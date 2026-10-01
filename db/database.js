const DB_VERSION = 14;

function requireUserId(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("An active user is required to access store data.");
  }
  return id;
}

function requireWholePieces(unit, quantity, label = "Quantity") {
  if (unit === "piece" && !Number.isInteger(Number(quantity))) {
    throw new Error(`${label} for products sold by the piece must be a whole item.`);
  }
}

/**
 * Runs once when the SQLiteProvider mounts. Creates tables if they don't
 * exist yet and stamps a user_version so future schema changes can migrate
 * safely instead of dropping data.
 */
export async function updateUserProfile(db, { id, storeName, phoneNumber }) {
  const hasEmailColumn = await userColumnExists(db, "email");
  if (hasEmailColumn) {
    await db.runAsync(
      `UPDATE users SET store_name = ?, phone_number = ?, email = ? WHERE id = ?`,
      [storeName, phoneNumber, phoneNumber, id]
    );
    return;
  }

  await db.runAsync(
    `UPDATE users SET store_name = ?, phone_number = ? WHERE id = ?`,
    [storeName, phoneNumber, id]
  );
}

export async function updateUserPin(db, { id, newPin }) {
  const hasPasswordColumn = await userColumnExists(db, "password");
  if (hasPasswordColumn) {
    await db.runAsync(
      `UPDATE users SET pin_code = ?, password = ? WHERE id = ?`,
      [newPin, newPin, id]
    );
    return;
  }

  await db.runAsync(
    `UPDATE users SET pin_code = ? WHERE id = ?`,
    [newPin, id]
  );
}

async function userColumnExists(db, columnName) {
  const columns = await db.getAllAsync("PRAGMA table_info(users)");
  return columns.some((column) => column.name === columnName);
}

async function ensureUserAuthColumns(db) {
  if (!(await userColumnExists(db, "phone_number"))) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN phone_number TEXT;`);
  }

  if (await userColumnExists(db, "email")) {
    await db.execAsync(`UPDATE users SET phone_number = email WHERE phone_number IS NULL;`);
  }

  if (!(await userColumnExists(db, "pin_code"))) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN pin_code TEXT;`);
  }

  if (await userColumnExists(db, "password")) {
    await db.execAsync(`UPDATE users SET pin_code = password WHERE pin_code IS NULL;`);
  }

  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;`
  );
}

async function debtorColumnExists(db, columnName) {
  const columns = await db.getAllAsync("PRAGMA table_info(debtors)");
  return columns.some((column) => column.name === columnName);
}

async function ensureDebtorProfileColumns(db) {
  if (!(await debtorColumnExists(db, "credit_limit"))) {
    await db.execAsync(`ALTER TABLE debtors ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0;`);
  }

  if (!(await debtorColumnExists(db, "id_photo_uri"))) {
    await db.execAsync(`ALTER TABLE debtors ADD COLUMN id_photo_uri TEXT;`);
  }

  if (!(await debtorColumnExists(db, "id_number"))) {
    await db.execAsync(`ALTER TABLE debtors ADD COLUMN id_number TEXT;`);
  }

  if (!(await debtorColumnExists(db, "profile_photo_uri"))) {
    await db.execAsync(`ALTER TABLE debtors ADD COLUMN profile_photo_uri TEXT;`);
  }
}

async function ensureProductUnitColumn(db) {
  if (!(await tableColumnExists(db, "products", "unit"))) {
    await db.execAsync(
      `ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece';`
    );
  }
}

async function ensureProductMeasurementValueColumn(db) {
  if (!(await tableColumnExists(db, "products", "measurement_value"))) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN measurement_value REAL;`);
  }
}

async function ensureProductItemPriceColumn(db) {
  if (!(await tableColumnExists(db, "products", "item_price"))) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN item_price REAL;`);
  }
}

