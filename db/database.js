const DB_VERSION = 5;

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
        full_name TEXT NOT NULL,
        contact_number TEXT,
        address TEXT,
        notes TEXT,
        credit_limit REAL NOT NULL DEFAULT 0,
        id_photo_uri TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        unit_price REAL NOT NULL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY NOT NULL,
        debtor_id INTEGER NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
        amount REAL NOT NULL,
        description TEXT,
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

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

/* ----------------------------- Debtors ----------------------------- */

export async function getDebtors(db, search) {
  const where = search ? `WHERE d.full_name LIKE ?` : "";
  const args = search ? [`%${search}%`] : [];
  return db.getAllAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id
     ${where}
     GROUP BY d.id
     ORDER BY d.full_name ASC`,
    args
  );
}

export async function getDebtor(db, id) {
  return db.getFirstAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id
     WHERE d.id = ?
     GROUP BY d.id`,
    [id]
  );
}

export async function createDebtor(db, data) {
  const res = await db.runAsync(
    `INSERT INTO debtors (full_name, contact_number, address, notes, credit_limit, id_photo_uri) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.full_name,
      data.contact_number,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.id_photo_uri ?? null,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateDebtor(db, id, data) {
  await db.runAsync(
    `UPDATE debtors SET full_name = ?, contact_number = ?, address = ?, notes = ?, credit_limit = ?, id_photo_uri = ? WHERE id = ?`,
    [
      data.full_name,
      data.contact_number,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.id_photo_uri ?? null,
      id,
    ]
  );
}

export async function deleteDebtor(db, id) {
  await db.runAsync(`DELETE FROM debtors WHERE id = ?`, [id]);
}

export async function getTotalOutstanding(db) {
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS total FROM transactions`
  );
  return row?.total ?? 0;
}

/* --------------------------- Transactions --------------------------- */

export async function getTransactionsForDebtor(db, debtorId) {
  return db.getAllAsync(
    `SELECT * FROM transactions WHERE debtor_id = ? ORDER BY created_at DESC, id DESC`,
    [debtorId]
  );
}

export async function addCreditTransaction(db, params) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (debtor_id, type, amount, description, product_id, quantity) VALUES (?, 'credit', ?, ?, ?, ?)`,
      [
        params.debtorId,
        params.amount,
        params.description ?? null,
        params.productId ?? null,
        params.quantity ?? null,
      ]
    );
    if (params.productId && params.quantity) {
      await db.runAsync(
        `UPDATE products SET stock_quantity = MAX(stock_quantity - ?, 0) WHERE id = ?`,
        [params.quantity, params.productId]
      );
    }
  });
}

export async function addPaymentTransaction(db, params) {
  await db.runAsync(
    `INSERT INTO transactions (debtor_id, type, amount, description) VALUES (?, 'payment', ?, ?)`,
    [params.debtorId, params.amount, params.description ?? null]
  );
}

export async function deleteTransaction(db, id) {
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

/* ----------------------------- Products ------------------------------ */

export async function getProducts(db, search) {
  const where = search ? `WHERE name LIKE ?` : "";
  const args = search ? [`%${search}%`] : [];
  return db.getAllAsync(
    `SELECT * FROM products ${where} ORDER BY name ASC`,
    args
  );
}

export async function getProduct(db, id) {
  return db.getFirstAsync(`SELECT * FROM products WHERE id = ?`, [id]);
}

export async function createProduct(db, data) {
  const res = await db.runAsync(
    `INSERT INTO products (name, category, unit_price, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?)`,
    [
      data.name,
      data.category,
      data.unit_price,
      data.stock_quantity,
      data.low_stock_threshold,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateProduct(db, id, data) {
  await db.runAsync(
    `UPDATE products SET name = ?, category = ?, unit_price = ?, stock_quantity = ?, low_stock_threshold = ? WHERE id = ?`,
    [
      data.name,
      data.category,
      data.unit_price,
      data.stock_quantity,
      data.low_stock_threshold,
      id,
    ]
  );
}

export async function deleteProduct(db, id) {
  await db.runAsync(`DELETE FROM products WHERE id = ?`, [id]);
}

export async function adjustStock(db, id, delta) {
  await db.runAsync(
    `UPDATE products SET stock_quantity = MAX(stock_quantity + ?, 0) WHERE id = ?`,
    [delta, id]
  );
}

/* ------------------------------- Sales ------------------------------- */

export async function createSale(db, { saleType, debtorId = null, items }) {
  if (!items?.length) {
    throw new Error("Cart is empty.");
  }

  const normalizedItems = items.map((item) => ({
    product: item.product,
    quantity: Number(item.quantity) || 0,
  }));
  const total = normalizedItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.unit_price),
    0
  );

  return db.withTransactionAsync(async () => {
    for (const item of normalizedItems) {
      const product = await getProduct(db, Number(item.product.id));
      if (!product) {
        throw new Error(`${item.product.name} is no longer in inventory.`);
      }
      if (item.quantity <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }
      if (product.stock_quantity < item.quantity) {
        throw new Error(`${product.name} only has ${product.stock_quantity} left in stock.`);
      }
    }

    const sale = await db.runAsync(
      `INSERT INTO sales (debtor_id, sale_type, total_amount) VALUES (?, ?, ?)`,
      [saleType === "credit" ? debtorId : null, saleType, total]
    );
    const saleId = sale.lastInsertRowId;

    for (const item of normalizedItems) {
      const product = item.product;
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, product.id, product.name, product.unit_price, item.quantity]
      );
      await db.runAsync(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [item.quantity, product.id]
      );
    }

    if (saleType === "credit") {
      if (!debtorId) {
        throw new Error("Select a debtor for an utang sale.");
      }
      await db.runAsync(
        `INSERT INTO transactions (debtor_id, type, amount, description)
         VALUES (?, 'credit', ?, ?)`,
        [debtorId, total, `Credit sale #${saleId}`]
      );
    }

    return saleId;
  });
}

