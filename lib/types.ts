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
