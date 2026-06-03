# MyDailySales — Full Implementation Guide
> Stage 1 MVP · WhatsApp Bot + Supabase Backend + Minimal Dashboard
> Prepared for AI Coding Agent · June 2026

---

## 0. PROJECT OVERVIEW

**What you are building:**
A WhatsApp-first sales tracker for Nigerian shop owners. Merchants text structured commands to a WhatsApp bot number. The bot parses commands, writes to Supabase, and replies with instant confirmations. A minimal Next.js dashboard shows a read-only view of their data.

**Stack:**
- Framework: Next.js 14 (App Router) + TypeScript
- Database: Supabase (PostgreSQL + Row Level Security)
- WhatsApp: Meta Cloud API (inbound webhook only in Stage 1)
- Hosting: Vercel
- Styling: Tailwind CSS
- Payments: NOT in Stage 1 (Paystack comes in Stage 2)

**Repo structure to create:**
```
mydailysales/
├── app/
│   ├── api/
│   │   ├── whatsapp/
│   │   │   └── route.ts          ← Meta webhook (GET verify + POST receive)
│   │   └── dashboard/
│   │       ├── summary/route.ts  ← Dashboard data API
│   │       └── products/route.ts
│   ├── dashboard/
│   │   └── page.tsx              ← Minimal read-only dashboard
│   ├── layout.tsx
│   └── page.tsx                  ← Landing / login by phone
├── lib/
│   ├── supabase.ts               ← Supabase client
│   ├── whatsapp.ts               ← Meta API reply sender
│   ├── parser.ts                 ← Command parser (deterministic)
│   ├── fuzzy.ts                  ← Fuzzy product/name matching
│   ├── handlers/
│   │   ├── sell.ts
│   │   ├── debt.ts
│   │   ├── paid.ts
│   │   ├── stock.ts
│   │   ├── undo.ts
│   │   ├── summary.ts
│   │   ├── history.ts
│   │   ├── debts.ts
│   │   ├── help.ts
│   │   └── onboarding.ts
│   └── types.ts                  ← All shared types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local
└── package.json
```

---

## 1. ENVIRONMENT VARIABLES

Create `.env.local` with these exact keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Meta / WhatsApp Cloud API
META_WHATSAPP_TOKEN=your-permanent-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
META_WEBHOOK_VERIFY_TOKEN=a-random-secret-string-you-choose

# App
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

**How to get these values:**
1. Supabase: Create project at supabase.com → Settings → API
2. Meta: Create app at developers.facebook.com → Add WhatsApp product → get Phone Number ID and generate permanent token → set up webhook

---

## 2. SUPABASE SCHEMA

File: `supabase/migrations/001_initial_schema.sql`

Run this entire file in Supabase SQL Editor:

```sql
-- =============================================
-- MERCHANTS
-- One row per WhatsApp number = one business
-- =============================================
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT UNIQUE NOT NULL,    -- E.164 format: +2348012345678
  business_name   TEXT,
  onboarding_step TEXT DEFAULT 'start',    -- 'start' | 'naming' | 'adding_products' | 'complete'
  trial_start     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCTS
-- Each merchant's product catalog
-- =============================================
CREATE TABLE products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  price                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_qty            INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, name)
);

-- =============================================
-- SALES LOG
-- Every sale ever logged, with soft-delete for undo
-- =============================================
CREATE TABLE sales_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,              -- denormalized snapshot at time of sale
  qty_sold    INTEGER NOT NULL,
  price_each  NUMERIC(12, 2) NOT NULL,
  total       NUMERIC(12, 2) GENERATED ALWAYS AS (qty_sold * price_each) STORED,
  undone      BOOLEAN NOT NULL DEFAULT FALSE,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CREDIT BOOK
-- Customer debts. One row per debt entry.
-- =============================================
CREATE TABLE credit_book (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount_owed   NUMERIC(12, 2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unpaid'  CHECK (status IN ('unpaid', 'paid')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_sales_merchant_date ON sales_log(merchant_id, logged_at DESC);
CREATE INDEX idx_sales_undone ON sales_log(merchant_id, undone);
CREATE INDEX idx_credit_merchant ON credit_book(merchant_id, status);
CREATE INDEX idx_products_merchant ON products(merchant_id);

-- =============================================
-- ROW LEVEL SECURITY
-- The webhook uses service_role key so RLS is bypassed.
-- Dashboard uses anon key so RLS applies.
-- =============================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_book ENABLE ROW LEVEL SECURITY;

-- For the dashboard: user can only see their own data
-- (Dashboard identifies user by phone stored in localStorage after OTP — Stage 2)
-- For Stage 1, dashboard uses service_role key directly (acceptable for 10 beta users)
```

---

## 3. SUPABASE CLIENT

File: `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

// Use service role key on server (webhook, API routes) — bypasses RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Use anon key on client (dashboard)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 4. SHARED TYPES

File: `lib/types.ts`

```typescript
export type OnboardingStep = 'start' | 'naming' | 'adding_products' | 'complete'

export interface Merchant {
  id: string
  phone: string
  business_name: string | null
  onboarding_step: OnboardingStep
  trial_start: string
  created_at: string
}

export interface Product {
  id: string
  merchant_id: string
  name: string
  price: number
  stock_qty: number
  low_stock_threshold: number
}

export interface SaleLog {
  id: string
  merchant_id: string
  product_id: string
  product_name: string
  qty_sold: number
  price_each: number
  total: number
  undone: boolean
  logged_at: string
}

export interface CreditEntry {
  id: string
  merchant_id: string
  customer_name: string
  amount_owed: number
  status: 'unpaid' | 'paid'
  created_at: string
  paid_at: string | null
}