async function ensureSalesTables(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY NOT NULL,
      debtor_id INTEGER REFERENCES debtors(id) ON DELETE SET NULL,
      sale_type TEXT NOT NULL CHECK (sale_type IN ('cash', 'credit')),
      total_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY NOT NULL,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
  `);
}

async function tableColumnExists(db, tableName, columnName) {
  const columns = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

async function ensureDataOwnershipColumns(db) {
  for (const tableName of ["debtors", "products", "transactions", "sales", "sale_items"]) {
    if (!(await tableColumnExists(db, tableName, "user_id"))) {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN user_id INTEGER REFERENCES users(id);`);
    }
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_debtors_user ON debtors(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_user ON sale_items(user_id);
  `);
}

async function transactionColumnExists(db, columnName) {
  const columns = await db.getAllAsync("PRAGMA table_info(transactions)");
  return columns.some((column) => column.name === columnName);
}

async function ensurePaymentMethodColumns(db) {
  if (!(await transactionColumnExists(db, "payment_method"))) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN payment_method TEXT;`);
  }

  if (!(await transactionColumnExists(db, "payment_provider"))) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN payment_provider TEXT;`);
  }

  if (!(await transactionColumnExists(db, "payment_reference"))) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN payment_reference TEXT;`);
  }
}

export async function migrateDbIfNeeded(db) {
  const result = await db.getFirstAsync("PRAGMA user_version");
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY NOT NULL,
        phone_number TEXT UNIQUE NOT NULL,
        pin_code TEXT NOT NULL,
        store_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS debtors (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        full_name TEXT NOT NULL,
        contact_number TEXT,
        id_number TEXT,
        address TEXT,
        notes TEXT,
        credit_limit REAL NOT NULL DEFAULT 0,
        profile_photo_uri TEXT,
        id_photo_uri TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT NOT NULL DEFAULT 'piece',
        measurement_value REAL,
        unit_price REAL NOT NULL DEFAULT 0,
        item_price REAL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        debtor_id INTEGER NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
        amount REAL NOT NULL,
        description TEXT,
        payment_method TEXT,
        payment_provider TEXT,
        payment_reference TEXT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_debtor ON transactions(debtor_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
    `);
    await ensureSalesTables(db);
    currentVersion = 1;
  }

  if (currentVersion < 3) {
    await ensureUserAuthColumns(db);
    currentVersion = 3;
  }

  if (currentVersion < 4) {
    await ensureDebtorProfileColumns(db);
    currentVersion = 4;
  }

  if (currentVersion < 5) {
    await ensureSalesTables(db);
    currentVersion = 5;
  }

  if (currentVersion < 6) {
    await ensureDataOwnershipColumns(db);
    currentVersion = 6;
  }

  if (currentVersion < 7) {
    const userCount = await db.getFirstAsync(`SELECT COUNT(*) AS count FROM users`);
    if (userCount?.count === 1) {
      const owner = await db.getFirstAsync(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
      for (const tableName of ["debtors", "products", "transactions", "sales", "sale_items"]) {
        await db.runAsync(`UPDATE ${tableName} SET user_id = ? WHERE user_id IS NULL`, [owner.id]);
      }
    }
    currentVersion = 7;
  }

  if (currentVersion < 8) {
    await ensureProductUnitColumn(db);
    currentVersion = 8;
  }

  if (currentVersion < 9) {
    await ensureDebtorProfileColumns(db);
    currentVersion = 9;
  }

  if (currentVersion < 10) {
    await ensureDebtorProfileColumns(db);
    currentVersion = 10;
  }

  if (currentVersion < 11) {
    await ensurePaymentMethodColumns(db);
    currentVersion = 11;
  }

  if (currentVersion < 12) {
    await ensurePaymentMethodColumns(db);
    currentVersion = 12;
  }

  if (currentVersion < 13) {
    await ensureProductMeasurementValueColumn(db);
    currentVersion = 13;
  }

  if (currentVersion < 14) {
    await ensureProductItemPriceColumn(db);
    currentVersion = 14;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

/* ----------------------------- Debtors ----------------------------- */

export async function getDebtors(db, userId, search) {
  const ownerId = requireUserId(userId);
  const where = search
    ? `WHERE d.user_id = ? AND d.full_name LIKE ?`
    : `WHERE d.user_id = ?`;
  const args = search ? [ownerId, `%${search}%`] : [ownerId];
  return db.getAllAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id AND t.user_id = d.user_id
     ${where}
     GROUP BY d.id
     ORDER BY d.full_name ASC`,
    args
  );
}

export async function getDebtor(db, userId, id) {
  const ownerId = requireUserId(userId);
  return db.getFirstAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.id = ? AND d.user_id = ?
     GROUP BY d.id`,
    [id, ownerId]
  );
}

export async function createDebtor(db, userId, data) {
  const ownerId = requireUserId(userId);
  const res = await db.runAsync(
    `INSERT INTO debtors (user_id, full_name, contact_number, id_number, address, notes, credit_limit, profile_photo_uri, id_photo_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      data.full_name,
      data.contact_number,
      data.id_number ?? null,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.profile_photo_uri ?? null,
      data.id_photo_uri ?? null,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateDebtor(db, userId, id, data) {
  const ownerId = requireUserId(userId);
  await db.runAsync(
    `UPDATE debtors SET full_name = ?, contact_number = ?, id_number = ?, address = ?, notes = ?, credit_limit = ?, profile_photo_uri = ?, id_photo_uri = ? WHERE id = ? AND user_id = ?`,
    [
      data.full_name,
      data.contact_number,
      data.id_number ?? null,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.profile_photo_uri ?? null,
      data.id_photo_uri ?? null,
      id, ownerId,
    ]
  );
}

export async function deleteDebtor(db, userId, id) {
  await db.runAsync(`DELETE FROM debtors WHERE id = ? AND user_id = ?`, [id, requireUserId(userId)]);
}

export async function getTotalOutstanding(db, userId) {
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS total FROM transactions WHERE user_id = ?`,
    [requireUserId(userId)]
  );
  return row?.total ?? 0;
}

/* --------------------------- Transactions --------------------------- */

export async function getTransactionsForDebtor(db, userId, debtorId) {
  return db.getAllAsync(
    `SELECT * FROM transactions WHERE debtor_id = ? AND user_id = ? ORDER BY created_at DESC, id DESC`,
    [debtorId, requireUserId(userId)]
  );
}

export async function addCreditTransaction(db, userId, params) {
  const ownerId = requireUserId(userId);
  await db.withTransactionAsync(async () => {
    const debtor = await getDebtor(db, ownerId, params.debtorId);
    if (!debtor) throw new Error("Debtor not found for this user.");
    if (params.productId) {
      const product = await getProduct(db, ownerId, params.productId);
      if (!product) throw new Error("Product not found for this user.");
      requireWholePieces(product.unit ?? "piece", params.quantity);
    }
    await db.runAsync(
      `INSERT INTO transactions (user_id, debtor_id, type, amount, description, product_id, quantity) VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
      [
        ownerId,
        params.debtorId,
        params.amount,
        params.description ?? null,
        params.productId ?? null,
        params.quantity ?? null,
      ]
    );
    if (params.productId && params.quantity) {
      await db.runAsync(
        `UPDATE products SET stock_quantity = MAX(stock_quantity - ?, 0) WHERE id = ? AND user_id = ?`,
        [params.quantity, params.productId, ownerId]
      );
    }
  });
}

