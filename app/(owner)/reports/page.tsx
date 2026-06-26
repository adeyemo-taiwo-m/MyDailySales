'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNaira } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'

type Range = 'this-week' | 'last-week' | 'this-month'

interface ReportSale {
  total: number
  logged_at: string
  product_name?: string
  staff_name?: string
  product_id: string
  staff_id: string
}

export default function ReportsPage() {
  const [sales, setSales] = useState<ReportSale[]>([])
  const [range, setRange] = useState<Range>('this-week')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffMember } = await supabase
        .from('staff_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

      if (staffMember?.business_id) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const { data } = await supabase
          .from('sales')
          .select('total, logged_at, product_id, staff_id, products(name), staff_members(name)')
          .eq('business_id', staffMember.business_id)
          .gte('logged_at', thirtyDaysAgo)
          .eq('is_undone', false)
          .order('logged_at')

      if (data) {
        const formattedSales: ReportSale[] = data.map(item => ({
          total: item.total,
          logged_at: item.logged_at,
          product_name: (item as any).products?.name || 'Unknown',
          staff_name: (item as any).staff_members?.name || 'Staff',
          product_id: item.product_id,
          staff_id: item.staff_id
        }))
        setSales(formattedSales)
      }
    }
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadReportData() }, [loadReportData])

  // Get date intervals
  const now = new Date()
  let interval: { start: Date; end: Date }

  if (range === 'this-week') {
    interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  } else if (range === 'last-week') {
    const lastWeek = subWeeks(now, 1)
    interval = { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) }
  } else {
    interval = { start: startOfMonth(now), end: endOfMonth(now) }
  }

  // Filter sales within range
  const filteredSales = sales.filter(s =>
    isWithinInterval(parseISO(s.logged_at), interval)
  )

  // Chart data aggregation: Group by day of week or day of month
  const chartDataMap = new Map<string, number>()
  
  if (range === 'this-month') {
    // Group by days of month (1 to 31)
    filteredSales.forEach(s => {
      const dateStr = new Date(s.logged_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
      chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + s.total)
    })
  } else {
    // Group by day of week (Mon-Sun)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    days.forEach(d => chartDataMap.set(d, 0))
    filteredSales.forEach(s => {
      const dayName = new Date(s.logged_at).toLocaleDateString('en-NG', { weekday: 'short' })
      if (chartDataMap.has(dayName)) {
        chartDataMap.set(dayName, (chartDataMap.get(dayName) || 0) + s.total)
      }
    })
  }

  const chartData = Array.from(chartDataMap.entries()).map(([label, total]) => ({
    label,
    revenue: total,
  }))

  // Top products aggregation
  const productMap = new Map<string, { name: string; revenue: number }>()
  filteredSales.forEach(s => {
    const name = s.product_name || 'Unknown'
    const existing = productMap.get(s.product_id) || { name, revenue: 0 }
    productMap.set(s.product_id, { name, revenue: existing.revenue + s.total })
  })

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Staff comparison aggregation
  const staffMap = new Map<string, { name: string; revenue: number }>()
  filteredSales.forEach(s => {
    const name = s.staff_name || 'Staff'
    const existing = staffMap.get(s.staff_id) || { name, revenue: 0 }
    staffMap.set(s.staff_id, { name, revenue: existing.revenue + s.total })
  })

  const staffStats = Array.from(staffMap.values())
    .sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <p className="text-[#A1A8A1] text-sm">Analyze sales performance</p>
          <h1 className="text-[#FFFFFF] text-2xl font-bold font-display">Reports</h1>
        </div>
        
        {/* Range Selector */}
        <div className="flex bg-[#111811] border border-[#1A211A] rounded-xl p-1 font-mono text-xs">
          {(['this-week', 'last-week', 'this-month'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                range === r
                  ? 'bg-[rgba(0,200,83,0.12)] text-[#00C853]'
                  : 'text-[#6B726B] hover:text-[#A1A8A1]'
              }`}
            >
              {r.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="skeleton h-[280px]" />
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="skeleton h-[220px]" />
            <div className="skeleton h-[220px]" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main Chart */}
          <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card">
            <h2 className="text-[#FFFFFF] text-sm font-semibold mb-6 uppercase tracking-wider font-mono text-[#6B726B]">
              Revenue Over Time
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: '#6B726B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B726B', fontSize: 10 }} axisLine={false} tickLine={false}
                         tickFormatter={v => `₦${Math.round(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#111811', border: '1px solid #1A211A', borderRadius: 12 }}
                    labelStyle={{ color: '#A1A8A1', fontSize: 12 }}
                    itemStyle={{ color: '#00C853', fontSize: 13 }}
                    formatter={(v: any) => [`₦${Number(v || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#00C853" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Top Products */}
            <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card">
              <h2 className="text-[#FFFFFF] text-sm font-semibold mb-4 uppercase tracking-wider font-mono text-[#6B726B]">
                Top Products
              </h2>
              {topProducts.length === 0 ? (
                <p className="text-[#6B726B] text-sm py-6 text-center">No sales logged in this range</p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[#6B726B] font-mono text-xs">{i+1}.</span>
                        <span className="text-[#FFFFFF] font-medium">{p.name}</span>
                      </div>
                      <span className="text-[#00C853] font-semibold font-mono">{formatNaira(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff Performance */}
            <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card">
              <h2 className="text-[#FFFFFF] text-sm font-semibold mb-4 uppercase tracking-wider font-mono text-[#6B726B]">
                Staff Performance
              </h2>
              {staffStats.length === 0 ? (
                <p className="text-[#6B726B] text-sm py-6 text-center">No sales logged in this range</p>
              ) : (
                <div className="space-y-4">
                  {staffStats.map(s => (
                    <div key={s.name} className="flex justify-between items-center text-sm">
                      <span className="text-[#FFFFFF] font-medium">{s.name}</span>
                      <span className="text-[#00C853] font-semibold font-mono">{formatNaira(s.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
