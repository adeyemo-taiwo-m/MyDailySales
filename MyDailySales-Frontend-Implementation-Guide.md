bash

cat > /mnt/user-data/outputs/MyDailySales-Implementation-Guide.md << 'IMPLEOF'

# MyDailySales — Agent Implementation Guide

**Complete Step-by-Step Build Reference · June 2026**

> READ THIS FIRST: This guide is written for an AI coding agent. Every step must be completed in order. Do not skip steps. Do not start a phase until the previous phase's checkpoint passes. Every phase ends with an explicit checkpoint — verify it before moving on.

---

## Core Decisions Locked In

Before writing a single line of code, know these:

- **No WhatsApp API.** No Meta Cloud API. No Baileys. Removed entirely.
- **Notifications = PWA Push.** Native browser push via `web-push` npm package + VAPID keys.
- **Two user experiences.** Owner gets a dashboard. Staff gets a sale logging screen. Nothing overlaps.
- **Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Paystack · Vercel
- **Database:** Supabase PostgreSQL with Row Level Security on every table.
- **Styling:** Dark theme. Near-black background. Accent green (#00C853) for all money amounts.

---

## Design System — Implement Before Any Component

These tokens are the foundation. Every component uses them. Define them first, reference them always.

### globals.css

```css
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Backgrounds */
  --bg: #0a0f0a;
  --surface: #111711;
  --surface-2: #1a221a;
  --border: #2a362a;

  /* Brand */
  --accent: #00c853;
  --accent-dim: #00843a;
  --accent-glow: rgba(0, 200, 83, 0.12);

  /* Status */
  --warn: #ffb300;
  --danger: #ff3d3d;

  /* Text */
  --text-1: #f0f4f0;
  --text-2: #8a9e8a;
  --text-3: #4a5e4a;

  /* Fonts */
  --font-display: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
}

body {
  background-color: var(--bg);
  color: var(--text-1);
  font-family: var(--font-body);
}

/* All money amounts: green + tabular numbers */
.money {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-display);
}

/* Headings use display font */
h1,
h2,
h3 {
  font-family: var(--font-display);
}
```

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0F0A",
        surface: "#111711",
        surface2: "#1A221A",
        border: "#2A362A",
        accent: "#00C853",
        "accent-dim": "#00843A",
        warn: "#FFB300",
        danger: "#FF3D3D",
        text1: "#F0F4F0",
        text2: "#8A9E8A",
        text3: "#4A5E4A",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
```

### Design Rules for Agent

1. **Background is always `#0A0F0A`.** Cards use `#111711`. Modals/elevated use `#1A221A`.
2. **Every naira amount is green (`#00C853`) with `font-variant-numeric: tabular-nums`.**
3. **Borders are `#2A362A`.** Use sparingly — depth comes from background color, not borders.
4. **Buttons: accent green with black text.** Secondary: `#1A221A` surface with `#8A9E8A` text.
5. **Full-width buttons on mobile.** Staff uses small Android screens.
6. **Rounded corners everywhere.** `rounded-2xl` (20px) for cards and buttons. `rounded-xl` (16px) for inputs.
7. **No white backgrounds anywhere.** Ever.

---

## Phase 0 — Project Initialization

### Step 0.1 — Create Next.js Project

```bash
npx create-next-app@latest mydailysales \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint

cd mydailysales
```

### Step 0.2 — Install All Dependencies

```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  web-push \
  recharts \
  lucide-react \
  date-fns \
  clsx \
  tailwind-merge \
  react-hot-toast \
  zustand

npm install -D @types/web-push
```

### Step 0.3 — Folder Structure

Create this exact structure. Do not deviate.

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (owner)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx
│   │   ├── debts/
│   │   │   └── page.tsx
│   │   ├── staff/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   ├── (staff)/
│   │   ├── layout.tsx
│   │   └── log-sale/
│   │       └── page.tsx
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx
│   ├── onboarding/
│   │   └── page.tsx
│   ├── api/
│   │   ├── cron/
│   │   │   └── daily-summary/
│   │   │       └── route.ts
│   │   ├── push/
│   │   │   └── subscribe/
│   │   │       └── route.ts
│   │   ├── invite/
│   │   │   └── create/
│   │   │       └── route.ts
│   │   └── paystack/
│   │       └── webhook/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Toast.tsx
│   │   └── Badge.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── RealtimeSalesFeed.tsx
│   │   ├── StaffBreakdown.tsx
│   │   ├── LowStockPanel.tsx
│   │   └── WeeklyChart.tsx
│   ├── sales/
│   │   ├── ProductGrid.tsx
│   │   └── SaleConfirmSheet.tsx
│   ├── inventory/
│   │   ├── ProductList.tsx
│   │   └── AddProductForm.tsx
│   ├── debts/
│   │   ├── DebtList.tsx
│   │   └── AddDebtForm.tsx
│   └── staff/
│       ├── StaffList.tsx
│       └── InviteForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── push.ts
│   └── utils.ts
├── hooks/
│   ├── useRealtimeSales.ts
│   ├── usePushNotifications.ts
│   └── useBusinessId.ts
├── stores/
│   └── saleStore.ts
├── types/
│   └── index.ts
└── middleware.ts
```

### Step 0.4 — Environment Variables

Create `.env.local` with these keys. All are required before running the app.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=

# Push Notifications (generated in Step 0.5)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:hello@mydailysales.com

# CRON security
CRON_SECRET=generate-a-random-string-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 0.5 — Generate VAPID Keys

Run this once. Copy the output into `.env.local`.

```bash
npx web-push generate-vapid-keys
```

Output looks like:

```
Public Key:  BEl62iUYgUivxIkv69yViEuiBIa-KyvxvGcNAU...
Private Key: UUxI4O8-HoGLsk-...
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key
`VAPID_PRIVATE_KEY` = Private Key

### Step 0.6 — TypeScript Types

```typescript
// src/types/index.ts

export type Role = "owner" | "staff";
export type SubscriptionStatus = "trial" | "active" | "expired";
export type DebtStatus = "unpaid" | "partial" | "paid";
export type MovementType = "restock" | "sale" | "adjustment";

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  phone: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  created_at: string;
}

export interface StaffMember {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  role: Role;
  is_active: boolean;
  joined_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  selling_price: number;
  cost_price?: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  staff_id: string;
  product_id: string;
  qty_sold: number;
  price_each: number;
  total: number;
  cost_total?: number;
  is_undone: boolean;
  logged_at: string;
  undone_at?: string;
  // Joined fields
  products?: Pick<Product, "name" | "selling_price">;
  staff_members?: Pick<StaffMember, "name">;
}

export interface Debt {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone?: string;
  amount_owed: number;
  amount_paid: number;
  status: DebtStatus;
  created_by: string;
  created_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  recorded_by: string;
  paid_at: string;
}

export interface PushSubscription {
  id: string;
  business_id: string;
  subscription: string;
  updated_at: string;
}

export interface PendingInvite {
  id: string;
  token: string;
  business_id: string;
  staff_name: string;
  staff_phone: string;
  created_at: string;
  expires_at: string;
}

// Dashboard computed types
export interface StaffSalesSummary {
  staff_id: string;
  staff_name: string;
  total: number;
  count: number;
}

export interface DashboardData {
  today_revenue: number;
  today_sales_count: number;
  staff_breakdown: StaffSalesSummary[];
  outstanding_debt: number;
  low_stock_count: number;
}
```

### Step 0.7 — Utility Functions

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number as Naira: 15000 → ₦15,000
export function formatNaira(amount: number): string {
  return (
    "₦" +
    amount.toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// Format Nigerian phone: 08012345678 → +2348012345678
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "+234" + cleaned.slice(1);
  if (cleaned.startsWith("234")) return "+" + cleaned;
  return "+" + cleaned;
}

// Check if running on iOS
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if PWA is installed (running in standalone mode)
export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

// Convert VAPID public key for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
```

### Step 0.8 — Supabase Clients

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore: called from Server Component, cookies will be set by middleware
          }
        },
      },
    },
  );
}
```

### Step 0.9 — Middleware

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Unauthenticated users can only access auth pages and invite pages
  const publicPaths = ["/login", "/signup", "/invite"];
  const isPublic = publicPaths.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users: check role and redirect accordingly
  if (user) {
    // If on auth page, redirect based on role
    if (path === "/login" || path === "/signup") {
      const { data: staffData } = await supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (staffData?.role === "staff") {
        return NextResponse.redirect(new URL("/log-sale", request.url));
      } else if (staffData?.role === "owner") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // No staff record yet = new owner, let them reach onboarding
    }

    // Staff trying to access owner routes
    const ownerOnlyPaths = [
      "/dashboard",
      "/inventory",
      "/debts",
      "/staff",
      "/reports",
    ];
    if (ownerOnlyPaths.some((p) => path.startsWith(p))) {
      const { data: staffData } = await supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (staffData?.role === "staff") {
        return NextResponse.redirect(new URL("/log-sale", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js).*)",
  ],
};
```

### Step 0.10 — Root Layout

```typescript
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'MyDailySales',
  description: 'Know your numbers. Every day.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyDailySales',
  },
}

export const viewport: Viewport = {
  themeColor: '#00C853',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#111711',
              color: '#F0F4F0',
              border: '1px solid #2A362A',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#00C853', secondary: '#0A0F0A' },
            },
          }}
        />
      </body>
    </html>
  )
}
```

### Step 0.11 — PWA Files

```json
// public/manifest.json
{
  "name": "MyDailySales",
  "short_name": "MDS",
  "description": "Know your numbers. Every day.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0A0F0A",
  "theme_color": "#00C853",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

```javascript
// public/sw.js
// Service Worker — handles push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/dashboard" },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: "daily-summary", // replaces previous notification of same tag
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // App not open, open it
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

// Install and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
```

**CHECKPOINT 0:** Run `npm run dev`. App loads at `localhost:3000` with no errors. Tailwind styles apply. No TypeScript errors.

---

## Phase 1 — Supabase Setup

### Step 1.1 — Create Supabase Project

1. Go to `supabase.com` → New Project
2. Name it `mydailysales`
3. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 1.2 — Run Schema SQL

Go to Supabase Dashboard → SQL Editor → New Query. Paste and run this entire block:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- BUSINESSES
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  phone text UNIQUE NOT NULL,
  subscription_status text DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired')),
  trial_ends_at timestamptz DEFAULT now() + interval '14 days',
  created_at timestamptz DEFAULT now()
);