export async function addPaymentTransaction(db, userId, params) {
  const ownerId = requireUserId(userId);
  const debtor = await getDebtor(db, ownerId, params.debtorId);
  if (!debtor) throw new Error("Debtor not found for this user.");
  await db.runAsync(
    `INSERT INTO transactions (user_id, debtor_id, type, amount, description, payment_method, payment_provider, payment_reference) VALUES (?, ?, 'payment', ?, ?, ?, ?, ?)`,
    [
      ownerId,
      params.debtorId,
      params.amount,
      params.description ?? null,
      params.paymentMethod ?? "cash",
      params.paymentProvider ?? null,
      params.paymentReference ?? null,
    ]
  );
}

export async function deleteTransaction(db, userId, id) {
  await db.runAsync(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, requireUserId(userId)]);
}

/* ----------------------------- Products ------------------------------ */

export async function getProducts(db, userId, search) {
  const ownerId = requireUserId(userId);
  const where = search ? `WHERE user_id = ? AND name LIKE ?` : `WHERE user_id = ?`;
  const args = search ? [ownerId, `%${search}%`] : [ownerId];
  return db.getAllAsync(
    `SELECT * FROM products ${where} ORDER BY name ASC`,
    args
  );
}

export async function getProduct(db, userId, id) {
  return db.getFirstAsync(`SELECT * FROM products WHERE id = ? AND user_id = ?`, [id, requireUserId(userId)]);
}

