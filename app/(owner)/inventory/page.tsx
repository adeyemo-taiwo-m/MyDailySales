'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search, Plus, Trash2, Edit } from 'lucide-react'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stockQty, setStockQty] = useState('0')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const loadProducts = useCallback(async () => {
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
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', staffMember.business_id)
          .eq('is_active', true)
          .order('name')

        if (data) setProducts(data)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadProducts() }, [loadProducts])

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !sellingPrice) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('business_id, id')
      .eq('user_id', user.id)
      .single()

    if (!staffMember?.business_id) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: staffMember.business_id,
        name: name.trim(),
        selling_price: Number(sellingPrice),
        cost_price: costPrice ? Number(costPrice) : null,
        stock_qty: Number(stockQty),
        low_stock_threshold: Number(lowStockThreshold),
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Product added!')
      setName('')
      setSellingPrice('')
      setCostPrice('')
      setStockQty('0')
      setLowStockThreshold('5')
      setShowAddForm(false)
      // Log stock movement
      if (Number(stockQty) > 0 && data) {
        await supabase.from('stock_movements').insert({
          business_id: staffMember.business_id,
          product_id: data.id,
          movement_type: 'restock',
          qty_change: Number(stockQty),
          logged_by: staffMember.id,
        })
      }
      loadProducts()
    }
    setSubmitting(false)
  }

  async function adjustStock(productId: string, currentQty: number, change: number) {
    const newQty = currentQty + change
    if (newQty < 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('business_id, id')
      .eq('user_id', user.id)
      .single()

    if (!staffMember) return

    // Update in DB
    const { error } = await supabase
      .from('products')
      .update({ stock_qty: newQty })
      .eq('id', productId)

    if (error) {
      toast.error('Failed to update stock')
    } else {
      // Log movement
      await supabase.from('stock_movements').insert({
        business_id: staffMember.business_id,
        product_id: productId,
        movement_type: change > 0 ? 'restock' : 'adjustment',
        qty_change: change,
        logged_by: staffMember.id,
      })

      setProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, stock_qty: newQty } : p)
      )
      toast.success('Stock adjusted')
    }
  }

  async function softDeleteProduct(productId: string) {
    if (!confirm('Are you sure you want to remove this product?')) return

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)

    if (error) {
      toast.error('Failed to delete product')
    } else {
      toast.success('Product removed')
      setProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-[#A1A8A1] text-sm">Manage your catalog</p>
          <h1 className="text-[#FFFFFF] text-2xl font-bold font-display">Inventory</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#6B726B]">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input !pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-[140px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111811] rounded-2xl border border-[#1A211A] p-12 text-center shadow-card">
          <p className="text-[#6B726B] mb-4">No products found</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => {
            const isOut = product.stock_qty <= 0
            const isLow = !isOut && product.stock_qty <= product.low_stock_threshold
            const stockColor = isOut ? 'text-[#EF4444]' : isLow ? 'text-[#F59E0B]' : 'text-[#FFFFFF]'

            return (
              <div key={product.id} className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 flex flex-col justify-between hover:border-[#2A322A] transition-colors shadow-card">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-bold text-sm text-[#FFFFFF] truncate" title={product.name}>
                      {product.name}
                    </span>
                    <button
                      onClick={() => softDeleteProduct(product.id)}
                      className="text-[#6B726B] hover:text-[#EF4444] p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-xl font-bold text-[#00C853] font-display mb-1">
                    {formatNaira(product.selling_price)}
                  </div>
                  {product.cost_price && (
                    <p className="text-[#6B726B] text-xs">Cost: {formatNaira(product.cost_price)}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#1A211A] flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-[#6B726B]">Stock:</span>
                    <span className={`font-bold ${stockColor}`}>{product.stock_qty} pcs</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => adjustStock(product.id, product.stock_qty, -1)}
                      className="w-7 h-7 bg-[#151E15] hover:bg-[#2A322A] border border-[#1A211A] rounded-lg text-lg flex items-center justify-center text-[#FFFFFF] active:scale-90 transition-transform"
                    >
                      −
                    </button>
                    <button
                      onClick={() => adjustStock(product.id, product.stock_qty, 1)}
                      className="w-7 h-7 bg-[#151E15] hover:bg-[#2A322A] border border-[#1A211A] rounded-lg text-lg flex items-center justify-center text-[#FFFFFF] active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Product Drawer */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-40 bg-[#0A0F0A]/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setShowAddForm(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#111811] border-l border-[#1A211A] p-6 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          showAddForm ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex justify-between items-center mb-6 border-b border-[#1A211A] pb-4">
          <div>
            <h2 className="text-[#FFFFFF] text-lg font-bold font-display">Add Product</h2>
            <p className="text-[#A1A8A1] text-xs">Create a new item in your catalog</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="w-8 h-8 rounded-lg bg-[#151E15] border border-[#1A211A] flex items-center justify-center text-[#A1A8A1] hover:text-[#FFFFFF] hover:bg-[#2A322A] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-5 flex-1 flex flex-col justify-between overflow-y-auto pr-1">
          <div className="space-y-4">
            <div>
              <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Garri 1kg"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input w-full bg-[#151E15] border border-[#1A211A] text-white px-4 py-3 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Selling Price</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#6B726B] font-mono">₦</span>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="input w-full bg-[#151E15] border border-[#1A211A] text-white pl-8 pr-4 py-3 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Cost Price</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#6B726B] font-mono">₦</span>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="input w-full bg-[#151E15] border border-[#1A211A] text-white pl-8 pr-4 py-3 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Opening Stock</label>
                <input
                  type="number"
                  placeholder="0"
                  value={stockQty}
                  onChange={e => setStockQty(e.target.value)}
                  className="input w-full bg-[#151E15] border border-[#1A211A] text-white px-4 py-3 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Low Stock Alert</label>
                <input
                  type="number"
                  placeholder="5"
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(e.target.value)}
                  className="input w-full bg-[#151E15] border border-[#1A211A] text-white px-4 py-3 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-[#1A211A]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 btn-secondary py-3.5 rounded-xl border border-[#1A211A] text-[#A1A8A1] hover:text-[#FFFFFF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary py-3.5 rounded-xl bg-[#00C853] text-black font-bold hover:brightness-105 active:scale-98 transition-all"
            >
              {submitting ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
