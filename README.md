# Track & Tally

## Firebase setup

The app is currently SQLite-first, so its existing local accounts, inventory,
and sales continue to work offline. Firebase is now prepared for adding cloud
authentication and Firestore sync without changing that behavior.

1. Create a Firebase project, add a **Web app**, and create a **Cloud Firestore** database.
2. Copy `.env.example` to `.env` and replace every value with the Web app configuration from **Firebase Console → Project settings → Your apps**.
3. In Firebase Console, enable the authentication provider you plan to use before adding sign-in code.
4. Restart Expo after editing `.env`.

Import shared Firebase services from `firebaseConfig.js`:

```js
import { getFirebaseAuth, getFirebaseDb } from "@/firebaseConfig";

const auth = getFirebaseAuth();
const firestore = getFirebaseDb();
```

Do not commit `.env`. Firebase web configuration identifies the project but is
not a server secret; Firestore Security Rules must still enforce access control.

Track & Tally is a mobile commerce and credit-tracking app built for sari-sari stores and small retail businesses. It helps owners manage customer debts, cash and credit sales, inventory, and daily store performance directly on-device using SQLite.

## Overview

This system is designed for local, offline-first store management. It allows users to:

- create and manage customer debt records
- log credit sales and payments
- track inventory levels and low-stock alerts
- sell products through a checkout flow
- view store summaries and reports
- authenticate with a local app login/signup flow

The application uses Expo and React Native with file-based routing via `expo-router`.

## System Structure

| Module | Purpose | Key files |
|---|---|---|
| Authentication | App login, signup, and session protection | `app/login.js`, `app/signup.js`, `context/AuthContext.js`, `app/_layout.js` |
| Dashboard | Main landing screen after login | `app/index.js`, `app/home/index.js`, `app/home/dashboard.js` |
| Debtors | Maintain debtor profiles and transactions | `app/debtors/index.js`, `app/debtors/new.js`, `app/debtors/[id].js`, `app/debtors/add-credit.js`, `app/debtors/add-payment.js`, `app/debtors/edit.js` |
| Inventory | Product catalog and stock management | `app/inventory/index.js`, `app/inventory/new.js`, `app/inventory/[id].js` |
| Sales | Product checkout and payment flow | `app/sell/index.js`, `app/sell/checkout.js`, `app/sell/_layout.js` |
| Reports | Daily sales and account summaries | `app/reports/index.js` |
| Profile & Settings | Store profile and preferences | `app/profile.js`, `app/settings.js` |
| Data layer | Local database schema and queries | `db/database.js` |
| Theme | Brand styling and color constants | `constants/theme.js` |
| Navigation | Route setup and navigation entry | `app/navigation/AppNavigator.js` |

## Core Features

### 1. User Authentication

- Users can sign up with a phone number and PIN.
- Unauthenticated users are redirected to the login screen.
- Auth state is managed through `AuthContext`.

### 2. Debtor Management

- Add debtors with names, contact numbers, addresses, notes, credit limits, and ID photos.
- Track balances based on credit and payment transactions.
- View debtor records, add payments, and log credit sales.

### 3. Inventory Monitoring

- Add and update products.
- Track stock quantities and low-stock thresholds.
- Adjust inventory after sales or manual changes.

### 4. Sales and Payment Flow

- Sell products through a checkout process.
- Support cash and credit sales.
- Automatically update inventory and debtor balances for credit sales.

### 5. Reporting

- Show daily sales summaries.
- Display recent transactions and unpaid balances.
- Flag low-stock inventory items.

## Tech Stack

- React Native
- Expo SDK 57
- `expo-router`
- `expo-sqlite`
- AsyncStorage
- JavaScript

## Project Structure

```text
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

## Database and Data Model

The app uses a local SQLite database named `store.db`, created and migrated by `db/database.js`.

Main tables include:

- `users` — app users and store profile data
- `debtors` — customer debtor records
- `products` — inventory products
- `transactions` — credit and payment history
- `sales` — completed cash and credit sales
- `sale_items` — products included in each sale

A debtor's balance is calculated from credit and payment transactions rather than stored as a separate value. This helps prevent balance data from becoming out of sync.

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo Go or an Android/iOS emulator or simulator

### Installation

```bash
npm install
```

### Start the app

```bash
npx expo start
```

You can then scan the QR code with Expo Go or launch the project in a simulator.

## App Flow

1. The user opens the app.
2. Unauthenticated users are redirected to `login`.
3. New users can register through `signup`.
4. Authenticated users are redirected to `home/dashboard`.
5. Users can manage debtors, inventory, sales, reports, settings, and their profile.
6. Sales and transactions are saved locally in SQLite.

## Notes

This project is intentionally offline-first and local-first. Core operations do not require a remote backend service.

---

Track & Tally is a practical business management app for local store operations, built to keep daily transactions, debt records, and inventory organized on a single mobile platform.
