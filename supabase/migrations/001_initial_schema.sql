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

-- For Stage 1, dashboard uses service_role key directly or uses basic policies.
-- Let's create permissive policies for public/anonymous access for the anon key for simplicity in demo
CREATE POLICY "Allow anonymous read access to merchants" ON merchants FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access to sales_log" ON sales_log FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access to credit_book" ON credit_book FOR SELECT USING (true);
