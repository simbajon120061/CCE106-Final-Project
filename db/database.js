// db/database.js
import { scheduleCloudSync } from "@/db/cloudSync";
import { getSalePricing } from "@/lib/inventory";

const DB_VERSION = 15;

/**
 * Runs once when the SQLiteProvider mounts. Creates tables if they don't
 * exist yet and stamps a user_version so future schema changes can migrate
 * safely instead of dropping data.
 */
export async function updateUserProfile(
  db,
  { id, storeName, phoneNumber, ownerName }
) {
  const hasEmailColumn = await userColumnExists(db, "email");
  if (hasEmailColumn) {
    await db.runAsync(
      `UPDATE users
       SET store_name = ?, owner_name = ?, phone_number = ?, email = ?
       WHERE id = ?`,
      [storeName, ownerName, phoneNumber, phoneNumber, id]
    );
    scheduleCloudSync(db, id);
    return;
  }

  await db.runAsync(
    `UPDATE users
     SET store_name = ?, owner_name = ?, phone_number = ?
     WHERE id = ?`,
    [storeName, ownerName, phoneNumber, id]
  );
  scheduleCloudSync(db, id);
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

async function ensureUserCloudColumns(db) {
  if (!(await userColumnExists(db, "firebase_uid"))) {
    await db.execAsync(`ALTER TABLE users ADD COLUMN firebase_uid TEXT;`);
  }

  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid
     ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;`
  );
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cloud_sync_deletions (
      user_id INTEGER NOT NULL,
      collection_name TEXT NOT NULL
        CHECK (collection_name IN ('debtors', 'products', 'sales', 'transactions')),
      record_id TEXT NOT NULL,
      PRIMARY KEY (user_id, collection_name, record_id)
    );
  `);
}

async function recordCloudDeletion(db, userId, collectionName, recordId) {
  if (userId == null) return;
  await db.runAsync(
    `INSERT OR IGNORE INTO cloud_sync_deletions
       (user_id, collection_name, record_id)
     VALUES (?, ?, ?)`,
    [userId, collectionName, String(recordId)]
  );
}

async function debtorColumnExists(db, columnName) {
  const columns = await db.getAllAsync("PRAGMA table_info(debtors)");
  return columns.some((column) => column.name === columnName);
}

async function ensureDebtorProfileColumns(db) {
  if (!(await debtorColumnExists(db, "credit_limit"))) {
    await db.execAsync(
      `ALTER TABLE debtors ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0;`
    );
  }

  if (!(await debtorColumnExists(db, "profile_photo_uri"))) {
    await db.execAsync(
      `ALTER TABLE debtors ADD COLUMN profile_photo_uri TEXT;`
    );
  }

  if (!(await debtorColumnExists(db, "id_photo_uri"))) {
    await db.execAsync(
      `ALTER TABLE debtors ADD COLUMN id_photo_uri TEXT;`
    );
  }
}

