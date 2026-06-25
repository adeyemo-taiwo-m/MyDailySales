# MyDailySales — Architecture Document

**Version 1.0 · June 2026 · Internal Use Only**

> This document is the authoritative map of the entire system. Read this before writing any code. Every structural decision — route groups, data flow, auth model, realtime channels, background jobs — is defined here. The implementation guide contains the code. This document explains why.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Topology](#3-system-topology)
4. [Next.js App Router Structure](#4-nextjs-app-router-structure)
5. [Authentication Architecture](#5-authentication-architecture)
6. [Data Flow Maps](#6-data-flow-maps)
7. [Database Architecture](#7-database-architecture)
8. [Realtime Architecture](#8-realtime-architecture)
9. [Push Notification Architecture](#9-push-notification-architecture)
10. [Security Model](#10-security-model)
11. [State Management Strategy](#11-state-management-strategy)
12. [API Route Architecture](#12-api-route-architecture)
13. [CRON & Background Jobs](#13-cron--background-jobs)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Dependency Map](#15-dependency-map)
16. [Error Handling Architecture](#16-error-handling-architecture)
17. [Performance Architecture](#17-performance-architecture)

---

## 1. System Overview

MyDailySales is a multi-tenant SaaS PWA with two distinct user experiences running on the same codebase. The system has three layers:

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  Owner PWA (dashboard)    Staff PWA (log-sale screen)        │
│  Service Worker + Push    Same domain, different routes      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────┐
│                    VERCEL (Next.js 14)                        │
│  App Router · Middleware · API Routes · CRON Jobs            │
│  Server Components (RSC) + Client Components                 │
└────────┬──────────────────────────────────┬─────────────────┘
         │                                  │
┌────────▼────────┐              ┌──────────▼──────────┐
│    SUPABASE      │              │      PAYSTACK        │
│  PostgreSQL DB   │              │  Recurring billing   │
│  Auth (OTP SMS)  │              │  Webhook events      │
│  Realtime WS     │              └─────────────────────┘
│  Row Level Sec.  │
└────────┬────────┘
         │
┌────────▼────────────────────────────────────────────────────┐
│              BROWSER PUSH INFRASTRUCTURE                      │
│  Google FCM (Android)    Apple APNs (installed iOS PWA)      │
│  Delivery via VAPID-signed Web Push Protocol                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Constraints

- **No WhatsApp API anywhere.** Not in MVP, not planned. Replaced entirely by PWA push.
- **Supabase is the only database.** No Redis, no separate cache layer, no external queue.
- **Vercel is the only compute.** API routes, CRON, SSR all run on Vercel serverless functions.
- **Service Role Key never touches the client.** Only used in server-side API routes.
- **RLS is the enforcement layer.** Not the application layer. The app enforces UX; the DB enforces data security.
- **Multi-tenant by `business_id`.** Every table except `auth.users` has a `business_id` foreign key. All queries are scoped to it.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 14 (App Router) | SSR, routing, API routes, CRON |
| Language | TypeScript | 5.x | Type safety across entire codebase |
| Styling | Tailwind CSS | 3.x | Utility-first styling |
| Database | Supabase PostgreSQL | Latest | Primary data store |
| Auth | Supabase Auth | Latest | Phone OTP, session management |
| Realtime | Supabase Realtime | Latest | Websocket subscriptions on `sales` table |
| Push | web-push (npm) | Latest | VAPID-signed push notifications |
| Payments | Paystack | v1 | Recurring subscriptions, webhooks |
| Hosting | Vercel | Latest | Serverless deployment, CRON jobs |
| Charts | Recharts | Latest | Weekly revenue bar chart |
| Icons | Lucide React | Latest | All iconography |
| Toast | react-hot-toast | Latest | In-app notifications |
| State | Zustand | Latest | Client-side global state |
| Date | date-fns | Latest | Date formatting and manipulation |
| Utilities | clsx + tailwind-merge | Latest | Conditional classname composition |

### What is intentionally NOT in the stack

| Excluded | Reason |
|---|---|
| Redux | Zustand is sufficient for this scope |
| React Query / SWR | Supabase client handles subscriptions; RSC handles server fetching |
| Prisma | Supabase JS client is the ORM |
| NextAuth | Supabase Auth handles everything |
| Twilio SDK | Supabase Auth handles SMS OTP via Twilio internally |
| Socket.io | Supabase Realtime replaces this |
| Any WhatsApp SDK | Removed from architecture entirely |

---

## 3. System Topology

### Request Flow — Owner loads dashboard

```
1. Browser → GET /dashboard
2. Vercel Edge → middleware.ts runs
3. middleware.ts → Supabase Auth: getUser()
4. Supabase returns user session
5. middleware.ts checks staff_members.role → 'owner'
6. Request proceeds to /app/(owner)/dashboard/page.tsx
7. Server Component → Supabase (service client) → queries sales, products, debts
8. HTML streamed to browser
9. Client hydrates → RealtimeSalesFeed subscribes to Supabase Realtime channel
10. Websocket connection established to Supabase Realtime
11. Any new INSERT on sales table → arrives via WS → UI updates
```

### Request Flow — Staff logs a sale

```
1. Staff taps product card → /app/(staff)/log-sale/page.tsx (client component)
2. Staff selects quantity, confirms
3. Client → supabase.from('sales').insert(...)
4. RLS policy runs: business_id = get_my_business_id() ✓
5. Supabase inserts row, triggers Realtime event
6. Client → supabase.from('products').update({ stock_qty: ... })
7. Client → supabase.from('stock_movements').insert(...)
8. Toast shown to staff: "3 Ankara Print — ₦15,000"
9. Realtime event arrives on owner's open dashboard → feed updates
```

### Request Flow — Staff invite acceptance

```
1. Staff opens /invite/[token] (public route)
2. Page loads → supabase.from('pending_invites').select() by token
3. If expired → show error state
4. Staff enters name + sets PIN
5. Client → supabase.auth.signInWithOtp({ phone })
6. OTP arrives via Supabase → Twilio → staff's phone
7. Staff verifies OTP → supabase.auth.verifyOtp()
8. Client → POST /api/invite/accept (server route, uses service role)
9. Service role: inserts staff_members row, deletes pending_invites row
10. Client → router.push('/log-sale')
```

### Request Flow — 9pm CRON notification

```
1. Vercel CRON fires at 20:00 UTC
2. GET /api/cron/daily-summary with Authorization: Bearer [CRON_SECRET]
3. Server verifies header
4. Service client → queries push_subscriptions JOIN businesses
5. For each business:
   a. Query today's sales, staff breakdown, low stock
   b. Build notification payload
   c. web-push.sendNotification(subscription, payload)
   d. Browser push service (FCM/APNs) → owner's device
6. On 410/404 error → delete stale subscription from DB
7. Return { sent: N, skipped: M }
```

---

## 4. Next.js App Router Structure

### Route Group Strategy

The App Router uses route groups to enforce layout separation between owner and staff without URL segments. This is the core routing decision — understand it before building any page.

```
src/app/
├── layout.tsx                    ← Root layout: fonts, Toaster, metadata, viewport
├── page.tsx                      ← Root redirect: / → /dashboard or /log-sale based on role
│
├── (auth)/                       ← Route group: no shared layout, unauthenticated
│   ├── login/page.tsx            → /login
│   └── signup/page.tsx           → /signup
│
├── (owner)/                      ← Route group: owner layout (sidebar nav)
│   ├── layout.tsx                ← Sidebar + bottom nav + subscription check
│   ├── dashboard/page.tsx        → /dashboard
│   ├── inventory/page.tsx        → /inventory
│   ├── debts/page.tsx            → /debts
│   ├── staff/page.tsx            → /staff
│   └── reports/page.tsx          → /reports
│
├── (staff)/                      ← Route group: minimal layout, no nav
│   ├── layout.tsx                ← Bare wrapper, black background
│   └── log-sale/page.tsx         → /log-sale
│
├── invite/
│   └── [token]/page.tsx          → /invite/[token] — public, no auth required
│
├── onboarding/
│   └── page.tsx                  → /onboarding — authenticated but no business yet
│
└── api/
    ├── cron/
    │   └── daily-summary/route.ts
    ├── push/
    │   └── subscribe/route.ts
    ├── invite/
    │   ├── create/route.ts
    │   └── accept/route.ts
    └── paystack/
        └── webhook/route.ts
```

### Server vs. Client Component Decision Matrix

| Component Type | Rendering | When to Use |
|---|---|---|
| Page with initial data | Server Component | Dashboard, inventory, debts, reports |
| Page with no data | Server Component | Login, signup, onboarding |
| Component with Supabase Realtime | Client Component | RealtimeSalesFeed |
| Component with user interaction | Client Component | Sale logging, forms, modals |
| Component with `useState` / `useEffect` | Client Component | Any stateful UI |
| Static display only | Server Component | StaffBreakdown (initial render) |
| Push notification setup | Client Component | usePushNotifications hook |

### Middleware Routing Logic

```
middleware.ts runs on every request except:
  - _next/static/*
  - _next/image/*
  - favicon.ico, icon-*.png, manifest.json, sw.js

Decision tree:
  1. Get user session from Supabase Auth
  2. Is the path public? (/login, /signup, /invite/*)
     YES → allow through regardless of auth state
  3. Is user unauthenticated?
     YES → redirect to /login
  4. Is user on /login or /signup?
     YES → get role from staff_members
       role = 'staff'  → redirect to /log-sale
       role = 'owner'  → redirect to /dashboard
       no record       → allow through to /onboarding
  5. Is path an owner-only route? (/dashboard, /inventory, /debts, /staff, /reports)
     YES → get role from staff_members
       role = 'staff' → redirect to /log-sale
  6. Allow request through
```

---

## 5. Authentication Architecture

### Auth Provider

Supabase Auth handles all authentication. Phone OTP via Twilio is the only provider in MVP.

### Session Model

| Property | Value |
|---|---|
| Session storage | Supabase manages via cookies (SSR-compatible) |
| JWT expiry | 2,592,000 seconds (30 days) |
| Refresh | Automatic via `@supabase/ssr` |
| Cookie name | `sb-[project-ref]-auth-token` |

### Two Supabase Client Instances

This is critical. Getting this wrong causes auth bugs.

```
src/lib/supabase/client.ts   ← createBrowserClient()
  Used in:                     Client Components only ('use client')
  Auth state:                  Reads from browser cookies
  RLS:                         Runs as authenticated user

src/lib/supabase/server.ts   ← createServerClient()
  Used in:                     Server Components, API Routes, middleware
  Auth state:                  Reads from request cookies
  RLS:                         Runs as authenticated user

Service Role Client           ← createClient(url, SERVICE_ROLE_KEY)
  Used in:                     API routes that need to bypass RLS
  Never used in:               Client components, middleware
  Cases:                       invite/accept, invite/create, cron/daily-summary,
                               paystack/webhook, onboarding business creation
```

### Owner Auth Flow

```
/signup → signInWithOtp({ phone }) → OTP SMS → verifyOtp() → session created
→ check staff_members for this user_id → none found → /onboarding
→ onboarding creates businesses row + staff_members row (owner role)
→ /dashboard

/login  → signInWithOtp({ phone }) → OTP SMS → verifyOtp() → session exists
→ check staff_members.role → 'owner' → /dashboard
```

### Staff Auth Flow

```
/invite/[token] → load pending_invites by token
→ staff sets PIN (stored locally — PIN is UX only, not Supabase auth)
→ signInWithOtp({ phone: invite.staff_phone }) → OTP SMS
→ verifyOtp() → session created for staff's phone number
→ POST /api/invite/accept (service role) → insert staff_members row
→ delete pending_invites row
→ /log-sale

Returning staff:
/login → signInWithOtp({ phone }) → verifyOtp()
→ check staff_members.role → 'staff' → /log-sale
```

### PIN Architecture

The 4-digit PIN is a UX layer only, not a cryptographic auth mechanism.

- PIN is NOT stored in Supabase
- PIN is NOT used for session creation
- Supabase Auth (phone OTP) is the real authenticator
- PIN provides a fast re-entry UX for returning staff on shared devices
- If PIN is forgotten: staff logs in via OTP again

### Token Lifecycle

```
pending_invites.token:
  - Generated: gen_random_bytes(32) encoded as hex (64 chars)
  - Stored in: pending_invites table
  - Expires: 7 days after creation
  - Single use: deleted immediately after staff accepts
  - Public: anyone with the URL can view the invite page
  - Protected: accepting requires valid phone OTP for invite.staff_phone
```

---

## 6. Data Flow Maps

### Sale Logging — Complete Data Flow

```
User action: Staff taps "Confirm — ₦15,000"

1. [Client] confirmSale() called
   └── supabase.from('sales').insert({
         business_id,   ← from staff_members.business_id
         staff_id,      ← from staff_members.id
         product_id,    ← selected product
         qty_sold,      ← from qty state
         price_each,    ← from price state (editable)
         total,         ← qty * price
       })

2. [Supabase RLS] 'business members can log sales' policy
   └── WITH CHECK (business_id = get_my_business_id())
   └── PASSES → row inserted

3. [Client] supabase.from('products').update({ stock_qty: stock - qty })
   └── RLS: 'owner can manage products' — NOTE: staff cannot update products directly
   └── SOLUTION: stock decrement must be in an API route or done via DB trigger

   CORRECT APPROACH: Create a Postgres function:
   CREATE OR REPLACE FUNCTION decrement_stock(product_id uuid, qty int)
   RETURNS void AS $$
     UPDATE products SET stock_qty = stock_qty - qty
     WHERE id = product_id AND business_id = get_my_business_id();
   $$ LANGUAGE sql SECURITY DEFINER;

   Client calls: supabase.rpc('decrement_stock', { product_id, qty })

4. [Client] supabase.from('stock_movements').insert({...})
   └── RLS: 'business members can log stock movements' → PASSES

5. [Supabase Realtime] INSERT event broadcast on 'sales' channel
   └── Owner's open dashboard receives event via websocket

6. [Client — Owner Dashboard] RealtimeSalesFeed receives payload
   └── Fetches full sale with joins (products.name, staff_members.name)
   └── Prepends to feed state
   └── UI updates — new sale appears at top

7. [Client — Staff Screen] Local state updates
   └── todayTotal += sale.total
   └── product.stock_qty -= qty (local only)
   └── lastSale = { id, total }
   └── undoSeconds = 300
   └── Toast shown
```

### Undo Sale — Complete Data Flow

```
User action: Staff taps undo button (within 5 minutes)

1. [Client] undoSale() called
   └── supabase.from('sales').update({
         is_undone: true,
         undone_at: new Date().toISOString()
       }).eq('id', lastSale.id)

2. [Supabase RLS] 'members can undo sales' policy
   └── USING (business_id = get_my_business_id())
   └── PASSES

3. [Client] supabase.rpc('increment_stock', { product_id, qty })
   └── Restores stock via SECURITY DEFINER function

4. [Client] Local state updates
   └── todayTotal -= lastSale.total
   └── lastSale = null, undoSeconds = 0
   └── loadData() called to sync product stock from DB

NOTE: The 5-minute window is enforced in the UI only (countdown timer).
The DB allows undos at any time. If stricter enforcement is needed in V2,
add a DB trigger that rejects is_undone updates where
NOW() > logged_at + INTERVAL '5 minutes'.
```

### Push Subscription — Complete Data Flow

```
User action: Owner clicks "Enable Daily Summaries" in onboarding

1. [Client] navigator.serviceWorker.register('/sw.js')
2. [Client] navigator.serviceWorker.ready → registration
3. [Client] Notification.requestPermission() → 'granted'
4. [Client] registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
   })
5. Browser generates PushSubscription object:
   {
     endpoint: "https://fcm.googleapis.com/fcm/send/...",
     keys: { p256dh: "...", auth: "..." }
   }
6. [Client] supabase.from('push_subscriptions').upsert({
     business_id,
     subscription: subscription.toJSON(),
     updated_at: now()
   }, { onConflict: 'business_id' })
7. RLS: 'owner can manage push subscription' → PASSES
8. Row stored in push_subscriptions table

At 9pm:
9. [Vercel CRON] → GET /api/cron/daily-summary
10. [Server] Service client reads push_subscriptions
11. [Server] web-push.sendNotification(sub, payload)
    └── Signs request with VAPID private key
    └── Sends to FCM/APNs endpoint
12. [FCM/APNs] → owner's device → service worker wakes
13. [sw.js] push event → showNotification()
14. Owner taps → notificationclick event → opens /dashboard
```

---

## 7. Database Architecture

### Table Relationships

```
auth.users (Supabase managed)
    │
    ├── businesses (owner_id → auth.users.id)
    │       │
    │       ├── staff_members (business_id → businesses.id)
    │       │       │
    │       │       ├── sales (staff_id → staff_members.id)
    │       │       ├── debts (created_by → staff_members.id)
    │       │       ├── debt_payments (recorded_by → staff_members.id)
    │       │       └── stock_movements (logged_by → staff_members.id)
    │       │
    │       ├── products (business_id → businesses.id)
    │       │       │
    │       │       ├── sales (product_id → products.id)
    │       │       └── stock_movements (product_id → products.id)
    │       │
    │       ├── debts (business_id → businesses.id)
    │       │       └── debt_payments (debt_id → debts.id)
    │       │
    │       ├── push_subscriptions (business_id → businesses.id, UNIQUE)
    │       └── pending_invites (business_id → businesses.id)
```

### Multi-Tenancy Model

Every query is automatically scoped to the authenticated user's business via RLS helper functions:

```sql
get_my_business_id()  → returns business_id for auth.uid()
get_my_role()         → returns 'owner' | 'staff' for auth.uid()
get_my_staff_id()     → returns staff_members.id for auth.uid()
```

These functions are `SECURITY DEFINER STABLE` — they run with elevated privileges but are read-only. They cache per transaction for performance.

### Critical Indexes

```sql
-- Most frequently queried
idx_sales_business_logged   ON sales(business_id, logged_at DESC)
idx_sales_staff             ON sales(staff_id)
idx_products_business       ON products(business_id)
idx_debts_business          ON debts(business_id, status)
idx_staff_members_user      ON staff_members(user_id)
idx_staff_members_business  ON staff_members(business_id)
```

### Soft Deletes Strategy

| Table | Strategy | Column |
|---|---|---|
| products | Soft delete | `is_active = false` |
| staff_members | Soft deactivate | `is_active = false` |
| sales | Soft undo | `is_undone = true` |
| debts | Status transition | `status: unpaid → partial → paid` |
| pending_invites | Hard delete | Deleted after acceptance |

### Stock Consistency

Stock qty is stored denormalized on `products.stock_qty` for read performance. The `stock_movements` table is the audit log. In the event of a discrepancy, `stock_movements` is the source of truth and `products.stock_qty` can be recalculated:

```sql
SELECT product_id, SUM(qty_change) as calculated_stock
FROM stock_movements
GROUP BY product_id;
```

### Subscription Status Transitions

```
businesses.subscription_status:
  'trial'   → auto-set on creation, expires after 14 days
  'active'  → set by Paystack webhook on successful payment
  'expired' → set by Paystack webhook on subscription disable
              OR set by CRON if trial_ends_at < NOW() and status still 'trial'
```

---

## 8. Realtime Architecture

### Channel Strategy

One channel subscription exists in the app:

```typescript
// In RealtimeSalesFeed component (client component, owner dashboard only)
const channel = supabase
  .channel('realtime-sales')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sales',
    // No filter here — RLS handles business_id scoping
  }, handler)
  .subscribe()
```

### Why no filter on the channel

Supabase Realtime applies RLS on `postgres_changes` — the user only receives events for rows they have SELECT permission on. Since `owner can view all sales` is scoped to `business_id = get_my_business_id()`, events from other businesses never reach the client. No explicit filter is needed.

### Realtime Supabase Dashboard Setup

**Required:** In Supabase Dashboard → Database → Replication → enable `sales` table for realtime. Without this step the channel subscribes but no events arrive.

Only `sales` needs realtime enabled. Other tables (products, debts, etc.) use manual refresh or re-fetch after mutations.

### Reconnection Strategy

Supabase Realtime auto-reconnects on dropped connections. For cases where reconnection fails silently:

```typescript
// Add polling fallback in RealtimeSalesFeed
useEffect(() => {
  const pollInterval = setInterval(async () => {
    if (channel.state !== 'joined') {
      // Websocket not connected — poll for recent sales
      const { data } = await supabase
        .from('sales')
        .select('...')
        .gte('logged_at', today)
        .order('logged_at', { ascending: false })
        .limit(10)
      if (data) setSales(data)
    }
  }, 30000) // every 30 seconds

  return () => clearInterval(pollInterval)
}, [channel])
```

### Channel Cleanup

Always unsubscribe on component unmount:

```typescript
return () => { supabase.removeChannel(channel) }
```

---

## 9. Push Notification Architecture

### VAPID Key Management

```
Keys generated once with: npx web-push generate-vapid-keys
Stored in: .env.local (dev), Vercel env vars (prod)

NEXT_PUBLIC_VAPID_PUBLIC_KEY  → exposed to browser (safe, public by design)
VAPID_PRIVATE_KEY             → server only, never in client bundle
VAPID_EMAIL                   → contact email in VAPID header
```

### Service Worker Scope

`/sw.js` is served from `public/sw.js`. It has scope `/` — it controls all pages of the PWA.

Event handlers:
- `push` → receives notification payload, calls `showNotification()`
- `notificationclick` → opens `/dashboard` in existing or new window
- `install` → `skipWaiting()` for immediate activation
- `activate` → `clients.claim()` to take control immediately

### iOS Constraints

| Constraint | Handling |
|---|---|
| Push only works in standalone mode | Detect iOS + not installed → show install instructions in onboarding Step 4 |
| `navigator.standalone` is the detection | `window.matchMedia('(display-mode: standalone)').matches` |
| Permission prompt only works after install | Order: install → open from home screen → permission prompt |
| APNs requires Apple Developer account | Supabase + VAPID handles this automatically for web push |

### Notification Payload Structure

```typescript
{
  title: string,   // e.g. "FreshMart — Daily Summary"
  body: string,    // e.g. "₦184,000 from 23 sales. Aisha ₦112k · Tunde ₦72k. Tap to view."
  url: string,     // always "/dashboard"
}
```

Body construction rules:
- Revenue formatted as `₦Xk` (thousands) for brevity in notification body
- Staff listed as `Name ₦Xk` separated by ` · `
- If 0 sales: skip notification entirely for that business
- If low stock: append `· N low stock` to body
- `tag: 'daily-summary'` replaces previous notification if not yet tapped

### Stale Subscription Handling

```
If web-push throws statusCode 410 (Gone) or 404 (Not Found):
  → subscription is invalid (browser unsubscribed or cleared)
  → delete from push_subscriptions table
  → owner will need to re-enable notifications in Settings
```

---

## 10. Security Model

### Defense in Depth

```
Layer 1: Middleware (routing)
  → Unauthenticated users cannot reach protected routes
  → Staff cannot access owner routes

Layer 2: RLS (data)
  → Authenticated users cannot read/write other businesses' data
  → Staff cannot read owner-only data even if they construct queries directly

Layer 3: API Route authorization
  → Server routes verify user identity and role before performing service-role operations
  → Webhook routes verify signatures before processing

Layer 4: Client-side UX
  → Staff UI never shows owner-only features
  → Undo window enforced in UI (5 minutes)
```

### Service Role Key Rules

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Usage rules:

| Route | Reason |
|---|---|
| `/api/invite/create` | Must insert pending_invites without business_id check on new user |
| `/api/invite/accept` | Must insert staff_members for a user who has no business yet |
| `/api/cron/daily-summary` | Must read all businesses' push_subscriptions |
| `/api/paystack/webhook` | Must update businesses.subscription_status by email lookup |

**Never use service role in:**
- Client components
- Browser-side Supabase client
- Middleware
- Any route that doesn't explicitly need to bypass RLS

### Webhook Verification

Paystack webhooks are verified by HMAC-SHA512 signature:

```typescript
const hash = crypto
  .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
  .update(rawBody)
  .digest('hex')

if (hash !== request.headers.get('x-paystack-signature')) {
  return 401 // Reject
}
```

CRON endpoint verified by shared secret:

```typescript
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return 401
}
```

### Invite Token Security

- Token is 32 random bytes encoded as hex (64 chars) — 256 bits of entropy
- Link is public but accepting requires the correct phone OTP for `staff_phone`
- Token is single-use — deleted immediately on acceptance
- Token expires after 7 days
- An attacker with the link cannot accept unless they control the staff's phone number

---

## 11. State Management Strategy

### State Location Decision Tree

```
Is the state needed across multiple unrelated components?
  YES → Zustand store
  NO  → Continue

Is the state fetched from the server and displayed?
  YES → Server Component (no client state needed)
  NO  → Continue

Does the state change based on user interaction in this component?
  YES → useState / useReducer in the component
  NO  → prop drilling or context
```

### Zustand Store

Only one store exists: `saleStore.ts`

```typescript
// src/stores/saleStore.ts
interface SaleStore {
  // Selected product during sale flow
  selectedProduct: Product | null
  setSelectedProduct: (p: Product | null) => void

  // Quantity during sale flow
  qty: number
  setQty: (q: number) => void

  // Price override during sale flow
  price: number
  setPrice: (p: number) => void

  // Last sale for undo
  lastSale: { id: string; total: number } | null
  setLastSale: (s: { id: string; total: number } | null) => void

  // Undo countdown
  undoSeconds: number
  setUndoSeconds: (s: number) => void

  // Today's total for staff
  todayTotal: number
  addToTodayTotal: (amount: number) => void
  subtractFromTodayTotal: (amount: number) => void
}
```

### What Does NOT Go in Zustand

| Data | Why | Where instead |
|---|---|---|
| User identity | Supabase manages session | `supabase.auth.getUser()` |
| Business ID | Read from staff_members | `useBusinessId()` hook |
| Products list | Server-fetched, rarely changes | Server Component prop → local useState |
| Dashboard metrics | Server-rendered | RSC, re-fetch on navigation |
| Sales feed | Realtime subscription | Local useState in RealtimeSalesFeed |

### Custom Hooks

```
useBusinessId()        → fetches and caches business_id for current user
useRealtimeSales()     → manages Supabase Realtime channel subscription
usePushNotifications() → registers service worker, saves subscription to DB
```

---

## 12. API Route Architecture

### Route Inventory

| Route | Method | Auth | Uses Service Role | Purpose |
|---|---|---|---|---|
| `/api/invite/create` | POST | Required (owner) | Yes | Generate invite token |
| `/api/invite/accept` | POST | Required (any) | Yes | Accept invite, create staff record |
| `/api/push/subscribe` | POST | Required (owner) | No | Save push subscription |
| `/api/cron/daily-summary` | GET | CRON secret | Yes | Send nightly notifications |
| `/api/paystack/webhook` | POST | Paystack signature | Yes | Handle payment events |

### Route Response Contract

All API routes return JSON with this shape:

```typescript
// Success
{ data: T }

// Error
{ error: string }
```

HTTP status codes:
- `200` — success
- `400` — bad request (invalid input)
- `401` — unauthorized (no session or bad CRON secret)
- `403` — forbidden (wrong role)
- `500` — server error

### Route Protection Pattern

```typescript
// Standard protection pattern for all authenticated routes
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Role check if needed
  const { data: staff } = await supabase
    .from('staff_members')
    .select('role, business_id')
    .eq('user_id', user.id)
    .single()

  if (staff?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ... route logic
}
```

---

## 13. CRON & Background Jobs

### CRON Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 20 * * *"
    }
  ]
}
```

`0 20 * * *` = 20:00 UTC = 21:00 WAT (West Africa Time). Adjust to `0 19 * * *` for 20:00 WAT.

### CRON Execution Flow

```
For each business in push_subscriptions:
  1. Check subscription_status ≠ 'expired'
  2. Fetch today's sales (gte logged_at today, is_undone = false)
  3. If sales.length === 0 → skip (no notification for zero-sales days)
  4. Calculate: totalRevenue, staffBreakdown, lowStockCount
  5. Build notification body (see payload structure in Section 9)
  6. web-push.sendNotification()
  7. On error 410/404 → delete subscription
  8. On other error → log, continue to next business

Return: { sent: N, skipped: M }
```

### Trial Expiry CRON (Future)

Add a second CRON to expire trials:

```json
{
  "path": "/api/cron/expire-trials",
  "schedule": "0 0 * * *"
}
```

This route would:
```sql
UPDATE businesses
SET subscription_status = 'expired'
WHERE subscription_status = 'trial'
  AND trial_ends_at < NOW()
```

### Manual CRON Testing

Test the CRON locally or in production:

```bash
curl -X GET https://your-domain.com/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 14. Deployment Architecture

### Vercel Project Setup

```
Framework Preset:     Next.js
Build Command:        next build
Output Directory:     .next
Install Command:      npm install
Node.js Version:      20.x
```

### Environment Variables (Vercel)

Set all of these in Vercel Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL          → Production Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Supabase anon key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY         → Server only — never expose to client
NEXT_PUBLIC_VAPID_PUBLIC_KEY      → Safe to expose (public key by design)
VAPID_PRIVATE_KEY                 → Server only
VAPID_EMAIL                       → mailto:hello@mydailysales.com
CRON_SECRET                       → Random 32-char string
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY   → Safe to expose
PAYSTACK_SECRET_KEY               → Server only
NEXT_PUBLIC_PAYSTACK_BUSINESS_PLAN → Paystack plan code for ₦8,000/month plan
NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN  → Paystack plan code for ₦15,000/month plan
NEXT_PUBLIC_APP_URL               → https://mydailysales.com (production domain)
```

### Supabase Production Checklist

```
☐ Phone auth provider enabled
☐ Twilio credentials configured in Supabase Auth → Providers → Phone
☐ JWT expiry set to 2592000 (30 days)
☐ Realtime enabled for 'sales' table in Replication settings
☐ All 9 tables created with schema SQL
☐ All RLS policies applied
☐ All helper functions created (get_my_business_id, get_my_role, get_my_staff_id)
☐ All indexes created
☐ decrement_stock and increment_stock RPC functions created
```

### PWA Assets Required

```
public/
├── manifest.json     ← PWA manifest (theme color, icons, display mode)
├── sw.js             ← Service worker (push handling, notification clicks)
├── icon-192.png      ← 192×192 PWA icon
└── icon-512.png      ← 512×512 PWA icon (maskable)
```

Icons must be created before deployment. Use a green (#00C853) background with the "M" logomark.

### next.config.ts Required Headers

```typescript
// Required for service worker to have correct scope
async headers() {
  return [{
    source: '/sw.js',
    headers: [
      { key: 'Service-Worker-Allowed', value: '/' },
      { key: 'Cache-Control', value: 'no-cache' },
    ],
  }]
}
```

---

## 15. Dependency Map

### Production Dependencies

| Package | Version | Used For | Breaks If Removed |
|---|---|---|---|
| `@supabase/supabase-js` | Latest | All DB queries, auth, realtime | Everything |
| `@supabase/ssr` | Latest | Server-side auth, cookie handling | SSR auth, middleware |
| `web-push` | Latest | Sending push notifications | CRON notifications |
| `recharts` | Latest | Weekly revenue chart on Reports page | Reports page chart |
| `lucide-react` | Latest | All icons throughout the app | All iconography |
| `date-fns` | Latest | Formatting timestamps in realtime feed | Feed timestamps |
| `clsx` | Latest | Conditional classnames | cn() utility |
| `tailwind-merge` | Latest | Merging Tailwind classes without conflicts | cn() utility |
| `react-hot-toast` | Latest | Sale confirmation toasts, error toasts | All toast feedback |
| `zustand` | Latest | Sale flow global state | Sale store |

### Dev Dependencies

| Package | Used For |
|---|---|
| `@types/web-push` | TypeScript types for web-push |
| `typescript` | Type checking |
| `tailwindcss` | CSS framework |
| `@types/node` | Node.js types for API routes |

### External Scripts (loaded at runtime)

| Script | Source | Used For |
|---|---|---|
| Paystack Inline | `https://js.paystack.co/v1/inline.js` | Payment popup on billing page |
| Google Fonts | `https://fonts.googleapis.com` | Space Grotesk + Inter |

---

## 16. Error Handling Architecture

### Error Categories

| Category | Examples | Handling Strategy |
|---|---|---|
| Auth errors | Invalid OTP, session expired | Redirect to /login with toast |
| Network errors | Supabase unreachable, timeout | Show retry UI, log to console |
| RLS violations | Staff accessing owner data | Should never reach UI (middleware blocks it) |
| Validation errors | Empty required fields, invalid price | Inline field error, disable submit |
| Push errors | 410 stale subscription | Delete subscription, prompt re-enable |
| Payment errors | Failed webhook signature | Return 401, Paystack will retry |
| CRON errors | Push delivery failure | Log + continue, remove stale subscriptions |

### Error State Requirements

Every page must render three states:

```
1. Loading state
   → Skeleton cards matching exact layout of loaded content
   → Never a spinner as the primary loading indicator
   → Implemented with CSS animation on placeholder divs

2. Empty state
   → Icon (Lucide) + explanation + single CTA
   → e.g. "No sales today yet. Sales appear here the moment staff log them."

3. Error state
   → "Something went wrong." + Retry button
   → Retry button calls the same data-fetch function
   → Implemented as a reusable <ErrorState onRetry={fn} /> component
```

### Toast Message Standards

| Event | Toast Type | Message |
|---|---|---|
| Sale confirmed | Success | "{qty} {product} — {amount}" |
| Sale undone | Success | "Last sale undone" |
| OTP sent | Success | "Code sent!" |
| Invalid OTP | Error | "Invalid code. Try again." |
| Product added | Success | "{name} added" |
| Debt logged | Success | "Debt recorded" |
| Payment recorded | Success | "Payment recorded" |
| Invite link copied | Success | "Copied!" |
| Any network failure | Error | "Something went wrong. Try again." |
| Push permission denied | — | No toast — update UI to show "Notifications off" |

---

## 17. Performance Architecture

### Rendering Strategy per Page

| Page | Strategy | Reason |
|---|---|---|
| `/dashboard` | Server Component + `force-dynamic` | Fresh data on every load |
| `/inventory` | Server Component + `force-dynamic` | Stock counts must be current |
| `/debts` | Server Component + `force-dynamic` | Financial data must be current |
| `/reports` | Server Component + `force-dynamic` | Aggregate queries, no caching |
| `/staff` | Server Component + `force-dynamic` | Staff list changes |
| `/log-sale` | Client Component | Real-time interaction required |
| `/login` | Static | No data dependencies |
| `/onboarding` | Client Component | Multi-step form state |

### Lighthouse PWA Targets

| Metric | Target |
|---|---|
| Performance | > 80 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 80 |
| PWA | Pass all checks |

### Database Query Optimization

- Always filter by `business_id` first (uses index)
- Never `SELECT *` — always specify columns
- Use `.maybeSingle()` instead of `.single()` when row may not exist (avoids throw)
- Batch independent queries with `Promise.all()`
- Use `.limit()` on feed queries (default: 10 most recent sales)

### Bundle Size Rules

- No `import * as` from large libraries — use named imports
- Recharts: import only used components (`BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer`)
- Lucide: import only used icons by name
- `date-fns`: import only used functions by name

---

*MyDailySales Architecture Document v1.0 · June 2026 · Internal Use Only*
*This document must be updated whenever a structural decision changes during build.*