-- STAFF MEMBERS
CREATE TABLE staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

-- PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  selling_price numeric NOT NULL CHECK (selling_price >= 0),
  cost_price numeric CHECK (cost_price >= 0),
  stock_qty int DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_threshold int DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- SALES
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES staff_members NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  qty_sold int NOT NULL CHECK (qty_sold > 0),
  price_each numeric NOT NULL CHECK (price_each >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  cost_total numeric,
  is_undone boolean DEFAULT false,
  logged_at timestamptz DEFAULT now(),
  undone_at timestamptz
);

-- DEBTS
CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  amount_owed numeric NOT NULL CHECK (amount_owed > 0),
  amount_paid numeric DEFAULT 0 CHECK (amount_paid >= 0),
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  created_by uuid REFERENCES staff_members NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- DEBT PAYMENTS
CREATE TABLE debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid REFERENCES debts ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  recorded_by uuid REFERENCES staff_members NOT NULL,
  paid_at timestamptz DEFAULT now()
);

-- STOCK MOVEMENTS
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  movement_type text CHECK (movement_type IN ('restock','sale','adjustment')),
  qty_change int NOT NULL,
  reference_id uuid,
  logged_by uuid REFERENCES staff_members NOT NULL,
  logged_at timestamptz DEFAULT now()
);

-- PUSH SUBSCRIPTIONS
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- PENDING INVITES
CREATE TABLE pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  staff_name text NOT NULL,
  staff_phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);

