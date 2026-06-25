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
