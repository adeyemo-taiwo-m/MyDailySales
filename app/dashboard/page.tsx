'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface DashboardData {
  merchant: { business_name: string; phone: string }
  today: { total: number; transactions: number; sales: any[] }
  debts: { total: number; entries: any[] }
  products: any[]
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DashboardPage() {
  const [phone, setPhone] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'debtors'>('overview')
  const router = useRouter()

  const fetchData = useCallback(async (ph: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/dashboard/summary?phone=${encodeURIComponent(ph)}`)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      setData(json)
      setPhone(ph)
    } catch (err) {
      setError('Failed to fetch business data. Ensure you have registered on WhatsApp.')
      localStorage.removeItem('mds_phone')
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const saved = localStorage.getItem('mds_phone')
    if (!saved) {
      router.push('/')
    } else {
      setPhone(saved)
      fetchData(saved)
    }
  }, [router, fetchData])

  function handleLogout() {
    localStorage.removeItem('mds_phone')
    router.push('/')
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0f0e0c] flex flex-col items-center justify-center text-[#f7f3ec]">
        <div className="w-12 h-12 rounded-full border-4 border-blue-900 border-t-blue-500 animate-spin mb-4" />
        <p className="font-mono text-sm tracking-wider text-[#888]">Loading Merchant Dashboard...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0f0e0c] flex flex-col items-center justify-center text-red-400 p-6 text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold mb-2">Access Error</h2>
        <p className="text-sm text-[#888] max-w-sm mb-6">{error}</p>
        <p className="text-xs text-[#555]">Redirecting back to login...</p>
      </div>
    )
  }

  if (!data) return null

  const { merchant, today, debts, products } = data
  const outOfStock = products.filter(p => p.stock_qty <= 0)
  const lowStock = products.filter(p => p.stock_qty > 0 && p.stock_qty <= (p.low_stock_threshold || 5))

  return (
    <div className="min-h-screen bg-[#0f0e0c] text-[#f7f3ec] font-sans pb-16 relative">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Navigation Top Bar */}
      <nav className="border-b border-[#2a2826] bg-[#141210]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
              📊
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-blue-500 block leading-none">Dashboard</span>
              <span className="font-bold text-base">{merchant.business_name || 'My Business'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 border border-[#2a2826] hover:border-red-900/50 hover:text-red-400 text-xs text-[#888] rounded-lg transition-colors uppercase tracking-wider font-mono"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Today Sales */}
          <div className="bg-[#161412] border border-[#2a2826] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#3a3836] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl group-hover:scale-110 transition-transform">💰</div>
            <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono mb-2">Today's Sales Revenue</div>
            <div className="text-2xl font-black text-emerald-400 leading-none mb-1">{formatNaira(today.total)}</div>
            <div className="text-xs text-[#888]">{today.transactions} transaction{today.transactions !== 1 ? 's' : ''} logged</div>
          </div>

          {/* Card 2: Debt Book */}
          <div className="bg-[#161412] border border-[#2a2826] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#3a3836] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl group-hover:scale-110 transition-transform">📝</div>
            <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono mb-2">Total Outstanding Debt</div>
            <div className="text-2xl font-black text-amber-500 leading-none mb-1">{formatNaira(debts.total)}</div>
            <div className="text-xs text-[#888]">{debts.entries.length} customer{debts.entries.length !== 1 ? 's' : ''} owing</div>
          </div>

          {/* Card 3: Stock Levels */}
          <div className="bg-[#161412] border border-[#2a2826] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#3a3836] transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl group-hover:scale-110 transition-transform">📦</div>
            <div className="text-[10px] uppercase tracking-wider text-[#666] font-mono mb-2">Catalog Inventory</div>
            <div className="text-2xl font-black text-blue-400 leading-none mb-1">{products.length} <span className="text-xs font-normal text-[#888]">products</span></div>
            <div className="text-xs text-[#888]">
              {outOfStock.length > 0 ? (
                <span className="text-red-400 font-semibold">{outOfStock.length} out of stock</span>
              ) : lowStock.length > 0 ? (
                <span className="text-amber-500">{lowStock.length} low stock alerts</span>
              ) : (
                <span className="text-[#666]">All items well stocked</span>
              )}
            </div>
          </div>

        </div>

        {/* Alerts Section (Only visible on Overview tab and when there are critical issues) */}
        {activeTab === 'overview' && (outOfStock.length > 0 || lowStock.length > 0) && (
          <div className="space-y-2">
            {outOfStock.length > 0 && (
              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-start gap-3 text-xs text-red-400">
                <span className="text-base leading-none">🔴</span>
                <div>
                  <strong>Out of stock products:</strong> {outOfStock.map(p => p.name).join(', ')}. Restock by sending <code className="bg-red-950/50 px-1 py-0.5 rounded font-mono text-[10px] text-red-300">stock add [product] [qty]</code> on WhatsApp.
                </div>
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-500">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <strong>Low stock items:</strong> {lowStock.map(p => `${p.name} (${p.stock_qty} left)`).join(', ')}.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-[#1c1a18] gap-6 text-xs uppercase tracking-widest font-mono font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-all ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-[#666] hover:text-[#aaa]'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 border-b-2 transition-all ${activeTab === 'inventory' ? 'border-blue-500 text-blue-400' : 'border-transparent text-[#666] hover:text-[#aaa]'}`}
          >
            Inventory ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('debtors')}
            className={`pb-3 border-b-2 transition-all ${activeTab === 'debtors' ? 'border-blue-500 text-blue-400' : 'border-transparent text-[#666] hover:text-[#aaa]'}`}
          >
            Debt Book ({debts.entries.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Today Sales Listing */}
              <div className="bg-[#161412] border border-[#2a2826] rounded-xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-[#2a2826] flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-wider uppercase font-mono text-[#888]">Sales logged today</h3>
                  <span className="text-xs bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                    Live
                  </span>
                </div>
                <div className="p-5">
                  {today.sales.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#555]">
                      No sales logged today. Send sales commands via WhatsApp!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#2a2826] text-[#555] font-mono uppercase tracking-wider">
                            <th className="pb-3 font-semibold">Product</th>
                            <th className="pb-3 text-center font-semibold">Qty</th>
                            <th className="pb-3 text-right font-semibold">Price Each</th>
                            <th className="pb-3 text-right font-semibold">Total</th>
                            <th className="pb-3 text-right font-semibold">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e1c1a]">
                          {today.sales.map((s, idx) => (
                            <tr key={idx} className="group hover:bg-[#1a1816]/40 transition-colors">
                              <td className="py-3.5 font-semibold text-[#eee]">{s.product_name}</td>
                              <td className="py-3.5 text-center text-[#888]">{s.qty_sold}</td>
                              <td className="py-3.5 text-right text-[#888]">{formatNaira(Number(s.price_each))}</td>
                              <td className="py-3.5 text-right font-bold text-emerald-400">{formatNaira(Number(s.total))}</td>
                              <td className="py-3.5 text-right text-[#555] font-mono">
                                {new Date(s.logged_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="bg-[#161412] border border-[#2a2826] rounded-xl overflow-hidden shadow-lg p-5">
              <h3 className="font-bold text-sm tracking-wider uppercase font-mono text-[#888] mb-4">Stock list</h3>
              
              {products.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#555]">
                  No products added yet. Use the onboarding prompt on WhatsApp to register your first product.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p, idx) => {
                    const isOut = p.stock_qty <= 0
                    const isLow = !isOut && p.stock_qty <= (p.low_stock_threshold || 5)
                    const statusColor = isOut ? 'text-red-400 bg-red-950/20 border-red-900/30' : isLow ? 'text-amber-500 bg-amber-950/20 border-amber-900/30' : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                    const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'
                    
                    return (
                      <div key={idx} className="bg-[#1a1816]/60 border border-[#2a2826] rounded-xl p-4 flex flex-col justify-between hover:border-[#3c3a38] transition-colors">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="font-bold text-sm text-[#eee] truncate" title={p.name}>{p.name}</span>
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="text-lg font-black text-blue-400 font-mono mb-1">{formatNaira(Number(p.price))}</div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-[#2a2826] flex justify-between items-center text-[10px] text-[#666] font-mono">
                          <span>Qty Owed/Stock:</span>
                          <span className={`font-bold text-xs ${isOut ? 'text-red-400' : 'text-[#bbb]'}`}>{p.stock_qty} pcs</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEBTORS */}
          {activeTab === 'debtors' && (
            <div className="bg-[#161412] border border-[#2a2826] rounded-xl overflow-hidden shadow-lg p-5">
              <h3 className="font-bold text-sm tracking-wider uppercase font-mono text-[#888] mb-4">Outstanding customer accounts</h3>

              {debts.entries.length === 0 ? (
                <div className="text-center py-12 text-xs text-emerald-400 font-mono">
                  ✅ Excellent! Everyone has settled their accounts. No unpaid debts.
                </div>
              ) : (
                <div className="divide-y divide-[#1e1c1a]">
                  {debts.entries.map((d, idx) => (
                    <div key={idx} className="py-4 flex justify-between items-center group hover:bg-[#1a1816]/20 px-2 rounded-lg transition-colors">
                      <div>
                        <div className="font-bold text-sm text-[#eee]">{d.customer_name}</div>
                        <div className="text-[10px] text-[#555] font-mono mt-0.5">
                          Owed since {new Date(d.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-amber-500 font-mono">{formatNaira(Number(d.amount_owed))}</div>
                        <div className="text-[9px] text-[#555] font-mono leading-none mt-1 uppercase">Unpaid</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-[#444] font-mono pt-12">
          MyDailySales · Data refreshes on page reload · Stage 1 Live Demo
        </div>

      </main>
    </div>
  )
}