async function ensureDebtorDeletionColumn(db) {
  if (!(await debtorColumnExists(db, "deleted_at"))) {
    await db.execAsync(`ALTER TABLE debtors ADD COLUMN deleted_at TEXT;`);
  }

  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_debtors_active_user
     ON debtors(user_id, deleted_at);`
  );
}

async function ensureCloudSyncDeletionCollections(db) {
  const table = await db.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='cloud_sync_deletions'"
  );
  if (!table) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cloud_sync_deletions (
        user_id INTEGER NOT NULL,
        collection_name TEXT NOT NULL
          CHECK (collection_name IN ('debtors', 'products', 'sales', 'transactions')),
        record_id TEXT NOT NULL,
        PRIMARY KEY (user_id, collection_name, record_id)
      );
    `);
    return;
  }
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cloud_sync_deletions_next (
      user_id INTEGER NOT NULL,
      collection_name TEXT NOT NULL
        CHECK (collection_name IN ('debtors', 'products', 'sales', 'transactions')),
      record_id TEXT NOT NULL,
      PRIMARY KEY (user_id, collection_name, record_id)
    );
    INSERT OR IGNORE INTO cloud_sync_deletions_next
      (user_id, collection_name, record_id)
      SELECT user_id, collection_name, record_id FROM cloud_sync_deletions;
    DROP TABLE cloud_sync_deletions;
    ALTER TABLE cloud_sync_deletions_next RENAME TO cloud_sync_deletions;
  `);
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

async function ensureUserDataColumns(db) {
  // DEBTORS
  if (!(await debtorColumnExists(db, "user_id"))) {
    await db.execAsync(
      `ALTER TABLE debtors ADD COLUMN user_id INTEGER REFERENCES users(id);`
    );
  }

  // PRODUCTS
  const productColumns = await db.getAllAsync("PRAGMA table_info(products)");
  if (!productColumns.some((column) => column.name === "user_id")) {
    await db.execAsync(
      `ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id);`
    );
  }

  // TRANSACTIONS
  const transactionColumns = await db.getAllAsync(
    "PRAGMA table_info(transactions)"
  );
  if (!transactionColumns.some((column) => column.name === "user_id")) {
    await db.execAsync(
      `ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id);`
    );
  }

  // SALES
  const salesColumns = await db.getAllAsync("PRAGMA table_info(sales)");
  if (!salesColumns.some((column) => column.name === "user_id")) {
    await db.execAsync(
      `ALTER TABLE sales ADD COLUMN user_id INTEGER REFERENCES users(id);`
    );
  }

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_debtors_user
    ON debtors(user_id);

    CREATE INDEX IF NOT EXISTS idx_products_user
    ON products(user_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_user
    ON transactions(user_id);

    CREATE INDEX IF NOT EXISTS idx_sales_user
    ON sales(user_id);
  `);
}

async function ensureProductPricingColumns(db) {
  const cols = await db.getAllAsync("PRAGMA table_info(products)");
  const has = (name) => cols.some((c) => c.name === name);

  if (!has("unit")) {
    await db.execAsync(
      `ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece';`
    );
  }
  if (!has("measurement_value")) {
    await db.execAsync(
      `ALTER TABLE products ADD COLUMN measurement_value REAL;`
    );
  }
  if (!has("item_price")) {
    await db.execAsync(
      `ALTER TABLE products ADD COLUMN item_price REAL;`
    );
  }
}

