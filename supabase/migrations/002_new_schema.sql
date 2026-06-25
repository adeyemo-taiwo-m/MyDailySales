-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- BUSINESSES
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL, -- references auth.users (cannot foreign key directly without service role if not in auth schema)
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
  user_id uuid NOT NULL, -- references auth.users
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