export async function createProduct(db, userId, data) {
  const ownerId = requireUserId(userId);
  const unit = data.unit ?? "piece";
  requireWholePieces(unit, data.stock_quantity, "Stock quantity");
  const res = await db.runAsync(
    `INSERT INTO products (user_id, name, category, unit, measurement_value, unit_price, item_price, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      data.name,
      data.category,
      unit,
      data.measurement_value ?? null,
      data.unit_price,
      data.item_price ?? null,
      data.stock_quantity,
      data.low_stock_threshold,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateProduct(db, userId, id, data) {
  const ownerId = requireUserId(userId);
  const unit = data.unit ?? "piece";
  requireWholePieces(unit, data.stock_quantity, "Stock quantity");
  await db.runAsync(
    `UPDATE products SET name = ?, category = ?, unit = ?, measurement_value = ?, unit_price = ?, item_price = ?, stock_quantity = ?, low_stock_threshold = ? WHERE id = ? AND user_id = ?`,
    [
      data.name,
      data.category,
      unit,
      data.measurement_value ?? null,
      data.unit_price,
      data.item_price ?? null,
      data.stock_quantity,
      data.low_stock_threshold,
      id, ownerId,
    ]
  );
}

export async function deleteProduct(db, userId, id) {
  await db.runAsync(`DELETE FROM products WHERE id = ? AND user_id = ?`, [id, requireUserId(userId)]);
}

export async function adjustStock(db, userId, id, delta) {
  const ownerId = requireUserId(userId);
  const product = await getProduct(db, ownerId, id);
  if (!product) throw new Error("Product not found for this user.");
  requireWholePieces(product.unit ?? "piece", delta, "Stock adjustment");
  await db.runAsync(
    `UPDATE products SET stock_quantity = MAX(stock_quantity + ?, 0) WHERE id = ? AND user_id = ?`,
    [delta, id, ownerId]
  );
}

/* ------------------------------- Sales ------------------------------- */

export async function createSale(db, userId, { saleType, debtorId = null, items }) {
  const ownerId = requireUserId(userId);
  if (!items?.length) {
    throw new Error("Cart is empty.");
  }

  return db.withTransactionAsync(async () => {
    if (saleType === "credit") {
      if (!debtorId) {
        throw new Error("Select a debtor for an utang sale.");
      }
      const debtor = await getDebtor(db, ownerId, debtorId);
      if (!debtor) {
        throw new Error("Debtor not found for this user.");
      }
    }

    const normalizedItems = [];
    for (const item of items) {
      const product = await getProduct(db, ownerId, Number(item.product.id));
      if (!product) {
        throw new Error(`${item.product.name} is no longer in inventory.`);
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }
      const packageSize = Math.max(
        1,
        Math.floor(Number(product.measurement_value) || 1)
      );
      const hasPackagePrice =
        product.unit === "piece" &&
        Number(product.measurement_value) > 1 &&
        Number(product.item_price) > 0 &&
        Number(product.unit_price) > 0 &&
        Number(product.item_price) !== Number(product.unit_price);
      const sellPackage =
        item.saleMode === "package" && hasPackagePrice;
      const stockItems = sellPackage ? packageSize : 1;
      const unitPrice = Number(
        sellPackage
          ? product.unit_price
          : product.item_price || product.unit_price
      ) || 0;
      requireWholePieces(product.unit ?? "piece", quantity * stockItems);
      if (product.stock_quantity < quantity * stockItems) {
        throw new Error(`${product.name} only has ${product.stock_quantity} left in stock.`);
      }
      normalizedItems.push({ product, quantity, stockItems, unitPrice });
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const sale = await db.runAsync(
      `INSERT INTO sales (user_id, debtor_id, sale_type, total_amount) VALUES (?, ?, ?, ?)`,
      [ownerId, saleType === "credit" ? debtorId : null, saleType, total]
    );
    const saleId = sale.lastInsertRowId;

    for (const item of normalizedItems) {
      const product = item.product;
      await db.runAsync(
        `INSERT INTO sale_items (user_id, sale_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ownerId, saleId, product.id, product.name, item.unitPrice, item.quantity]
      );
      await db.runAsync(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND user_id = ?`,
        [item.quantity * item.stockItems, product.id, ownerId]
      );
    }

    if (saleType === "credit") {
      await db.runAsync(
        `INSERT INTO transactions (user_id, debtor_id, type, amount, description)
         VALUES (?, ?, 'credit', ?, ?)`,
        [ownerId, debtorId, total, `Credit sale #${saleId}`]
      );
    }

    return saleId;
  });
}