export async function migrateDbIfNeeded(db) {
  await db.execAsync("PRAGMA busy_timeout = 5000;");

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
        profile_photo_uri TEXT,
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

  if (currentVersion < 6) {
    await ensureDebtorProfileColumns(db);
    currentVersion = 6;
  }

  if (currentVersion < 7) {
    await ensureUserDataColumns(db);

    const firstUser = await db.getFirstAsync(
      `SELECT id FROM users ORDER BY id ASC LIMIT 1`
    );

    if (firstUser?.id) {
      await db.runAsync(
        `UPDATE debtors SET user_id = ? WHERE user_id IS NULL`,
        [firstUser.id]
      );

      await db.runAsync(
        `UPDATE products SET user_id = ? WHERE user_id IS NULL`,
        [firstUser.id]
      );

      await db.runAsync(
        `UPDATE transactions SET user_id = ? WHERE user_id IS NULL`,
        [firstUser.id]
      );

      await db.runAsync(
        `UPDATE sales SET user_id = ? WHERE user_id IS NULL`,
        [firstUser.id]
      );
    }

    currentVersion = 7;
  }

  if (currentVersion < 8) {
    await ensureProductPricingColumns(db);
    currentVersion = 8;
  }

  if (currentVersion < 11) {
    await ensureUserCloudColumns(db);
    currentVersion = 11;
  }

  if (currentVersion < 12) {
    await ensureDebtorDeletionColumn(db);
    currentVersion = 12;
  }

  if (currentVersion < 13) {
    await ensureCloudSyncDeletionCollections(db);
    currentVersion = 13;
  }

  if (currentVersion < 14) {
    if (!(await userColumnExists(db, "owner_name"))) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN owner_name TEXT;`);
    }
    currentVersion = 14;
  }

  if (currentVersion < 15) {
    const transactionColumns = await db.getAllAsync(
      "PRAGMA table_info(transactions)"
    );
    const hasTransactionColumn = (name) =>
      transactionColumns.some((column) => column.name === name);
    if (!hasTransactionColumn("payment_method")) {
      await db.execAsync(
        `ALTER TABLE transactions ADD COLUMN payment_method TEXT;`
      );
    }
    if (!hasTransactionColumn("payment_provider")) {
      await db.execAsync(
        `ALTER TABLE transactions ADD COLUMN payment_provider TEXT;`
      );
    }
    if (!hasTransactionColumn("payment_reference")) {
      await db.execAsync(
        `ALTER TABLE transactions ADD COLUMN payment_reference TEXT;`
      );
    }
    currentVersion = 15;
  }

  await ensureUserCloudColumns(db);
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

/* ----------------------------- Debtors ----------------------------- */

export async function getDebtors(db, userId, search) {
  const where = search
    ? `WHERE d.user_id = ? AND d.deleted_at IS NULL AND d.full_name LIKE ?`
    : `WHERE d.user_id = ? AND d.deleted_at IS NULL`;

  const args = search
    ? [userId, `%${search}%`]
    : [userId];

  return db.getAllAsync(
    `SELECT d.*,
      COALESCE(
        SUM(
          CASE
            WHEN t.type = 'credit' THEN t.amount
            ELSE -t.amount
          END
        ), 0
      ) AS balance
     FROM debtors d
     LEFT JOIN transactions t
       ON t.debtor_id = d.id AND t.user_id = d.user_id
     ${where}
     GROUP BY d.id
     ORDER BY d.full_name ASC`,
    args
  );
}
export async function getDebtor(db, id, userId) {
  if (!userId) {
    return db.getFirstAsync(
      `SELECT d.*, 
         COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
       FROM debtors d
       LEFT JOIN transactions t
         ON t.debtor_id = d.id AND t.user_id = d.user_id
       WHERE d.id = ? AND d.deleted_at IS NULL
       GROUP BY d.id`,
      [id]
    );
  }

  return db.getFirstAsync(
    `SELECT d.*, 
       COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t
       ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.id = ? AND d.user_id = ? AND d.deleted_at IS NULL
     GROUP BY d.id`,
    [id, userId]
  );
}

export async function createDebtor(db, userId, data) {
  const res = await db.runAsync(
    `INSERT INTO debtors (
      user_id,
      full_name,
      contact_number,
      address,
      notes,
      credit_limit,
      profile_photo_uri,
      id_photo_uri
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.full_name,
      data.contact_number,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.profile_photo_uri ?? null,
      data.id_photo_uri ?? null,
    ]
  );

  scheduleCloudSync(db, userId);
  return res.lastInsertRowId;
}

export async function updateDebtor(db, id, data) {
  const owner = await db.getFirstAsync(
    "SELECT user_id FROM debtors WHERE id = ?",
    [id]
  );
  await db.runAsync(
    `UPDATE debtors
     SET full_name = ?,
         contact_number = ?,
         address = ?,
         notes = ?,
         credit_limit = ?,
         profile_photo_uri = ?,
         id_photo_uri = ?
     WHERE id = ?`,
    [
      data.full_name,
      data.contact_number,
      data.address,
      data.notes,
      data.credit_limit ?? 0,
      data.profile_photo_uri ?? null,
      data.id_photo_uri ?? null,
      id,
    ]
  );
  scheduleCloudSync(db, owner?.user_id);
}

