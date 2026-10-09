# Track & Tally

Track & Tally is a store-management app for sari-sari stores and small retailers. It manages debtor accounts, inventory, sales, and reports in a local SQLite database. Its normal sign-in remains the local phone-number and PIN login. Firebase Email/Password and Cloud Firestore provide an optional cloud backup and restore.

## Firebase setup

1. In Firebase Console → **Authentication → Sign-in method**, enable **Email/Password**.
2. In Firebase Console → **Firestore Database**, create a database if one does not already exist. Choose the location required for your data; the database location cannot be changed after creation.
3. Deploy the owner-only rules from [`firestore.rules`](./firestore.rules) from an authenticated Firebase CLI session:

   ```bash
   npx firebase-tools deploy --only firestore:rules --project tracktally-f7dd3
   ```

4. Install packages and start the app:

   ```bash
   npm install
   npx expo start
   ```

   The Firebase JavaScript SDK is used, so a custom native Firebase build is not required. The Android native configuration is ignored by Git and referenced by the app config.

To opt into cloud sync, open **Settings → Optional Cloud Backup**, then create or sign in to a Firebase Email/Password account. Choose an automatic full-backup interval of 8 hours, 12 hours, or a custom interval of at least 1 hour, then save the frequency to apply it. A linked profile can be switched to another Firebase account; switching does not delete the previous account's cloud backup. Scheduled backups run while the app is active; if it is closed or offline at the scheduled time, the backup is attempted when the app is reopened with a connection. Once linked, all screens continue to read from SQLite and local changes to debtors, products, sales, transactions, stock, and store profile are also mirrored to that Firebase account. Failed or offline syncs keep the local change and are shown in Settings, where you can retry; pending changes are retried when the app returns to the foreground. To move data to another device, sign in to a local store account there, open **Settings → Optional Cloud Backup → Restore from Cloud Backup**, and sign in to the Firebase account that owns the backup. Review the backup summary and confirm to replace that local store's records. Restore imports the backup's debtors, products, sales, and transactions; profile and ID photos stored only on the original device are not transferred. The local PIN login does not use or depend on Firebase authentication.

## Data layout

Each account is stored under its Firebase Authentication UID:

```text
users/{uid}
  debtors/{debtorId}
  products/{productId}
  transactions/{transactionId}
  sales/{saleId}   # sale items are embedded in the sale document
```

The app calculates balances and report summaries from local SQLite transactions and sales. Firestore rules enforce ownership of the optional cloud backup; the client-side UID check is an additional guard, not a replacement for those rules. Restoring requires read access to the signed-in user's Firestore document and its backup subcollections.

## Development

```bash
npm install
npx expo start --dev-client
```

Core functionality includes debtor management, credit/payment tracking, stock updates, cash and credit sales, reporting, profile editing, and data export.