// Command parser output
export type ParsedCommand =
  | { type: 'sell'; product: string; qty: number; price: number; time?: string }
  | { type: 'debt'; name: string; amount: number }
  | { type: 'paid'; name: string; amount: number }
  | { type: 'stock_add'; product: string; qty: number }
  | { type: 'stock_check'; product?: string }
  | { type: 'undo' }
  | { type: 'summary' }
  | { type: 'debts' }
  | { type: 'history' }
  | { type: 'help' }
  | { type: 'add_product'; name: string; price: number; qty: number }  // onboarding
  | { type: 'done' }                                                    // onboarding
  | { type: 'unknown'; raw: string }
```

---

## 5. COMMAND PARSER

File: `lib/parser.ts`

This is the most critical file. It must be deterministic — no AI/NLP. Every supported command has an exact regex pattern.

```typescript
import { ParsedCommand } from './types'

// Normalize: lowercase, trim, collapse whitespace
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Extract optional @time tag from command: "sell garri 5 500 @2pm" → "2pm"
function extractTime(text: string): { cleaned: string; time?: string } {
  const timeMatch = text.match(/@(\S+)$/)
  if (timeMatch) {
    return { cleaned: text.replace(/@\S+$/, '').trim(), time: timeMatch[1] }
  }
  return { cleaned: text }
}

// Parse Nigerian number formats: "2500", "2,500", "2500naira", "2500 naira", "#2500"
function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/naira|₦|#/gi, '')
    .replace(/,/g, '')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function parseCommand(rawText: string): ParsedCommand {
  const { cleaned: text, time } = extractTime(normalize(rawText))

  // ── SELL ──────────────────────────────────────────
  // sell <product> <qty> <price>
  // Accepts: "sell garri 5 500", "sell garri 5 500naira"
  const sellMatch = text.match(/^sell\s+(.+?)\s+(\d+)\s+(.+)$/)
  if (sellMatch) {
    const product = sellMatch[1].trim()
    const qty = parseInt(sellMatch[2], 10)
    const price = parseAmount(sellMatch[3])
    if (qty > 0 && price !== null && price > 0) {
      return { type: 'sell', product, qty, price, time }
    }
  }

  // ── DEBT ──────────────────────────────────────────
  // debt <name> <amount>
  const debtMatch = text.match(/^debt\s+(.+?)\s+(\S+)$/)
  if (debtMatch) {
    const name = debtMatch[1].trim()
    const amount = parseAmount(debtMatch[2])
    if (name && amount !== null && amount > 0) {
      return { type: 'debt', name, amount }
    }
  }

  // ── PAID ──────────────────────────────────────────
  // paid <name> <amount>
  const paidMatch = text.match(/^paid\s+(.+?)\s+(\S+)$/)
  if (paidMatch) {
    const name = paidMatch[1].trim()
    const amount = parseAmount(paidMatch[2])
    if (name && amount !== null && amount > 0) {
      return { type: 'paid', name, amount }
    }
  }

  // ── STOCK ADD ────────────────────────────────────
  // stock add <product> <qty>
  const stockAddMatch = text.match(/^stock\s+add\s+(.+?)\s+(\d+)$/)
  if (stockAddMatch) {
    const product = stockAddMatch[1].trim()
    const qty = parseInt(stockAddMatch[2], 10)
    if (product && qty > 0) {
      return { type: 'stock_add', product, qty }
    }
  }

  // ── STOCK CHECK ──────────────────────────────────
  // stock check [product]  OR  stock  (no product = show all)
  if (text === 'stock') return { type: 'stock_check' }
  const stockCheckMatch = text.match(/^stock\s+check(?:\s+(.+))?$/)
  if (stockCheckMatch) {
    return { type: 'stock_check', product: stockCheckMatch[1]?.trim() }
  }

  // ── UNDO ─────────────────────────────────────────
  if (text === 'undo') return { type: 'undo' }

  // ── SUMMARY ──────────────────────────────────────
  if (text === 'summary' || text === 'report') return { type: 'summary' }

  // ── DEBTS ────────────────────────────────────────
  if (text === 'debts' || text === 'debt list' || text === 'owing') {
    return { type: 'debts' }
  }

  // ── HISTORY ──────────────────────────────────────
  if (text === 'history' || text === 'log') return { type: 'history' }

  // ── HELP ─────────────────────────────────────────
  if (text === 'help' || text === 'menu' || text === 'commands') {
    return { type: 'help' }
  }

  // ── ONBOARDING: ADD PRODUCT ──────────────────────
  // add <product> <price> <qty>
  const addProductMatch = text.match(/^add\s+(.+?)\s+(\S+)\s+(\d+)$/)
  if (addProductMatch) {
    const name = addProductMatch[1].trim()
    const price = parseAmount(addProductMatch[2])
    const qty = parseInt(addProductMatch[3], 10)
    if (name && price !== null && price > 0 && qty >= 0) {
      return { type: 'add_product', name, price, qty }
    }
  }

  // ── ONBOARDING: DONE ─────────────────────────────
  if (text === 'done' || text === 'finish' || text === 'complete') {
    return { type: 'done' }
  }

  // ── UNKNOWN ──────────────────────────────────────
  return { type: 'unknown', raw: rawText }
}
```

---

## 6. FUZZY MATCHING

File: `lib/fuzzy.ts`

Used for product names and customer names. Prevents "garri" vs "Garri" vs "gari" from creating duplicate records.

```typescript
// Levenshtein distance between two strings
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// Find best match from a list of names
// Returns the match if distance is ≤ 2 (allows 1-2 typos), null otherwise
export function findBestMatch(
  input: string,
  candidates: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalInput = input.toLowerCase().trim()

  // Exact match first
  const exact = candidates.find(c => c.name.toLowerCase() === normalInput)
  if (exact) return exact

  // Fuzzy match
  let bestMatch: { id: string; name: string } | null = null
  let bestDist = Infinity

  for (const candidate of candidates) {
    const dist = levenshtein(normalInput, candidate.name.toLowerCase())
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = candidate
    }
  }

  // Only accept if distance is small enough relative to name length
  const threshold = Math.min(2, Math.floor(normalInput.length / 3))
  return bestDist <= threshold ? bestMatch : null
}