export async function deleteDebtor(db, id, userId) {
  if (!db) {
    throw new Error("Database is not available.");
  }

  if (!id) {
    throw new Error("Invalid debtor ID.");
  }

  if (!userId) {
    throw new Error("User is not logged in.");
  }

  // Check that this debtor belongs to the logged-in user
  const debtor = await db.getFirstAsync(
    `
    SELECT id, full_name
    FROM debtors
    WHERE id = ? AND user_id = ?
    `,
    [id, userId]
  );

  if (!debtor) {
    throw new Error("Debtor not found.");
  }

  // Check the debtor's remaining balance
  const balanceResult = await db.getFirstAsync(
    `
    SELECT COALESCE(
      SUM(
        CASE
          WHEN type = 'credit' THEN amount
          WHEN type = 'payment' THEN -amount
          ELSE 0
        END
      ),
      0
    ) AS balance
    FROM transactions
    WHERE debtor_id = ? AND user_id = ?
    `,
    [id, userId]
  );

  const balance = Number(balanceResult?.balance || 0);

  // Do not allow deletion if the debtor still owes money
  if (balance > 0) {
    throw new Error(
      "This debtor still has an outstanding balance. Please settle the debt before deleting the debtor."
    );
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      // Keep the debtor row and linked transactions for report history.
      // Active debtor queries exclude soft-deleted rows.
      `UPDATE debtors
       SET deleted_at = datetime('now')
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
  });

  scheduleCloudSync(db, userId);
  return true;
}

export async function getTotalOutstanding(db, userId) {
  const row = await db.getFirstAsync(
    `SELECT COALESCE(
       SUM(
         CASE
           WHEN type = 'credit' THEN amount
           ELSE -amount
         END
       ), 0
     ) AS total
     FROM transactions
     WHERE user_id = ?`,
    [userId]
  );

  return row?.total ?? 0;
}

/* --------------------------- Transactions --------------------------- */

export async function getTransactionsForDebtor(db, debtorId, userId) {
  if (userId == null) {
    throw new Error("A store account is required to load debtor transactions.");
  }
  return db.getAllAsync(
    `SELECT t.*
     FROM transactions t
     INNER JOIN debtors d
       ON d.id = t.debtor_id AND d.user_id = t.user_id
     WHERE t.debtor_id = ? AND t.user_id = ? AND d.user_id = ?
     ORDER BY t.created_at DESC, t.id DESC`,
    [debtorId, userId, userId]
  );
}

export async function addCreditTransaction(db, params) {
  await db.withTransactionAsync(async () => {
    const debtor = await db.getFirstAsync(
      `SELECT id FROM debtors
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [params.debtorId, params.userId]
    );
    if (!debtor) {
      throw new Error("The selected debtor does not belong to this store.");
    }

    await db.runAsync(
      `INSERT INTO transactions (user_id, debtor_id, type, amount, description, product_id, quantity) 
       VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
      [
        params.userId ?? null,
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
  scheduleCloudSync(db, params.userId);
}

export async function addPaymentTransaction(db, params) {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  await db.withTransactionAsync(async () => {
    const debtor = await db.getFirstAsync(
      `SELECT id FROM debtors
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [params.debtorId, params.userId]
    );
    if (!debtor) {
      throw new Error("The selected debtor does not belong to this store.");
    }

    const balanceResult = await db.getFirstAsync(
      `SELECT COALESCE(
         SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0
       ) AS balance
       FROM transactions
       WHERE debtor_id = ? AND user_id = ?`,
      [params.debtorId, params.userId]
    );
    if (amount > Number(balanceResult?.balance || 0)) {
      throw new Error("Payment cannot exceed the debtor's outstanding balance.");
    }

    await db.runAsync(
      `INSERT INTO transactions (
         user_id, debtor_id, type, amount, description,
         payment_method, payment_provider, payment_reference
       )
       VALUES (?, ?, 'payment', ?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.debtorId,
        amount,
        params.description ?? null,
        params.paymentMethod ?? "cash",
        params.paymentProvider ?? null,
        params.paymentReference ?? null,
      ]
    );
  });
  scheduleCloudSync(db, params.userId);
}

async function ensureCloudSyncColumns(db) {
  const cols = await db.getAllAsync("PRAGMA table_info(products)");
  if (!cols.some((column) => column.name === "cloud_id")) {
    await db.execAsync(`ALTER TABLE products ADD COLUMN cloud_id TEXT;`);
  }
  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_cloud_id
     ON products(cloud_id) WHERE cloud_id IS NOT NULL;`
  );
}

