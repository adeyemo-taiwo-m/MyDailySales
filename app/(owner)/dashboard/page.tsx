import { createClient } from '@/lib/supabase/server'
import { RealtimeSalesFeed } from '@/components/dashboard/RealtimeSalesFeed'
import { StaffBreakdown } from '@/components/dashboard/StaffBreakdown'
import { formatNaira } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    let businessId: string | undefined
    if (user) {
      const { data: staffMember, error: staffError } = await supabase
        .from('staff_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()
      if (staffError) throw staffError
      businessId = staffMember?.business_id
    }

    if (!businessId) {
      return (
        <div className="p-4 lg:p-8 text-center text-[#6B726B]">
          No active business setup. Please onboard.
        </div>
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const [salesRes, lowStockRes, debtsRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total, staff_id, logged_at, product_id, products(name), staff_members(name)')
        .eq('business_id', businessId)
        .gte('logged_at', today)
        .eq('is_undone', false),
      supabase
        .from('products')
        .select('id, name, stock_qty, low_stock_threshold')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .filter('stock_qty', 'lte', 5),
      supabase
        .from('debts')
        .select('amount_owed, amount_paid')
        .eq('business_id', businessId)
        .neq('status', 'paid'),
    ])

    if (salesRes.error) throw salesRes.error
    if (lowStockRes.error) throw lowStockRes.error
    if (debtsRes.error) throw debtsRes.error

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
          <p className="text-[#A1A8A1] text-sm">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-[#FFFFFF] text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            Dashboard
          </h1>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
            color="text-[#F59E0B]"
          />
          <MetricCard
            label="Low Stock"
            value={String(lowStock.length)}
            sub={lowStock.length === 0 ? 'all good' : 'need restocking'}
            color={lowStock.length > 0 ? 'text-[#F59E0B]' : 'text-[#FFFFFF]'}
          />
          <MetricCard
            label="Sales Count"
            value={String(sales.length)}
            sub="transactions"
            color="text-[#FFFFFF]"
          />
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-[rgba(245,158,11,0.08)] border border-[#F59E0B] rounded-2xl p-4 mb-6">
            <p className="text-[#F59E0B] font-semibold text-sm mb-2">⚠ Low Stock Alert</p>
            <div className="space-y-1">
              {lowStock.map(product => (
                <div key={product.id} className="flex justify-between text-sm">
                  <span className="text-[#FFFFFF]">{product.name}</span>
                  <span className={product.stock_qty === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}>
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
  } catch (err) {
    console.error("Dashboard render error:", err)
    return (
      <div className="p-4 lg:p-8 text-center min-h-[80vh] flex flex-col items-center justify-center">
        <div className="bg-[#111811] border border-[#EF4444]/20 rounded-2xl p-12 text-center shadow-card max-w-sm">
          <p className="text-[#EF4444] mb-4">Something went wrong. Tap to retry.</p>
          <a
            href="/dashboard"
            className="btn-secondary inline-block border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-white px-6 py-2.5 rounded-xl text-sm"
          >
            Retry
          </a>
        </div>
      </div>
    )
  }
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 shadow-card">
      <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}
         style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p className="text-[#6B726B] text-xs mt-1">{sub}</p>
    </div>
  )
}