// Normalize a customer name for matching (used in debt lookup)
export function normalizeCustomerName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
```

---

## 7. WHATSAPP REPLY SENDER

File: `lib/whatsapp.ts`

```typescript
const META_API_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const response = await fetch(META_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: message, preview_url: false },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('WhatsApp send failed:', error)
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }
}

// Format naira amounts: 14500 → "₦14,500"
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}
```

---

## 8. COMMAND HANDLERS

### 8a. Onboarding Handler

File: `lib/handlers/onboarding.ts`

This handles the conversation flow for new merchants before they can use commands.

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage } from '../whatsapp'
import { ParsedCommand, Merchant } from '../types'

export async function handleOnboarding(
  merchant: Merchant | null,
  phone: string,
  message: string,
  parsed: ParsedCommand
): Promise<void> {

  // ── BRAND NEW MERCHANT (first ever message) ──────
  if (!merchant) {
    // Create merchant record in 'naming' step
    await supabaseAdmin.from('merchants').insert({
      phone,
      onboarding_step: 'naming',
    })

    await sendWhatsAppMessage(phone,
      `👋 Welcome to MyDailySales!\n\n` +
      `I help you track sales, stock, and customer debts — all from WhatsApp.\n\n` +
      `Let's set you up in 2 minutes.\n\n` +
      `*What is your business name?*`
    )
    return
  }

  // ── STEP: WAITING FOR BUSINESS NAME ─────────────
  if (merchant.onboarding_step === 'naming') {
    const businessName = message.trim()
    if (businessName.length < 2) {
      await sendWhatsAppMessage(phone, `Please send your business name (e.g., "FreshMart" or "Mama Chisom Stores")`)
      return
    }

    await supabaseAdmin.from('merchants')
      .update({ business_name: businessName, onboarding_step: 'adding_products' })
      .eq('id', merchant.id)

    await sendWhatsAppMessage(phone,
      `Great! *${businessName}* is set up.\n\n` +
      `Now add your first products. Format:\n` +
      `\`add <name> <price> <qty>\`\n\n` +
      `Example: \`add garri 500 20\`\n\n` +
      `Add at least 1 product, then type *done* when finished.`
    )
    return
  }

  // ── STEP: ADDING PRODUCTS ────────────────────────
  if (merchant.onboarding_step === 'adding_products') {

    if (parsed.type === 'add_product') {
      // Check for duplicate product name
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('merchant_id', merchant.id)
        .ilike('name', parsed.name)
        .single()

      if (existing) {
        await sendWhatsAppMessage(phone, `⚠️ You already have a product called "${parsed.name}". Try a different name or type *done* to finish.`)
        return
      }

      await supabaseAdmin.from('products').insert({
        merchant_id: merchant.id,
        name: parsed.name,
        price: parsed.price,
        stock_qty: parsed.qty,
      })

      await sendWhatsAppMessage(phone,
        `✅ *${parsed.name}* added.\n` +
        `Price: ₦${parsed.price.toLocaleString()} | Stock: ${parsed.qty}\n\n` +
        `Add another product or type *done* to finish.`
      )
      return
    }

    if (parsed.type === 'done') {
      // Check they have at least 1 product
      const { count } = await supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchant.id)

      if (!count || count === 0) {
        await sendWhatsAppMessage(phone, `Please add at least 1 product before finishing.\n\nFormat: \`add garri 500 20\``)
        return
      }

      await supabaseAdmin.from('merchants')
        .update({ onboarding_step: 'complete' })
        .eq('id', merchant.id)

      await sendWhatsAppMessage(phone,
        `🎉 *${merchant.business_name}* is ready!\n\n` +
        `Try logging your first sale now:\n` +
        `\`sell <product> <qty> <price>\`\n\n` +
        `Example: \`sell garri 2 500\`\n\n` +
        `Type *help* anytime to see all commands.`
      )
      return
    }

    // They sent something else during product setup
    await sendWhatsAppMessage(phone,
      `To add a product: \`add <name> <price> <qty>\`\n` +
      `Example: \`add garri 500 20\`\n\n` +
      `Type *done* when you've added all your products.`
    )
    return
  }
}
```

---

### 8b. Sell Handler

File: `lib/handlers/sell.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handleSell(
  merchant: Merchant,
  productInput: string,
  qty: number,
  price: number
): Promise<void> {
  const phone = merchant.phone

  // Load all merchant products for fuzzy matching
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, stock_qty, price')
    .eq('merchant_id', merchant.id)

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(phone,
      `❓ You haven't added any products yet.\n\n` +
      `Add one first: \`add ${productInput} ${price} 10\``
    )
    return
  }

  // Fuzzy match product name
  const match = findBestMatch(productInput, products)

  if (!match) {
    const productList = products.slice(0, 5).map(p => p.name).join(', ')
    await sendWhatsAppMessage(phone,
      `❓ I don't have *"${productInput}"* in your products.\n\n` +
      `Your products: ${productList}\n\n` +
      `Did you mean one of these? Or type \`add ${productInput} ${price} 0\` to create it.`
    )
    return
  }

  const product = products.find(p => p.id === match.id)!

  // Stock warning: selling more than available
  if (product.stock_qty !== null && qty > product.stock_qty && product.stock_qty >= 0) {
    await sendWhatsAppMessage(phone,
      `⚠️ You only have *${product.stock_qty}* ${product.name} in stock.\n\n` +
      `Log ${product.stock_qty} sold, or reply:\n` +
      `\`sell ${product.name} ${product.stock_qty} ${price}\``
    )
    return
  }

  // Write the sale
  await supabaseAdmin.from('sales_log').insert({
    merchant_id: merchant.id,
    product_id: product.id,
    product_name: product.name,
    qty_sold: qty,
    price_each: price,
  })

  // Deduct from stock
  const newStock = Math.max(0, (product.stock_qty || 0) - qty)
  await supabaseAdmin.from('products')
    .update({ stock_qty: newStock })
    .eq('id', product.id)

  // Get today's total (excluding undone)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('total')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + (s.total || 0), 0)
  const saleTotal = qty * price

  let reply = `✅ Sold *${qty} ${product.name}* @ ${formatNaira(price)} each = *${formatNaira(saleTotal)}*\n`
  reply += `Stock left: ${newStock} ${newStock <= 0 ? '— *OUT OF STOCK* ⚠️' : ''}\n`
  reply += `Today total: *${formatNaira(todayTotal)}*`

  if (newStock > 0 && newStock <= (product.low_stock_threshold || 5)) {
    reply += `\n\n⚠️ *Low stock warning:* Only ${newStock} ${product.name} left. Restock soon.`
  }

  await sendWhatsAppMessage(phone, reply)
}
```

---

### 8c. Debt Handler

File: `lib/handlers/debt.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleDebt(
  merchant: Merchant,
  customerName: string,
  amount: number
): Promise<void> {
  const phone = merchant.phone

  // Insert new debt entry
  await supabaseAdmin.from('credit_book').insert({
    merchant_id: merchant.id,
    customer_name: customerName,
    amount_owed: amount,
    status: 'unpaid',
  })

  // Get total owed to this merchant
  const { data: allDebts } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const totalOwed = (allDebts || []).reduce((sum, d) => sum + d.amount_owed, 0)

  await sendWhatsAppMessage(phone,
    `📝 *${customerName}* owes ${formatNaira(amount)}.\n` +
    `Total owed to you: *${formatNaira(totalOwed)}*\n\n` +
    `When they pay, type: \`paid ${customerName} ${amount}\``
  )
}
```

---

### 8d. Paid Handler

File: `lib/handlers/paid.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handlePaid(
  merchant: Merchant,
  customerInput: string,
  amount: number
): Promise<void> {
  const phone = merchant.phone

  // Get all unpaid debts for this merchant
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('id, customer_name, amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  if (!unpaidDebts || unpaidDebts.length === 0) {
    await sendWhatsAppMessage(phone, `✅ You have no outstanding debts recorded.`)
    return
  }

  // Deduplicate by name for fuzzy match
  const uniqueNames = [...new Map(unpaidDebts.map(d => [d.customer_name, { id: d.id, name: d.customer_name }])).values()]
  const match = findBestMatch(customerInput, uniqueNames)

  if (!match) {
    const names = unpaidDebts.slice(0, 5).map(d => d.customer_name).join(', ')
    await sendWhatsAppMessage(phone,
      `❓ I don't have a debt for *"${customerInput}"*.\n\n` +
      `People who owe you: ${names}\n\n` +
      `Type *debts* to see the full list.`
    )
    return
  }

  // Mark ALL debts from this customer as paid (full payment MVP)
  const customerDebts = unpaidDebts.filter(d => d.customer_name.toLowerCase() === match.name.toLowerCase())
  const totalPaid = customerDebts.reduce((sum, d) => sum + d.amount_owed, 0)

  await supabaseAdmin.from('credit_book')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .ilike('customer_name', match.name)

  // Get remaining total
  const { data: remaining } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const stillOwed = (remaining || []).reduce((sum, d) => sum + d.amount_owed, 0)

  await sendWhatsAppMessage(phone,
    `✅ *${match.name}* has paid ${formatNaira(totalPaid)}. Debt cleared.\n\n` +
    `Total still owed to you: *${formatNaira(stillOwed)}*`
  )
}
```

---

### 8e. Stock Handler

File: `lib/handlers/stock.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handleStockAdd(
  merchant: Merchant,
  productInput: string,
  qty: number
): Promise<void> {
  const phone = merchant.phone

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, stock_qty')
    .eq('merchant_id', merchant.id)

  const match = findBestMatch(productInput, products || [])

  if (!match) {
    await sendWhatsAppMessage(phone,
      `❓ Product *"${productInput}"* not found.\n\n` +
      `To create it: \`add ${productInput} <price> ${qty}\``
    )
    return
  }

  const product = (products || []).find(p => p.id === match.id)!
  const newQty = (product.stock_qty || 0) + qty

  await supabaseAdmin.from('products')
    .update({ stock_qty: newQty })
    .eq('id', product.id)

  await sendWhatsAppMessage(phone,
    `✅ Added *${qty}* ${product.name}.\n` +
    `New stock: *${newQty}*`
  )
}

