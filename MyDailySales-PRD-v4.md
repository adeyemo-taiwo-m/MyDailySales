# MyDailySales — PRD v4.0
**Final Edition · June 2026**

> This is the definitive PRD. It supersedes all previous versions. Every decision in here reflects the full conversation: target customer, product shape, notification strategy, and monetization approach.

---

## The Final Decisions (Read This First)

These are the conclusions from the product conversation. They are not open for re-debate during build.

| Decision | What We Chose | Why |
|---|---|---|
| Target customer | Intermediate brands — boutiques, fashion, cosmetics, electronics with 2–3 staff | Higher willingness to pay, real staff accountability problem |
| Primary interface | PWA (Progressive Web App) | Owner/staff are app-comfortable. No friction like provision sellers |
| WhatsApp role | Removed entirely | Meta approval hell. Replaced with PWA push notifications |
| Notification delivery | Native PWA push notifications at 9pm nightly | Free, no third-party dependency, works on Android and installed iOS |
| Input method | Staff log sales in-app via form UI | Faster and more reliable than any WhatsApp command grammar |
| Pricing | ₦8,000/month (Business) · ₦15,000/month (Growth) | This customer already pays for tools. ₦8k is easy yes if product works |
| WhatsApp for invites | Keep for staff invite links only | One-time link delivery, not a conversation. Low risk |

---

## 01 — Product Overview

**Name:** MyDailySales

**What it is:** A PWA-based business dashboard for Nigerian small brands with staff. Owners get real-time oversight of sales, inventory, and debts from anywhere. Staff get a fast, dead-simple sale logging screen.

**What it is not:** A WhatsApp bot. A POS system. An accounting tool.

**Core promise:** *"Know exactly what your staff sold today — without being there."*

**Stack:**
- Frontend: Next.js 14 (App Router) · TypeScript · Tailwind CSS
- Auth & Database: Supabase (PostgreSQL + Auth + Realtime)
- Notifications: Web Push API (VAPID) via `web-push` npm package
- Payments: Paystack (recurring subscriptions)
- Hosting: Vercel (frontend + CRON jobs)

**No WhatsApp API. No Baileys. No Meta Cloud API. No external messaging dependency.**

---

## 02 — Problem Statement

### Who This Customer Is

A boutique owner in Lagos. Age 28–42. Has 2–3 staff working in the shop while she's not always there. Monthly revenue ₦500k–₦2M. Uses Instagram to sell, Opay to receive payments, WhatsApp to talk to customers. Has PiggyVest on her phone. Not afraid of paying for tools that work.

### What Keeps Her Up at Night

**"I don't know what my staff is actually selling."**

At month-end, the cash doesn't match what staff reported. She can't prove it. She can't trace it. She just knows something is off. This is the pain that makes her pay.

Beyond that:

- **No consolidated view.** Each staff has their own method. She spends 1–2 hours every weekend manually adding things up — and it's still wrong.
- **Inventory blindness.** Stock runs out mid-week. She finds out when a customer asks for something that's gone.
- **Credit chaos.** Loyal customers buy on credit. No one has a reliable record. Disputes happen. Money disappears quietly.
- **No profit clarity.** She knows roughly what came in. She doesn't know what she kept.

### Why Nothing Existing Solves This

| Tool | Why It Fails |
|---|---|
| Paper notebook | Not shareable, inconsistent, staff can alter it |
| Excel / Google Sheets | Nobody updates it in real time |
| Moniepoint / Nomba POS | Tracks payments only — no inventory, no debts, no staff breakdown |
| QuickBooks / Sage | Too complex, too expensive, requires accountant to set up |
| WhatsApp Business | Manual, no reports, no structure, no staff separation |

**The gap:** No simple, affordable tool exists for the Nigerian small brand owner who has staff and needs oversight without being physically present.

---

## 03 — Users & Roles

### The Owner

- Signs up, creates the business, invites staff
- Sees everything: all sales, all staff, all inventory, all debts
- Receives the 9pm push notification daily summary
- Manages billing and subscription
- Can log sales themselves too

### The Staff Member

- Invited by owner via a link (sent over WhatsApp manually or SMS)
- Sets up a name and 4-digit PIN on first visit
- Sees only their own today total
- Logs sales — that's their entire job in the app
- Can add incoming stock (restock)
- Can log a new debt at point of sale
- Cannot see revenue totals, other staff's sales, debt records, or reports

### Permission Table

