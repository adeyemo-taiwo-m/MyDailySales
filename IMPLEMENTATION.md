# MyDailySales — Meta WhatsApp Cloud API Implementation Guide

> Stage 1 MVP · WhatsApp Bot (Meta Cloud API) + Supabase + Minimal Dashboard
> Updated Edition — Replaces Baileys with Meta Cloud API
> June 2026

---

## WHAT CHANGED FROM THE BAILEYS GUIDE

1. `lib/whatsapp.ts` — rewritten to call the Meta Graph API instead of a Baileys socket
2. `lib/bot.ts` — **removed** (no persistent WebSocket connection to manage)
3. `server.ts` — **removed** (no custom server needed — standard Next.js works fine)
4. `app/api/whatsapp/route.ts` — **restored** (Meta delivers messages via webhook POST)
5. `lib/router.ts` — simplified (Meta already gives you a plain phone number, no JID to parse)
6. `package.json` — Baileys, pino, and qrcode-terminal dependencies removed

Everything else — Supabase schema, all command handlers, the parser, fuzzy matching, and
the dashboard — is **100% identical**. Do not rewrite anything that worked before.

---

## 0. HOW META CLOUD API WORKS (vs Baileys)

With Baileys:

```
Merchant texts bot → Baileys catches it directly over a WebSocket → you reply via Baileys
```

With Meta Cloud API:

```
Merchant texts bot → Meta's servers receive it → Meta POSTs the message to your
webhook URL → your server replies by calling Meta's Graph API
```

This means your app needs a **public HTTPS endpoint** that Meta can reach — there's no
direct connection to maintain, no QR code, and no session file to keep alive. The
tradeoff is that you need a real, registered WhatsApp Business phone number (not just
any SIM with WhatsApp installed) and a webhook Meta can call.

**Practical upside:** because there's no persistent process to keep running, this no
longer needs a VPS. A standard Vercel deployment (free tier is fine) works, since
webhooks are just serverless API routes.

### Cost note

Meta only charges for **business-initiated** conversations that use message templates
(e.g. proactive reminders). Replies you send within 24 hours of a merchant texting you
first are "service conversations" and are free, with no monthly cap. Since every reply
in this bot is a direct response to something the merchant just typed, this stays
entirely within free service conversations — no template setup or per-message cost,
the same constraint the original Meta build was designed around.

---

## 1. PROJECT STRUCTURE

```
mydailysales/
├── app/
│   ├── api/
│   │   ├── whatsapp/
│   │   │   └── route.ts             ← RESTORED: Meta webhook receiver
│   │   └── dashboard/
│   │       └── summary/route.ts     ← Dashboard data API (unchanged)
│   ├── dashboard/
│   │   └── page.tsx                 ← Minimal dashboard (unchanged)
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── supabase.ts                  ← Supabase client (unchanged)
│   ├── whatsapp.ts                  ← REWRITTEN for Meta Graph API
│   ├── router.ts                    ← Simplified (no JID parsing)
│   ├── parser.ts                    ← Unchanged
│   ├── fuzzy.ts                     ← Unchanged
│   ├── handlers/
│   │   ├── sell.ts                  ← Unchanged
│   │   ├── debt.ts                  ← Unchanged
│   │   ├── paid.ts                  ← Unchanged (bug fixed)
│   │   ├── stock.ts                 ← Unchanged
│   │   ├── undo.ts                  ← Unchanged (bug fixed)
│   │   ├── summary.ts               ← Unchanged
│   │   ├── history.ts               ← Unchanged
│   │   ├── debts.ts                 ← Unchanged
│   │   ├── help.ts                  ← Unchanged
│   │   └── onboarding.ts            ← Unchanged
│   └── types.ts                     ← Unchanged
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   ← Unchanged
├── .env.local
├── next.config.ts
├── tsconfig.json
└── package.json                     ← Updated — Baileys deps removed
```

No `auth_info_baileys/` folder, no `bot.ts`, no custom `server.ts`. This is a plain
Next.js app.

---

## 2. ENVIRONMENT VARIABLES

Create `.env.local`:

```env
# Meta WhatsApp Cloud API
META_WHATSAPP_TOKEN=your-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
META_VERIFY_TOKEN=make-up-any-string-yourself
META_APP_SECRET=your-app-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

**How to get the Meta values:**
Go to developers.facebook.com → create an App → add the **WhatsApp** product.
The **API Setup** tab gives you a temporary access token (24hr, fine for testing) and
your Phone Number ID directly. `META_APP_SECRET` is under App Settings → Basic.
`META_VERIFY_TOKEN` isn't issued by Meta — you invent any string and use the same one
in both `.env.local` and the webhook configuration screen.

For anything beyond short test sessions, generate a **permanent token** via a System
User in Meta Business Settings — the temporary one expires daily and will silently
break the bot.

**How to get the Supabase values:**
Go to supabase.com → your project → Settings → API → copy URL, anon key, and service
role key.

---

## 3. PACKAGE.JSON

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
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

Install everything:

```bash
npm install
```

---

## 4. SUPABASE SCHEMA (UNCHANGED)

File: `supabase/migrations/001_initial_schema.sql`

Run this in Supabase SQL Editor:

```sql
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT UNIQUE NOT NULL,
  business_name   TEXT,
  onboarding_step TEXT DEFAULT 'start',
  trial_start     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE sales_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  qty_sold     INTEGER NOT NULL,
  price_each   NUMERIC(12, 2) NOT NULL,
  total        NUMERIC(12, 2) GENERATED ALWAYS AS (qty_sold * price_each) STORED,
  undone       BOOLEAN NOT NULL DEFAULT FALSE,
  logged_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_book (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount_owed   NUMERIC(12, 2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);

CREATE INDEX idx_sales_merchant_date ON sales_log(merchant_id, logged_at DESC);
CREATE INDEX idx_sales_undone ON sales_log(merchant_id, undone);
CREATE INDEX idx_credit_merchant ON credit_book(merchant_id, status);
CREATE INDEX idx_products_merchant ON products(merchant_id);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_book ENABLE ROW LEVEL SECURITY;
```

---

## 5. SUPABASE CLIENT (UNCHANGED)

File: `lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

---

## 6. SHARED TYPES (UNCHANGED)

File: `lib/types.ts`

```typescript
export type OnboardingStep =
  | "start"
  | "naming"
  | "adding_products"
  | "complete";

export interface Merchant {
  id: string;
  phone: string;
  business_name: string | null;
  onboarding_step: OnboardingStep;
  trial_start: string;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  stock_qty: number;
  low_stock_threshold: number;
}

export interface SaleLog {
  id: string;
  merchant_id: string;
  product_id: string;
  product_name: string;
  qty_sold: number;
  price_each: number;
  total: number;
  undone: boolean;
  logged_at: string;
}

export interface CreditEntry {
  id: string;
  merchant_id: string;
  customer_name: string;
  amount_owed: number;
  status: "unpaid" | "paid";
  created_at: string;
  paid_at: string | null;
}

export type ParsedCommand =
  | { type: "sell"; product: string; qty: number; price: number; time?: string }
  | { type: "debt"; name: string; amount: number }
  | { type: "paid"; name: string; amount: number }
  | { type: "stock_add"; product: string; qty: number }
  | { type: "stock_check"; product?: string }
  | { type: "undo" }
  | { type: "summary" }
  | { type: "debts" }
  | { type: "history" }
  | { type: "help" }
  | { type: "add_product"; name: string; price: number; qty: number }
  | { type: "done" }
  | { type: "unknown"; raw: string };
```

---

## 7. WHATSAPP SENDER — REWRITTEN FOR META

File: `lib/whatsapp.ts`

This is the core change from the Baileys version. Instead of writing to a shared
socket instance, we call Meta's Graph API directly over HTTPS.

```typescript
const META_API_VERSION = "v20.0";
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${process.env.META_PHONE_NUMBER_ID}/messages`;

/**
 * Send a WhatsApp text message via the Meta Cloud API.
 *
 * Phone format: Meta sends/expects numbers as E.164 digits with no leading "+",
 * e.g. "2348012345678". Incoming webhook payloads use the same format, so no
 * JID-style conversion is needed anywhere in the app.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<void> {
  try {
    const res = await fetch(META_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message, preview_url: false },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(
        `Meta API error (${res.status}) sending to ${to}:`,
        errBody,
      );
      throw new Error(`Meta API responded with ${res.status}`);
    }
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error);
    throw error;
  }
}

// Format naira amounts: 14500 → "₦14,500"
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/**
 * Convert a Nigerian number to E.164 format (no leading +) for storage.
 * "08012345678" → "2348012345678"
 * "2348012345678" → "2348012345678" (already correct)
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  if (digits.startsWith("234")) return digits;
  return digits;
}
```

---

## 8. COMMAND PARSER (UNCHANGED)

File: `lib/parser.ts`

```typescript
import { ParsedCommand } from "./types";

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function extractTime(text: string): { cleaned: string; time?: string } {
  const timeMatch = text.match(/@(\S+)$/);
  if (timeMatch) {
    return { cleaned: text.replace(/@\S+$/, "").trim(), time: timeMatch[1] };
  }
  return { cleaned: text };
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/naira|₦|#/gi, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseCommand(rawText: string): ParsedCommand {
  const { cleaned: text, time } = extractTime(normalize(rawText));

  // SELL
  const sellMatch = text.match(/^sell\s+(.+?)\s+(\d+)\s+(.+)$/);
  if (sellMatch) {
    const product = sellMatch[1].trim();
    const qty = parseInt(sellMatch[2], 10);
    const price = parseAmount(sellMatch[3]);
    if (qty > 0 && price !== null && price > 0) {
      return { type: "sell", product, qty, price, time };
    }
  }

  // DEBT
  const debtMatch = text.match(/^debt\s+(.+?)\s+(\S+)$/);
  if (debtMatch) {
    const name = debtMatch[1].trim();
    const amount = parseAmount(debtMatch[2]);
    if (name && amount !== null && amount > 0) {
      return { type: "debt", name, amount };
    }
  }

  // PAID
  const paidMatch = text.match(/^paid\s+(.+?)\s+(\S+)$/);
  if (paidMatch) {
    const name = paidMatch[1].trim();
    const amount = parseAmount(paidMatch[2]);
    if (name && amount !== null && amount > 0) {
      return { type: "paid", name, amount };
    }
  }

  // STOCK ADD
  const stockAddMatch = text.match(/^stock\s+add\s+(.+?)\s+(\d+)$/);
  if (stockAddMatch) {
    const product = stockAddMatch[1].trim();
    const qty = parseInt(stockAddMatch[2], 10);
    if (product && qty > 0) {
      return { type: "stock_add", product, qty };
    }
  }

  // STOCK CHECK
  if (text === "stock") return { type: "stock_check" };
  const stockCheckMatch = text.match(/^stock\s+check(?:\s+(.+))?$/);
  if (stockCheckMatch) {
    return { type: "stock_check", product: stockCheckMatch[1]?.trim() };
  }

  if (text === "undo") return { type: "undo" };
  if (text === "summary" || text === "report") return { type: "summary" };
  if (text === "debts" || text === "debt list" || text === "owing")
    return { type: "debts" };
  if (text === "history" || text === "log") return { type: "history" };
  if (text === "help" || text === "menu" || text === "commands")
    return { type: "help" };

  // ADD PRODUCT (onboarding)
  const addProductMatch = text.match(/^add\s+(.+?)\s+(\S+)\s+(\d+)$/);
  if (addProductMatch) {
    const name = addProductMatch[1].trim();
    const price = parseAmount(addProductMatch[2]);
    const qty = parseInt(addProductMatch[3], 10);
    if (name && price !== null && price > 0 && qty >= 0) {
      return { type: "add_product", name, price, qty };
    }
  }

  if (text === "done" || text === "finish" || text === "complete")
    return { type: "done" };

  return { type: "unknown", raw: rawText };
}
```

---

## 9. FUZZY MATCHING (UNCHANGED)

File: `lib/fuzzy.ts`

```typescript
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function findBestMatch(
  input: string,
  candidates: { id: string; name: string }[],
): { id: string; name: string } | null {
  if (!candidates || candidates.length === 0) return null;
  const normalInput = input.toLowerCase().trim();

  const exact = candidates.find((c) => c.name.toLowerCase() === normalInput);
  if (exact) return exact;

  let bestMatch: { id: string; name: string } | null = null;
  let bestDist = Infinity;

  for (const candidate of candidates) {
    const dist = levenshtein(normalInput, candidate.name.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = candidate;
    }
  }

  const threshold = Math.min(2, Math.floor(normalInput.length / 3));
  return bestDist <= threshold ? bestMatch : null;
}

export function normalizeCustomerName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}
```

---

## 10. COMMAND HANDLERS

### 10a. Onboarding Handler (UNCHANGED)

File: `lib/handlers/onboarding.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage } from "../whatsapp";
import { ParsedCommand, Merchant } from "../types";

export async function handleOnboarding(
  merchant: Merchant | null,
  phone: string,
  message: string,
  parsed: ParsedCommand,
): Promise<void> {
  if (!merchant) {
    await supabaseAdmin.from("merchants").insert({
      phone,
      onboarding_step: "naming",
    });

    await sendWhatsAppMessage(
      phone,
      `👋 Welcome to MyDailySales!\n\n` +
        `I help you track sales, stock, and customer debts — all from WhatsApp.\n\n` +
        `Let's set you up in 2 minutes.\n\n` +
        `*What is your business name?*`,
    );
    return;
  }

  if (merchant.onboarding_step === "naming") {
    const businessName = message.trim();
    if (businessName.length < 2) {
      await sendWhatsAppMessage(
        phone,
        `Please send your business name (e.g., "FreshMart" or "Mama Chisom Stores")`,
      );
      return;
    }

    await supabaseAdmin
      .from("merchants")
      .update({
        business_name: businessName,
        onboarding_step: "adding_products",
      })
      .eq("id", merchant.id);

    await sendWhatsAppMessage(
      phone,
      `Great! *${businessName}* is set up.\n\n` +
        `Now add your first products. Format:\n` +
        `add <name> <price> <qty>\n\n` +
        `Example: add garri 500 20\n\n` +
        `Add at least 1 product, then type *done* when finished.`,
    );
    return;
  }

  if (merchant.onboarding_step === "adding_products") {
    if (parsed.type === "add_product") {
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("merchant_id", merchant.id)
        .ilike("name", parsed.name)
        .single();

      if (existing) {
        await sendWhatsAppMessage(
          phone,
          `⚠️ You already have a product called "${parsed.name}". ` +
            `Try a different name or type *done* to finish.`,
        );
        return;
      }

      await supabaseAdmin.from("products").insert({
        merchant_id: merchant.id,
        name: parsed.name,
        price: parsed.price,
        stock_qty: parsed.qty,
      });

      await sendWhatsAppMessage(
        phone,
        `✅ *${parsed.name}* added.\n` +
          `Price: ₦${parsed.price.toLocaleString()} | Stock: ${parsed.qty}\n\n` +
          `Add another product or type *done* to finish.`,
      );
      return;
    }

    if (parsed.type === "done") {
      const { count } = await supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id);

      if (!count || count === 0) {
        await sendWhatsAppMessage(
          phone,
          `Please add at least 1 product before finishing.\n\nFormat: add garri 500 20`,
        );
        return;
      }

      await supabaseAdmin
        .from("merchants")
        .update({ onboarding_step: "complete" })
        .eq("id", merchant.id);

      await sendWhatsAppMessage(
        phone,
        `🎉 *${merchant.business_name}* is ready!\n\n` +
          `Try logging your first sale now:\n` +
          `sell <product> <qty> <price>\n\n` +
          `Example: sell garri 2 500\n\n` +
          `Type *help* anytime to see all commands.`,
      );
      return;
    }

    await sendWhatsAppMessage(
      phone,
      `To add a product: add <name> <price> <qty>\n` +
        `Example: add garri 500 20\n\n` +
        `Type *done* when you've added all your products.`,
    );
    return;
  }
}
```

---

### 10b. Sell Handler (UNCHANGED)

File: `lib/handlers/sell.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { findBestMatch } from "../fuzzy";
import { Merchant } from "../types";

export async function handleSell(
  merchant: Merchant,
  productInput: string,
  qty: number,
  price: number,
): Promise<void> {
  const phone = merchant.phone;

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, stock_qty, price, low_stock_threshold")
    .eq("merchant_id", merchant.id);

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `❓ You haven't added any products yet.\n\n` +
        `Add one first: add ${productInput} ${price} 10`,
    );
    return;
  }

  const match = findBestMatch(productInput, products);

  if (!match) {
    const productList = products
      .slice(0, 5)
      .map((p) => p.name)
      .join(", ");
    await sendWhatsAppMessage(
      phone,
      `❓ I don't have *"${productInput}"* in your products.\n\n` +
        `Your products: ${productList}\n\n` +
        `Did you mean one of these? Or type: add ${productInput} ${price} 0`,
    );
    return;
  }

  const product = products.find((p) => p.id === match.id)!;

  if (
    product.stock_qty !== null &&
    qty > product.stock_qty &&
    product.stock_qty >= 0
  ) {
    await sendWhatsAppMessage(
      phone,
      `⚠️ You only have *${product.stock_qty}* ${product.name} in stock.\n\n` +
        `Log ${product.stock_qty} sold instead:\n` +
        `sell ${product.name} ${product.stock_qty} ${price}`,
    );
    return;
  }

  await supabaseAdmin.from("sales_log").insert({
    merchant_id: merchant.id,
    product_id: product.id,
    product_name: product.name,
    qty_sold: qty,
    price_each: price,
  });

  const newStock = Math.max(0, (product.stock_qty || 0) - qty);
  await supabaseAdmin
    .from("products")
    .update({ stock_qty: newStock })
    .eq("id", product.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todaysSales } = await supabaseAdmin
    .from("sales_log")
    .select("total")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .gte("logged_at", today.toISOString());

  const todayTotal = (todaysSales || []).reduce(
    (sum, s) => sum + (s.total || 0),
    0,
  );
  const saleTotal = qty * price;

  let reply = `✅ Sold *${qty} ${product.name}* @ ${formatNaira(price)} each = *${formatNaira(saleTotal)}*\n`;
  reply += `Stock left: ${newStock}${newStock <= 0 ? " — *OUT OF STOCK* ⚠️" : ""}\n`;
  reply += `Today total: *${formatNaira(todayTotal)}*`;

  if (newStock > 0 && newStock <= (product.low_stock_threshold || 5)) {
    reply += `\n\n⚠️ *Low stock:* Only ${newStock} ${product.name} left. Restock soon.`;
  }

  await sendWhatsAppMessage(phone, reply);
}
```

---

### 10c. Debt Handler (UNCHANGED)

File: `lib/handlers/debt.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleDebt(
  merchant: Merchant,
  customerName: string,
  amount: number,
): Promise<void> {
  const phone = merchant.phone;

  await supabaseAdmin.from("credit_book").insert({
    merchant_id: merchant.id,
    customer_name: customerName,
    amount_owed: amount,
    status: "unpaid",
  });

  const { data: allDebts } = await supabaseAdmin
    .from("credit_book")
    .select("amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  const totalOwed = (allDebts || []).reduce((sum, d) => sum + d.amount_owed, 0);

  await sendWhatsAppMessage(
    phone,
    `📝 *${customerName}* owes ${formatNaira(amount)}.\n` +
      `Total owed to you: *${formatNaira(totalOwed)}*\n\n` +
      `When they pay: paid ${customerName} ${amount}`,
  );
}
```

---

### 10d. Paid Handler (BUG FIXED)

File: `lib/handlers/paid.ts`

**Fix:** Original marked ALL debts for a customer at once regardless of amount.
Now it matches by name AND closest amount to prevent accidentally clearing
the wrong debt entry.

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { findBestMatch } from "../fuzzy";
import { Merchant } from "../types";

export async function handlePaid(
  merchant: Merchant,
  customerInput: string,
  amount: number,
): Promise<void> {
  const phone = merchant.phone;

  const { data: unpaidDebts } = await supabaseAdmin
    .from("credit_book")
    .select("id, customer_name, amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  if (!unpaidDebts || unpaidDebts.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `✅ You have no outstanding debts recorded.`,
    );
    return;
  }

  // Step 1: fuzzy match the customer name
  const uniqueNames = [
    ...new Map(
      unpaidDebts.map((d) => [
        d.customer_name,
        { id: d.id, name: d.customer_name },
      ]),
    ).values(),
  ];
  const nameMatch = findBestMatch(customerInput, uniqueNames);

  if (!nameMatch) {
    const names = unpaidDebts
      .slice(0, 5)
      .map((d) => d.customer_name)
      .join(", ");
    await sendWhatsAppMessage(
      phone,
      `❓ No debt found for *"${customerInput}"*.\n\n` +
        `People who owe you: ${names}\n\n` +
        `Type *debts* to see the full list.`,
    );
    return;
  }

  // Step 2: among debts for this customer, find the one matching the amount
  const customerDebts = unpaidDebts.filter(
    (d) => d.customer_name.toLowerCase() === nameMatch.name.toLowerCase(),
  );

  // Find closest matching debt by amount
  const exactDebt = customerDebts.find((d) => d.amount_owed === amount);
  const targetDebt =
    exactDebt ||
    customerDebts.reduce((closest, d) =>
      Math.abs(d.amount_owed - amount) < Math.abs(closest.amount_owed - amount)
        ? d
        : closest,
    );

  // Mark only this specific debt as paid
  await supabaseAdmin
    .from("credit_book")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", targetDebt.id);

  // Get remaining total
  const { data: remaining } = await supabaseAdmin
    .from("credit_book")
    .select("amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  const stillOwed = (remaining || []).reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  // Check if customer has more unpaid debts
  const remainingForCustomer = customerDebts.filter(
    (d) => d.id !== targetDebt.id,
  );
  const customerStillOwes = remainingForCustomer.reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  let reply = `✅ *${nameMatch.name}* paid ${formatNaira(targetDebt.amount_owed)}. Debt cleared.\n\n`;

  if (customerStillOwes > 0) {
    reply += `⚠️ ${nameMatch.name} still owes ${formatNaira(customerStillOwes)} from other entries.\n\n`;
  }

  reply += `Total still owed to you: *${formatNaira(stillOwed)}*`;

  await sendWhatsAppMessage(phone, reply);
}
```

---

### 10e. Stock Handler (UNCHANGED)

File: `lib/handlers/stock.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { findBestMatch } from "../fuzzy";
import { Merchant } from "../types";

export async function handleStockAdd(
  merchant: Merchant,
  productInput: string,
  qty: number,
): Promise<void> {
  const phone = merchant.phone;

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, name, stock_qty")
    .eq("merchant_id", merchant.id);

  const match = findBestMatch(productInput, products || []);

  if (!match) {
    await sendWhatsAppMessage(
      phone,
      `❓ Product *"${productInput}"* not found.\n\n` +
        `To create it: add ${productInput} <price> ${qty}`,
    );
    return;
  }

  const product = (products || []).find((p) => p.id === match.id)!;
  const newQty = (product.stock_qty || 0) + qty;

  await supabaseAdmin
    .from("products")
    .update({ stock_qty: newQty })
    .eq("id", product.id);

  await sendWhatsAppMessage(
    phone,
    `✅ Added *${qty}* ${product.name}.\n` + `New stock: *${newQty}*`,
  );
}

export async function handleStockCheck(
  merchant: Merchant,
  productInput?: string,
): Promise<void> {
  const phone = merchant.phone;

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("name, stock_qty, price, low_stock_threshold")
    .eq("merchant_id", merchant.id)
    .order("name");

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `You haven't added any products yet.\n\nAdd one: add garri 500 20`,
    );
    return;
  }

  if (productInput) {
    const match = findBestMatch(
      productInput,
      products.map((p) => ({ id: p.name, name: p.name })),
    );
    const product = products.find(
      (p) => p.name.toLowerCase() === match?.name?.toLowerCase(),
    );

    if (!product) {
      await sendWhatsAppMessage(
        phone,
        `❓ Product *"${productInput}"* not found.`,
      );
      return;
    }

    const status =
      product.stock_qty <= 0
        ? "🔴 OUT OF STOCK"
        : product.stock_qty <= (product.low_stock_threshold || 5)
          ? "🟡 LOW"
          : "🟢 OK";

    await sendWhatsAppMessage(
      phone,
      `📦 *${product.name}*\n` +
        `Stock: ${product.stock_qty} — ${status}\n` +
        `Price: ${formatNaira(product.price)}`,
    );
    return;
  }

  const lines = products.map((p) => {
    const status =
      p.stock_qty <= 0
        ? "🔴"
        : p.stock_qty <= (p.low_stock_threshold || 5)
          ? "🟡"
          : "🟢";
    return `${status} *${p.name}*: ${p.stock_qty} left`;
  });

  await sendWhatsAppMessage(phone, `📦 *Your Stock*\n\n${lines.join("\n")}`);
}
```

---

### 10f. Undo Handler (BUG FIXED)

File: `lib/handlers/undo.ts`

**Fix:** Removed the broken `supabaseAdmin.rpc as any` line that did nothing.
Stock restore now works correctly.

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleUndo(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  // Get the most recent non-undone sale
  const { data: lastSale, error } = await supabaseAdmin
    .from("sales_log")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .order("logged_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !lastSale) {
    await sendWhatsAppMessage(phone, `↩ Nothing to undo. No sales logged yet.`);
    return;
  }

  // Soft-delete the sale
  await supabaseAdmin
    .from("sales_log")
    .update({ undone: true })
    .eq("id", lastSale.id);

  // Restore stock — get current qty first, then add back
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("stock_qty")
    .eq("id", lastSale.product_id)
    .single();

  if (product) {
    await supabaseAdmin
      .from("products")
      .update({ stock_qty: (product.stock_qty || 0) + lastSale.qty_sold })
      .eq("id", lastSale.product_id);
  }

  // Get updated today's total
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todaysSales } = await supabaseAdmin
    .from("sales_log")
    .select("total")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .gte("logged_at", today.toISOString());

  const todayTotal = (todaysSales || []).reduce(
    (sum, s) => sum + (s.total || 0),
    0,
  );

  const loggedAt = new Date(lastSale.logged_at).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendWhatsAppMessage(
    phone,
    `↩ *Done. Last entry reversed.*\n\n` +
      `Removed: Sold ${lastSale.qty_sold} ${lastSale.product_name} @ ${formatNaira(lastSale.price_each)} (logged ${loggedAt})\n\n` +
      `Today total: *${formatNaira(todayTotal)}*`,
  );
}
```

---

### 10g. Summary Handler (UNCHANGED)

File: `lib/handlers/summary.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleSummary(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todaysSales } = await supabaseAdmin
    .from("sales_log")
    .select("total, product_name, qty_sold")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .gte("logged_at", today.toISOString());

  const totalRevenue = (todaysSales || []).reduce(
    (sum, s) => sum + (s.total || 0),
    0,
  );
  const totalTransactions = (todaysSales || []).length;

  const { data: unpaidDebts } = await supabaseAdmin
    .from("credit_book")
    .select("amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  const totalOwed = (unpaidDebts || []).reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  const { data: outOfStock } = await supabaseAdmin
    .from("products")
    .select("name")
    .eq("merchant_id", merchant.id)
    .eq("stock_qty", 0);

  let reply = `📊 *${merchant.business_name} — Today's Summary*\n`;
  reply += `─────────────────────\n`;
  reply += `💰 Sales: *${formatNaira(totalRevenue)}* (${totalTransactions} transactions)\n`;
  reply += `📋 Debts owed to you: *${formatNaira(totalOwed)}*\n`;

  if (outOfStock && outOfStock.length > 0) {
    reply += `🔴 Out of stock: ${outOfStock.map((p) => p.name).join(", ")}\n`;
  }

  if (totalRevenue === 0 && totalTransactions === 0) {
    reply += `\n_No sales logged today yet._`;
  }

  reply += `\nType *history* to see recent entries.`;

  await sendWhatsAppMessage(phone, reply);
}
```

---

### 10h. History Handler (UNCHANGED)

File: `lib/handlers/history.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleHistory(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  const { data: recent } = await supabaseAdmin
    .from("sales_log")
    .select("product_name, qty_sold, price_each, total, logged_at, undone")
    .eq("merchant_id", merchant.id)
    .order("logged_at", { ascending: false })
    .limit(5);

  if (!recent || recent.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `No sales logged yet. Type: sell <product> <qty> <price>`,
    );
    return;
  }

  const lines = recent.map((s) => {
    const time = new Date(s.logged_at).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const tag = s.undone ? " _(undone)_" : "";
    return `• ${s.qty_sold}x ${s.product_name} @ ${formatNaira(s.price_each)} = *${formatNaira(s.total)}*${tag}\n  _${time}_`;
  });

  await sendWhatsAppMessage(
    phone,
    `🕐 *Last ${recent.length} entries:*\n\n${lines.join("\n\n")}`,
  );
}
```

---

### 10i. Debts List Handler (UNCHANGED)

File: `lib/handlers/debts.ts`

```typescript
import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleDebtsList(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  const { data: unpaid } = await supabaseAdmin
    .from("credit_book")
    .select("customer_name, amount_owed, created_at")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid")
    .order("amount_owed", { ascending: false });

  if (!unpaid || unpaid.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `✅ No outstanding debts. Everyone has paid up!`,
    );
    return;
  }

  const total = unpaid.reduce((sum, d) => sum + d.amount_owed, 0);
  const lines = unpaid.map(
    (d) => `• *${d.customer_name}*: ${formatNaira(d.amount_owed)}`,
  );

  await sendWhatsAppMessage(
    phone,
    `📋 *Outstanding Debts*\n\n` +
      `${lines.join("\n")}\n\n` +
      `Total owed to you: *${formatNaira(total)}*\n\n` +
      `To mark paid: paid <name> <amount>`,
  );
}
```

---

### 10j. Help Handler (UNCHANGED)

File: `lib/handlers/help.ts`

```typescript
import { sendWhatsAppMessage } from "../whatsapp";
import { Merchant } from "../types";

export async function handleHelp(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  await sendWhatsAppMessage(
    phone,
    `📖 *MyDailySales Commands*\n\n` +
      `*Log a sale:*\nsell <product> <qty> <price>\n_e.g. sell garri 5 500_\n\n` +
      `*Record a debt:*\ndebt <name> <amount>\n_e.g. debt Emeka 3000_\n\n` +
      `*Mark debt paid:*\npaid <name> <amount>\n_e.g. paid Emeka 3000_\n\n` +
      `*Add stock:*\nstock add <product> <qty>\n_e.g. stock add garri 20_\n\n` +
      `*Check stock:*\nstock check\nstock check garri\n\n` +
      `*Today's summary:*\nsummary\n\n` +
      `*All debts:*\ndebts\n\n` +
      `*Recent entries:*\nhistory\n\n` +
      `*Undo last sale:*\nundo\n\n` +
      `─────────────────────\n` +
      `Type any command to get started.`,
  );
}
```

---

## 11. MAIN MESSAGE ROUTER — SIMPLIFIED

File: `lib/router.ts`

This is the central logic that receives a message and routes it to the right
handler. With Meta, the phone number arrives already in plain digit form (e.g.
`"2348012345678"`), so there's no JID to extract like there was with Baileys.

```typescript
import { supabaseAdmin } from "./supabase";
import { sendWhatsAppMessage } from "./whatsapp";
import { parseCommand } from "./parser";
import { handleOnboarding } from "./handlers/onboarding";
import { handleSell } from "./handlers/sell";
import { handleDebt } from "./handlers/debt";
import { handlePaid } from "./handlers/paid";
import { handleStockAdd, handleStockCheck } from "./handlers/stock";
import { handleUndo } from "./handlers/undo";
import { handleSummary } from "./handlers/summary";
import { handleHistory } from "./handlers/history";
import { handleDebtsList } from "./handlers/debts";
import { handleHelp } from "./handlers/help";

export async function routeMessage(phone: string, text: string): Promise<void> {
  try {
    // Load merchant by phone number
    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("*")
      .eq("phone", phone)
      .single();

    const isOnboarding = !merchant || merchant.onboarding_step !== "complete";

    if (isOnboarding) {
      const parsed = parseCommand(text);
      await handleOnboarding(merchant, phone, text, parsed);
      return;
    }

    const parsed = parseCommand(text);

    switch (parsed.type) {
      case "sell":
        await handleSell(merchant, parsed.product, parsed.qty, parsed.price);
        break;
      case "debt":
        await handleDebt(merchant, parsed.name, parsed.amount);
        break;
      case "paid":
        await handlePaid(merchant, parsed.name, parsed.amount);
        break;
      case "stock_add":
        await handleStockAdd(merchant, parsed.product, parsed.qty);
        break;
      case "stock_check":
        await handleStockCheck(merchant, parsed.product);
        break;
      case "undo":
        await handleUndo(merchant);
        break;
      case "summary":
        await handleSummary(merchant);
        break;
      case "debts":
        await handleDebtsList(merchant);
        break;
      case "history":
        await handleHistory(merchant);
        break;
      case "help":
        await handleHelp(merchant);
        break;
      case "unknown":
      default:
        await handleUnknownCommand(phone, text);
        break;
    }
  } catch (error) {
    console.error(`Error routing message from ${phone}:`, error);
    // Don't crash — just log it
  }
}

async function handleUnknownCommand(
  phone: string,
  rawText: string,
): Promise<void> {
  const lower = rawText.toLowerCase().trim();

  let suggestion = "";
  if (lower.includes("sell") || lower.includes("sold")) {
    suggestion = `\nDid you mean: sell <product> <qty> <price>?`;
  } else if (lower.includes("debt") || lower.includes("owe")) {
    suggestion = `\nDid you mean: debt <name> <amount>?`;
  } else if (lower.includes("stock") || lower.includes("inventory")) {
    suggestion = `\nDid you mean: stock check  or  stock add <product> <qty>?`;
  }

  await sendWhatsAppMessage(
    phone,
    `❓ I didn't understand: _"${rawText.substring(0, 50)}"_${suggestion}\n\n` +
      `Type *help* to see all commands with examples.`,
  );
}
```

---

## 12. WEBHOOK ROUTE — THE CORE NEW FILE

File: `app/api/whatsapp/route.ts`

This replaces `bot.ts` entirely. Meta calls `GET` once when you set up the webhook
(to verify ownership) and `POST` every time a message comes in.

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { routeMessage } from "@/lib/router";
import { sendWhatsAppMessage, normalizePhone } from "@/lib/whatsapp";

/**
 * GET — Meta calls this once when you set the webhook URL in the App Dashboard.
 * It sends hub.mode, hub.verify_token, and hub.challenge as query params.
 * Respond with the raw challenge value if the verify token matches yours.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST — Meta calls this for every incoming message or status update.
 * We verify the payload signature, pull out any text messages, and route them.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isValidSignature(req, rawBody)) {
    console.error("[Webhook] Invalid signature — rejecting payload");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const from = normalizePhone(msg.from);
        const text = extractText(msg);

        if (!text) {
          // Non-text message (image, voice note, sticker, location, etc.)
          await sendWhatsAppMessage(
            from,
            `Hi! I can only read text messages.\n\nType *help* to see what I can do.`,
          );
          continue;
        }

        console.log(`[Webhook] Message from ${from}: ${text.substring(0, 50)}`);

        // Don't await — let Meta get its 200 OK quickly, process in background
        routeMessage(from, text).catch((err) => {
          console.error(
            `[Webhook] Error processing message from ${from}:`,
            err,
          );
        });
      }
    }
  } catch (error) {
    console.error("[Webhook] Error parsing payload:", error);
  }

  // Meta expects a fast 200 response — it will retry the webhook if you're slow
  // or return an error status, which can cause duplicate message delivery.
  return new NextResponse("OK", { status: 200 });
}

/**
 * Extract plain text from any Meta message type. Returns null for media
 * messages (image/audio/video/sticker/location) so the caller can send a
 * "text only" reply.
 */
function extractText(msg: any): string | null {
  if (msg.type === "text") return msg.text?.body || null;
  if (msg.type === "button") return msg.button?.text || null;
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      null
    );
  }
  return null;
}