export async function deleteTransaction(db, userId, id) {
  if (userId == null) {
    throw new Error("A store account is required to delete a transaction.");
  }
  const owner = await db.getFirstAsync(
    "SELECT user_id FROM transactions WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  if (!owner) {
    throw new Error("Transaction not found for this store.");
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM transactions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    await recordCloudDeletion(db, owner?.user_id, "transactions", id);
  });
  scheduleCloudSync(db, owner?.user_id);
}

/* ----------------------------- Products ------------------------------ */

export async function getProducts(db, userId, search) {
  // Include legacy products created before account ownership was added. This
  // keeps existing local inventory visible after upgrading the app.
  const ownership = userId == null ? "" : "(user_id = ? OR user_id IS NULL)";
  const where = search
    ? `WHERE ${ownership}${ownership ? " AND " : ""}name LIKE ?`
    : ownership ? `WHERE ${ownership}` : "";
  const args = userId == null
    ? (search ? [`%${search}%`] : [])
    : (search ? [userId, `%${search}%`] : [userId]);

  return db.getAllAsync(
    `SELECT * FROM products
     ${where}
     ORDER BY name ASC`,
    args
  );
}

export async function getProduct(db, userId, id) {
  return db.getFirstAsync(
    // Match the list query: records created before product ownership was
    // introduced remain usable after an app upgrade.
    `SELECT * FROM products
     WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
    [id, userId]
  );
}

export async function createProduct(db, userId, data) {
  const res = await db.runAsync(
    `INSERT INTO products (
      user_id, name, category, unit, measurement_value, unit_price, item_price,
      stock_quantity, low_stock_threshold
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.name,
      data.category,
      data.unit ?? "piece",
      data.measurement_value ?? null,
      data.unit_price,
      data.item_price ?? null,
      data.stock_quantity,
      data.low_stock_threshold,
    ]
  );
  scheduleCloudSync(db, userId);
  return res.lastInsertRowId;
}

