'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { isIOS, isPWAInstalled } from '@/lib/utils'
import { urlBase64ToUint8Array } from '@/lib/push'
import toast from 'react-hot-toast'
import { 
  Store, 
  ShoppingBag, 
  Users, 
  Bell, 
  Check, 
  Sparkles, 
  Trash2, 
  Plus, 
  Copy, 
  ArrowRight,
  Smartphone
} from 'lucide-react'

type Step = 'business' | 'products' | 'staff' | 'notifications' | 'done'

interface ProductDraft {
  name: string
  selling_price: string
  stock_qty: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('business')
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [products, setProducts] = useState<ProductDraft[]>([
    { name: '', selling_price: '', stock_qty: '' }
  ])
  const [staffName, setStaffName] = useState('')
  const [staffPhone, setStaffPhone] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function populateDemoData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session not found. Please log in first.')
        router.push('/login')
        return
      }

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // 1. Create Business
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .insert({
          name: 'StyleHaus Boutique (Demo)',
          owner_id: user.id,
          phone: user.phone || '+2348000000000',
        })
        .select()
        .single()

      if (bizError || !biz) {
        throw new Error('Business creation failed: ' + bizError?.message)
      }

      // 2. Create Owner Staff Record
      const { data: ownerStaff, error: ownerStaffError } = await supabase
        .from('staff_members')
        .insert({
          business_id: biz.id,
          user_id: user.id,
          name: 'Owner (Demo)',
          role: 'owner',
        })
        .select()
        .single()

      if (ownerStaffError || !ownerStaff) {
        throw new Error('Owner staff creation failed: ' + ownerStaffError?.message)
      }

      // 3. Create Demo Staff Record
      const { data: demoStaff, error: staffError } = await supabase
        .from('staff_members')
        .insert({
          business_id: biz.id,
          user_id: generateUUID(),
          name: 'Aisha (Demo Staff)',
          role: 'staff',
        })
        .select()
        .single()

      if (staffError || !demoStaff) {
        throw new Error('Demo staff creation failed: ' + staffError?.message)
      }

      // 4. Create Products
      const demoProducts = [
        { name: 'Silk Wrap Dress', selling_price: 25000, cost_price: 15000, stock_qty: 12, low_stock_threshold: 5 },
        { name: 'Leather Tote Bag', selling_price: 45000, cost_price: 28000, stock_qty: 4, low_stock_threshold: 5 },
        { name: 'Gold Hoop Earrings', selling_price: 12000, cost_price: 6000, stock_qty: 25, low_stock_threshold: 5 },
        { name: 'Oversized Blazer', selling_price: 32000, cost_price: 20000, stock_qty: 8, low_stock_threshold: 5 },
        { name: 'Velvet Heel Sandals', selling_price: 38000, cost_price: 24000, stock_qty: 3, low_stock_threshold: 5 }
      ]

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .insert(demoProducts.map(p => ({ ...p, business_id: biz.id })))
        .select()

      if (productsError || !productsData) {
        throw new Error('Product creation failed: ' + productsError?.message)
      }

      // 5. Create Mock Sales
      const silkDress = productsData.find(p => p.name === 'Silk Wrap Dress')
      const goldHoops = productsData.find(p => p.name === 'Gold Hoop Earrings')
      const blazer = productsData.find(p => p.name === 'Oversized Blazer')

      const salesToInsert = []
      if (silkDress) {
        salesToInsert.push({
          business_id: biz.id,
          staff_id: demoStaff.id,
          product_id: silkDress.id,
          qty_sold: 2,
          price_each: silkDress.selling_price,
          total: silkDress.selling_price * 2,
          cost_total: (silkDress.cost_price || 0) * 2,
          logged_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        })
      }
      if (goldHoops) {
        salesToInsert.push({
          business_id: biz.id,
          staff_id: demoStaff.id,
          product_id: goldHoops.id,
          qty_sold: 1,
          price_each: goldHoops.selling_price,
          total: goldHoops.selling_price,
          cost_total: goldHoops.cost_price || 0,
          logged_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        })
      }
      if (blazer) {
        salesToInsert.push({
          business_id: biz.id,
          staff_id: ownerStaff.id,
          product_id: blazer.id,
          qty_sold: 1,
          price_each: blazer.selling_price,
          total: blazer.selling_price,
          cost_total: blazer.cost_price || 0,
          logged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        })
      }

      if (salesToInsert.length > 0) {
        const { error: salesError } = await supabase.from('sales').insert(salesToInsert)
        if (salesError) {
          throw new Error('Sales creation failed: ' + salesError.message)
        }
      }

      // 6. Create Mock Debts
      const debtsToInsert = [
        {
          business_id: biz.id,
          customer_name: 'Chioma Nwachukwu',
          customer_phone: '08098765432',
          amount_owed: 30000,
          amount_paid: 10000,
          status: 'partial',
          created_by: ownerStaff.id
        },
        {
          business_id: biz.id,
          customer_name: 'Funmi Adebayo',
          customer_phone: '07012345678',
          amount_owed: 15000,
          amount_paid: 0,
          status: 'unpaid',
          created_by: demoStaff.id
        }
      ]

      const { error: debtsError } = await supabase.from('debts').insert(debtsToInsert)
      if (debtsError) {
        throw new Error('Debts creation failed: ' + debtsError.message)
      }

      toast.success('Demo data populated!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Failed to populate demo data.')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Create business
  async function createBusiness() {
    if (!businessName.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Create business record
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: businessName.trim(),
        owner_id: user.id,
        phone: businessPhone.trim() || null,
      })
      .select()
      .single()

    if (bizError || !biz) {
      toast.error(bizError?.message || 'Could not create business. Try again.')
      setLoading(false)
      return
    }

    // Create owner staff_members record
    const { error: staffError } = await supabase
      .from('staff_members')
      .insert({
        business_id: biz.id,
        user_id: user.id,
        name: 'Owner',
        role: 'owner',
      })

    if (staffError) {
      toast.error(staffError.message || 'Setup error. Try again.')
      setLoading(false)
      return
    }

    setBusinessId(biz.id)
    setStep('products')
    setLoading(false)
  }

  // Step 2: Add products
  async function saveProducts() {
    const validProducts = products.filter(p => p.name.trim() && p.selling_price)
    if (validProducts.length === 0) {
      toast.error('Add at least one product')
      return
    }
    setLoading(true)

    const { error } = await supabase.from('products').insert(
      validProducts.map(p => ({
        business_id: businessId,
        name: p.name.trim(),
        selling_price: Number(p.selling_price),
        stock_qty: Number(p.stock_qty) || 0,
      }))
    )

    if (error) {
      toast.error('Could not save products.')
      setLoading(false)
      return
    }

    setStep('staff')
    setLoading(false)
  }

  // Step 3: Generate staff invite link
  async function generateInvite() {
    if (!staffName.trim() || !staffPhone.trim()) {
      setStep('notifications')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          staff_name: staffName.trim(),
          staff_phone: staffPhone.trim(),
        }),
      }).then(r => r.json())

      if (res.error || !res.data?.link) {
        toast.error(res.error || 'Could not generate invite.')
      } else {
        setInviteLink(res.data.link)
      }
    } catch (err) {
      toast.error('Connection error.')
    }
    setLoading(false)
  }

  // Step 4: Request push notification permission
  async function setupNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStep('done')
      return
    }

    try {
      // Register service worker
      await navigator.serviceWorker.register('/sw.js')
      const registration = await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStep('done')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as any,
      })

      await supabase.from('push_subscriptions').upsert({
        business_id: businessId,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' })

      toast.success('Daily summaries enabled!')
    } catch (err) {
      toast.error('Could not enable notifications.')
    }

    setStep('done')
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function addProductField() {
    setProducts([...products, { name: '', selling_price: '', stock_qty: '' }])
  }

  function removeProductField(index: number) {
    if (products.length <= 1) return
    setProducts(products.filter((_, i) => i !== index))
  }

  const stepIndex = { business: 0, products: 1, staff: 2, notifications: 3, done: 4 }
  const progress = ((stepIndex[step]) / 4) * 100

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex flex-col relative overflow-hidden font-body selection:bg-accent/30 selection:text-white">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[450px] h-[450px] bg-accent-alt/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Progress bar */}
      <div className="h-[3px] bg-border w-full relative z-10">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-alt shadow-[0_0_8px_rgba(0,200,83,0.5)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="w-full max-w-md">

          {/* Step 1: Business Name */}
          {step === 'business' && (
            <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="inline-flex items-center gap-1.5 bg-surface2 border border-border2 text-accent text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
                  <Store size={12} className="text-accent" />
                  Step 1 of 4
                </span>
                <span className="text-text3 text-xs font-semibold">Setup Business</span>
              </div>

              <h1 className="text-text1 text-2xl md:text-3xl font-bold mb-2 font-display leading-tight">
                What's your business called?
              </h1>
              <p className="text-text2 text-sm mb-6 leading-relaxed">
                This will appear on your daily summaries and dashboard.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-text3 text-[10px] font-bold uppercase tracking-widest mb-2 block">
                    Business Name
                  </label>
                  <input
                    placeholder="e.g. FreshMart Boutique"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createBusiness()}
                    autoFocus
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-3
                               text-text1 placeholder-text3 text-sm focus:outline-none 
                               focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-text3 text-[10px] font-bold uppercase tracking-widest block">
                      Business Phone
                    </label>
                    <span className="text-[10px] text-text3 font-medium">Optional</span>
                  </div>
                  <input
                    placeholder="e.g. 08012345678"
                    value={businessPhone}
                    onChange={e => setBusinessPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createBusiness()}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-3
                               text-text1 placeholder-text3 text-sm focus:outline-none 
                               focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={createBusiness}
                disabled={loading || !businessName.trim()}
                className="w-full bg-accent text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 
                           active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Creating...' : 'Continue'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-3 text-text3 font-bold tracking-widest text-[9px]">Quick Start</span>
                </div>
              </div>

              <button
                type="button"
                onClick={populateDemoData}
                disabled={loading}
                className="w-full bg-transparent border border-accent/30 text-accent font-semibold py-3.5 rounded-xl 
                           hover:bg-accent/5 hover:border-accent active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Auto-populate Demo Data ⚡</span>
              </button>
            </div>
          )}

          {/* Step 2: Products */}
          {step === 'products' && (
            <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="inline-flex items-center gap-1.5 bg-surface2 border border-border2 text-accent text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
                  <ShoppingBag size={12} className="text-accent" />
                  Step 2 of 4
                </span>
                <span className="text-text3 text-xs font-semibold">Inventory Setup</span>
              </div>

              <h1 className="text-text1 text-2xl md:text-3xl font-bold mb-2 font-display leading-tight">
                Add your products
              </h1>
              <p className="text-text2 text-sm mb-6 leading-relaxed">
                Add at least one product to start. You can add more anytime later.
              </p>

              <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {products.map((p, i) => (
                  <div key={i} className="bg-surface2 rounded-2xl p-4 space-y-3 border border-border relative group/row">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text3 font-bold uppercase tracking-wider">Product #{i+1}</span>
                      {products.length > 1 && (
                        <button
                          onClick={() => removeProductField(i)}
                          className="text-text3 hover:text-danger p-1 rounded-lg hover:bg-danger/10 transition-colors"
                          title="Remove product"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <input
                      placeholder="Product name (e.g. Silk Wrap Dress)"
                      value={p.name}
                      onChange={e => {
                        const updated = [...products]
                        updated[i].name = e.target.value
                        setProducts(updated)
                      }}
                      className="w-full bg-transparent border-b border-border pb-2
                                 text-text1 placeholder-text3 text-sm
                                 focus:outline-none focus:border-accent transition-colors"
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="Price (₦)"
                          value={p.selling_price}
                          onChange={e => {
                            const updated = [...products]
                            updated[i].selling_price = e.target.value
                            setProducts(updated)
                          }}
                          className="w-full bg-transparent border-b border-border pb-2
                                     text-text1 placeholder-text3 text-sm
                                     focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="Stock qty"
                          value={p.stock_qty}
                          onChange={e => {
                            const updated = [...products]
                            updated[i].stock_qty = e.target.value
                            setProducts(updated)
                          }}
                          className="w-full bg-transparent border-b border-border pb-2
                                     text-text1 placeholder-text3 text-sm
                                     focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addProductField}
                className="w-full border border-dashed border-border2 text-text2 py-3 rounded-xl text-sm mb-4
                           hover:border-accent hover:text-accent active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 font-medium"
              >
                <Plus size={16} />
                <span>Add another product</span>
              </button>

              <button
                onClick={saveProducts}
                disabled={loading}
                className="w-full bg-accent text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-accent/90 active:scale-[0.99] transition-all 
                           flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Saving...' : 'Save & Continue'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          )}

          {/* Step 3: Staff Invite */}
          {step === 'staff' && (
            <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="inline-flex items-center gap-1.5 bg-surface2 border border-border2 text-accent text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
                  <Users size={12} className="text-accent" />
                  Step 3 of 4
                </span>
                <span className="text-text3 text-xs font-semibold">Staff Setup</span>
              </div>

              <h1 className="text-text1 text-2xl md:text-3xl font-bold mb-2 font-display leading-tight">
                Invite your staff
              </h1>
              <p className="text-text2 text-sm mb-6 leading-relaxed">
                Add staff members so they can log sales. You can skip this and add them later.
              </p>

              {!inviteLink ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-text3 text-[10px] font-bold uppercase tracking-widest mb-2 block">
                      Staff Name
                    </label>
                    <input
                      placeholder="e.g. Aisha"
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-xl px-4 py-3
                                 text-text1 placeholder-text3 text-sm focus:outline-none 
                                 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-text3 text-[10px] font-bold uppercase tracking-widest mb-2 block">
                      Their Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={staffPhone}
                      onChange={e => setStaffPhone(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-xl px-4 py-3
                                 text-text1 placeholder-text3 text-sm focus:outline-none 
                                 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    />
                  </div>

                  <button
                    onClick={generateInvite}
                    disabled={loading || !staffName.trim() || !staffPhone.trim()}
                    className="w-full bg-accent text-black font-semibold py-3.5 rounded-xl
                               disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 
                               active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Generating...' : 'Generate Invite Link'}</span>
                    {!loading && <ArrowRight size={16} />}
                  </button>

                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full text-text2 text-sm py-2 hover:text-text1 transition-colors font-medium text-center"
                  >
                    Skip for now →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-surface2 border border-border rounded-2xl p-4">
                    <p className="text-text2 text-[11px] mb-2 font-semibold">Invite link for {staffName}:</p>
                    <div className="bg-bg border border-border p-3 rounded-xl break-all font-mono text-accent text-xs select-all">
                      {inviteLink}
                    </div>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="w-full border border-accent text-accent font-semibold py-3 rounded-xl 
                               hover:bg-accent/5 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <p className="text-text3 text-xs text-center leading-relaxed">
                    Send this link to {staffName} over WhatsApp or SMS. Once they open it, they can register and access the shop.
                  </p>

                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full bg-accent text-black font-semibold py-3.5 rounded-xl
                               hover:bg-accent/90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Notifications */}
          {step === 'notifications' && (
            <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="inline-flex items-center gap-1.5 bg-surface2 border border-border2 text-accent text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
                  <Bell size={12} className="text-accent" />
                  Step 4 of 4
                </span>
                <span className="text-text3 text-xs font-semibold">Alerts</span>
              </div>

              <h1 className="text-text1 text-2xl md:text-3xl font-bold mb-2 font-display leading-tight">
                Get your daily summary
              </h1>
              <p className="text-text2 text-sm mb-6 leading-relaxed">
                Every night at 9pm, we'll send a summary of the day's sales, who sold what, and what's running low.
              </p>

              {/* iOS prompt */}
              {isIOS() && !isPWAInstalled() && (
                <div className="bg-warn/10 border border-warn/20 rounded-2xl p-4 mb-4 flex gap-3">
                  <Smartphone className="text-warn shrink-0" size={20} />
                  <div className="space-y-1">
                    <p className="text-warn text-xs font-bold uppercase tracking-wider">iPhone Required Action</p>
                    <p className="text-text2 text-xs leading-relaxed">
                      To receive notifications on iOS, first add this app to your Home Screen: 
                      tap <span className="text-text1 font-semibold">Share</span> → <span className="text-text1 font-semibold">"Add to Home Screen"</span>, then open it there.
                    </p>
                  </div>
                </div>
              )}

              {/* Mock Notification bubble */}
              <div className="bg-[#151E15]/50 border border-border rounded-2xl p-4 mb-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
                      <span className="text-black font-extrabold text-[10px] font-display">M</span>
                    </div>
                    <span className="text-text1 text-xs font-bold tracking-wide">MyDailySales</span>
                  </div>
                  <span className="text-text3 text-[10px] font-medium">9:00 PM</span>
                </div>
                <p className="text-text1 text-xs font-bold">{businessName || 'FreshMart'} — Daily Summary</p>
                <p className="text-text2 text-[11px] mt-0.5 leading-snug">
                  ₦184,000 from 23 sales today. Aisha ₦112k · Owner ₦72k. 2 items low on stock.
                </p>
              </div>

              <button
                onClick={setupNotifications}
                className="w-full bg-accent text-black font-semibold py-3.5 rounded-xl
                           hover:bg-accent/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mb-3"
              >
                <Bell size={16} />
                <span>Enable Daily Summaries</span>
              </button>
              <button
                onClick={() => setStep('done')}
                className="w-full text-text2 text-sm py-2 hover:text-text1 transition-colors font-medium text-center"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border shadow-2xl text-center relative overflow-hidden transition-all duration-300">
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="text-accent animate-bounce" size={28} />
              </div>
              <h1 className="text-text1 text-2xl md:text-3xl font-bold mb-2 font-display tracking-tight">
                You're all set!
              </h1>
              <p className="text-text2 text-sm mb-8 leading-relaxed">
                Your business is created. You can now access your daily manager board, log sales, track stock levels, and monitor debts.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-accent text-black font-semibold py-4 rounded-xl
                           hover:bg-accent/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>Open Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