export async function getDebtorOptions(db, userId) {
  const ownerId = requireUserId(userId);
  return db.getAllAsync(
    `SELECT d.id, d.full_name, d.contact_number,
      COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.user_id = ?
     GROUP BY d.id
     ORDER BY d.full_name ASC`
  , [ownerId]);
}

/* ------------------------------ Reports ------------------------------ */

export async function getDailySalesSummary(db, userId, days = 14) {
  const ownerId = requireUserId(userId);
  return db.getAllAsync(
    `WITH dates AS (
        SELECT date(created_at) AS date FROM transactions WHERE user_id = ? AND date(created_at) >= date('now', ?)
        UNION
        SELECT date(created_at) AS date FROM sales WHERE user_id = ? AND date(created_at) >= date('now', ?)
      ),
      tx AS (
        SELECT
          date(created_at) AS date,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS credit_total,
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS payment_total,
          COUNT(*) AS transaction_count
        FROM transactions
        WHERE user_id = ? AND date(created_at) >= date('now', ?)
        GROUP BY date(created_at)
      ),
      sale_summary AS (
        SELECT
          date(s.created_at) AS date,
          COALESCE(SUM(CASE WHEN s.sale_type = 'cash' THEN s.total_amount ELSE 0 END), 0) AS cash_total,
          COALESCE(SUM(si.quantity), 0) AS item_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id AND si.user_id = s.user_id
        WHERE s.user_id = ? AND date(s.created_at) >= date('now', ?)
        GROUP BY date(s.created_at)
      )
      SELECT
        dates.date,
        COALESCE(sale_summary.cash_total, 0) AS cash_total,
        COALESCE(tx.credit_total, 0) AS credit_total,
        COALESCE(tx.credit_total, 0) AS total_credit_sales,
        COALESCE(tx.payment_total, 0) AS total_payments_received,
        COALESCE(sale_summary.item_count, 0) AS item_count,
        COALESCE(tx.transaction_count, 0) AS transaction_count
      FROM dates
      LEFT JOIN tx ON tx.date = dates.date
      LEFT JOIN sale_summary ON sale_summary.date = dates.date
      ORDER BY dates.date DESC`,
    [ownerId, `-${days} days`, ownerId, `-${days} days`, ownerId, `-${days} days`, ownerId, `-${days} days`]
  );
}

export async function getTodaysSales(db, userId) {
  return db.getAllAsync(
    `SELECT s.id, s.sale_type, s.total_amount, s.created_at, d.full_name AS debtor_name
     FROM sales s
     LEFT JOIN debtors d ON d.id = s.debtor_id AND d.user_id = s.user_id
     WHERE s.user_id = ? AND date(s.created_at) = date('now')
     ORDER BY s.created_at DESC, s.id DESC`
  , [requireUserId(userId)]);
}