export async function updateProduct(db, userId, id, data) {
  await db.runAsync(
    `UPDATE products
     SET name = ?, category = ?, unit = ?, measurement_value = ?,
         unit_price = ?, item_price = ?,
         stock_quantity = ?, low_stock_threshold = ?, user_id = ?
     WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
    [
      data.name,
      data.category,
      data.unit ?? "piece",
      data.measurement_value ?? null,
      data.unit_price,
      data.item_price ?? null,
      data.stock_quantity,
      data.low_stock_threshold,
      userId,
      id,
      userId,
    ]
  );
  scheduleCloudSync(db, userId);
}

export async function deleteProduct(db, userId, id) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM products
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [id, userId]
    );
    await recordCloudDeletion(db, userId, "products", id);
  });
  scheduleCloudSync(db, userId);
}
export async function adjustStock(db, id, delta) {
  const owner = await db.getFirstAsync(
    "SELECT user_id FROM products WHERE id = ?",
    [id]
  );
  await db.runAsync(
    `UPDATE products SET stock_quantity = MAX(stock_quantity + ?, 0) WHERE id = ?`,
    [delta, id]
  );
  scheduleCloudSync(db, owner?.user_id);
}

/* ------------------------------- Sales ------------------------------- */

export async function createSale(db, userId, { saleType, debtorId = null, items }) {
  if (!items?.length) {
    throw new Error("Cart is empty.");
  }

  // Use the same pricing logic as the Sell and Checkout screens.
  const normalizedItems = items.map((item) => {
    const pricing = getSalePricing(item.product, item.saleMode);
    return {
      product: item.product,
      saleMode: item.saleMode,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(pricing.unitPrice) || 0,
      stockItems: Number(pricing.stockItems) || 1, // stock units used per sold unit
    };
  });

  const total = normalizedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  let saleId;
  await db.withTransactionAsync(async () => {
    for (const item of normalizedItems) {
      const product = await getProduct(db, userId, Number(item.product.id));
      if (!product) {
        throw new Error(`${item.product.name} is no longer in inventory.`);
      }
      if (item.quantity <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }
      const needed = item.quantity * item.stockItems;
      if (product.stock_quantity < needed) {
        throw new Error(
          `${product.name} only has ${product.stock_quantity} left in stock.`
        );
      }
    }

    const sale = await db.runAsync(
      `INSERT INTO sales (user_id, debtor_id, sale_type, total_amount) VALUES (?, ?, ?, ?)`,
      [userId, saleType === "credit" ? debtorId : null, saleType, total]
    );
    saleId = sale.lastInsertRowId;

    for (const item of normalizedItems) {
      const product = item.product;
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, product.id, product.name, item.unitPrice, item.quantity]
      );
      await db.runAsync(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [item.quantity * item.stockItems, product.id]
      );
    }

    if (saleType === "credit") {
      if (!debtorId) {
        throw new Error("Select a debtor for an utang sale.");
      }
      const debtor = await db.getFirstAsync(
        `SELECT id FROM debtors
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        [debtorId, userId]
      );
      if (!debtor) {
        throw new Error("The selected debtor does not belong to this store.");
      }
      await db.runAsync(
        `INSERT INTO transactions (user_id, debtor_id, type, amount, description)
         VALUES (?, ?, 'credit', ?, ?)`,
        [userId, debtorId, total, `Credit sale #${saleId}`]
      );
    }
  });

  scheduleCloudSync(db, userId);
  return saleId;
}

export async function getDebtorOptions(db, userId) {
  return db.getAllAsync(
    `SELECT d.id, d.full_name, d.contact_number,
      COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t
       ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.user_id = ? AND d.deleted_at IS NULL
     GROUP BY d.id
     ORDER BY d.full_name ASC`,
    [userId]
  );
}

/* ------------------------------ Reports ------------------------------ */

export async function getDailySalesSummary(db, userId, days = 14) {
  return db.getAllAsync(
    `WITH dates AS (
        SELECT date(created_at, 'localtime') AS date
        FROM transactions
        WHERE user_id = ?
          AND date(created_at, 'localtime') >= date('now', 'localtime', ?)

        UNION

        SELECT date(created_at, 'localtime') AS date
        FROM sales
        WHERE user_id = ?
          AND date(created_at, 'localtime') >= date('now', 'localtime', ?)
      ),

      tx AS (
        SELECT
          date(created_at, 'localtime') AS date,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS credit_total,
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS payment_total,
          COUNT(*) AS transaction_count
        FROM transactions
        WHERE user_id = ?
          AND date(created_at, 'localtime') >= date('now', 'localtime', ?)
        GROUP BY date(created_at, 'localtime')
      ),

      sale_summary AS (
        SELECT
          date(s.created_at, 'localtime') AS date,
          COALESCE(
            SUM(CASE WHEN s.sale_type = 'cash' THEN s.total_amount ELSE 0 END),
            0
          ) AS cash_total,
          COALESCE(SUM(si.quantity), 0) AS item_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        WHERE s.user_id = ?
          AND date(s.created_at, 'localtime') >= date('now', 'localtime', ?)
        GROUP BY date(s.created_at, 'localtime')
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
    [
      userId, `-${days} days`,
      userId, `-${days} days`,
      userId, `-${days} days`,
      userId, `-${days} days`,
    ]
  );
}

export async function getTodaysSales(db, userId) {
  return db.getAllAsync(
    `SELECT s.id, s.sale_type, s.total_amount, s.created_at, d.full_name AS debtor_name
     FROM sales s
     LEFT JOIN debtors d ON d.id = s.debtor_id
     WHERE s.user_id = ? AND date(s.created_at, 'localtime') = date('now', 'localtime')
     ORDER BY s.created_at DESC, s.id DESC`,
    [userId]
  );
}

export async function getUnpaidBalances(db, userId) {
  return db.getAllAsync(
    `SELECT d.*, COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM debtors d
     LEFT JOIN transactions t
       ON t.debtor_id = d.id AND t.user_id = d.user_id
     WHERE d.user_id = ? AND d.deleted_at IS NULL
     GROUP BY d.id
     HAVING balance > 0
     ORDER BY balance DESC`,
    [userId]
  );
}

export async function getLowStockProducts(db, userId) {
  return db.getAllAsync(
    `SELECT *
     FROM products
     WHERE user_id = ?
       AND stock_quantity <= low_stock_threshold
     ORDER BY stock_quantity ASC`,
    [userId]
  );
}

export async function getTodayCreditItemCount(db, userId) {
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(si.quantity), 0) AS item_count
     FROM sales s
     JOIN sale_items si ON si.sale_id = s.id
     WHERE s.user_id = ?
       AND s.sale_type = 'credit'
       AND date(s.created_at, 'localtime') = date('now', 'localtime')`,
    [userId]
  );

  return row?.item_count ?? 0;
}

