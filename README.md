# MyDailySales (MDS) — WhatsApp-First Merchant ERP

MyDailySales (MDS) is a lightweight, WhatsApp-first sales, inventory, and debt management system designed specifically for micro-merchants and small businesses. 

Instead of downloading complex applications or using slow, offline ledger books, merchants run their entire business operations directly through a WhatsApp chat interface. MDS automatically syncs all data to a Supabase database and serves a clean web-based dashboard for real-time analytics.

---

## 🌟 Key Features

- **WhatsApp-First UX**: Log sales, track stock levels, and record customer debts directly via natural text commands.
- **Robust Fuzzy Matching**: Forgives spelling mistakes when typing product or customer names (e.g., typing "gari" matches "garri").
- **Intelligent Debt Ledger**: Tracks outstanding customer balances, handles payouts, and prevents double-clearing of matching entries.
- **Real-Time Web Dashboard**: A minimalistic, high-performance dashboard showing today's summaries, out-of-stock items, and credit lists.
- **Self-Hosted Baileys Integration**: Uses the WhatsApp Web WebSocket protocol (`baileys`) to run the bot on any WhatsApp number without Meta API fees.

---

## 🏗️ Architecture

```
                      +-----------------------------+
                      |       WhatsApp Client       |
                      +--------------+--------------+
                                     |
                             WebSocket Connection
                                     |
                                     v
                      +--------------+--------------+
                      |         Baileys Bot         |
                      |          (Server)           |
                      +--------------+--------------+
                                     |
                               Route Message
                                     v
                      +--------------+--------------+
                      |        Message Router       |
                      +--------+-----------+--------+
                               |           |
                        Fuzzy Matching  Command Parser
                               |           |
                               +-----+-----+
                                     |
                               Database Sync
                                     v
                      +--------------+--------------+
                      |      Supabase Database      |
                      +--------------+--------------+
                                     ^
                                 JSON REST
                                     |
                      +--------------+--------------+
                      |      Next.js Dashboard      |
                      +-----------------------------+
```

- **Backend / Bot Runner**: Node.js custom HTTP server (`server.ts`) running the Baileys WebSocket client alongside the Next.js framework handler.
- **Database**: Supabase PostgreSQL with real-time sync, transaction logging, and row-level security.
- **Frontend Dashboard**: Next.js (React) static/dynamic dashboard page reading from custom API routes.

---

## 📖 Commands Guide

### Onboarding Flow (First-Time Users)
When a new number texts the bot, they are automatically placed in the onboarding flow:
1. **Welcome**: `👋 Welcome to MyDailySales!...`
2. **Business Name**: Send your business name (e.g., `FreshMart`).
3. **Add First Product**: Format: `add <name> <price> <qty>` (e.g., `add garri 500 20`).
4. **Complete Onboarding**: Type `done` once you've added at least one product.

### Business Management Commands
Once onboarding is complete, merchants can send the following commands at any time:

| Action | Command Format | Example |
| :--- | :--- | :--- |
| **Log a Sale** | `sell <product> <qty> <price>` | `sell garri 2 500` |
| **Record Debt** | `debt <customer_name> <amount>` | `debt Emeka 3000` |
| **Clear Debt** | `paid <customer_name> <amount>` | `paid Emeka 3000` |
| **Add Stock** | `stock add <product> <qty>` | `stock add garri 20` |
| **Check Stock** | `stock check` / `stock check <product>` | `stock check garri` |
| **Today's Summary** | `summary` / `report` | `summary` |
| **Full Debt List** | `debts` / `owing` | `debts` |
| **Recent History** | `history` / `log` | `history` |
| **Undo Last Sale** | `undo` | `undo` |
| **Help Menu** | `help` / `commands` | `help` |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- Supabase account (with PostgreSQL setup)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/adeyemo-taiwo-m/MyDailySales.git
cd MyDailySales
npm install
```

### 3. Setup Database Schema
Execute the SQL script located in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor. This will provision the tables:
- `merchants`
- `products`
- `sales_log`
- `credit_book`

### 4. Running the Development Server
Start both the WhatsApp bot connection and Next.js:
```bash
npm run dev
```

Upon launching, a **QR Code** will render in the terminal. Open WhatsApp on your phone -> three dots/Settings -> **Linked Devices** -> **Link a Device** and scan the QR code to authenticate the bot.

Your dashboard will be available at:
`http://localhost:3000/dashboard`

---

## 🛡️ Security Note

The `auth_info_baileys/` directory stores your WhatsApp session credentials.
> [!CAUTION]
> **Never commit the `auth_info_baileys/` folder to Git.** If exposed, anyone can hijack your WhatsApp bot number. It is included in `.gitignore` by default.

---

## 📄 License
This project is licensed under the MIT License.