/**
 * Verify the X-Hub-Signature-256 header Meta attaches to every webhook POST,
 * so random requests can't be forged to look like they came from Meta.
 */
function isValidSignature(req: NextRequest, rawBody: string): boolean {
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (!signature || !appSecret) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

---

## 13. DASHBOARD API (UNCHANGED)

File: `app/api/dashboard/summary/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: todaysSales }, { data: unpaidDebts }, { data: products }] =
    await Promise.all([
      supabaseAdmin
        .from("sales_log")
        .select("product_name, qty_sold, price_each, total, logged_at")
        .eq("merchant_id", merchant.id)
        .eq("undone", false)
        .gte("logged_at", today.toISOString())
        .order("logged_at", { ascending: false }),
      supabaseAdmin
        .from("credit_book")
        .select("customer_name, amount_owed, created_at")
        .eq("merchant_id", merchant.id)
        .eq("status", "unpaid")
        .order("amount_owed", { ascending: false }),
      supabaseAdmin
        .from("products")
        .select("name, stock_qty, price, low_stock_threshold")
        .eq("merchant_id", merchant.id)
        .order("name"),
    ]);

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + s.total, 0);
  const totalOwed = (unpaidDebts || []).reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  return NextResponse.json({
    merchant: { business_name: merchant.business_name, phone: merchant.phone },
    today: {
      total: todayTotal,
      transactions: (todaysSales || []).length,
      sales: todaysSales || [],
    },
    debts: { total: totalOwed, entries: unpaidDebts || [] },
    products: products || [],
  });
}
```

---

## 14. DASHBOARD PAGE (UNCHANGED)

File: `app/dashboard/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  merchant: { business_name: string; phone: string };
  today: { total: number; transactions: number; sales: any[] };
  debts: { total: number; entries: any[] };
  products: any[];
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export default function DashboardPage() {
  const [phone, setPhone] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mds_phone");
    if (saved) {
      setPhone(saved);
      fetchData(saved);
    }
  }, []);

  async function fetchData(ph: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/dashboard/summary?phone=${encodeURIComponent(ph)}`,
      );
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      setData(json);
      localStorage.setItem("mds_phone", ph);
      setPhone(ph);
    } catch {
      setError(
        "Phone number not found. Make sure you have texted the bot first.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!inputPhone.trim()) return;
    let normalized = inputPhone.replace(/\s+/g, "");
    if (normalized.startsWith("0")) normalized = "234" + normalized.slice(1);
    fetchData(normalized);
  }

  if (!phone || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0e0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            background: "#1a1816",
            padding: "2.5rem",
            maxWidth: "400px",
            width: "90%",
            border: "1px solid #2a2826",
          }}
        >
          <div
            style={{
              color: "#c8380a",
              fontFamily: "monospace",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: "0.5rem",
            }}
          >
            MyDailySales
          </div>
          <h1
            style={{
              color: "#f7f3ec",
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              color: "#666",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
            }}
          >
            Enter your WhatsApp number to view your business data
          </p>
          <input
            type="tel"
            placeholder="08012345678"
            value={inputPhone}
            onChange={(e) => setInputPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#0f0e0c",
              border: "1px solid #333",
              color: "#f7f3ec",
              fontSize: "1rem",
              marginBottom: "1rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#c8380a",
              color: "#fff",
              border: "none",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Loading..." : "View My Dashboard"}
          </button>
          {error && (
            <p
              style={{
                color: "#f85149",
                fontSize: "0.8rem",
                marginTop: "1rem",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const { merchant, today, debts, products } = data;
  const lowStock = products.filter(
    (p: any) => p.stock_qty > 0 && p.stock_qty <= (p.low_stock_threshold || 5),
  );
  const outOfStock = products.filter((p: any) => p.stock_qty <= 0);

  return (
    <div
      style={{
        background: "#0f0e0c",
        minHeight: "100vh",
        color: "#f7f3ec",
        fontFamily: "system-ui",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <div
              style={{
                color: "#c8380a",
                fontFamily: "monospace",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              MyDailySales
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
              {merchant.business_name}
            </h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("mds_phone");
              setPhone("");
              setData(null);
            }}
            style={{
              background: "transparent",
              border: "1px solid #2a2826",
              color: "#666",
              padding: "0.4rem 0.8rem",
              cursor: "pointer",
              fontSize: "0.78rem",
            }}
          >
            Switch Account
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <StatCard
            label="Today's Sales"
            value={formatNaira(today.total)}
            sub={`${today.transactions} transactions`}
          />
          <StatCard
            label="Debts Owed"
            value={formatNaira(debts.total)}
            sub={`${debts.entries.length} customers`}
            color="#f59e0b"
          />
          <StatCard
            label="Products"
            value={String(products.length)}
            sub={
              outOfStock.length > 0
                ? `${outOfStock.length} out of stock`
                : "All stocked"
            }
          />
        </div>

        {outOfStock.length > 0 && (
          <div
            style={{
              background: "#2d1a1a",
              border: "1px solid #c8380a44",
              padding: "1rem 1.2rem",
              marginBottom: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            🔴 <strong>Out of stock:</strong>{" "}
            {outOfStock.map((p: any) => p.name).join(", ")}
          </div>
        )}
        {lowStock.length > 0 && (
          <div
            style={{
              background: "#2a2000",
              border: "1px solid #b85c0044",
              padding: "1rem 1.2rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
            }}
          >
            🟡 <strong>Low stock:</strong>{" "}
            {lowStock.map((p: any) => `${p.name} (${p.stock_qty})`).join(", ")}
          </div>
        )}

        <Section title="Today's Sales">
          {today.sales.length === 0 ? (
            <p style={{ color: "#444", fontSize: "0.85rem" }}>
              No sales logged today yet.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  {["Product", "Qty", "Price", "Total", "Time"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        color: "#444",
                        fontWeight: 600,
                        padding: "0.4rem 0.6rem",
                        borderBottom: "1px solid #1e1c1a",
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {today.sales.map((s: any, i: number) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderBottom: "1px solid #161412",
                      }}
                    >
                      {s.product_name}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderBottom: "1px solid #161412",
                        color: "#888",
                      }}
                    >
                      {s.qty_sold}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderBottom: "1px solid #161412",
                        color: "#888",
                      }}
                    >
                      {formatNaira(s.price_each)}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderBottom: "1px solid #161412",
                        color: "#4ecb82",
                        fontWeight: 700,
                      }}
                    >
                      {formatNaira(s.total)}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderBottom: "1px solid #161412",
                        color: "#444",
                        fontSize: "0.75rem",
                      }}
                    >
                      {new Date(s.logged_at).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={`Outstanding Debts — ${formatNaira(debts.total)}`}>
          {debts.entries.length === 0 ? (
            <p style={{ color: "#444", fontSize: "0.85rem" }}>
              No outstanding debts ✅
            </p>
          ) : (
            debts.entries.map((d: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.6rem 0",
                  borderBottom: "1px solid #161412",
                  fontSize: "0.88rem",
                }}
              >
                <span>{d.customer_name}</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  {formatNaira(d.amount_owed)}
                </span>
              </div>
            ))
          )}
        </Section>

        <Section title="Stock Levels">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {products.map((p: any, i: number) => {
              const isOut = p.stock_qty <= 0;
              const isLow =
                !isOut && p.stock_qty <= (p.low_stock_threshold || 5);
              const color = isOut ? "#c8380a" : isLow ? "#f59e0b" : "#4ecb82";
              return (
                <div
                  key={i}
                  style={{
                    background: "#1a1816",
                    border: `1px solid ${color}22`,
                    padding: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      marginBottom: "0.25rem",
                      color: "#ccc",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ color, fontSize: "1.2rem", fontWeight: 800 }}>
                    {p.stock_qty}
                  </div>
                  <div
                    style={{
                      color: "#444",
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                    }}
                  >
                    in stock
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <div
          style={{
            textAlign: "center",
            color: "#2a2826",
            fontSize: "0.7rem",
            marginTop: "2rem",
            fontFamily: "monospace",
          }}
        >
          MyDailySales · Refresh page to update data
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = "#4ecb82",
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#1a1816",
        border: "1px solid #2a2826",
        padding: "1.2rem",
      }}
    >
      <div
        style={{
          color: "#444",
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "0.4rem",
          fontFamily: "monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: "1.6rem",
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: "0.3rem",
        }}
      >
        {value}
      </div>
      <div style={{ color: "#444", fontSize: "0.72rem" }}>{sub}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#444",
          marginBottom: "1rem",
          fontFamily: "monospace",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
```

---

## 15. NEXT.JS CONFIG

File: `next.config.ts`

No special webpack handling is needed anymore — that was only there to stop
Baileys' Node-only dependencies from leaking into client bundles. A bare config
is fine:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

---

## 16. TYPESCRIPT CONFIG

File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 17. .GITIGNORE

File: `.gitignore`

```
node_modules/
.next/
.env.local
*.log
```

No session folder to exclude this time — Meta doesn't use local credential files,
your access token lives only in environment variables.

---

## 18. BUILD ORDER

Follow this exactly:

```
Step 1:  npx create-next-app@latest mydailysales --typescript --tailwind --app
Step 2:  cd mydailysales
Step 3:  npm install @supabase/supabase-js
Step 4:  Create a Meta App at developers.facebook.com → add the WhatsApp product
Step 5:  Copy the temporary access token + Phone Number ID from the API Setup tab
Step 6:  Create .env.local with your Meta + Supabase keys (invent your own META_VERIFY_TOKEN)
Step 7:  Create lib/types.ts
Step 8:  Create lib/supabase.ts
Step 9:  Create lib/whatsapp.ts  ← Meta Graph API version
Step 10: Create lib/parser.ts
Step 11: Create lib/fuzzy.ts
Step 12: Create all lib/handlers/*.ts files
Step 13: Create lib/router.ts
Step 14: Create app/api/whatsapp/route.ts
Step 15: Run the Supabase SQL migration
Step 16: Run: npm run dev — then in a second terminal: ngrok http 3000
Step 17: In Meta App Dashboard → WhatsApp → Configuration, sthis et the Callback URL to
         your ngrok HTTPS URL + /api/whatsapp, and the Verify Token to match
         META_VERIFY_TOKEN
Step 18: Click "Verify and Save" — subscribe to the "messages" webhook field
Step 19: From one of the 5 test recipient numbers added in the dashboard, text "hi"
         to the test business number
Step 20: Follow onboarding → add products → log a sale → type summary
```

---

## 19. RUNNING THE BOT

**Local development:**

```bash
npm run dev
```

Meta needs a public HTTPS URL it can POST to — your laptop on `localhost:3000`
isn't reachable from the internet, so you need a tunnel. In a second terminal:

```bash
ngrok http 3000
```

Take the `https://xxxx.ngrok-free.app` URL ngrok gives you, append `/api/whatsapp`,
and paste it into the Callback URL field in Meta App Dashboard → WhatsApp →
Configuration. Every time you restart ngrok the URL changes, so you'll need to
re-paste it (a paid ngrok plan gives you a fixed subdomain if this gets annoying).

**Production:**

Unlike Baileys, this no longer needs a VPS. Deploy straight to Vercel:

```bash
vercel deploy
```

Then update the Callback URL in Meta App Dashboard to your real Vercel domain,
e.g. `https://mydailysales.vercel.app/api/whatsapp`. No persistent process, no
PM2, no reconnection logic to babysit — Vercel spins up the function only when
Meta actually sends a webhook.

**Going beyond test numbers:**

While your Meta App is in development mode, only the 5 phone numbers you've
manually added as testers can message the bot. To open it up to real merchants
you'll need to either keep adding testers (fine for an early beta) or move the
app to Live mode, which requires adding a real WhatsApp Business phone number
and completing Meta Business verification — budget a few days for that step
since it can involve submitting business documents.

---

## 20. TESTING CHECKLIST

Test every path before giving to a beta merchant:

```
WEBHOOK SETUP
□ GET request with correct verify token → returns challenge, 200
□ GET request with wrong verify token → 403
□ POST with valid signature → processed
□ POST with invalid/missing signature → 401 rejected
□ Meta dashboard shows the webhook as "Active" (green) after setup

ONBOARDING
□ Text bot from new number → welcome message received
□ Send business name → products prompt received
□ add garri 500 20 → product added confirmation
□ add garri 500 20 again → duplicate warning
□ done → setup complete + first sale prompt
□ Text hi before setup is done → handled gracefully

COMMANDS (after onboarding complete)
□ sell garri 5 500 → confirmation + stock deducted + today total shown
□ sell garri 100 500 → stock warning (only X in stock)
□ sell kpomo 2 1000 → product not found with suggestions
□ sell garri 5 → missing price error
□ sell gari 5 500 → fuzzy match finds "garri" ✓
□ debt Emeka 3000 → debt recorded + total shown
□ debt Emeka 5000 → second debt entry for same person
□ paid Emeka 3000 → correct debt cleared (not both)
□ paid Unknown 1000 → customer not found message
□ stock check → all products listed with status
□ stock check garri → single product with status
□ stock add garri 20 → stock increased
□ summary → today's total + debts + out of stock
□ debts → full debt list sorted by amount
□ history → last 5 sales
□ undo → last sale reversed + stock restored
□ undo again → previous sale reversed
□ undo (no sales) → "nothing to undo" message
□ help → full command menu
□ random text → unknown command with suggestion
□ voice note / image → "text only" message
```

---

## 21. WHAT IS NOT BUILT YET (STAGE 2)

Do not build these until 7/10 beta merchants are active for 5+ consecutive days:

- Paystack subscription integration
- Proper auth for dashboard (OTP via WhatsApp)
- Weekly/monthly PDF reports
- Partial debt payments
- Multi-staff numbers
- Automated debt reminders (these would be business-initiated and need an
  approved message template, since they fall outside the free 24-hour reply
  window)
- NLP free-text parsing
- Analytics charts
- Referral system
- Permanent access token rotation via a System User (swap out the temporary
  token before it expires)
- Business verification / Live mode for unlimited recipients

---

_MyDailySales · Meta WhatsApp Cloud API Implementation Guide · June 2026_
_Stage 1 MVP — Behavior Validation Only_