export async function getRecentTransactions(db, userId, limit = 20) {
  return db.getAllAsync(
    `SELECT t.*, d.full_name AS debtor_name
     FROM transactions t
     JOIN debtors d ON d.id = t.debtor_id
     WHERE t.user_id = ?
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export async function getTransactionHistory(db, userId, days = 7) {
  return db.getAllAsync(
    `SELECT
        'sale-' || s.id AS id,
        CASE WHEN s.sale_type = 'credit' THEN 'Utang' ELSE 'Cash Sale' END AS label,
        s.sale_type AS type,
        s.total_amount AS amount,
        datetime(s.created_at, 'localtime') AS date,
        CASE
          WHEN s.debtor_id IS NULL THEN NULL
          ELSE COALESCE(d.full_name, 'Deleted debtor')
        END AS debtor_name
      FROM sales s
      LEFT JOIN debtors d ON d.id = s.debtor_id
      WHERE s.user_id = ?
        AND date(s.created_at, 'localtime') >= date('now', 'localtime', ?)
      UNION ALL
      SELECT
        'payment-' || t.id AS id,
        'Payment' AS label,
        'payment' AS type,
        t.amount AS amount,
        datetime(t.created_at, 'localtime') AS date,
        COALESCE(d.full_name, 'Deleted debtor') AS debtor_name
      FROM transactions t
      LEFT JOIN debtors d ON d.id = t.debtor_id
      WHERE t.user_id = ? AND t.type = 'payment'
        AND date(t.created_at, 'localtime') >= date('now', 'localtime', ?)
      ORDER BY date DESC`,
    [userId, `-${days} days`, userId, `-${days} days`]
  );
}

export async function clearHistory(db, userId) {
  if (userId == null) {
    throw new Error("User is not logged in.");
  }

  const [sales, transactions] = await Promise.all([
    db.getAllAsync("SELECT id FROM sales WHERE user_id = ?", [userId]),
    db.getAllAsync("SELECT id FROM transactions WHERE user_id = ?", [userId]),
  ]);

  await db.withTransactionAsync(async () => {
    for (const sale of sales) {
      await recordCloudDeletion(db, userId, "sales", sale.id);
    }
    for (const transaction of transactions) {
      await recordCloudDeletion(db, userId, "transactions", transaction.id);
    }

    // Deleting sales also removes their sale_items via the existing cascade.
    await db.runAsync("DELETE FROM sales WHERE user_id = ?", [userId]);
    await db.runAsync("DELETE FROM transactions WHERE user_id = ?", [userId]);
  });

  scheduleCloudSync(db, userId);
}

export async function deleteHistoryEntry(db, userId, entryId) {
  if (userId == null) {
    throw new Error("User is not logged in.");
  }

  const [kind, rawId] = String(entryId).split("-", 2);
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid history entry.");
  }

  await db.withTransactionAsync(async () => {
    if (kind === "sale") {
      const sale = await db.getFirstAsync(
        "SELECT id, sale_type FROM sales WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      if (!sale) throw new Error("Sale record not found.");

      await recordCloudDeletion(db, userId, "sales", id);
      await db.runAsync("DELETE FROM sales WHERE id = ? AND user_id = ?", [id, userId]);

      // Credit sales create a matching debtor transaction. Remove it too so
      // report totals and debtor balances remain accurate.
      if (sale.sale_type === "credit") {
        const credits = await db.getAllAsync(
          `SELECT id FROM transactions
           WHERE user_id = ? AND type = 'credit' AND description = ?`,
          [userId, `Credit sale #${id}`]
        );
        for (const credit of credits) {
          await recordCloudDeletion(db, userId, "transactions", credit.id);
          await db.runAsync("DELETE FROM transactions WHERE id = ? AND user_id = ?", [credit.id, userId]);
        }
      }
      return;
    }

    if (kind === "payment") {
      const payment = await db.getFirstAsync(
        "SELECT id FROM transactions WHERE id = ? AND user_id = ? AND type = 'payment'",
        [id, userId]
      );
      if (!payment) throw new Error("Payment record not found.");

      await recordCloudDeletion(db, userId, "transactions", id);
      await db.runAsync("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, userId]);
      return;
    }

    throw new Error("Unsupported history entry.");
  });

  scheduleCloudSync(db, userId);
}

