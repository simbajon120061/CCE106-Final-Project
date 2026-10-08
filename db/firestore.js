import { getFirebaseAuth, getFirebaseDb } from "@/firebaseConfig";

function requireUser() {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Sign in to Firebase before syncing store data.");
  }
  return uid;
}

function throwIfCancelled(cancellation) {
  if (cancellation?.requested) {
    const error = new Error("Cloud backup was cancelled.");
    error.code = "cloud-sync/cancelled";
    throw error;
  }
}

export async function syncLocalDataToFirestore(
  db,
  localUserId,
  profile,
  cancellation
) {
  throwIfCancelled(cancellation);
  if (localUserId == null) {
    throw new Error("A local store account is required before cloud sync.");
  }

  const uid = requireUser();
  const firebaseDb = getFirebaseDb();
  const [debtors, products, sales, saleItems, transactions, deletions] = await Promise.all([
    db.getAllAsync("SELECT * FROM debtors WHERE user_id = ?", [localUserId]),
    db.getAllAsync("SELECT * FROM products WHERE user_id = ?", [localUserId]),
    db.getAllAsync("SELECT * FROM sales WHERE user_id = ?", [localUserId]),
    db.getAllAsync(
      `SELECT si.* FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.user_id = ?`,
      [localUserId]
    ),
    db.getAllAsync("SELECT * FROM transactions WHERE user_id = ?", [localUserId]),
    db.getAllAsync(
      `SELECT collection_name, record_id
       FROM cloud_sync_deletions WHERE user_id = ?`,
      [localUserId]
    ),
  ]);
  throwIfCancelled(cancellation);

  const itemsBySale = new Map();
  for (const item of saleItems) {
    const items = itemsBySale.get(String(item.sale_id)) ?? [];
    items.push({
      product_id: item.product_id == null ? null : String(item.product_id),
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
    });
    itemsBySale.set(String(item.sale_id), items);
  }

  const recordSets = [
    { name: "debtors", records: debtors },
    { name: "products", records: products },
    { name: "sales", records: sales },
    { name: "transactions", records: transactions },
  ];

  for (const { name, records } of recordSets) {
    const collection = firebaseDb.collection("users").doc(uid).collection(name);
    const currentRecordIds = new Set(records.map((record) => String(record.id)));
    let batch = firebaseDb.batch();
    let writes = 0;

    const addWrite = async (write) => {
      if (writes === 400) {
        throwIfCancelled(cancellation);
        await batch.commit();
        throwIfCancelled(cancellation);
        batch = firebaseDb.batch();
        writes = 0;
      }
      throwIfCancelled(cancellation);
      write(batch);
      writes += 1;
    };

    for (const record of records) {
      const data = { ...record };
      delete data.id;
      if (name === "sales") {
        data.debtor_id = data.debtor_id == null ? null : String(data.debtor_id);
        data.items = itemsBySale.get(String(record.id)) ?? [];
      } else if (name === "transactions") {
        data.debtor_id = String(data.debtor_id);
        data.product_id =
          data.product_id == null ? null : String(data.product_id);
      }

      for (const key of Object.keys(data)) {
        if (data[key] === undefined) {
          data[key] = null;
        }
      }

      await addWrite((currentBatch) => {
        currentBatch.set(collection.doc(String(record.id)), {
          ...data,
          user_id: uid,
        });
      });
    }

    for (const deletion of deletions) {
      if (
        deletion.collection_name === name &&
        !currentRecordIds.has(String(deletion.record_id))
      ) {
        await addWrite((currentBatch) =>
          currentBatch.delete(collection.doc(deletion.record_id))
        );
      }
    }

    if (writes > 0) {
      throwIfCancelled(cancellation);
      await batch.commit();
      throwIfCancelled(cancellation);
    }
  }

  throwIfCancelled(cancellation);
  const backedUpAt = new Date().toISOString();
  await firebaseDb.collection("users").doc(uid).set(
    {
      phone_number: profile?.phoneNumber ?? null,
      store_name: profile?.storeName ?? null,
      owner_name: profile?.ownerName ?? null,
      cloud_backup_at: backedUpAt,
    },
    { merge: true }
  );
  throwIfCancelled(cancellation);
  if (deletions.length > 0) {
    await db.runAsync(
      "DELETE FROM cloud_sync_deletions WHERE user_id = ?",
      [localUserId]
    );
  }

  return {
    backedUpAt,
    debtors: debtors.length,
    products: products.length,
    sales: sales.length,
    transactions: transactions.length,
  };
}