| Action | Owner | Staff |
|---|---|---|
| Log a sale | ✅ | ✅ |
| View own today total | ✅ | ✅ |
| View all staff sales | ✅ | ❌ |
| View total revenue | ✅ | ❌ |
| Add products | ✅ | ❌ |
| Edit / delete products | ✅ | ❌ |
| Add incoming stock | ✅ | ✅ |
| View full inventory | ✅ | ✅ (read only) |
| Log a debt | ✅ | ✅ |
| View full debt ledger | ✅ | ❌ |
| Mark debt paid / partial | ✅ | ❌ |
| View reports & charts | ✅ | ❌ |
| Invite / remove staff | ✅ | ❌ |
| Manage billing | ✅ | ❌ |
| Receive push notification | ✅ | ❌ |

---

## 04 — Core Features

### 4.1 Staff Sale Logging

The most-used screen in the product. Must work in under 15 seconds from open to confirmed sale.

- Products shown as large tappable cards (not a dropdown list)
- Quantity adjusted with +/- buttons (not keyboard input)
- Price pre-filled from catalog, editable for discounts
- Confirm button is large, full-width, at the bottom (thumb zone)
- After confirm: toast shows "Sold 3 Ankara Print — ₦15,000"
- Staff's today total updates immediately at the top of screen
- Undo button appears for exactly 5 minutes after each sale

### 4.2 Owner Dashboard

Real-time view of the business. Loads with server-side data, then subscribes to live updates.

**Metric cards:**
- Today's Revenue (₦, green)
- Number of Sales Today
- Outstanding Debts (₦, yellow)
- Low Stock Items count

**Live Sales Feed:**
- Every new sale appears instantly (Supabase Realtime websocket)
- Shows: product name, quantity, staff name, time, amount
- Pulsing green dot shows "Live"

**Staff Breakdown:**
- Each staff member's total for today and this week
- Shown as a list, not a chart (simpler, faster to read)

**Low Stock Alert panel:** appears only when items are at or below threshold

### 4.3 Inventory Management

- Owner adds products: name, selling price, cost price (optional), opening stock, low-stock threshold
- Stock decrements automatically when a sale is logged
- Staff can log incoming stock (restocks): selects product, enters qty received — stock increases
- Owner can manually adjust stock count (for physical stocktake)
- Out-of-stock products: greyed out on staff sale screen, cannot be tapped

### 4.4 Customer Debt Ledger

- Owner or staff can log a debt: customer name, phone (optional), amount
- Debt appears immediately in owner's ledger
- Owner can record partial payments — each payment creates a history row
- When fully paid: status moves to `paid`, removed from active ledger
- Total outstanding always visible on dashboard and debts page
- Full payment history per customer

### 4.5 Daily Push Notification (9pm)

The feature that replaces WhatsApp summaries. No external API required.

At 9pm every night, a Vercel CRON job fires. For every active business with a stored push subscription:
1. Fetches today's sales, staff breakdown, low stock, new debts
2. Sends a push notification to the owner's device via Web Push API

Notification appearance on owner's phone:
```
Title: FreshMart — Daily Summary
Body:  ₦184,000 from 23 sales today. Aisha ₦112k · Tunde ₦72k. Tap to view.
```

Owner taps → PWA opens → full dashboard with complete breakdown.

**How the owner grants permission:** During onboarding Step 4, before the first notification can be sent, the app calls `Notification.requestPermission()`. If granted, the push subscription is saved to Supabase. If denied, onboarding continues — the owner can enable it later in Settings.

**iOS note:** On iPhone, push notifications only work if the PWA is installed to the home screen. Onboarding detects iOS and shows: "Add this app to your home screen to receive daily summaries. Tap Share → Add to Home Screen."

### 4.6 Staff Invite Flow

Owner enters staff name + phone number in the Staff page. App generates a unique token and creates a link: `https://mydailysales.com/invite/[token]`

Owner sends this link to their staff — over WhatsApp, SMS, however they prefer. The app doesn't send it automatically. This avoids any WhatsApp API dependency entirely.

Staff opens the link → sets name + 4-digit PIN → immediately redirected to log-sale screen.

### 4.7 Authentication

- **Owner:** Phone number → OTP SMS (Supabase handles SMS via Twilio) → logged in → session persists for 30 days
- **Staff:** Invite link → set PIN → logged in → session persists until they log out or owner deactivates them
- **Returning staff:** Enter phone + PIN → straight to log-sale. Never sees the dashboard.
- **Middleware:** Checks role on every protected route. Staff trying to access `/dashboard` gets redirected to `/log-sale`. Unauthenticated users redirected to `/login`.

---

## 05 — What Is Cut From MVP