-- Indexes for common queries
CREATE INDEX idx_sales_business_logged ON sales(business_id, logged_at DESC);
CREATE INDEX idx_sales_staff ON sales(staff_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_debts_business ON debts(business_id, status);
CREATE INDEX idx_staff_members_user ON staff_members(user_id);
CREATE INDEX idx_staff_members_business ON staff_members(business_id);
```

### Step 1.3 — Enable Row Level Security

Run this second SQL block:

```sql
-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Returns business_id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS uuid AS $$
  SELECT business_id
  FROM staff_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns role for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role::text
  FROM staff_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns staff_members.id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_staff_id()
RETURNS uuid AS $$
  SELECT id
  FROM staff_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- BUSINESSES POLICIES
-- =============================================

CREATE POLICY "members can view their business"
  ON businesses FOR SELECT
  USING (id = get_my_business_id());

CREATE POLICY "owner can update their business"
  ON businesses FOR UPDATE
  USING (id = get_my_business_id() AND get_my_role() = 'owner');

-- INSERT allowed via service role only (during signup)

-- =============================================
-- STAFF MEMBERS POLICIES
-- =============================================

CREATE POLICY "members can view staff in their business"
  ON staff_members FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "owner can manage staff"
  ON staff_members FOR ALL
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

CREATE POLICY "own staff record is always visible"
  ON staff_members FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- PRODUCTS POLICIES
-- =============================================

CREATE POLICY "business members can view products"
  ON products FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "owner can manage products"
  ON products FOR ALL
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

-- =============================================
-- SALES POLICIES
-- =============================================

-- Owner sees all sales in business
CREATE POLICY "owner can view all sales"
  ON sales FOR SELECT
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

-- Staff sees only their own sales
CREATE POLICY "staff can view own sales"
  ON sales FOR SELECT
  USING (
    business_id = get_my_business_id()
    AND get_my_role() = 'staff'
    AND staff_id = get_my_staff_id()
  );

-- Anyone in business can insert a sale
CREATE POLICY "business members can log sales"
  ON sales FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

-- Anyone can undo their own sale (within 5 min enforced in app)
CREATE POLICY "members can undo sales"
  ON sales FOR UPDATE
  USING (business_id = get_my_business_id());

-- =============================================
-- DEBTS POLICIES
-- =============================================

CREATE POLICY "owner can manage all debts"
  ON debts FOR ALL
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

CREATE POLICY "staff can log debts"
  ON debts FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

-- =============================================
-- DEBT PAYMENTS POLICIES
-- =============================================

CREATE POLICY "owner can manage debt payments"
  ON debt_payments FOR ALL
  USING (
    debt_id IN (
      SELECT id FROM debts WHERE business_id = get_my_business_id()
    )
    AND get_my_role() = 'owner'
  );

-- =============================================
-- STOCK MOVEMENTS POLICIES
-- =============================================

CREATE POLICY "business members can view stock movements"
  ON stock_movements FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "business members can log stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

-- =============================================
-- PUSH SUBSCRIPTIONS POLICIES
-- =============================================

CREATE POLICY "owner can manage push subscription"
  ON push_subscriptions FOR ALL
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

-- =============================================
-- PENDING INVITES POLICIES
-- =============================================

CREATE POLICY "owner can manage invites"
  ON pending_invites FOR ALL
  USING (business_id = get_my_business_id() AND get_my_role() = 'owner');

-- Anyone can read an invite by token (for the invite acceptance page)
CREATE POLICY "invite token is publicly readable"
  ON pending_invites FOR SELECT
  USING (true);
```

### Step 1.4 — Configure Supabase Auth

In Supabase Dashboard → Authentication → Settings:

- **Enable phone provider:** On
- **SMS provider:** Twilio (add credentials) OR use Supabase's built-in test OTP for development
- **JWT expiry:** 2592000 (30 days)
- **Disable email provider** if you want phone-only (optional for now)

**For development only:** In Supabase Auth settings, enable "Disable phone confirmation" to skip real SMS during local testing.

**CHECKPOINT 1:** Go to Supabase Table Editor. All 9 tables exist. Run `SELECT get_my_business_id()` in SQL editor — returns null (no user logged in). No errors.

---

## Phase 2 — Authentication Screens

### Step 2.1 — Login Page

```typescript
// src/app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function sendOTP() {
    if (phone.length < 10) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
    })
    if (error) {
      toast.error(error.message)
    } else {
      setStep('otp')
      toast.success('Code sent!')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    if (otp.length < 6) return
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: 'sms',
    })

    if (error) {
      toast.error('Invalid code. Try again.')
      setLoading(false)
      return
    }

    // Determine where to send user based on role
    const { data: staffData } = await supabase
      .from('staff_members')
      .select('role')
      .eq('user_id', data.user?.id)
      .maybeSingle()

    if (!staffData) {
      // New user — no business yet
      router.push('/onboarding')
    } else if (staffData.role === 'staff') {
      router.push('/log-sale')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[#00C853] rounded-xl flex items-center justify-center">
              <span className="text-black font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>M</span>
            </div>
            <span className="text-[#F0F4F0] font-semibold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
              MyDailySales
            </span>
          </div>
          <p className="text-[#8A9E8A] text-sm">Know your numbers. Every day.</p>
        </div>

        <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
          <h1 className="text-[#F0F4F0] text-xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            {step === 'phone' ? 'Welcome back' : 'Enter your code'}
          </h1>
          <p className="text-[#8A9E8A] text-sm mb-6">
            {step === 'phone'
              ? 'Enter your business phone number'
              : `6-digit code sent to ${phone}`}
          </p>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#8A9E8A] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  autoFocus
                  className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                             text-[#F0F4F0] text-base placeholder-[#4A5E4A]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#00A846] active:scale-[0.98] transition-all"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[#8A9E8A] text-xs font-medium uppercase tracking-widest mb-2 block">
                  6-Digit Code
                </label>
                <input
                  type="number"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  autoFocus
                  className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                             text-[#F0F4F0] text-2xl text-center tracking-[0.5em] placeholder-[#4A5E4A]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] active:scale-[0.98] transition-all"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp('') }}
                className="w-full text-[#8A9E8A] text-sm py-2 hover:text-[#F0F4F0] transition-colors"
              >
                ← Use a different number
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[#4A5E4A] text-sm mt-6">
          New business?{' '}
          <a href="/signup" className="text-[#00C853] hover:underline">Create account</a>
        </p>
      </div>
    </div>
  )
}
```

### Step 2.2 — Signup Page

```typescript
// src/app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp'

export default function SignupPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function sendOTP() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
      options: { shouldCreateUser: true },
    })
    if (error) {
      toast.error(error.message)
    } else {
      setStep('otp')
      toast.success('Code sent!')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: 'sms',
    })
    if (error) {
      toast.error('Invalid code.')
      setLoading(false)
      return
    }
    // New user → onboarding
    router.push('/onboarding')
    setLoading(false)
  }

  // Same UI as login, just different heading text
  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[#00C853] rounded-xl flex items-center justify-center">
              <span className="text-black font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>M</span>
            </div>
            <span className="text-[#F0F4F0] font-semibold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
              MyDailySales
            </span>
          </div>
        </div>

        <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
          <h1 className="text-[#F0F4F0] text-xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            {step === 'phone' ? 'Create your account' : 'Verify your number'}
          </h1>
          <p className="text-[#8A9E8A] text-sm mb-6">
            {step === 'phone'
              ? 'Your phone number is your login'
              : `Enter the code sent to ${phone}`}
          </p>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                  className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                             text-[#F0F4F0] placeholder-[#4A5E4A]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="number"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                autoFocus
                className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                           text-[#F0F4F0] text-2xl text-center tracking-[0.5em] placeholder-[#4A5E4A]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Verifying...' : 'Create Account'}
              </button>
              <button onClick={() => setStep('phone')}
                      className="w-full text-[#8A9E8A] text-sm py-2">
                ← Change number
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[#4A5E4A] text-sm mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#00C853] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
```

**CHECKPOINT 2:** Signup flow completes. Supabase Auth creates a user. Login with same number works. Middleware redirects logged-in users away from `/login`. Unauthenticated users redirected to `/login` from protected routes.

---

## Phase 3 — Onboarding Flow

### Step 3.1 — Onboarding Page

This is a multi-step wizard. The owner goes through 5 steps after first signup.

```typescript
// src/app/onboarding/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { isIOS, isPWAInstalled, urlBase64ToUint8Array } from '@/lib/utils'
import toast from 'react-hot-toast'

type Step = 'business' | 'products' | 'staff' | 'notifications' | 'done'

interface ProductDraft {
  name: string
  selling_price: string
  stock_qty: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('business')
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [products, setProducts] = useState<ProductDraft[]>([
    { name: '', selling_price: '', stock_qty: '' }
  ])
  const [staffName, setStaffName] = useState('')
  const [staffPhone, setStaffPhone] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Step 1: Create business
  async function createBusiness() {
    if (!businessName.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Create business record
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: businessName.trim(),
        owner_id: user.id,
        phone: user.phone || '',
      })
      .select()
      .single()

    if (bizError || !biz) {
      toast.error('Could not create business. Try again.')
      setLoading(false)
      return
    }

    // Create owner staff_members record
    const { error: staffError } = await supabase
      .from('staff_members')
      .insert({
        business_id: biz.id,
        user_id: user.id,
        name: 'Owner',
        role: 'owner',
      })

    if (staffError) {
      toast.error('Setup error. Try again.')
      setLoading(false)
      return
    }

    setBusinessId(biz.id)
    setStep('products')
    setLoading(false)
  }

  // Step 2: Add products
  async function saveProducts() {
    const validProducts = products.filter(p => p.name.trim() && p.selling_price)
    if (validProducts.length === 0) {
      toast.error('Add at least one product')
      return
    }
    setLoading(true)

    const { error } = await supabase.from('products').insert(
      validProducts.map(p => ({
        business_id: businessId,
        name: p.name.trim(),
        selling_price: Number(p.selling_price),
        stock_qty: Number(p.stock_qty) || 0,
      }))
    )

    if (error) {
      toast.error('Could not save products.')
      setLoading(false)
      return
    }

    setStep('staff')
    setLoading(false)
  }

  // Step 3: Generate staff invite link
  async function generateInvite() {
    if (!staffName.trim() || !staffPhone.trim()) {
      setStep('notifications')
      return
    }
    setLoading(true)

    const { data, error } = await fetch('/api/invite/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        staff_name: staffName,
        staff_phone: staffPhone,
      }),
    }).then(r => r.json())

    if (error || !data?.link) {
      toast.error('Could not generate invite.')
    } else {
      setInviteLink(data.link)
    }
    setLoading(false)
  }

  // Step 4: Request push notification permission
  async function setupNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStep('done')
      return
    }

    // Register service worker
    await navigator.serviceWorker.register('/sw.js')
    const registration = await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStep('done')
      return
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      await supabase.from('push_subscriptions').upsert({
        business_id: businessId,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' })

      toast.success('Daily summaries enabled!')
    } catch (err) {
      toast.error('Could not enable notifications.')
    }

    setStep('done')
  }

  const stepIndex = { business: 0, products: 1, staff: 2, notifications: 3, done: 4 }
  const progress = ((stepIndex[step]) / 4) * 100

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[#1A221A]">
        <div
          className="h-full bg-[#00C853] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          {/* Step 1: Business Name */}
          {step === 'business' && (
            <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-1">Step 1 of 4</p>
              <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                What's your business called?
              </h1>
              <p className="text-[#8A9E8A] text-sm mb-6">This shows on your daily summaries.</p>
              <input
                placeholder="e.g. FreshMart Boutique"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBusiness()}
                autoFocus
                className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                           text-[#F0F4F0] placeholder-[#4A5E4A] mb-4
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <button
                onClick={createBusiness}
                disabled={loading || !businessName.trim()}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Creating...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Step 2: Products */}
          {step === 'products' && (
            <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-1">Step 2 of 4</p>
              <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Add your products
              </h1>
              <p className="text-[#8A9E8A] text-sm mb-6">Add at least one to continue. You can add more later.</p>

              <div className="space-y-4 mb-4">
                {products.map((p, i) => (
                  <div key={i} className="bg-[#1A221A] rounded-xl p-3 space-y-2">
                    <input
                      placeholder="Product name"
                      value={p.name}
                      onChange={e => {
                        const updated = [...products]
                        updated[i].name = e.target.value
                        setProducts(updated)
                      }}
                      className="w-full bg-transparent border-b border-[#2A362A] pb-2
                                 text-[#F0F4F0] placeholder-[#4A5E4A] text-sm
                                 focus:outline-none focus:border-[#00C853] transition-colors"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Price (₦)"
                        value={p.selling_price}
                        onChange={e => {
                          const updated = [...products]
                          updated[i].selling_price = e.target.value
                          setProducts(updated)
                        }}
                        className="flex-1 bg-transparent border-b border-[#2A362A] pb-2
                                   text-[#F0F4F0] placeholder-[#4A5E4A] text-sm
                                   focus:outline-none focus:border-[#00C853] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Stock qty"
                        value={p.stock_qty}
                        onChange={e => {
                          const updated = [...products]
                          updated[i].stock_qty = e.target.value
                          setProducts(updated)
                        }}
                        className="flex-1 bg-transparent border-b border-[#2A362A] pb-2
                                   text-[#F0F4F0] placeholder-[#4A5E4A] text-sm
                                   focus:outline-none focus:border-[#00C853] transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setProducts([...products, { name: '', selling_price: '', stock_qty: '' }])}
                className="w-full border border-[#2A362A] text-[#8A9E8A] py-2.5 rounded-xl text-sm mb-3
                           hover:border-[#00C853] hover:text-[#00C853] transition-colors"
              >
                + Add another product
              </button>

              <button
                onClick={saveProducts}
                disabled={loading}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Saving...' : 'Save Products →'}
              </button>
            </div>
          )}

          {/* Step 3: Staff Invite */}
          {step === 'staff' && (
            <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-1">Step 3 of 4</p>
              <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Invite your staff
              </h1>
              <p className="text-[#8A9E8A] text-sm mb-6">You can skip this and add staff later.</p>

              {!inviteLink ? (
                <div className="space-y-3">
                  <input
                    placeholder="Staff name (e.g. Aisha)"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                               text-[#F0F4F0] placeholder-[#4A5E4A]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder="Their phone number"
                    value={staffPhone}
                    onChange={e => setStaffPhone(e.target.value)}
                    className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                               text-[#F0F4F0] placeholder-[#4A5E4A]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                  <button
                    onClick={generateInvite}
                    disabled={loading}
                    className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                               disabled:opacity-40 hover:bg-[#00A846] transition-all"
                  >
                    {loading ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full text-[#8A9E8A] text-sm py-2"
                  >
                    Skip for now →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1A221A] border border-[#2A362A] rounded-xl p-4">
                    <p className="text-[#8A9E8A] text-xs mb-2">Invite link for {staffName}:</p>
                    <p className="text-[#00C853] text-sm break-all font-mono">{inviteLink}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
                    className="w-full border border-[#00C853] text-[#00C853] font-semibold py-3 rounded-xl"
                  >
                    Copy Link
                  </button>
                  <p className="text-[#8A9E8A] text-xs text-center">
                    Send this link to {staffName} over WhatsApp or SMS
                  </p>
                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                               hover:bg-[#00A846] transition-all"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Notifications */}
          {step === 'notifications' && (
            <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-1">Step 4 of 4</p>
              <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Get your daily summary
              </h1>
              <p className="text-[#8A9E8A] text-sm mb-6">
                Every night at 9pm, we'll send you a summary of the day's sales, who sold what, and what's running low.
              </p>

              {/* iOS prompt */}
              {isIOS() && !isPWAInstalled() && (
                <div className="bg-[rgba(255,179,0,0.1)] border border-[#FFB300] rounded-xl p-4 mb-4">
                  <p className="text-[#FFB300] text-sm font-medium mb-1">iPhone users</p>
                  <p className="text-[#8A9E8A] text-sm">
                    To receive notifications, first add this app to your home screen:
                    tap the Share button → "Add to Home Screen" → open the app from there.
                  </p>
                </div>
              )}

              <div className="bg-[#1A221A] rounded-xl p-4 mb-6">
                <p className="text-[#F0F4F0] text-sm font-medium">Preview:</p>
                <p className="text-[#8A9E8A] text-xs mt-1">FreshMart — Daily Summary</p>
                <p className="text-[#8A9E8A] text-xs">₦184,000 from 23 sales today. Aisha ₦112k · Tunde ₦72k. Tap to view.</p>
              </div>

              <button
                onClick={setupNotifications}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           hover:bg-[#00A846] transition-all mb-3"
              >
                Enable Daily Summaries
              </button>
              <button
                onClick={() => setStep('done')}
                className="w-full text-[#8A9E8A] text-sm py-2"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A] text-center">
              <div className="w-16 h-16 bg-[rgba(0,200,83,0.15)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                You're all set!
              </h1>
              <p className="text-[#8A9E8A] text-sm mb-6">
                Your business is ready. Go to your dashboard to see everything.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           hover:bg-[#00A846] transition-all"
              >
                Open Dashboard →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
```

### Step 3.2 — Invite Create API Route

```typescript
// src/app/api/invite/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { business_id, staff_name, staff_phone } = await request.json();

  // Verify requesting user is owner of this business
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("role, business_id")
    .eq("user_id", user.id)
    .single();

  if (
    !staffMember ||
    staffMember.role !== "owner" ||
    staffMember.business_id !== business_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service role to insert (bypasses RLS for token generation)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite, error } = await serviceSupabase
    .from("pending_invites")
    .insert({
      business_id,
      staff_name,
      staff_phone,
    })
    .select()
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: "Could not create invite" },
      { status: 500 },
    );
  }

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

  return NextResponse.json({ data: { link, token: invite.token } });
}
```

### Step 3.3 — Staff Invite Acceptance Page

```typescript
// src/app/invite/[token]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function InvitePage() {
  const [invite, setInvite] = useState<{ staff_name: string; business_name: string; staff_phone: string } | null>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'loading' | 'setup' | 'otp' | 'invalid'>('loading')
  const [loading, setLoading] = useState(false)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadInvite() {
      const { data } = await supabase
        .from('pending_invites')
        .select('staff_name, staff_phone, business_id, businesses(name), expires_at')
        .eq('token', params.token as string)
        .single()

      if (!data || new Date(data.expires_at) < new Date()) {
        setStep('invalid')
        return
      }

      setInvite({
        staff_name: data.staff_name,
        staff_phone: data.staff_phone,
        business_name: (data as any).businesses?.name || '',
      })
      setStep('setup')
    }
    loadInvite()
  }, [params.token])

  async function sendOTP() {
    if (pin !== confirmPin || pin.length < 4) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(invite!.staff_phone),
    })

    if (error) {
      toast.error(error.message)
    } else {
      setStep('otp')
      toast.success('Code sent to your phone')
    }
    setLoading(false)
  }

  async function verifyAndJoin() {
    if (otp.length < 6) return
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: formatPhone(invite!.staff_phone),
      token: otp,
      type: 'sms',
    })

    if (authError || !authData.user) {
      toast.error('Invalid code')
      setLoading(false)
      return
    }

    // Get business_id from invite token
    const { data: inviteData } = await supabase
      .from('pending_invites')
      .select('business_id')
      .eq('token', params.token as string)
      .single()

    if (!inviteData) {
      toast.error('Invite not found')
      setLoading(false)
      return
    }

    // Create staff_members record via API route (needs service role)
    const response = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        user_id: authData.user.id,
        name: invite!.staff_name,
        business_id: inviteData.business_id,
      }),
    })

    if (!response.ok) {
      toast.error('Could not join business')
      setLoading(false)
      return
    }

    router.push('/log-sale')
    setLoading(false)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
        <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A] text-center max-w-sm w-full">
          <p className="text-[#FF3D3D] text-xl mb-2">Link expired</p>
          <p className="text-[#8A9E8A] text-sm">Ask your employer to generate a new invite link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#111711] rounded-2xl p-6 border border-[#2A362A]">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[rgba(0,200,83,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-[#F0F4F0] text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              You're invited!
            </h1>
            <p className="text-[#8A9E8A] text-sm mt-1">
              Join <span className="text-[#00C853]">{invite?.business_name}</span> on MyDailySales
            </p>
          </div>

          {step === 'setup' && (
            <div className="space-y-4">
              <div>
                <label className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2 block">
                  Your Name
                </label>
                <div className="bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3">
                  <p className="text-[#F0F4F0]">{invite?.staff_name}</p>
                </div>
              </div>
              <div>
                <label className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2 block">
                  Set 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                             text-[#F0F4F0] text-center text-2xl tracking-[0.5em] placeholder-[#4A5E4A]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <div>
                <label className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2 block">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`w-full bg-[#1A221A] border rounded-xl px-4 py-3
                             text-[#F0F4F0] text-center text-2xl tracking-[0.5em] placeholder-[#4A5E4A]
                             focus:outline-none transition-colors ${
                    confirmPin.length === 4 && confirmPin !== pin
                      ? 'border-[#FF3D3D]'
                      : 'border-[#2A362A] focus:border-[#00C853]'
                  }`}
                />
                {confirmPin.length === 4 && confirmPin !== pin && (
                  <p className="text-[#FF3D3D] text-xs mt-1">PINs don't match</p>
                )}
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || pin.length < 4 || pin !== confirmPin}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Sending code...' : 'Set PIN & Continue'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-[#8A9E8A] text-sm text-center">
                Enter the code sent to {invite?.staff_phone}
              </p>
              <input
                type="number"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                autoFocus
                className="w-full bg-[#1A221A] border border-[#2A362A] rounded-xl px-4 py-3
                           text-[#F0F4F0] text-2xl text-center tracking-[0.5em] placeholder-[#4A5E4A]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <button
                onClick={verifyAndJoin}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00A846] transition-all"
              >
                {loading ? 'Joining...' : 'Join Business'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Step 3.4 — Invite Accept API Route

```typescript
// src/app/api/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { token, user_id, name, business_id } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify token exists and is not expired
  const { data: invite } = await supabase
    .from("pending_invites")
    .select("*")
    .eq("token", token)
    .eq("business_id", business_id)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid or expired invite" },
      { status: 400 },
    );
  }

  // Create staff_members record
  const { error: staffError } = await supabase.from("staff_members").insert({
    business_id,
    user_id,
    name,
    role: "staff",
  });

  if (staffError) {
    return NextResponse.json(
      { error: "Could not create staff record" },
      { status: 500 },
    );
  }

  // Delete the used invite
  await supabase.from("pending_invites").delete().eq("token", token);

  return NextResponse.json({ success: true });
}
```

**CHECKPOINT 3:** Owner can complete full onboarding. Business, products, and staff_members rows exist in Supabase. Invite link generates correctly. Staff can open invite link, set PIN, accept, and are redirected to `/log-sale`.

---

## Phase 4 — Staff Sale Logging Screen

### Step 4.1 — Staff Layout

```typescript
// src/app/(staff)/layout.tsx
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F0A]">
      {children}
    </div>
  )
}
```

### Step 4.2 — Log Sale Page

```typescript
// src/app/(staff)/log-sale/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, StaffMember } from '@/types'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'

type SaleStep = 'select' | 'quantity'

export default function LogSalePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [step, setStep] = useState<SaleStep>('select')
  const [loading, setLoading] = useState(false)
  const [todayTotal, setTodayTotal] = useState(0)
  const [lastSale, setLastSale] = useState<{ id: string; total: number } | null>(null)
  const [undoSeconds, setUndoSeconds] = useState(0)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: staffData }, { data: productsData }] = await Promise.all([
      supabase.from('staff_members').select('*').eq('user_id', user.id).single(),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])

    if (staffData) {
      setStaff(staffData)
      // Load today total for this staff member
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('staff_id', staffData.id)
        .gte('logged_at', today)
        .eq('is_undone', false)

      setTodayTotal((todaySales || []).reduce((s, sale) => s + sale.total, 0))
    }
    if (productsData) setProducts(productsData)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // Undo countdown
  useEffect(() => {
    if (undoSeconds <= 0) {
      setLastSale(null)
      return
    }
    const timer = setTimeout(() => setUndoSeconds(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [undoSeconds])

  function selectProduct(product: Product) {
    setSelected(product)
    setPrice(product.selling_price)
    setQty(1)
    setStep('quantity')
  }

  async function confirmSale() {
    if (!selected || !staff) return
    setLoading(true)

    const saleTotal = qty * price

    const { data, error } = await supabase
      .from('sales')
      .insert({
        business_id: staff.business_id,
        staff_id: staff.id,
        product_id: selected.id,
        qty_sold: qty,
        price_each: price,
        total: saleTotal,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Sale failed. Try again.')
      setLoading(false)
      return
    }

    // Update product stock in DB
    await supabase
      .from('products')
      .update({ stock_qty: selected.stock_qty - qty })
      .eq('id', selected.id)

    // Log stock movement
    await supabase.from('stock_movements').insert({
      business_id: staff.business_id,
      product_id: selected.id,
      movement_type: 'sale',
      qty_change: -qty,
      reference_id: data.id,
      logged_by: staff.id,
    })

    setLastSale({ id: data.id, total: saleTotal })
    setUndoSeconds(300) // 5 minutes
    setTodayTotal(prev => prev + saleTotal)

    // Update local product stock
    setProducts(prev =>
      prev.map(p => p.id === selected.id ? { ...p, stock_qty: p.stock_qty - qty } : p)
    )

    toast.success(`${qty} ${selected.name} — ${formatNaira(saleTotal)}`)
    setStep('select')
    setSelected(null)
    setLoading(false)
  }

  async function undoSale() {
    if (!lastSale || !staff) return

    const { error } = await supabase
      .from('sales')
      .update({ is_undone: true, undone_at: new Date().toISOString() })
      .eq('id', lastSale.id)

    if (!error) {
      setTodayTotal(prev => prev - lastSale.total)
      setLastSale(null)
      setUndoSeconds(0)
      // Reload products to restore stock
      await loadData()
      toast.success('Last sale undone')
    }
  }

  const undoMins = Math.floor(undoSeconds / 60)
  const undoSecs = undoSeconds % 60

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex flex-col">

      {/* Header */}
      <div className="px-4 pt-12 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[#8A9E8A] text-xs uppercase tracking-widest">Your sales today</p>
          <p className="text-[#00C853] text-4xl font-bold mt-1"
             style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
            {formatNaira(todayTotal)}
          </p>
          {staff && (
            <p className="text-[#4A5E4A] text-sm mt-0.5">{staff.name}</p>
          )}
        </div>

        {lastSale && undoSeconds > 0 && (
          <button
            onClick={undoSale}
            className="flex items-center gap-2 bg-[#1A221A] border border-[#2A362A]
                       px-3 py-2 rounded-xl text-[#F0F4F0] text-sm active:scale-95 transition-transform"
          >
            <span>↩</span>
            <span>{undoMins}:{String(undoSecs).padStart(2, '0')}</span>
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 overflow-y-auto pb-32">

        {step === 'select' && (
          <>
            <p className="text-[#8A9E8A] text-sm mb-4">Tap a product to log a sale</p>
            {products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#4A5E4A]">No products yet. Ask your manager to add products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => product.stock_qty > 0 && selectProduct(product)}
                    disabled={product.stock_qty === 0}
                    className={`bg-[#111711] border rounded-2xl p-4 text-left transition-all
                               active:scale-95 ${
                      product.stock_qty === 0
                        ? 'border-[#2A362A] opacity-40 cursor-not-allowed'
                        : 'border-[#2A362A] hover:border-[#00C853]'
                    }`}
                  >
                    <p className="text-[#F0F4F0] font-medium text-sm mb-1 truncate leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[#00C853] font-bold text-base"
                       style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatNaira(product.selling_price)}
                    </p>
                    <p className={`text-xs mt-1.5 ${
                      product.stock_qty === 0
                        ? 'text-[#FF3D3D]'
                        : product.stock_qty <= product.low_stock_threshold
                        ? 'text-[#FFB300]'
                        : 'text-[#4A5E4A]'
                    }`}>
                      {product.stock_qty === 0
                        ? 'Out of stock'
                        : `${product.stock_qty} left`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'quantity' && selected && (
          <div>
            <button
              onClick={() => { setStep('select'); setSelected(null) }}
              className="text-[#8A9E8A] text-sm mb-6 flex items-center gap-1 hover:text-[#F0F4F0] transition-colors"
            >
              ← Back to products
            </button>

            {/* Product card */}
            <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5 mb-4">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-1">Product</p>
              <p className="text-[#F0F4F0] text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                {selected.name}
              </p>
            </div>

            {/* Quantity */}
            <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5 mb-4">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-4">Quantity</p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-16 h-16 bg-[#1A221A] rounded-2xl text-[#F0F4F0] text-3xl font-light
                             active:bg-[#2A362A] transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-[#F0F4F0] text-5xl font-bold"
                      style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => Math.min(selected.stock_qty, q + 1))}
                  className="w-16 h-16 bg-[#1A221A] rounded-2xl text-[#F0F4F0] text-3xl font-light
                             active:bg-[#2A362A] transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5 mb-6">
              <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2">Price Each</p>
              <div className="flex items-center gap-2">
                <span className="text-[#8A9E8A] text-2xl">₦</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="flex-1 bg-transparent text-[#F0F4F0] text-3xl font-bold
                             focus:outline-none"
                  style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>

            {/* Total display */}
            <div className="text-center mb-4">
              <p className="text-[#8A9E8A] text-sm">Total</p>
              <p className="text-[#00C853] text-5xl font-bold"
                 style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatNaira(qty * price)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed confirm button */}
      {step === 'quantity' && (
        <div className="fixed bottom-0 left-0 right-0 p-4"
             style={{ background: 'linear-gradient(to top, #0A0F0A 60%, transparent)' }}>
          <button
            onClick={confirmSale}
            disabled={loading || qty * price === 0}
            className="w-full bg-[#00C853] text-black font-bold py-5 rounded-2xl text-lg
                       disabled:opacity-40 active:scale-[0.98] transition-transform
                       shadow-lg"
            style={{ boxShadow: '0 8px 32px rgba(0, 200, 83, 0.3)' }}
          >
            {loading ? 'Logging sale...' : `Confirm — ${formatNaira(qty * price)}`}
          </button>
        </div>
      )}
    </div>
  )
}
```

**CHECKPOINT 4:** Staff can log in, see product grid, select a product, set quantity and price, confirm sale. Sale appears in `sales` table in Supabase. Stock decrements. Undo button appears and countdown works. Today's total updates after each sale.

---

## Phase 5 — Owner Dashboard

### Step 5.1 — Owner Layout with Navigation

```typescript
// src/app/(owner)/layout.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, CreditCard, Users, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#0A0F0A] lg:flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-60 flex-col bg-[#111711] border-r border-[#2A362A] fixed h-full p-5">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-[#00C853] rounded-xl flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-sm" style={{ fontFamily: 'Space Grotesk' }}>M</span>
          </div>
          <span className="text-[#F0F4F0] font-semibold text-lg" style={{ fontFamily: 'Space Grotesk' }}>
            MyDailySales
          </span>
        </div>

        <nav className="flex-1 space-y-0.5">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                           transition-colors ${
                  active
                    ? 'bg-[rgba(0,200,83,0.12)] text-[#00C853]'
                    : 'text-[#8A9E8A] hover:text-[#F0F4F0] hover:bg-[#1A221A]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 lg:ml-60 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111711] border-t border-[#2A362A]
                      flex safe-area-bottom">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                active ? 'text-[#00C853]' : 'text-[#4A5E4A]'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

### Step 5.2 — Dashboard Page

```typescript
// src/app/(owner)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { RealtimeSalesFeed } from '@/components/dashboard/RealtimeSalesFeed'
import { StaffBreakdown } from '@/components/dashboard/StaffBreakdown'
import { formatNaira } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [salesRes, lowStockRes, debtsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('total, staff_id, staff_members(name)')
      .gte('logged_at', today)
      .eq('is_undone', false),
    supabase
      .from('products')
      .select('id, name, stock_qty, low_stock_threshold')
      .eq('is_active', true)
      .filter('stock_qty', 'lte', 5),
    supabase
      .from('debts')
      .select('amount_owed, amount_paid')
      .neq('status', 'paid'),
  ])

  const sales = salesRes.data || []
  const lowStock = lowStockRes.data || []
  const debts = debtsRes.data || []

  const todayRevenue = sales.reduce((s, sale) => s + sale.total, 0)
  const outstandingDebt = debts.reduce((s, d) => s + (d.amount_owed - d.amount_paid), 0)

  // Staff breakdown
  const staffMap = new Map<string, { name: string; total: number; count: number }>()
  sales.forEach(sale => {
    const name = (sale as any).staff_members?.name || 'Unknown'
    const existing = staffMap.get(sale.staff_id) || { name, total: 0, count: 0 }
    staffMap.set(sale.staff_id, { ...existing, total: existing.total + sale.total, count: existing.count + 1 })
  })
  const staffBreakdown = Array.from(staffMap.values()).sort((a, b) => b.total - a.total)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#8A9E8A] text-sm">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-[#F0F4F0] text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
          Dashboard
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard
          label="Revenue Today"
          value={formatNaira(todayRevenue)}
          sub={`${sales.length} sales`}
          color="text-[#00C853]"
        />
        <MetricCard
          label="Debts Outstanding"
          value={formatNaira(outstandingDebt)}
          sub="owed to you"
          color="text-[#FFB300]"
        />
        <MetricCard
          label="Low Stock"
          value={String(lowStock.length)}
          sub={lowStock.length === 0 ? 'all good' : 'need restocking'}
          color={lowStock.length > 0 ? 'text-[#FFB300]' : 'text-[#F0F4F0]'}
        />
        <MetricCard
          label="Sales Count"
          value={String(sales.length)}
          sub="transactions"
          color="text-[#F0F4F0]"
        />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-[rgba(255,179,0,0.08)] border border-[#FFB300] rounded-2xl p-4 mb-6">
          <p className="text-[#FFB300] font-semibold text-sm mb-2">⚠ Low Stock Alert</p>
          <div className="space-y-1">
            {lowStock.map(product => (
              <div key={product.id} className="flex justify-between text-sm">
                <span className="text-[#F0F4F0]">{product.name}</span>
                <span className={product.stock_qty === 0 ? 'text-[#FF3D3D]' : 'text-[#FFB300]'}>
                  {product.stock_qty === 0 ? 'Out of stock' : `${product.stock_qty} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Realtime feed — client component */}
        <RealtimeSalesFeed initialSales={sales as any} />

        {/* Staff breakdown */}
        <StaffBreakdown breakdown={staffBreakdown} />
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-4">
      <p className="text-[#8A9E8A] text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}
         style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p className="text-[#4A5E4A] text-xs mt-1">{sub}</p>
    </div>
  )
}
```

### Step 5.3 — Realtime Sales Feed Component

```typescript
// src/components/dashboard/RealtimeSalesFeed.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sale } from '@/types'
import { formatNaira } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export function RealtimeSalesFeed({ initialSales }: { initialSales: Sale[] }) {
  const [sales, setSales] = useState<Sale[]>(
    initialSales.slice(0, 10)
  )
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        async payload => {
          // Fetch full sale with joins
          const { data } = await supabase
            .from('sales')
            .select('*, products(name), staff_members(name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setSales(prev => [data as any, ...prev.slice(0, 9)])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#F0F4F0] font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
          Live Sales Feed
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse" />
          <span className="text-[#8A9E8A] text-xs">Live</span>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#4A5E4A] text-sm">No sales logged today yet</p>
          <p className="text-[#4A5E4A] text-xs mt-1">Sales appear here the moment staff log them</p>
        </div>
      ) : (
        <div className="space-y-0">
          {sales.map((sale, i) => (
            <div
              key={sale.id}
              className={`flex items-center justify-between py-3 ${
                i < sales.length - 1 ? 'border-b border-[#1A221A]' : ''
              }`}
            >
              <div>
                <p className="text-[#F0F4F0] text-sm font-medium">
                  {(sale as any).products?.name}
                  <span className="text-[#8A9E8A] font-normal"> × {sale.qty_sold}</span>
                </p>
                <p className="text-[#4A5E4A] text-xs mt-0.5">
                  {(sale as any).staff_members?.name} ·{' '}
                  {formatDistanceToNow(new Date(sale.logged_at), { addSuffix: true })}
                </p>
              </div>
              <p className="text-[#00C853] font-semibold text-sm"
                 style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatNaira(sale.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 5.4 — Staff Breakdown Component

```typescript
// src/components/dashboard/StaffBreakdown.tsx
import { formatNaira } from '@/lib/utils'

interface StaffSummary {
  name: string
  total: number
  count: number
}

export function StaffBreakdown({ breakdown }: { breakdown: StaffSummary[] }) {
  const maxTotal = Math.max(...breakdown.map(s => s.total), 1)

  return (
    <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5">
      <h2 className="text-[#F0F4F0] font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
        Staff Today
      </h2>

      {breakdown.length === 0 ? (
        <p className="text-[#4A5E4A] text-sm text-center py-6">No sales logged yet</p>
      ) : (
        <div className="space-y-4">
          {breakdown.map(staff => (
            <div key={staff.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#F0F4F0] text-sm font-medium">{staff.name}</span>
                <div className="text-right">
                  <span className="text-[#00C853] font-semibold text-sm"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNaira(staff.total)}
                  </span>
                  <span className="text-[#4A5E4A] text-xs ml-2">{staff.count} sales</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-[#1A221A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00C853] rounded-full transition-all duration-700"
                  style={{ width: `${(staff.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**CHECKPOINT 5:** Owner dashboard loads with today's data. Live sales feed shows new sales in real time when staff logs one. Staff breakdown shows correctly. Low stock alert appears when products are below threshold.

---

## Phase 6 — Push Notifications

### Step 6.1 — Push Subscription Hook

```typescript
// src/hooks/usePushNotifications.ts
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function usePushNotifications(businessId: string | null) {
  const supabase = createClient();

  useEffect(() => {
    if (!businessId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    registerSubscription(businessId);
  }, [businessId]);

  async function registerSubscription(bizId: string) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        // Refresh subscription in DB in case it changed
        await saveToSupabase(bizId, existing);
        return;
      }
    } catch (err) {
      console.error("Push registration failed:", err);
    }
  }

  async function saveToSupabase(bizId: string, subscription: PushSubscription) {
    await supabase.from("push_subscriptions").upsert(
      {
        business_id: bizId,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );
  }
}
```

### Step 6.2 — Push Subscribe API Route

```typescript
// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = await request.json();

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .single();

  if (!staffMember || staffMember.role !== "owner") {
    return NextResponse.json(
      { error: "Only owners receive notifications" },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      business_id: staffMember.business_id,
      subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

### Step 6.3 — Daily Summary CRON Route

```typescript
// src/app/api/cron/daily-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel CRON (or your test)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().split("T")[0];

  // Get all active businesses that have push subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("business_id, subscription, businesses(name, subscription_status)");

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No subscriptions" });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    const biz = (sub as any).businesses;
    if (!biz || biz.subscription_status === "expired") {
      skipped++;
      continue;
    }

    // Fetch today's data for this business
    const [salesRes, lowStockRes, debtsRes] = await Promise.all([
      supabase
        .from("sales")
        .select("total, staff_id, staff_members(name)")
        .eq("business_id", sub.business_id)
        .gte("logged_at", today)
        .eq("is_undone", false),
      supabase
        .from("products")
        .select("name, stock_qty")
        .eq("business_id", sub.business_id)
        .lte("stock_qty", 5)
        .eq("is_active", true),
      supabase
        .from("debts")
        .select("amount_owed, amount_paid")
        .eq("business_id", sub.business_id)
        .neq("status", "paid"),
    ]);

    const sales = salesRes.data || [];
    if (sales.length === 0) {
      skipped++;
      continue;
    }

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const outstandingDebt = (debtsRes.data || []).reduce(
      (s, d) => s + (d.amount_owed - d.amount_paid),
      0,
    );

    // Staff breakdown
    const staffMap = new Map<string, { name: string; total: number }>();
    sales.forEach((sale) => {
      const name = (sale as any).staff_members?.name || "Staff";
      const existing = staffMap.get(sale.staff_id) || { name, total: 0 };
      staffMap.set(sale.staff_id, {
        ...existing,
        total: existing.total + sale.total,
      });
    });
    const staffParts = Array.from(staffMap.values())
      .sort((a, b) => b.total - a.total)
      .map((s) => `${s.name} ₦${Math.round(s.total / 1000)}k`)
      .join(" · ");

    const lowStockPart =
      (lowStockRes.data || []).length > 0
        ? ` · ${lowStockRes.data!.length} low stock`
        : "";

    const notificationPayload = JSON.stringify({
      title: `${biz.name} — Daily Summary`,
      body: `${formatNaira(totalRevenue)} from ${sales.length} sales. ${staffParts}${lowStockPart}. Tap to view.`,
      url: "/dashboard",
    });

    try {
      await webpush.sendNotification(
        sub.subscription as any,
        notificationPayload,
      );
      sent++;
    } catch (err: any) {
      console.error(
        `Push failed for business ${sub.business_id}:`,
        err.message,
      );
      // If subscription is invalid/expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("business_id", sub.business_id);
      }
    }
  }

  return NextResponse.json({ sent, skipped });
}

function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}
```

### Step 6.4 — Vercel CRON Config

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

`0 20 * * *` = every day at 20:00 UTC = 21:00 WAT in most of the year. Adjust to `0 19 * * *` (18:00 UTC) if you want exactly 7pm WAT.

**CHECKPOINT 6:** Test the CRON manually by calling `GET /api/cron/daily-summary` with `Authorization: Bearer [your CRON_SECRET]`. Notifications deliver to any device where permission was granted during onboarding. Check Supabase `push_subscriptions` table has a row.

---

## Phase 7 — Inventory, Debts, Staff Pages

### Step 7.1 — Inventory Page

Build at `src/app/(owner)/inventory/page.tsx`. Features:

- Product list with stock counts
- Color-coded stock: red = 0, yellow = at threshold, white = healthy
- +/- buttons to manually adjust stock (for stocktake)
- "Add Product" slide-in form: name, selling price, cost price (optional), opening stock, low-stock threshold
- Products sorted alphabetically
- Search/filter by name (client-side)

Key Supabase calls:

```typescript
// Load products
supabase.from("products").select("*").eq("is_active", true).order("name");

// Add product
supabase.from("products").insert({
  business_id,
  name,
  selling_price,
  cost_price,
  stock_qty,
  low_stock_threshold,
});

// Update stock manually
supabase.from("products").update({ stock_qty: newQty }).eq("id", productId);

// Soft delete product
supabase.from("products").update({ is_active: false }).eq("id", productId);
```

### Step 7.2 — Debts Page

Build at `src/app/(owner)/debts/page.tsx`. Features:

- List of all unpaid and partial debts
- Total outstanding shown at top in yellow
- Per-debt: customer name, phone, amount owed, amount paid, balance, status badge
- "Record Payment" expands inline: enter amount → updates `debts.amount_paid`, inserts `debt_payments` row
- "Log Debt" button opens form: customer name, phone, amount
- Fully paid debts disappear from list (status = 'paid')

Key Supabase calls:

```typescript
// Load active debts
supabase
  .from("debts")
  .select("*")
  .neq("status", "paid")
  .order("created_at", { ascending: false });

// Add debt
supabase.from("debts").insert({
  business_id,
  customer_name,
  customer_phone,
  amount_owed,
  created_by: staffId,
});

// Record payment
supabase
  .from("debts")
  .update({ amount_paid: newTotal, status: newStatus })
  .eq("id", debtId);
supabase
  .from("debt_payments")
  .insert({ debt_id, amount, recorded_by: staffId });
```

### Step 7.3 — Staff Management Page

Build at `src/app/(owner)/staff/page.tsx`. Features:

- List of all active staff members with join date
- Each staff row shows: name, role, status (active/inactive)
- "Invite Staff" form: name + phone → calls `/api/invite/create` → shows copy link
- Deactivate staff: sets `staff_members.is_active = false` (their sales history preserved)
- Cannot deactivate yourself (owner)

Key Supabase calls:

```typescript
// Load staff
supabase
  .from("staff_members")
  .select("*")
  .eq("business_id", businessId)
  .order("joined_at");

// Deactivate staff
supabase.from("staff_members").update({ is_active: false }).eq("id", staffId);
```

### Step 7.4 — Reports Page

Build at `src/app/(owner)/reports/page.tsx`. Features:

- Weekly revenue bar chart (Recharts `BarChart`)
- Top 5 products by revenue this week
- Staff comparison this week vs last week
- Date range selector (this week / last week / this month)

Key Supabase call:

```typescript
// Last 30 days of sales with joins
const thirtyDaysAgo = new Date(
  Date.now() - 30 * 24 * 60 * 60 * 1000,
).toISOString();
supabase
  .from("sales")
  .select("total, logged_at, products(name), staff_members(name)")
  .eq("business_id", businessId)
  .gte("logged_at", thirtyDaysAgo)
  .eq("is_undone", false)
  .order("logged_at");
```

Recharts bar chart setup:

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Data format: [{ day: 'Mon', revenue: 184000 }, ...]

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
    <XAxis dataKey="day" tick={{ fill: '#8A9E8A', fontSize: 12 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: '#8A9E8A', fontSize: 10 }} axisLine={false} tickLine={false}
           tickFormatter={v => `₦${Math.round(v/1000)}k`} />
    <Tooltip
      contentStyle={{ background: '#111711', border: '1px solid #2A362A', borderRadius: 12 }}
      labelStyle={{ color: '#8A9E8A' }}
      formatter={(v: number) => [`₦${v.toLocaleString()}`, 'Revenue']}
    />
    <Bar dataKey="revenue" fill="#00C853" radius={[6, 6, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

**CHECKPOINT 7:** All five owner pages render without errors. Products can be added and stock adjusted. Debts can be logged and payments recorded. Staff page shows invite link generation. Reports page shows chart.

---

## Phase 8 — Paystack Subscription

### Step 8.1 — Trial Expiry Gate

Add this check to the owner layout. If trial is expired and no active subscription, show paywall:

```typescript
// Add to src/app/(owner)/layout.tsx — check subscription status
// Fetch business subscription_status server-side
// If expired → render <PaywallOverlay /> instead of children
// Staff logging still works (different route group)
```

### Step 8.2 — Paystack Integration

```typescript
// src/app/(owner)/billing/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { formatNaira } from '@/lib/utils'

declare global {
  interface Window { PaystackPop: any }
}

export default function BillingPage() {
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)
    // Get user email from Supabase session
  }, [])

  function subscribe(plan: 'business' | 'growth') {
    const amount = plan === 'business' ? 8000 : 15000
    const planCode = plan === 'business'
      ? process.env.NEXT_PUBLIC_PAYSTACK_BUSINESS_PLAN!
      : process.env.NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN!

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail || 'owner@mydailysales.com',
      amount: amount * 100,
      currency: 'NGN',
      plan: planCode,
      callback: async (response: { reference: string }) => {
        // Verify on server
        await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: response.reference }),
        })
        window.location.href = '/dashboard'
      },
      onClose: () => {},
    })
    handler.openIframe()
  }

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto">
      <h1 className="text-[#F0F4F0] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
        Choose a plan
      </h1>
      <p className="text-[#8A9E8A] text-sm mb-8">
        Your 14-day free trial has ended. Subscribe to continue.
      </p>

      <div className="space-y-4">
        {/* Business Plan */}
        <div className="bg-[#111711] border-2 border-[#00C853] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[#F0F4F0] font-semibold text-lg">Business</p>
              <p className="text-[#8A9E8A] text-sm">Up to 3 staff</p>
            </div>
            <div className="text-right">
              <p className="text-[#00C853] text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                ₦8,000
              </p>
              <p className="text-[#8A9E8A] text-xs">per month</p>
            </div>
          </div>
          <button
            onClick={() => subscribe('business')}
            className="w-full bg-[#00C853] text-black font-semibold py-3 rounded-xl"
          >
            Subscribe — ₦8,000/month
          </button>
        </div>

        {/* Growth Plan */}
        <div className="bg-[#111711] border border-[#2A362A] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[#F0F4F0] font-semibold text-lg">Growth</p>
              <p className="text-[#8A9E8A] text-sm">Up to 8 staff · PDF reports</p>
            </div>
            <div className="text-right">
              <p className="text-[#F0F4F0] text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                ₦15,000
              </p>
              <p className="text-[#8A9E8A] text-xs">per month</p>
            </div>
          </div>
          <button
            onClick={() => subscribe('growth')}
            className="w-full bg-[#1A221A] text-[#F0F4F0] font-semibold py-3 rounded-xl
                       border border-[#2A362A]"
          >
            Subscribe — ₦15,000/month
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 8.3 — Paystack Webhook

```typescript
// src/app/api/paystack/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  // Verify webhook is from Paystack
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (
    event.event === "subscription.create" ||
    event.event === "charge.success"
  ) {
    const customerEmail = event.data?.customer?.email;
    if (customerEmail) {
      // Find business by owner email and update subscription status
      const { data: user } =
        await supabase.auth.admin.getUserByEmail(customerEmail);
      if (user?.user) {
        const { data: staff } = await supabase
          .from("staff_members")
          .select("business_id")
          .eq("user_id", user.user.id)
          .eq("role", "owner")
          .single();

        if (staff) {
          await supabase
            .from("businesses")
            .update({ subscription_status: "active" })
            .eq("id", staff.business_id);
        }
      }
    }
  }

  if (event.event === "subscription.disable") {
    // Handle cancellation — set to expired
    const customerEmail = event.data?.customer?.email;
    // Same lookup, set subscription_status = 'expired'
  }

  return NextResponse.json({ received: true });
}
```

**CHECKPOINT 8:** Paystack popup opens when subscribe is clicked. After payment, webhook fires, `businesses.subscription_status` updates to `active`. Paywall disappears.

---

## Phase 9 — Final Polish

### Step 9.1 — next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Step 9.2 — Error States

Every page must have these three states handled before launch:

1. **Loading state:** Skeleton cards (grey animated boxes) while data fetches
2. **Empty state:** Helpful message + action when list is empty (e.g. "No products yet. Add your first product.")
3. **Error state:** "Something went wrong. Tap to retry." with a retry button

### Step 9.3 — Environment Variables for Production

Add these to Vercel project settings (not just `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
CRON_SECRET
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_BUSINESS_PLAN
NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN
NEXT_PUBLIC_APP_URL  (set to your production domain)
```

### Step 9.4 — Supabase Realtime Permissions

In Supabase Dashboard → Database → Replication, enable realtime for the `sales` table. This is required for the live feed to work.

---

## Final Build Checklist

### Week 1 — Foundation ✓ when:

- [ ] Next.js project runs locally with no TypeScript errors
- [ ] Supabase schema deployed, all 9 tables exist
- [ ] RLS policies applied — test that user A cannot see user B's data
- [ ] Auth flow: signup → OTP → onboarding → dashboard
- [ ] Service worker registered, manifest linked
- [ ] Deployed to Vercel production URL

### Week 2 — Core Staff Flow ✓ when:

- [ ] Staff invite link generated and accepted
- [ ] Staff sees product grid on `/log-sale`
- [ ] Sale logs to Supabase with correct staff_id and business_id
- [ ] Stock decrements on sale confirm
- [ ] Undo works within 5 minutes, reverses stock
- [ ] Staff today total updates after each sale

### Week 3 — Owner Dashboard ✓ when:

- [ ] Dashboard loads today's revenue, sales count, debt total, low stock count
- [ ] Realtime feed updates within 2 seconds of staff logging a sale
- [ ] Staff breakdown shows correct per-staff totals
- [ ] Low stock alert appears when products ≤ threshold

### Week 4 — Notifications ✓ when:

- [ ] Onboarding requests push permission and saves subscription to Supabase
- [ ] iOS users see install prompt before permission request
- [ ] Service worker handles `push` event and shows notification
- [ ] Tapping notification opens dashboard
- [ ] CRON route sends correct payload when called manually
- [ ] `push_subscriptions` table populated correctly

### Week 5 — Inventory, Debts, Staff ✓ when:

- [ ] Owner can add products, edit stock, soft-delete products
- [ ] Debts page shows all outstanding, total, and per-debt history
- [ ] Partial payments work — status moves to `partial` then `paid`
- [ ] Staff page shows active staff and generates invite links
- [ ] Reports page shows weekly chart

### Week 6 — Monetization + Launch ✓ when:

- [ ] 14-day trial auto-starts on signup
- [ ] Trial expiry shows paywall to owner (staff logging unaffected)
- [ ] Paystack popup opens, payment completes, subscription_status updates
- [ ] Paystack webhook verified with signature check
- [ ] All pages have loading, empty, and error states
- [ ] Lighthouse PWA score > 85
- [ ] 10 real businesses onboarded and using it daily

---

_MyDailySales Implementation Guide · Final Edition · June 2026_
_For AI coding agent and developer use · Internal only_
