# MyDailySales (MDS) — Web-First Merchant ERP & Ledger App

MyDailySales (MDS) is a lightweight, mobile-first sales, inventory, and debt management system designed specifically for micro-merchants and small retail businesses. It allows owners to track daily operations, invite staff members to log transactions, manage customer debts, analyze sales reports, and monetize the platform using a Paystack subscription plan.

---

## 🌟 Key Features

* **Staff Log-Sale App (`/log-sale`)**: A mobile-optimized product grid allowing staff to log sales. Features a 5-minute undo countdown and instant daily total updates.
* **Owner Dashboard (`/dashboard`)**: Displays real-time metrics (Revenue Today, Debts Outstanding, Low Stock Alert, Sales Count) and aggregates live sales feeds with a staff performance breakdown.
* **Inventory Control (`/inventory`)**: Displays alphabetical product catalogs with color-coded stock levels (Red for out of stock, Yellow for below threshold, White for healthy) and a slide-in product drawer.
* **Intelligent Debt Ledger (`/debts`)**: Tracks outstanding customer credit with inline payment panels to record partial or full debt settlement history.
* **Staff Management (`/staff`)**: Allows owners to invite staff via secure, PIN-accepting links and toggle staff status (Active/Inactive) safely.
* **Business Analytics (`/reports`)**: Shows dynamic weekly revenue bar charts (using Recharts) and a week-over-week staff comparison table with positive/negative trend percentages.
* **Monetization & Gateways**: A 14-day trial auto-starts upon onboarding. Expired trials are gated by a paywall layout redirecting owners to a Paystack subscription choosing page.
* **Realtime Skeletons & Slices**: Built-in loading skeletons, empty-state UI vectors, and error retry blocks ("Something went wrong. Tap to retry.") for robust offline/online feedback.

---

## 🏗️ Architecture

```
                                  +------------------------------+
                                  |    Owner / Staff Browser     |
                                  +--------------+---------------+
                                                 |
                                         HTTPS Requests
                                                 |
                                                 v
                                  +--------------+---------------+
                                  |     Next.js Web Server       |
                                  |     (App Router Pages &      |
                                  |     API verification routes) |
                                  +--------------+---------------+
                                                 |
                                       Supabase / Webhooks
                                                 v
                                  +--------------+---------------+
                                  |      Supabase Database       |
                                  |       (9 Schema Tables       |
                                  |      & RLS Security)         |
                                  +------------------------------+
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:support@yourdomain.com

# Cron Security
CRON_SECRET=your-cron-secret-token

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYSTACK_BUSINESS_PLAN=PLN_...
NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN=PLN_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/adeyemo-taiwo-m/MyDailySales.git
cd MyDailySales
npm install
```

### 2. Setup Database Schema
Execute the SQL script located in `supabase/migrations/002_new_schema.sql` in your Supabase SQL Editor. This will provision the required PostgreSQL tables:
* `businesses`
* `staff_members`
* `products`
* `sales`
* `debts`
* `debt_payments`
* `stock_movements`
* `push_subscriptions`
* `pending_invites`

### 3. Running Locally
Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the onboarding page or login to your dashboard.

### 4. Production Build Verification
To build the application for deployment:
```bash
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.