| Feature | Reason | When |
|---|---|---|
| WhatsApp integration (any form) | Replaced by PWA push notifications | Possibly never |
| PDF reports | Not requested yet | V2 |
| Multi-branch | Single location in MVP | V2 |
| Expense tracking | Moves product toward accounting software | V2 |
| Barcode scanning | Hardware dependency | V2 |
| Offline-first (service worker caching) | Good internet assumed for target user | V2 |
| Free-text NLP anything | Never needed — PWA form UI is better | Never |
| Email auth | Phone-first market | V2 if needed |
| Analytics beyond weekly chart | Dashboard covers daily need | V2 |

---

## 06 — Database Schema

```sql
-- BUSINESSES
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  phone text UNIQUE NOT NULL,
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','expired')),
  trial_ends_at timestamptz DEFAULT now() + interval '14 days',
  created_at timestamptz DEFAULT now()
);

-- STAFF MEMBERS (owner is also a row here with role='owner')
CREATE TABLE staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

-- PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  selling_price numeric NOT NULL,
  cost_price numeric,
  stock_qty int DEFAULT 0,
  low_stock_threshold int DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- SALES
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  staff_id uuid REFERENCES staff_members NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  qty_sold int NOT NULL,
  price_each numeric NOT NULL,
  total numeric NOT NULL,
  cost_total numeric,
  is_undone boolean DEFAULT false,
  logged_at timestamptz DEFAULT now(),
  undone_at timestamptz
);

-- DEBTS
CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  amount_owed numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  created_by uuid REFERENCES staff_members NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- DEBT PAYMENTS
CREATE TABLE debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid REFERENCES debts NOT NULL,
  amount numeric NOT NULL,
  recorded_by uuid REFERENCES staff_members NOT NULL,
  paid_at timestamptz DEFAULT now()
);

-- STOCK MOVEMENTS (audit trail)
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  movement_type text CHECK (movement_type IN ('restock','sale','adjustment')),
  qty_change int NOT NULL,
  reference_id uuid,
  logged_by uuid REFERENCES staff_members NOT NULL,
  logged_at timestamptz DEFAULT now()
);

-- PUSH SUBSCRIPTIONS (one per business/owner device)
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- PENDING INVITES (for staff invite links)
CREATE TABLE pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  business_id uuid REFERENCES businesses NOT NULL,
  staff_name text NOT NULL,
  staff_phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);
```

---

## 07 — Notification Architecture

```
Vercel CRON (0 20 * * * UTC = 9pm WAT)
    ↓
GET /api/cron/daily-summary
    ↓
Fetch all businesses WHERE subscription_status = 'active'
    ↓
For each business:
  - Fetch today's sales (grouped by staff)
  - Fetch low stock products
  - Fetch new debts (today)
  - Fetch push_subscriptions for this business
    ↓
Build notification payload:
  { title, body, url: '/dashboard' }
    ↓
web-push.sendNotification(subscription, payload)
    ↓
Browser Push Service (Google FCM for Android, Apple APNs for iOS)
    ↓
Owner's phone shows notification
    ↓
Owner taps → service worker opens /dashboard
```

No WhatsApp. No third-party messaging service. Just the browser's native push infrastructure.

---

## 08 — Onboarding Flow

### Owner (5 steps, target < 5 minutes)

**Step 1 — Account**
Phone number → OTP → Business name → Creates `businesses` + `staff_members` (owner role) rows

**Step 2 — Products**
Add at least 1 product before proceeding. Simple form: name, selling price, stock qty. Cost price and threshold optional.

**Step 3 — Staff (skippable)**
Enter staff name + phone → app generates invite link → owner sees the link with a "Copy" button to send manually. No automatic sending.

**Step 4 — Notifications**
"Get your daily summary every night at 9pm." → Request push permission → Save subscription to Supabase. If iOS and not installed: show install prompt first.

**Step 5 — First Sale (test)**
Owner logs a test sale. Sees dashboard update. Onboarding complete.

### Staff (< 2 minutes)

1. Owner sends invite link (copy-paste over WhatsApp/SMS)
2. Staff opens link → sees business name
3. Enters their name + sets 4-digit PIN
4. Immediately on log-sale screen
5. Logs first sale within 60 seconds

---

## 09 — Build Roadmap

### Week 1 — Foundation
- Initialize Next.js 14 project (TypeScript, Tailwind, App Router)
- Create Supabase project, run full schema SQL
- Configure Supabase Auth (phone OTP)
- Set up middleware (auth guard + role-based routing)
- Deploy skeleton to Vercel, confirm env vars work

### Week 2 — Core Staff Flow
- Product catalog CRUD (owner side)
- Staff sale logging screen (product grid → qty/price → confirm)
- Undo sale (5-minute window with countdown)
- Inventory auto-decrement on confirmed sale
- Low stock detection at sale time

