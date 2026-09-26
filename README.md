# Track&Tally

A lightweight, cross-platform mobile app for sari-sari stores and other small
businesses to track customer credit ("utang"), payments, and inventory —
built with **React Native + Expo SDK 57** and **expo-router**.

## Features (mapped to the project's specific objectives)

| Objective | Where it lives |
|---|---|
| Debtor profile module | `app/debtors/new.tsx`, `app/debtors/[id].tsx` — name, contact, address, notes |
| Automated debt tracking with running balances & history | `db/database.ts` (`addCreditTransaction`, `getDebtor` balance query), `app/debtors/add-credit.tsx`, `app/debtors/[id].tsx` |
| Payment processing (partial & full) | `app/debtors/add-payment.tsx`, with "pay full balance" / "pay half" shortcuts |
| Inventory monitoring (stock, unit price, catalog) | `app/inventory/*` |
| Dynamic reporting (daily sales, unpaid balances, transaction history) | `app/reports/index.tsx`, `app/index.tsx` (dashboard) |

## Tech stack

- **Expo SDK 57** (React Native 0.86, React 19.2)
- **expo-router** for file-based navigation (stacks + modals)
- **expo-sqlite** for an on-device relational database — all data is local,
  offline-first, and survives app restarts
- **TypeScript** throughout
- No backend required — everything runs on the device

## Project structure

```
app/
  _layout.tsx          Root layout: wraps the app in <SQLiteProvider>
  index.tsx             Dashboard (stats + quick actions + recent activity)
  debtors/
    index.tsx            Debtor list with live balances + search
    new.tsx               Add debtor profile (modal)
    [id].tsx               Debtor detail: balance, profile, transaction history
    add-credit.tsx        Log a credit sale (modal, optional product link)
    add-payment.tsx       Record a partial/full payment (modal)
  inventory/
    index.tsx            Product grid with stock + low-stock badges
    new.tsx                Add product (modal)
    [id].tsx                Edit product / adjust stock (modal)
  reports/
    index.tsx            Daily sales, unpaid balances, low-stock tabs
db/
  database.ts           SQLite schema + all queries (single source of truth)
components/              Shared UI: Card, Button, StatBox, EmptyState
constants/theme.ts        Navy + gold color system matching the brand mark
lib/format.ts              Currency (₱) and date formatting helpers
types/index.ts             Shared TypeScript types
```

## How the data model works

- **debtors** — one row per customer.
- **products** — the store's catalog (name, unit price, stock, low-stock threshold).
- **transactions** — every credit sale (`type = 'credit'`) or payment
  (`type = 'payment'`) tied to a debtor. A debtor's balance is *never*
  stored directly — it's always computed as
  `SUM(credit) - SUM(payment)`, so it can never drift out of sync.
- Logging a credit sale linked to a product automatically decrements that
  product's `stock_quantity` inside the same SQLite transaction.

## Getting started

1. **Install prerequisites**
   - Node.js 22.13+ (required by Expo SDK 57)
   - The [Expo Go](https://expo.dev/go) app on your phone, *or* an
     Android/iOS simulator

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npx expo start
   ```
   Scan the QR code with Expo Go (Android) or the Camera app (iOS), or
   press `a` / `i` to launch a simulator.

4. **First run** — the SQLite database and tables are created automatically
   the first time the app launches (see `db/database.ts` →
   `migrateDbIfNeeded`). No manual setup needed.

## Suggested next steps

- Add authentication/PIN lock for the store owner (`expo-local-authentication`).
- Add CSV/PDF export for reports (`expo-print` / `expo-sharing`).
- Add barcode scanning for faster product lookup at checkout (`expo-camera`).
- Add push/local notifications for low-stock or overdue-balance alerts
  (`expo-notifications`).
- Replace the placeholder icon/splash images in `assets/` with the final
  Track&Tally logo assets at 1024×1024 (icon) and appropriate splash sizes.