export async function getDebtorOptions(db) {
  return db.getAllAsync(
    `SELECT d.id, d.full_name, d.contact_number,
      COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id
     GROUP BY d.id
     ORDER BY d.full_name ASC`
  );
}

/* ------------------------------ Reports ------------------------------ */

export async function getDailySalesSummary(db, days = 14) {
  return db.getAllAsync(
    `WITH dates AS (
        SELECT date(created_at) AS date FROM transactions WHERE date(created_at) >= date('now', ?)
        UNION
        SELECT date(created_at) AS date FROM sales WHERE date(created_at) >= date('now', ?)
      ),
      tx AS (
        SELECT
          date(created_at) AS date,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS credit_total,
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS payment_total,
          COUNT(*) AS transaction_count
        FROM transactions
        WHERE date(created_at) >= date('now', ?)
        GROUP BY date(created_at)
      ),
      sale_summary AS (
        SELECT
          date(s.created_at) AS date,
          COALESCE(SUM(CASE WHEN s.sale_type = 'cash' THEN s.total_amount ELSE 0 END), 0) AS cash_total,
          COALESCE(SUM(si.quantity), 0) AS item_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        WHERE date(s.created_at) >= date('now', ?)
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
    [`-${days} days`, `-${days} days`, `-${days} days`, `-${days} days`]
  );
}

export async function getTodaysSales(db) {
  return db.getAllAsync(
    `SELECT s.id, s.sale_type, s.total_amount, s.created_at, d.full_name AS debtor_name
     FROM sales s
     LEFT JOIN debtors d ON d.id = s.debtor_id
     WHERE date(s.created_at) = date('now')
     ORDER BY s.created_at DESC, s.id DESC`
  );
}

export async function getUnpaidBalances(db) {
  return db.getAllAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t ON t.debtor_id = d.id
     GROUP BY d.id
     HAVING balance > 0
     ORDER BY balance DESC`
  );
}

export async function getLowStockProducts(db) {
  return db.getAllAsync(
    `SELECT * FROM products WHERE stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC`
  );
}

export async function getRecentTransactions(db, limit = 20) {
  return db.getAllAsync(
    `SELECT t.*, d.full_name AS debtor_name
     FROM transactions t
     JOIN debtors d ON d.id = t.debtor_id
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getTransactionHistory(db, days = 7) {
  return db.getAllAsync(
    `SELECT
        'sale-' || s.id AS id,
        CASE WHEN s.sale_type = 'credit' THEN 'Utang' ELSE 'Cash Sale' END AS label,
        s.sale_type AS type,
        s.total_amount AS amount,
        s.created_at AS date,
        d.full_name AS debtor_name
      FROM sales s
      LEFT JOIN debtors d ON d.id = s.debtor_id
      WHERE date(s.created_at) >= date('now', ?)
      UNION ALL
      SELECT
        'payment-' || t.id AS id,
        'Payment' AS label,
        'payment' AS type,
        t.amount AS amount,
        t.created_at AS date,
        d.full_name AS debtor_name
      FROM transactions t
      JOIN debtors d ON d.id = t.debtor_id
      WHERE t.type = 'payment'
        AND date(t.created_at) >= date('now', ?)
      ORDER BY date DESC`,
    [`-${days} days`, `-${days} days`]
  );
}

export async function exportAllData(db) {
  const [debtors, products, sales, saleItems, transactions] = await Promise.all([
    db.getAllAsync(`SELECT * FROM debtors ORDER BY full_name ASC`),
    db.getAllAsync(`SELECT * FROM products ORDER BY name ASC`),
    db.getAllAsync(`SELECT * FROM sales ORDER BY created_at DESC`),
    db.getAllAsync(`SELECT * FROM sale_items ORDER BY sale_id DESC`),
    db.getAllAsync(`SELECT * FROM transactions ORDER BY created_at DESC`),
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