export async function handleStockCheck(
  merchant: Merchant,
  productInput?: string
): Promise<void> {
  const phone = merchant.phone

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, stock_qty, price, low_stock_threshold')
    .eq('merchant_id', merchant.id)
    .order('name')

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(phone, `You haven't added any products yet.\n\nAdd one: \`add garri 500 20\``)
    return
  }

  if (productInput) {
    const match = findBestMatch(productInput, products.map(p => ({ id: p.name, name: p.name })))
    const product = products.find(p => p.name.toLowerCase() === match?.name?.toLowerCase())

    if (!product) {
      await sendWhatsAppMessage(phone, `❓ Product *"${productInput}"* not found.`)
      return
    }

    const status = product.stock_qty <= 0 ? '🔴 OUT' : product.stock_qty <= (product.low_stock_threshold || 5) ? '🟡 LOW' : '🟢'
    await sendWhatsAppMessage(phone,
      `📦 *${product.name}*\n` +
      `Stock: ${product.stock_qty} ${status}\n` +
      `Price: ${formatNaira(product.price)}`
    )
    return
  }

  // Show all products
  const lines = products.map(p => {
    const status = p.stock_qty <= 0 ? '🔴 OUT' : p.stock_qty <= (p.low_stock_threshold || 5) ? '🟡' : '🟢'
    return `${status} *${p.name}*: ${p.stock_qty} left`
  })

  await sendWhatsAppMessage(phone, `📦 *Your Stock*\n\n${lines.join('\n')}`)
}
```

---

### 8f. Undo Handler

File: `lib/handlers/undo.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleUndo(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  // Get the most recent non-undone sale
  const { data: lastSale } = await supabaseAdmin
    .from('sales_log')
    .select('*')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastSale) {
    await sendWhatsAppMessage(phone, `↩ Nothing to undo. No sales logged yet today.`)
    return
  }

  // Soft-delete the sale
  await supabaseAdmin.from('sales_log')
    .update({ undone: true })
    .eq('id', lastSale.id)

  // Restore stock
  await supabaseAdmin.from('products')
    .update({ stock_qty: supabaseAdmin.rpc as any }) // handled below

  // Restore stock manually
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('stock_qty')
    .eq('id', lastSale.product_id)
    .single()

  if (product) {
    await supabaseAdmin.from('products')
      .update({ stock_qty: (product.stock_qty || 0) + lastSale.qty_sold })
      .eq('id', lastSale.product_id)
  }

  // Get new today's total
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('total')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + (s.total || 0), 0)

  const loggedAt = new Date(lastSale.logged_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })

  await sendWhatsAppMessage(phone,
    `↩ *Done. Last entry reversed.*\n\n` +
    `Removed: Sold ${lastSale.qty_sold} ${lastSale.product_name} @ ${formatNaira(lastSale.price_each)} (logged ${loggedAt})\n\n` +
    `Today total: *${formatNaira(todayTotal)}*`
  )
}
```

---

### 8g. Summary Handler

File: `lib/handlers/summary.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleSummary(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Today's sales
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('total, product_name, qty_sold')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())

  const totalRevenue = (todaysSales || []).reduce((sum, s) => sum + (s.total || 0), 0)
  const totalTransactions = (todaysSales || []).length

  // Outstanding debts
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const totalOwed = (unpaidDebts || []).reduce((sum, d) => sum + d.amount_owed, 0)

  // Out of stock products
  const { data: outOfStock } = await supabaseAdmin
    .from('products')
    .select('name')
    .eq('merchant_id', merchant.id)
    .eq('stock_qty', 0)

  let reply = `📊 *${merchant.business_name} — Today's Summary*\n`
  reply += `─────────────────────\n`
  reply += `💰 Sales: *${formatNaira(totalRevenue)}* (${totalTransactions} transactions)\n`
  reply += `📋 Debts owed to you: *${formatNaira(totalOwed)}*\n`

  if (outOfStock && outOfStock.length > 0) {
    const names = outOfStock.map(p => p.name).join(', ')
    reply += `🔴 Out of stock: ${names}\n`
  }

  if (totalRevenue === 0 && totalTransactions === 0) {
    reply += `\n_No sales logged today yet._`
  }

  reply += `\nType *history* to see recent entries.`

  await sendWhatsAppMessage(phone, reply)
}
```

---

### 8h. History Handler

File: `lib/handlers/history.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleHistory(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const { data: recent } = await supabaseAdmin
    .from('sales_log')
    .select('product_name, qty_sold, price_each, total, logged_at, undone')
    .eq('merchant_id', merchant.id)
    .order('logged_at', { ascending: false })
    .limit(5)

  if (!recent || recent.length === 0) {
    await sendWhatsAppMessage(phone, `No sales logged yet. Type \`sell <product> <qty> <price>\` to start.`)
    return
  }

  const lines = recent.map(s => {
    const time = new Date(s.logged_at).toLocaleString('en-NG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    const undoneTag = s.undone ? ' _(undone)_' : ''
    return `• ${s.qty_sold}x ${s.product_name} @ ${formatNaira(s.price_each)} = *${formatNaira(s.total)}*${undoneTag}\n  _${time}_`
  })

  await sendWhatsAppMessage(phone, `🕐 *Last ${recent.length} entries:*\n\n${lines.join('\n\n')}`)
}
```

---

### 8i. Debts List Handler

File: `lib/handlers/debts.ts`

```typescript
import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleDebtsList(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const { data: unpaid } = await supabaseAdmin
    .from('credit_book')
    .select('customer_name, amount_owed, created_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .order('amount_owed', { ascending: false })

  if (!unpaid || unpaid.length === 0) {
    await sendWhatsAppMessage(phone, `✅ No outstanding debts. Everyone has paid up!`)
    return
  }

  const total = unpaid.reduce((sum, d) => sum + d.amount_owed, 0)
  const lines = unpaid.map(d => `• *${d.customer_name}*: ${formatNaira(d.amount_owed)}`)

  await sendWhatsAppMessage(phone,
    `📋 *Outstanding Debts*\n\n` +
    `${lines.join('\n')}\n\n` +
    `Total owed to you: *${formatNaira(total)}*\n\n` +
    `To mark paid: \`paid <name> <amount>\``
  )
}
```

---

### 8j. Help Handler

File: `lib/handlers/help.ts`

```typescript
import { sendWhatsAppMessage } from '../whatsapp'
import { Merchant } from '../types'

export async function handleHelp(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const helpText =
    `📖 *MyDailySales Commands*\n\n` +
    `*Log a sale:*\n\`sell <product> <qty> <price>\`\n_sell garri 5 500_\n\n` +
    `*Record a debt:*\n\`debt <name> <amount>\`\n_debt Emeka 3000_\n\n` +
    `*Mark debt paid:*\n\`paid <name> <amount>\`\n_paid Emeka 3000_\n\n` +
    `*Add stock:*\n\`stock add <product> <qty>\`\n_stock add garri 20_\n\n` +
    `*Check stock:*\n\`stock check\` or \`stock check garri\`\n\n` +
    `*Today's summary:*\n\`summary\`\n\n` +
    `*All debts:*\n\`debts\`\n\n` +
    `*Recent entries:*\n\`history\`\n\n` +
    `*Undo last sale:*\n\`undo\`\n\n` +
    `─────────────────────\n` +
    `Need help? Type your question and we'll guide you.`

  await sendWhatsAppMessage(phone, helpText)
}
```

---

## 9. MAIN WEBHOOK ROUTE

File: `app/api/whatsapp/route.ts`

This is the central entry point for all WhatsApp messages. It handles Meta's GET verification request and the POST message delivery.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseCommand } from '@/lib/parser'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { handleOnboarding } from '@/lib/handlers/onboarding'
import { handleSell } from '@/lib/handlers/sell'
import { handleDebt } from '@/lib/handlers/debt'
import { handlePaid } from '@/lib/handlers/paid'
import { handleStockAdd, handleStockCheck } from '@/lib/handlers/stock'
import { handleUndo } from '@/lib/handlers/undo'
import { handleSummary } from '@/lib/handlers/summary'
import { handleHistory } from '@/lib/handlers/history'
import { handleDebtsList } from '@/lib/handlers/debts'
import { handleHelp } from '@/lib/handlers/help'

// ── GET: Meta webhook verification ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST: Receive inbound WhatsApp messages ──────────────────────────
export async function POST(req: NextRequest) {
  // Always return 200 immediately (Meta requires fast response to avoid retries)
  const body = await req.json()

  // Process asynchronously — don't await
  processMessage(body).catch(err => console.error('Message processing error:', err))

  return new NextResponse('OK', { status: 200 })
}

async function processMessage(body: any): Promise<void> {
  try {
    // Navigate Meta's nested payload structure
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // Only handle actual incoming messages (ignore status updates)
    if (!value?.messages || value.messages.length === 0) return
    if (value.statuses) return  // delivery receipts — skip

    const message = value.messages[0]

    // Only handle text messages (ignore voice notes, images, etc. in Stage 1)
    if (message.type !== 'text') {
      const phone = message.from
      await sendWhatsAppMessage(phone,
        `Hi! I can only read text messages for now.\n\n` +
        `Type *help* to see what I can do.`
      )
      return
    }

    const phone = message.from         // E.164 format: 2348012345678
    const text = message.text.body     // Raw message text

    // Load merchant by phone number
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('phone', phone)
      .single()

    // Route: onboarding vs. main commands
    const isNewMerchant = !merchant
    const isOnboarding = !merchant || merchant.onboarding_step !== 'complete'

    if (isOnboarding) {
      const parsed = parseCommand(text)
      await handleOnboarding(merchant, phone, text, parsed)
      return
    }

    // ── Parse and route command ────────────────────────────────────
    const parsed = parseCommand(text)

    switch (parsed.type) {
      case 'sell':
        await handleSell(merchant, parsed.product, parsed.qty, parsed.price)
        break

      case 'debt':
        await handleDebt(merchant, parsed.name, parsed.amount)
        break

      case 'paid':
        await handlePaid(merchant, parsed.name, parsed.amount)
        break

      case 'stock_add':
        await handleStockAdd(merchant, parsed.product, parsed.qty)
        break

      case 'stock_check':
        await handleStockCheck(merchant, parsed.product)
        break

      case 'undo':
        await handleUndo(merchant)
        break

      case 'summary':
        await handleSummary(merchant)
        break

      case 'debts':
        await handleDebtsList(merchant)
        break

      case 'history':
        await handleHistory(merchant)
        break

      case 'help':
        await handleHelp(merchant)
        break

      case 'unknown':
      default:
        // Smart error: try to suggest the closest command
        await handleUnknownCommand(merchant.phone, text)
        break
    }
  } catch (error) {
    console.error('processMessage error:', error)
    // Don't crash — Meta will retry if we don't return 200
  }
}

async function handleUnknownCommand(phone: string, rawText: string): Promise<void> {
  const lower = rawText.toLowerCase().trim()

  // Try to suggest the closest matching command
  let suggestion = ''
  if (lower.includes('sell') || lower.includes('sold')) {
    suggestion = `\nDid you mean: \`sell <product> <qty> <price>\`?`
  } else if (lower.includes('debt') || lower.includes('owe')) {
    suggestion = `\nDid you mean: \`debt <name> <amount>\`?`
  } else if (lower.includes('stock') || lower.includes('inventory')) {
    suggestion = `\nDid you mean: \`stock check\` or \`stock add <product> <qty>\`?`
  }

  await sendWhatsAppMessage(phone,
    `❓ I didn't understand: _"${rawText.substring(0, 50)}"_${suggestion}\n\n` +
    `Type *help* to see all commands with examples.`
  )
}
```

---

## 10. DASHBOARD

### 10a. Dashboard Data API

File: `app/api/dashboard/summary/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 })
  }

  // Get merchant
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Today's sales
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('product_name, qty_sold, price_each, total, logged_at')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())
    .order('logged_at', { ascending: false })

  // Unpaid debts
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('customer_name, amount_owed, created_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .order('amount_owed', { ascending: false })

  // Products with stock
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, stock_qty, price, low_stock_threshold')
    .eq('merchant_id', merchant.id)
    .order('name')

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + s.total, 0)
  const totalOwed = (unpaidDebts || []).reduce((sum, d) => sum + d.amount_owed, 0)

  return NextResponse.json({
    merchant: { business_name: merchant.business_name, phone: merchant.phone },
    today: {
      total: todayTotal,
      transactions: (todaysSales || []).length,
      sales: todaysSales || [],
    },
    debts: {
      total: totalOwed,
      entries: unpaidDebts || [],
    },
    products: products || [],
  })
}
```

---

### 10b. Dashboard Page

File: `app/dashboard/page.tsx`

Minimal read-only dashboard. Phone-number gated (no auth library needed for Stage 1 — just localStorage).

```tsx
'use client'