### Week 3 — Owner Dashboard
- Dashboard page with metric cards
- Realtime sales feed (Supabase Realtime channel)
- Staff breakdown panel
- Debt ledger (log, partial payment, mark paid)
- Basic weekly revenue chart (Recharts BarChart)

### Week 4 — Auth Polish + Notifications
- Staff invite flow (generate token → copy link → accept invite page)
- Staff PIN setup and PIN login
- Session persistence (30 days for both roles)
- VAPID key generation + service worker (`public/sw.js`)
- Push subscription save on owner permission grant
- 9pm CRON route + web-push sending
- iOS install prompt during onboarding

### Week 5 — Monetization + Beta
- Paystack subscription integration (14-day trial auto-start)
- Trial expiry gate (paywall on dashboard, staff logging unaffected)
- Inventory restock flow for staff
- 10 real businesses onboarded manually
- Bug fixes from live usage

### Week 6 — Polish + Launch Prep
- Error states on all pages (network error, empty state, loading)
- Performance audit (Lighthouse PWA score > 85)
- Settings page (business name, notification time, change PIN)
- Prepare public launch

---

## 10 — Monetization

### Plans

| Plan | Price | Limits | Notes |
|---|---|---|---|
| Trial | Free — 14 days | Full access | Auto-starts on signup, no card |
| Business | ₦8,000/month | Up to 3 staff | Main plan |
| Growth | ₦15,000/month | Up to 8 staff | PDF reports, priority support |

### Trial Expiry Behaviour

- Trial ends → owner sees paywall on dashboard
- Staff **can still log sales** (never block the shop from operating)
- Owner pays → dashboard unlocks immediately (Paystack webhook updates DB)
- Failed recurring payment → 3-day grace period → then suspension

### Why ₦8,000 Is the Right Number

This customer already pays:
- ₦5k–₦15k/month on Instagram ads
- ₦3k–₦5k/month on WhatsApp Business tools
- Thousands monthly in undetected staff underreporting

₦8,000 to know exactly what's sold, by who, every day, without being there — is an immediate yes for any owner who has experienced the pain.

---

## 11 — Revenue Projections

| Month | Paying | MRR | Notes |
|---|---|---|---|
| 2 | 10 | ₦80,000 | Founder-led, manual onboarding |
| 4 | 35 | ₦315,000 | Word of mouth + first Instagram content |
| 8 | 100 | ₦940,000 | Association deals + referral engine active |
| 12 | 250 | ₦2,350,000 | Self-sustaining with content + referrals |

---

## 12 — Go-to-Market

**Month 1:** Walk into 10 boutiques/fashion shops you know in Lagos. Set up their account while they watch. Follow up in 3 days. Fix everything.

**Month 2:** Instagram/TikTok content. Raw video of real owners using it. "This Lagos boutique owner sees exactly what her staff sold today — from her phone." No production needed.

**Month 3:** Association deals. Target Balogun Market fashion traders, Computer Village electronics dealers, Lekki fashion market. One association leader = 30–100 members. Give leader free lifetime access.

**Month 4+:** Referral engine. 1 free month per paying referral. Only launch after 20+ happy paying users — referrals only spread after trust is deep.

---

## 13 — Success Metrics

| Metric | Target | What It Signals |
|---|---|---|
| Staff logs sale daily | 80% of active staff | Product is in the daily workflow |
| Owner opens dashboard | 5x/week | Owner trusts and relies on it |
| Push notification tap rate | 60%+ | The nightly hook is working |
| Trial → paid conversion | 40%+ | Product delivers on its promise |
| Month 3 retention | 70%+ | Not a novelty, a habit |
| NPS | 50+ | Word of mouth will follow |

---

## 14 — Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Staff won't log consistently | Sub-15 second logging UX. Frame it as "your sales record — your accountability" |
| Owner ignores dashboard | Push notification is the real hook. Dashboard is what they open after tapping it |
| iOS users can't get notifications | Detect iOS in onboarding, show install prompt before asking for permission |
| Push subscription expires/invalid | Catch 410 errors in CRON, delete dead subscriptions, prompt owner to re-enable |
| Phone OTP delivery fails in Nigeria | Test with multiple networks (MTN, Airtel, Glo). Add email as fallback in V2 |
| Supabase Realtime drops | Add polling fallback (30-second interval) if websocket connection is lost |
| Price resistance | Start validation at ₦5,000 with first 10 beta users before enforcing ₦8,000 |
| Staff sharing PIN | Log all sessions. Owner can see active sessions and deactivate staff |

---

*MyDailySales PRD v4.0 · Final Edition · June 2026*
*Confidential — Internal Use Only*