export async function exportAllData(db, userId) {
  const owned = userId == null ? "" : " WHERE user_id = ?";
  const ownedArgs = userId == null ? [] : [userId];
  const [debtors, products, sales, saleItems, transactions] = await Promise.all([
    db.getAllAsync(`SELECT * FROM debtors${owned} ORDER BY full_name ASC`, ownedArgs),
    db.getAllAsync(`SELECT * FROM products${owned} ORDER BY name ASC`, ownedArgs),
    db.getAllAsync(`SELECT * FROM sales${owned} ORDER BY created_at DESC`, ownedArgs),
    userId == null
      ? db.getAllAsync(`SELECT * FROM sale_items ORDER BY sale_id DESC`)
      : db.getAllAsync(
          `SELECT si.* FROM sale_items si
           INNER JOIN sales s ON s.id = si.sale_id
           WHERE s.user_id = ?
           ORDER BY si.sale_id DESC`,
          ownedArgs
        ),
    db.getAllAsync(`SELECT * FROM transactions${owned} ORDER BY created_at DESC`, ownedArgs),
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

export async function getFirebaseUidForUser(db, userId) {
  const user = await db.getFirstAsync(
    `SELECT firebase_uid FROM users WHERE id = ?`,
    [userId]
  );
  return user?.firebase_uid ?? null;
}

export async function setFirebaseUidForUser(db, userId, firebaseUid) {
  await db.runAsync(
    `UPDATE users SET firebase_uid = ? WHERE id = ?`,
    [firebaseUid, userId]
  );
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
  const normalizedPhone = String(phoneNumber).replace(/\D/g, "");
  let alternatePhone = normalizedPhone;
  if (normalizedPhone.startsWith("63")) {
    alternatePhone = `0${normalizedPhone.slice(2)}`;
  } else if (normalizedPhone.startsWith("0")) {
    alternatePhone = `63${normalizedPhone.slice(1)}`;
  }

  const hasEmailColumn = await userColumnExists(db, "email");
  if (hasEmailColumn) {
    return db.getFirstAsync(
      `SELECT * FROM users
       WHERE phone_number IN (?, ?) OR email IN (?, ?)`,
      [normalizedPhone, alternatePhone, normalizedPhone, alternatePhone]
    );
  }

  return db.getFirstAsync(
    `SELECT * FROM users WHERE phone_number IN (?, ?)`,
    [normalizedPhone, alternatePhone]
  );
}