export async function getUnpaidBalances(db, userId) {
  const ownerId = requireUserId(userId);
  return db.getAllAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.user_id = ?
     GROUP BY d.id
     HAVING balance > 0
     ORDER BY balance DESC`
  , [ownerId]);
}

export async function getLowStockProducts(db, userId) {
  return db.getAllAsync(
    `SELECT * FROM products WHERE user_id = ? AND stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC`,
    [requireUserId(userId)]
  );
}

export async function getRecentTransactions(db, userId, limit = 20) {
  return db.getAllAsync(
    `SELECT t.*, d.full_name AS debtor_name
     FROM transactions t
     JOIN debtors d ON d.id = t.debtor_id AND d.user_id = t.user_id
     WHERE t.user_id = ?
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT ?`,
    [requireUserId(userId), limit]
  );
}

export async function getTransactionHistory(db, userId, days = 7) {
  const ownerId = requireUserId(userId);
  return db.getAllAsync(
    `SELECT
        'sale-' || s.id AS id,
        CASE WHEN s.sale_type = 'credit' THEN 'Utang' ELSE 'Cash Sale' END AS label,
        s.sale_type AS type,
        s.total_amount AS amount,
        s.created_at AS date,
        d.full_name AS debtor_name
      FROM sales s
      LEFT JOIN debtors d ON d.id = s.debtor_id AND d.user_id = s.user_id
      WHERE s.user_id = ? AND date(s.created_at) >= date('now', ?)
      UNION ALL
      SELECT
        'payment-' || t.id AS id,
        'Payment' AS label,
        'payment' AS type,
        t.amount AS amount,
        t.created_at AS date,
        d.full_name AS debtor_name
      FROM transactions t
      JOIN debtors d ON d.id = t.debtor_id AND d.user_id = t.user_id
      WHERE t.user_id = ? AND t.type = 'payment'
        AND date(t.created_at) >= date('now', ?)
      ORDER BY date DESC`,
    [ownerId, `-${days} days`, ownerId, `-${days} days`]
  );
}

export async function exportAllData(db, userId) {
  const ownerId = requireUserId(userId);
  const [debtors, products, sales, saleItems, transactions] = await Promise.all([
    db.getAllAsync(`SELECT * FROM debtors WHERE user_id = ? ORDER BY full_name ASC`, [ownerId]),
    db.getAllAsync(`SELECT * FROM products WHERE user_id = ? ORDER BY name ASC`, [ownerId]),
    db.getAllAsync(`SELECT * FROM sales WHERE user_id = ? ORDER BY created_at DESC`, [ownerId]),
    db.getAllAsync(`SELECT * FROM sale_items WHERE user_id = ? ORDER BY sale_id DESC`, [ownerId]),
    db.getAllAsync(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [ownerId]),
  ]);

  return {
    exported_at: new Date().toISOString(),
    debtors,
    products,
    sales,
    sale_items: saleItems,
    transactions,
  };
}

export async function getTodayCreditItemCount(db, userId) {
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(quantity), 0) AS total
     FROM transactions
     WHERE user_id = ? AND type = 'credit' AND date(created_at) = date('now')`,
    [requireUserId(userId)]
  );
  return row?.total ?? 0;
}

export async function createUser(db, { phoneNumber, pin, storeName }) {
  const hasEmailColumn = await userColumnExists(db, "email");
  const hasPasswordColumn = await userColumnExists(db, "password");

  if (hasEmailColumn && hasPasswordColumn) {
    const res = await db.runAsync(
      `INSERT INTO users (phone_number, pin_code, store_name, email, password) VALUES (?, ?, ?, ?, ?)`,
      [phoneNumber, pin, storeName, phoneNumber, pin]
    );
    return res.lastInsertRowId;
  }

  const res = await db.runAsync(
    `INSERT INTO users (phone_number, pin_code, store_name) VALUES (?, ?, ?)`,
    [phoneNumber, pin, storeName]
  );
  return res.lastInsertRowId;
}

export async function getUserByPhone(db, phoneNumber) {
  const hasEmailColumn = await userColumnExists(db, "email");
  if (hasEmailColumn) {
    return db.getFirstAsync(
      `SELECT * FROM users WHERE phone_number = ? OR email = ?`,
      [phoneNumber, phoneNumber]
    );
  }

  return db.getFirstAsync(`SELECT * FROM users WHERE phone_number = ?`, [phoneNumber]);
}
