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

The following structure reflects the current JavaScript implementation in this repository:

```text
app/
  _layout.js             Root layout: wraps the app in SQLiteProvider and AuthProvider
  index.js               Entry route: redirects to the dashboard
  login.js               User login screen
  signup.js              User registration screen
  profile.js             Store profile screen
  settings.js            Application settings screen
  home/
    index.js             Home route entry
    dashboard.js         Dashboard with store statistics and recent activity
  debtors/
    _layout.js            Debtor route layout
    index.js              Debtor list with balances and search
    new.js                Add debtor profile
    [id].js               Debtor detail, balance, and transaction history
    add-credit.js         Log a credit sale for a debtor
    add-payment.js        Record a debtor payment
    edit.js               Edit debtor profile
  inventory/
    _layout.js            Inventory route layout
    index.js              Product list with stock information
    new.js                Add a product
    [id].js               Edit product and adjust stock
  sell/
    _layout.js            Sales route layout
    index.js              Product selection and shopping cart
    checkout.js           Cash or credit sale checkout
  reports/
    index.js              Sales, payment, unpaid balance, and low-stock reports
  navigation/
    AppNavigator.js       Navigation entry component
context/
  AuthContext.js           Authentication state and user session management
constants/
  theme.js                Application colors and shared theme values
db/
  database.js             SQLite schema, migrations, and database queries
components/                Shared user-interface components
assets/                    Application images, icons, and splash assets
app.json                   Expo application configuration
package.json               Project dependencies and npm scripts
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
