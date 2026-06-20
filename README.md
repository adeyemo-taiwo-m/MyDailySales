# MyDailySales (MDS) — WhatsApp-First Merchant ERP

MyDailySales (MDS) is a lightweight, WhatsApp-first sales, inventory, and debt management system designed specifically for micro-merchants and small businesses. 

Instead of downloading complex applications or using slow, offline ledger books, merchants run their entire business operations directly through a WhatsApp chat interface. MDS automatically syncs all data to a Supabase database and serves a clean web-based dashboard for real-time analytics.

---

## 🌟 Key Features

- **WhatsApp-First UX**: Log sales, track stock levels, and record customer debts directly via natural text commands.
- **Robust Fuzzy Matching**: Forgives spelling mistakes when typing product or customer names (e.g., typing "gari" matches "garri").
- **Intelligent Debt Ledger**: Tracks outstanding customer balances, handles payouts, and prevents double-clearing of matching entries.
- **Real-Time Web Dashboard**: A minimalistic, high-performance dashboard showing today's summaries, out-of-stock items, and credit lists.
- **Official Meta Cloud API**: Integrates directly with Meta's official WhatsApp Business Platform Graph API via secure serverless webhooks, eliminating local credential files and WebSocket connection bottlenecks.

---

## 🏗️ Architecture

```
                      +-----------------------------+
                      |       WhatsApp User         |
                      +--------------+--------------+
                                     |
                                  Message
                                     |
                                     v
                      +--------------+--------------+
                      |    Meta Cloud API Servers   |
                      +--------------+--------------+
                                     |
                                Webhook POST
                                     |
                                     v
                      +--------------+--------------+
                      |    Next.js Webhook Route    |
                      |       (/api/whatsapp)       |
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

- **Backend / Webhook Route**: Serverless Next.js API route (`/api/whatsapp`) triggered dynamically by Meta incoming message webhooks.
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

# Meta / WhatsApp Cloud API Configuration
META_WHATSAPP_TOKEN=your-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
META_APP_SECRET=your-app-secret
META_WEBHOOK_VERIFY_TOKEN=any-made-up-verification-token-string

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- Supabase account (with PostgreSQL setup)
- A Meta Developer Account (with WhatsApp product added to your App)

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

### 4. Running Locally
1. Start the Next.js development server:
   ```bash
   npm run dev
   ```
2. Start an HTTPS tunnel to expose your local port:
   ```bash
   ngrok http 3000
   ```
3. Copy the ngrok HTTPS URL (e.g. `https://xxxx.ngrok-free.app/api/whatsapp`) and paste it as the **Callback URL** in the Meta App Developer Portal under **WhatsApp > Configuration**. Specify the matching `META_WEBHOOK_VERIFY_TOKEN` and subscribe to `messages`.

Your dashboard will be available at:
`http://localhost:3000/dashboard`

---

## ☁️ Deployment (Vercel)

Unlike Baileys, this architecture is fully serverless and can be deployed directly to **Vercel**:
1. Run `vercel deploy` or connect your Github repository.
2. Add your environment variables in the Vercel dashboard settings.
3. Configure the webhook Callback URL in the Meta Developer portal to point to `https://your-domain.vercel.app/api/whatsapp`.

---

## 🛡️ Security Note

Keep your `.env.local` secure and never share the `META_APP_SECRET` or `META_WHATSAPP_TOKEN`. The `.env.local` file is excluded from Git by default.

---

## 📄 License
This project is licensed under the MIT License.
