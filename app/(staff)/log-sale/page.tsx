'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, StaffMember } from '@/types'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'

type SaleStep = 'select' | 'quantity'

export default function LogSalePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [step, setStep] = useState<SaleStep>('select')
  const [loading, setLoading] = useState(false)
  const [todayTotal, setTodayTotal] = useState(0)
  const [lastSale, setLastSale] = useState<{ id: string; total: number } | null>(null)
  const [undoSeconds, setUndoSeconds] = useState(0)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: staffData }, { data: productsData }] = await Promise.all([
      supabase.from('staff_members').select('*').eq('user_id', user.id).single(),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
    ])

    if (staffData) {
      setStaff(staffData)
      // Load today total for this staff member
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('staff_id', staffData.id)
        .gte('logged_at', today)
        .eq('is_undone', false)

      setTodayTotal((todaySales || []).reduce((s, sale) => s + sale.total, 0))
    }
    if (productsData) setProducts(productsData)
  }, [supabase])

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

    // Update product stock in DB
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

    setLastSale({ id: data.id, total: saleTotal })
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

  async function undoSale() {
    if (!lastSale || !staff) return

    const { error } = await supabase
      .from('sales')
      .update({ is_undone: true, undone_at: new Date().toISOString() })
      .eq('id', lastSale.id)

    if (!error) {
      setTodayTotal(prev => prev - lastSale.total)
      setLastSale(null)
      setUndoSeconds(0)
      // Reload products to restore stock
      await loadData()
      toast.success('Last sale undone')
    }
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

        {lastSale && undoSeconds > 0 && (
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

      {/* Main content */}
      <div className="flex-1 px-4 overflow-y-auto pb-32">

        {step === 'select' && (
          <>
            <p className="text-[#A1A8A1] text-sm mb-4">Tap a product to log a sale</p>
            {products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#6B726B]">No products yet. Ask your manager to add products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => product.stock_qty > 0 && selectProduct(product)}
                    disabled={product.stock_qty === 0}
                    className={`bg-[#111811] border rounded-2xl p-4 text-left transition-all
                               active:scale-95 ${
                      product.stock_qty === 0
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
                      product.stock_qty === 0
                        ? 'text-[#EF4444]'
                        : product.stock_qty <= product.low_stock_threshold
                        ? 'text-[#F59E0B]'
                        : 'text-[#6B726B]'
                    }`}>
                      {product.stock_qty === 0
                        ? 'Out of stock'
                        : `${product.stock_qty} left`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
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
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-4">Quantity</p>
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
                  onClick={() => setQty(q => Math.min(selected.stock_qty, q + 1))}
                  className="w-16 h-16 bg-[#151E15] rounded-2xl text-[#FFFFFF] text-3xl font-light
                             active:bg-[#2A322A] transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price */}
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

            {/* Total display */}
            <div className="text-center mb-4">
              <p className="text-[#A1A8A1] text-sm">Total</p>
              <p className="text-[#00C853] text-5xl font-bold"
                 style={{ fontFamily: 'Space Grotesk', fontVariantNumeric: 'tabular-nums' }}>
                {formatNaira(qty * price)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed confirm button */}
      {step === 'quantity' && (
        <div className="fixed bottom-0 left-0 right-0 p-4"
             style={{ background: 'linear-gradient(to top, #0A0F0A 60%, transparent)' }}>
          <button
            onClick={confirmSale}
            disabled={loading || qty * price === 0}
            className="w-full bg-[#00C853] text-black font-bold py-5 rounded-2xl text-lg
                       disabled:opacity-40 active:scale-[0.98] transition-transform
                       shadow-lg"
            style={{ boxShadow: '0 8px 24px rgba(0, 200, 83, 0.25)' }}
          >
            {loading ? 'Logging sale...' : `Confirm — ${formatNaira(qty * price)}`}
          </button>
        </div>
      )}
    </div>
  )
}
