# Track & Tally

Track & Tally is a mobile commerce and credit-tracking app built for sari-sari stores and small retail businesses. It helps owners manage customer debts, cash and credit sales, inventory, and daily store performance directly on-device using SQLite.

## Overview

This system is designed for local, offline-first store management. It allows users to:

- create and manage customer debt records
- log credit sales and payments
- track inventory levels and low-stock alerts
- sell products through a checkout flow
- view store summaries and reports
- authenticate with a local app login/signup flow

The application uses Expo + React Native with file-based routing via expo-router.

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
- Add debtors with names, contact numbers, addresses, and notes.
- Track balances based on credit and payment transactions.
- View specific debtor records, add payments, and log credit sales.

### 3. Inventory Monitoring
- Add and update products.
- Track stock quantity and low-stock thresholds.
- Adjust inventory after sales or manual changes.

### 4. Sales and Payment Flow
- Sell products through a checkout process.
- Support cash and credit sales.
- Automatically update inventory and debtor balances.

### 5. Reporting
- Show daily sales summaries.
- Display recent transactions and unpaid balances.
- Flag low-stock inventory items.

## Tech Stack

- React Native
- Expo
- expo-router
- expo-sqlite
- AsyncStorage
- JavaScript

## Project Structure

```text
CCE106-Final-Project/
├── app/
│   ├── _layout.js
│   ├── index.js
│   ├── login.js
│   ├── signup.js
│   ├── profile.js
│   ├── settings.js
│   ├── home/
│   │   ├── index.js
│   │   └── dashboard.js
│   ├── debtors/
│   │   ├── _layout.js
│   │   ├── index.js
│   │   ├── new.js
│   │   ├── [id].js
│   │   ├── add-credit.js
│   │   ├── add-payment.js
│   │   └── edit.js
│   ├── inventory/
│   │   ├── _layout.js
│   │   ├── index.js
│   │   ├── new.js
│   │   └── [id].js
│   ├── reports/
│   │   └── index.js
│   ├── sell/
│   │   ├── _layout.js
│   │   ├── index.js
│   │   └── checkout.js
│   └── navigation/
│       └── AppNavigator.js
├── context/
│   └── AuthContext.js
├── constants/
│   └── theme.js
├── db/
│   └── database.js
├── assets/
├── app.json
├── babel.config.js
├── eslint.config.js
├── expo-env.d.js
├── jsconfig.json
├── metro.config.js
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```

## Database and Data Model

The app uses a local SQLite database created and migrated by `db/database.js`.

Main tables include:

- `users` — app users and store profile data
- `debtors` — customer debtor records
- `products` — inventory products
- `transactions` — debt credit/payment history
- `sales` and `sale_items` — completed sales records

The balance for each debtor is computed from the transaction history rather than stored as a redundant value, helping prevent data drift.

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo Go or an emulator/simulator

### Installation

```bash
npm install
```

### Start the app

```bash
npx expo start
```

Then run the app in Expo Go or a simulator.

## App Flow

1. User opens the app.
2. If not authenticated, they are redirected to `login`.
3. After login, the app redirects to the dashboard.
4. From the dashboard, users can navigate to debtors, inventory, sales, reports, settings, or profile.
5. Sales and transactions are saved locally in SQLite.

## Notes

This project is intentionally offline-first and local-first. It does not rely on a remote backend service for core operations.

---

Track & Tally is a practical business management app for local store operations, built to keep daily transactions, debt records, and inventory organized on a single mobile platform.