import { useState, useEffect } from 'react'

interface DashboardData {
  merchant: { business_name: string; phone: string }
  today: { total: number; transactions: number; sales: any[] }
  debts: { total: number; entries: any[] }
  products: any[]
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

export default function DashboardPage() {
  const [phone, setPhone] = useState('')
  const [inputPhone, setInputPhone] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('mds_phone')
    if (saved) {
      setPhone(saved)
      fetchData(saved)
    }
  }, [])

  async function fetchData(ph: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/dashboard/summary?phone=${encodeURIComponent(ph)}`)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      setData(json)
      localStorage.setItem('mds_phone', ph)
      setPhone(ph)
    } catch {
      setError('Phone number not found. Make sure you have texted the bot first.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputPhone.trim()) return
    // Normalize: strip spaces, add country code if missing
    let normalized = inputPhone.replace(/\s+/g, '')
    if (normalized.startsWith('0')) normalized = '234' + normalized.slice(1)
    if (!normalized.startsWith('+')) normalized = normalized
    fetchData(normalized)
  }

  // ── NOT LOGGED IN ────────────────────────────────────────────────
  if (!phone || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0e0c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ background: '#1a1816', padding: '2.5rem', maxWidth: '400px', width: '90%', border: '1px solid #333' }}>
          <div style={{ color: '#c8380a', fontFamily: 'monospace', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>MyDailySales</div>
          <h1 style={{ color: '#f7f3ec', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dashboard</h1>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Enter your WhatsApp number to view your business data</p>

          <form onSubmit={handleSubmit}>
            <input
              type="tel"
              placeholder="0812 345 6789"
              value={inputPhone}
              onChange={e => setInputPhone(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: '#0f0e0c', border: '1px solid #333', color: '#f7f3ec', fontSize: '1rem', marginBottom: '1rem', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', background: '#c8380a', color: '#fff', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {loading ? 'Loading...' : 'View My Dashboard'}
            </button>
          </form>

          {error && <p style={{ color: '#f85149', fontSize: '0.8rem', marginTop: '1rem' }}>{error}</p>}
        </div>
      </div>
    )
  }

  const { merchant, today, debts, products } = data
  const lowStockProducts = products.filter(p => p.stock_qty <= (p.low_stock_threshold || 5) && p.stock_qty > 0)
  const outOfStock = products.filter(p => p.stock_qty <= 0)

  // ── DASHBOARD ────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0f0e0c', minHeight: '100vh', color: '#f7f3ec', fontFamily: 'system-ui', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <div style={{ color: '#c8380a', fontFamily: 'monospace', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>MyDailySales</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{merchant.business_name}</h1>
          </div>
          <button
            onClick={() => { localStorage.removeItem('mds_phone'); setPhone(''); setData(null) }}
            style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            Switch Account
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Today's Sales" value={formatNaira(today.total)} sub={`${today.transactions} transactions`} />
          <StatCard label="Debts Owed to You" value={formatNaira(debts.total)} sub={`${debts.entries.length} customers`} color="#f59e0b" />
          <StatCard label="Products" value={String(products.length)} sub={outOfStock.length > 0 ? `${outOfStock.length} out of stock` : 'All stocked'} />
        </div>

        {/* Alerts */}
        {outOfStock.length > 0 && (
          <div style={{ background: '#2d1a1a', border: '1px solid #c8380a', padding: '1rem 1.2rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            🔴 <strong>Out of stock:</strong> {outOfStock.map((p: any) => p.name).join(', ')}
          </div>
        )}
        {lowStockProducts.length > 0 && (
          <div style={{ background: '#2a2000', border: '1px solid #b85c00', padding: '1rem 1.2rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            🟡 <strong>Low stock:</strong> {lowStockProducts.map((p: any) => `${p.name} (${p.stock_qty})`).join(', ')}
          </div>
        )}

        {/* Today's Sales */}
        <Section title="Today's Sales">
          {today.sales.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.85rem' }}>No sales logged today yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Product', 'Qty', 'Price', 'Total', 'Time'].map(h => (
                    <th key={h} style={{ textAlign: 'left', color: '#666', fontWeight: 600, padding: '0.4rem 0.6rem', borderBottom: '1px solid #222', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {today.sales.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #1a1a1a' }}>{s.product_name}</td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #1a1a1a', color: '#aaa' }}>{s.qty_sold}</td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #1a1a1a', color: '#aaa' }}>{formatNaira(s.price_each)}</td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #1a1a1a', color: '#4ecb82', fontWeight: 700 }}>{formatNaira(s.total)}</td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid #1a1a1a', color: '#666', fontSize: '0.78rem' }}>
                      {new Date(s.logged_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Debts */}
        <Section title={`Outstanding Debts (${formatNaira(debts.total)})`}>
          {debts.entries.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.85rem' }}>No outstanding debts. ✅</p>
          ) : (
            debts.entries.map((d: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a', fontSize: '0.88rem' }}>
                <span>{d.customer_name}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{formatNaira(d.amount_owed)}</span>
              </div>
            ))
          )}
        </Section>

        {/* Stock */}
        <Section title="Stock Levels">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {products.map((p: any, i: number) => {
              const isOut = p.stock_qty <= 0
              const isLow = !isOut && p.stock_qty <= (p.low_stock_threshold || 5)
              const color = isOut ? '#c8380a' : isLow ? '#f59e0b' : '#4ecb82'
              return (
                <div key={i} style={{ background: '#1a1816', border: `1px solid ${color}22`, padding: '0.9rem', position: 'relative' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ color, fontSize: '1.1rem', fontWeight: 800 }}>{p.stock_qty}</div>
                  <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase' }}>in stock</div>
                </div>
              )
            })}
          </div>
        </Section>

        <div style={{ textAlign: 'center', color: '#333', fontSize: '0.7rem', marginTop: '2rem', fontFamily: 'monospace' }}>
          MyDailySales · Dashboard · Data refreshes on page reload
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color = '#4ecb82' }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: '#1a1816', border: '1px solid #2a2826', padding: '1.2rem' }}>
      <div style={{ color: '#666', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: 'monospace' }}>{label}</div>
      <div style={{ color, fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.2rem' }}>{value}</div>
      <div style={{ color: '#555', fontSize: '0.72rem' }}>{sub}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: '1rem', fontFamily: 'monospace' }}>{title}</h2>
      {children}
    </div>
  )
}
```

---

## 11. PACKAGE.JSON DEPENDENCIES

```json
{
  "name": "mydailysales",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.39.0",
    "typescript": "^5"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## 12. VERCEL DEPLOYMENT

### `next.config.ts`
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required to allow Supabase service role key on server
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  }
}

export default nextConfig
```

### Vercel Environment Variables
Add ALL variables from `.env.local` to Vercel project settings → Environment Variables.

### Webhook URL to register with Meta:
```
https://your-project.vercel.app/api/whatsapp
```

---

## 13. META WHATSAPP SETUP CHECKLIST

Complete these steps in order at developers.facebook.com:

```
□ 1. Create Meta Developer App (Business type)
□ 2. Add WhatsApp product to the app
□ 3. Create or connect a Meta Business Account
□ 4. Get a test phone number (free from Meta) OR register your own number
□ 5. Copy the Phone Number ID → META_PHONE_NUMBER_ID
□ 6. Generate a Permanent Access Token → META_WHATSAPP_TOKEN
   (User → System User → Generate Token → Select whatsapp_business_messaging)
□ 7. Deploy to Vercel first, then:
□ 8. Go to WhatsApp → Configuration → Webhook
   URL: https://your-project.vercel.app/api/whatsapp
   Verify Token: (same as META_WEBHOOK_VERIFY_TOKEN in .env)
□ 9. Subscribe to: messages (check this field ONLY)
□ 10. Test by texting the bot number from your personal WhatsApp
```

**Important Stage 1 cost note:** All bot replies are FREE as long as:
- You only reply within the 24-hour window AFTER the merchant messages first
- You never initiate a conversation (no outbound proactive messages)
- This is a "service conversation" which costs ₦0 under Meta's pricing

---

## 14. BUILD ORDER FOR AI CODING AGENT

Execute in this exact sequence to avoid dependency issues:

```
Step 1:  Create Next.js project with TypeScript + Tailwind
Step 2:  Install @supabase/supabase-js
Step 3:  Create .env.local with all variables (use placeholders)
Step 4:  Create lib/types.ts
Step 5:  Create lib/supabase.ts
Step 6:  Create lib/whatsapp.ts
Step 7:  Create lib/parser.ts + write tests for every command pattern
Step 8:  Create lib/fuzzy.ts
Step 9:  Create all lib/handlers/*.ts files (in any order)
Step 10: Create app/api/whatsapp/route.ts (main webhook)
Step 11: Create app/api/dashboard/summary/route.ts
Step 12: Create app/dashboard/page.tsx
Step 13: Run Supabase migration (001_initial_schema.sql)
Step 14: Deploy to Vercel
Step 15: Set up Meta webhook with deployed URL
Step 16: Test full flow: first message → onboarding → sell command → summary
```

---

## 15. TESTING CHECKLIST

Before giving to beta merchants, manually test every path:

```
ONBOARDING
□ New phone number → welcome message received
□ Business name set → products prompt received
□ add garri 500 20 → product added confirmation
□ done → setup complete message + first sale prompt
□ First sale logged → 🎉 first sale message received

COMMANDS
□ sell garri 5 500 → correct confirmation + stock deducted
□ sell garri 100 500 → stock warning (only X in stock)
□ sell kpomo 2 1000 → product not found message
□ sell garri 5 → missing price error message
□ debt Emeka 3000 → debt recorded + total shown
□ paid Emeka 3000 → debt cleared + remaining shown
□ paid Unknown 1000 → customer not found message
□ stock check → all products listed
□ stock check garri → single product shown
□ stock add garri 20 → stock increased
□ summary → today's total + debts + out of stock
□ debts → full debt list
□ history → last 5 sales
□ undo → last sale reversed + stock restored
□ undo (no sales) → "nothing to undo" message
□ help → full command menu

ERROR PATHS
□ Random text → unknown command suggestion
□ Voice note → "text only" message
□ sell garri -5 500 → parser rejects negative qty
□ debt Emeka abc → parser rejects non-numeric amount
```

---

## 16. STAGE 2 ADDITIONS (DO NOT BUILD YET)

These are explicitly NOT in Stage 1. Do not build these until 7/10 beta merchants are active daily users:

- Paystack subscription integration
- Auth system (NextAuth or Supabase Auth) for dashboard
- Weekly/monthly PDF reports
- Partial debt payments
- Multi-staff WhatsApp numbers
- Automated debt reminder messages
- NLP free-text parsing
- Analytics charts
- Referral system

---

*MyDailySales Implementation Guide · v1.0 · June 2026*
*Stage 1 MVP — Behavior Validation Only*
