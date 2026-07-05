'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Product, StaffMember } from '@/types'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { SignOutButton } from '@/components/SignOutButton'

type SaleStep = 'select' | 'quantity'
type TabType = 'sale' | 'restock' | 'debt'

function LogSaleContent() {
  const [activeTab, setActiveTab] = useState<TabType>('sale')
  const [products, setProducts] = useState<Product[]>([])
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [step, setStep] = useState<SaleStep>('select')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState(false)
  const [todayTotal, setTodayTotal] = useState(0)
  const [lastSale, setLastSale] = useState<{ 
    id: string 
    total: number 
    product_id: string 
    qty_sold: number 
  } | null>(null)
  const [undoSeconds, setUndoSeconds] = useState(0)
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const productIdParam = searchParams.get('productId')
  const supabase = createClient()

  // Debt Form States
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [debtAmount, setDebtAmount] = useState<number | ''>('')

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true)
      setError(false)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingData(false)
        return
      }

      const [{ data: staffData, error: staffError }, { data: productsData, error: productsError }] = await Promise.all([
        supabase.from('staff_members').select('*').eq('user_id', user.id).single(),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ])

      if (staffError) throw staffError
      if (productsError) throw productsError

      if (staffData) {
        setStaff(staffData)
        // Load today total for this staff member
        const today = new Date().toISOString().split('T')[0]
        const { data: todaySales, error: salesError } = await supabase
          .from('sales')
          .select('total')
          .eq('staff_id', staffData.id)
          .gte('logged_at', today)
          .eq('is_undone', false)

        if (salesError) throw salesError

        setTodayTotal((todaySales || []).reduce((s, sale) => s + sale.total, 0))
      }
      if (productsData) {
        setProducts(productsData)
        // Auto-select product from URL query param if present
        if (productIdParam) {
          const match = productsData.find(p => p.id === productIdParam)
          if (match && match.stock_qty > 0) {
            setSelected(match)
            setPrice(match.selling_price)
            setQty(1)
            setStep('quantity')
          }
        }
      }
    } catch (err) {
      console.error('Error loading log-sale data:', err)
      setError(true)
    } finally {
      setLoadingData(false)
    }
  }, [supabase, productIdParam])

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
    setSearch('') // Clear search on selection
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

    // Update product stock in DB (relies on updated products RLS update policy)
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

    setLastSale({ 
      id: data.id, 
      total: saleTotal,
      product_id: selected.id,
      qty_sold: qty
    })
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

  async function confirmRestock() {
    if (!selected || !staff) return
    setLoading(true)

    // Update product stock in DB
    const { error } = await supabase
      .from('products')
      .update({ stock_qty: selected.stock_qty + qty })
      .eq('id', selected.id)

    if (error) {
      toast.error('Restock failed. Try again.')
      setLoading(false)
      return
    }

    // Log stock movement
    await supabase.from('stock_movements').insert({
      business_id: staff.business_id,
      product_id: selected.id,
      movement_type: 'restock',
      qty_change: qty,
      logged_by: staff.id,
    })

    // Update local product stock
    setProducts(prev =>
      prev.map(p => p.id === selected.id ? { ...p, stock_qty: p.stock_qty + qty } : p)
    )

    toast.success(`Restocked ${qty} ${selected.name}`)
    setStep('select')
    setSelected(null)
    setLoading(false)
  }

  async function handleLogDebt(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName || !debtAmount || !staff) {
      toast.error('Name and Amount are required.')
      return
    }
    setLoading(true)

    const { error } = await supabase.from('debts').insert({
      business_id: staff.business_id,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      amount_owed: Number(debtAmount),
      created_by: staff.id,
    })

    if (error) {
      toast.error('Failed to log debt. Try again.')
    } else {
      toast.success(`Logged ₦${Number(debtAmount).toLocaleString()} owed by ${customerName}`)
      setCustomerName('')
      setCustomerPhone('')
      setDebtAmount('')
    }
    setLoading(false)
  }

  async function undoSale() {
    if (!lastSale || !staff) return
    setLoading(true)

    const { error } = await supabase
      .from('sales')
      .update({ is_undone: true, undone_at: new Date().toISOString() })
      .eq('id', lastSale.id)

    if (!error) {
      // 1. Get current stock qty to restore
      const { data: prodData } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', lastSale.product_id)
        .single()

      if (prodData) {
        // 2. Increment stock in products table
        await supabase
          .from('products')
          .update({ stock_qty: prodData.stock_qty + lastSale.qty_sold })
          .eq('id', lastSale.product_id)

        // 3. Log stock movement for undo
        await supabase.from('stock_movements').insert({
          business_id: staff.business_id,
          product_id: lastSale.product_id,
          movement_type: 'restock',
          qty_change: lastSale.qty_sold,
          reference_id: lastSale.id,
          logged_by: staff.id,
        })
      }

      setTodayTotal(prev => prev - lastSale.total)
      setLastSale(null)
      setUndoSeconds(0)
      // Reload products to restore stock in local state
      await loadData()
      toast.success('Last sale undone')
    }
    setLoading(false)
  }

  const undoMins = Math.floor(undoSeconds / 60)
  const undoSecs = undoSeconds % 60

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex flex-col">

      {/* Header */}
      <div className="px-4 pt-12 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[#A1A8A1] text-xs uppercase tracking-widest">Your sales today</p>
          <p className="text-[#00C853] text-4xl font-bold mt-1"
             style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
            {formatNaira(todayTotal)}
          </p>
          {staff && (
            <p className="text-[#6B726B] text-sm mt-0.5">{staff.name}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2.5">
          {staff?.role === 'owner' ? (
            <Link
              href="/dashboard"
              className="bg-[#151E15] border border-[#2A322A] text-[#00C853] text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-[#2A322A] active:scale-95 transition-all"
            >
              ← Dashboard
            </Link>
          ) : staff?.role === 'staff' ? (
            <SignOutButton size={14} className="bg-[#151E15] border border-[#2A322A] text-[#8A9E8A] hover:text-[#FF3D3D] text-xs font-semibold px-3.5 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 w-auto" />
          ) : null}

          {lastSale && undoSeconds > 0 && activeTab === 'sale' && (
            <button
              onClick={undoSale}
              className="flex items-center gap-2 bg-[#151E15] border border-[#2A322A]
                         px-3 py-2 rounded-xl text-[#FFFFFF] text-sm active:scale-95 transition-transform"
            >
              <span>↩</span>
              <span>{undoMins}:{String(undoSecs).padStart(2, '0')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      {step === 'select' && (
        <div className="px-4 mb-6 flex border-b border-[#151E15]">
          <button
            onClick={() => setActiveTab('sale')}
            className={`flex-1 text-center pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sale'
                ? 'border-[#00C853] text-[#FFFFFF]'
                : 'border-transparent text-[#6B726B] hover:text-[#A1A8A1]'
            }`}
          >
            Log Sale
          </button>
          <button
            onClick={() => setActiveTab('restock')}
            className={`flex-1 text-center pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'restock'
                ? 'border-[#00C853] text-[#FFFFFF]'
                : 'border-transparent text-[#6B726B] hover:text-[#A1A8A1]'
            }`}
          >
            Catalog & Restock
          </button>
          <button
            onClick={() => setActiveTab('debt')}
            className={`flex-1 text-center pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'debt'
                ? 'border-[#00C853] text-[#FFFFFF]'
                : 'border-transparent text-[#6B726B] hover:text-[#A1A8A1]'
            }`}
          >
            Log Debt
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 px-4 overflow-y-auto pb-32">

        {step === 'select' && activeTab !== 'debt' && (
          <>
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-[#A1A8A1] text-sm">
                {activeTab === 'sale' ? 'Tap a product to log a sale' : 'Tap a product to record incoming stock'}
              </p>
              
              {/* Product Search Bar */}
              {products.length > 0 && (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#6B726B]">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search product (enter at least 3 letters)..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#111811] border border-[#1A211A] rounded-xl pl-10 pr-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors placeholder-[#6B726B]"
                  />
                </div>
              )}
            </div>

            {loadingData ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton h-[92px] rounded-2xl bg-[#111811] animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="bg-[#111811] border border-[#EF4444]/20 rounded-2xl p-8 text-center shadow-card">
                <p className="text-[#EF4444] mb-4 text-sm">Something went wrong. Tap to retry.</p>
                <button
                  onClick={() => loadData()}
                  className="btn-secondary border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-white text-xs px-4 py-2"
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#6B726B]">No products yet. Ask your manager to add products.</p>
              </div>
            ) : (() => {
              const filteredProducts = products.filter(product => {
                if (search.trim().length >= 3) {
                  return product.name.toLowerCase().includes(search.trim().toLowerCase())
                }
                return true
              })
              
              if (filteredProducts.length === 0) {
                return (
                  <div className="text-center py-16">
                    <p className="text-[#6B726B]">No matching products found.</p>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map(product => {
                    const isOutOfStock = product.stock_qty === 0
                    // Disable card click in sales mode if it's out of stock
                    const disableClick = activeTab === 'sale' && isOutOfStock

                    return (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        disabled={disableClick}
                        className={`bg-[#111811] border rounded-2xl p-4 text-left transition-all
                                   active:scale-95 ${
                          disableClick
                            ? 'border-[#1A211A] opacity-40 cursor-not-allowed'
                            : 'border-[#1A211A] hover:border-[#00C853]'
                        }`}
                      >
                        <p className="text-[#FFFFFF] font-medium text-sm mb-1 truncate leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[#00C853] font-bold text-base"
                           style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatNaira(product.selling_price)}
                        </p>
                        <p className={`text-xs mt-1.5 ${
                          isOutOfStock
                            ? 'text-[#EF4444]'
                            : product.stock_qty <= product.low_stock_threshold
                            ? 'text-[#F59E0B]'
                            : 'text-[#6B726B]'
                        }`}>
                          {isOutOfStock
                            ? 'Out of stock'
                            : `${product.stock_qty} left`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}

        {step === 'select' && activeTab === 'debt' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-[#FFFFFF] text-xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
              Log Customer Credit / Debt
            </h2>
            <p className="text-[#A1A8A1] text-sm mb-6">
              Record a customer purchase on credit. This will appear immediately in the owner ledger.
            </p>

            <form onSubmit={handleLogDebt} className="space-y-4">
              <div>
                <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joy Okafor"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#111811] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors placeholder-[#6B726B]"
                />
              </div>

              <div>
                <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                  Customer Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#111811] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors placeholder-[#6B726B]"
                />
              </div>

              <div>
                <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                  Amount Owed (₦) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15000"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#111811] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors placeholder-[#6B726B]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !customerName || !debtAmount}
                className="w-full bg-[#00C853] text-black font-bold py-4 rounded-xl mt-4 disabled:opacity-40 active:scale-95 transition-transform"
              >
                {loading ? 'Logging debt...' : 'Save Debt Record'}
              </button>
            </form>
          </div>
        )}

        {step === 'quantity' && selected && (
          <div>
            <button
              onClick={() => { setStep('select'); setSelected(null) }}
              className="text-[#A1A8A1] text-sm mb-6 flex items-center gap-1 hover:text-[#FFFFFF] transition-colors"
            >
              ← Back to products
            </button>

            {/* Product card */}
            <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 mb-4">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1">Product</p>
              <p className="text-[#FFFFFF] text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                {selected.name}
              </p>
            </div>

            {/* Quantity */}
            <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 mb-4">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-4">
                {activeTab === 'sale' ? 'Quantity Sold' : 'Quantity Received'}
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-16 h-16 bg-[#151E15] rounded-2xl text-[#FFFFFF] text-3xl font-light
                             active:bg-[#2A322A] transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-[#FFFFFF] text-5xl font-bold"
                      style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => activeTab === 'sale' ? Math.min(selected.stock_qty, q + 1) : q + 1)}
                  className="w-16 h-16 bg-[#151E15] rounded-2xl text-[#FFFFFF] text-3xl font-light
                             active:bg-[#2A322A] transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price (Sale logging only) */}
            {activeTab === 'sale' && (
              <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 mb-6">
                <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-2">Price Each</p>
                <div className="flex items-center gap-2">
                  <span className="text-[#A1A8A1] text-2xl">₦</span>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="flex-1 bg-transparent text-[#FFFFFF] text-3xl font-bold
                               focus:outline-none"
                    style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              </div>
            )}

            {/* Total display (Sale logging only) */}
            {activeTab === 'sale' && (
              <div className="text-center mb-4">
                <p className="text-[#A1A8A1] text-sm">Total</p>
                <p className="text-[#00C853] text-5xl font-bold"
                   style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNaira(qty * price)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed confirm button */}
      {step === 'quantity' && selected && (
        <div className="fixed bottom-0 left-0 right-0 p-4"
             style={{ background: 'linear-gradient(to top, #0A0F0A 60%, transparent)' }}>
          <button
            onClick={activeTab === 'sale' ? confirmSale : confirmRestock}
            disabled={loading || (activeTab === 'sale' && qty * price === 0)}
            className="w-full bg-[#00C853] text-black font-bold py-5 rounded-2xl text-lg
                       disabled:opacity-40 active:scale-[0.98] transition-transform
                       shadow-lg"
            style={{ boxShadow: '0 8px 24px rgba(0, 200, 83, 0.25)' }}
          >
            {loading 
              ? (activeTab === 'sale' ? 'Logging sale...' : 'Restocking...') 
              : (activeTab === 'sale' ? `Confirm Sale — ${formatNaira(qty * price)}` : `Confirm Restock — +${qty} items`)}
          </button>
        </div>
      )}
    </div>
  )
}

export default function LogSalePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LogSaleContent />
    </Suspense>
  )
}
