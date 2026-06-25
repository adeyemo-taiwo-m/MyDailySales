'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { isIOS, isPWAInstalled } from '@/lib/utils'
import { urlBase64ToUint8Array } from '@/lib/push'
import toast from 'react-hot-toast'

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

    const { data, error } = await fetch('/api/invite/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        staff_name: staffName,
        staff_phone: staffPhone,
      }),
    }).then(r => r.json())

    if (error || !data?.link) {
      toast.error('Could not generate invite.')
    } else {
      setInviteLink(data.link)
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

  const stepIndex = { business: 0, products: 1, staff: 2, notifications: 3, done: 4 }
  const progress = ((stepIndex[step]) / 4) * 100

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[#1A211A]">
        <div
          className="h-full bg-[#00C853] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">

          {/* Step 1: Business Name */}
          {step === 'business' && (
            <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1">Step 1 of 4</p>
              <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                What's your business called?
              </h1>
              <p className="text-[#A1A8A1] text-sm mb-6">This shows on your daily summaries.</p>
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Business Name
              </label>
              <input
                placeholder="e.g. FreshMart Boutique"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBusiness()}
                autoFocus
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] placeholder-[#6B726B] mb-4
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Business Phone (optional)
              </label>
              <input
                placeholder="e.g. 08012345678"
                value={businessPhone}
                onChange={e => setBusinessPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBusiness()}
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] placeholder-[#6B726B] mb-6
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <button
                onClick={createBusiness}
                disabled={loading || !businessName.trim()}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Creating...' : 'Continue →'}
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#1A211A]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#111811] px-2 text-[#6B726B] tracking-wider">Quick Start</span>
                </div>
              </div>

              <button
                type="button"
                onClick={populateDemoData}
                disabled={loading}
                className="w-full bg-transparent border border-[#00C853] text-[#00C853] font-semibold py-3.5 rounded-xl hover:bg-[#00C853]/10 transition-colors"
              >
                Auto-populate Demo Data ⚡
              </button>
            </div>
          )}

          {/* Step 2: Products */}
          {step === 'products' && (
            <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1">Step 2 of 4</p>
              <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Add your products
              </h1>
              <p className="text-[#A1A8A1] text-sm mb-6">Add at least one to continue. You can add more later.</p>

              <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-1">
                {products.map((p, i) => (
                  <div key={i} className="bg-[#151E15] rounded-xl p-3 space-y-2 border border-[#1A211A]">
                    <input
                      placeholder="Product name"
                      value={p.name}
                      onChange={e => {
                        const updated = [...products]
                        updated[i].name = e.target.value
                        setProducts(updated)
                      }}
                      className="w-full bg-transparent border-b border-[#1A211A] pb-2
                                 text-[#FFFFFF] placeholder-[#6B726B] text-sm
                                 focus:outline-none focus:border-[#00C853] transition-colors"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Price (₦)"
                        value={p.selling_price}
                        onChange={e => {
                          const updated = [...products]
                          updated[i].selling_price = e.target.value
                          setProducts(updated)
                        }}
                        className="flex-1 bg-transparent border-b border-[#1A211A] pb-2
                                   text-[#FFFFFF] placeholder-[#6B726B] text-sm
                                   focus:outline-none focus:border-[#00C853] transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Stock qty"
                        value={p.stock_qty}
                        onChange={e => {
                          const updated = [...products]
                          updated[i].stock_qty = e.target.value
                          setProducts(updated)
                        }}
                        className="flex-1 bg-transparent border-b border-[#1A211A] pb-2
                                   text-[#FFFFFF] placeholder-[#6B726B] text-sm
                                   focus:outline-none focus:border-[#00C853] transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setProducts([...products, { name: '', selling_price: '', stock_qty: '' }])}
                className="w-full border border-[#2A322A] text-[#A1A8A1] py-2.5 rounded-xl text-sm mb-3
                           hover:border-[#00C853] hover:text-[#00C853] transition-colors"
              >
                + Add another product
              </button>

              <button
                onClick={saveProducts}
                disabled={loading}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Saving...' : 'Save Products →'}
              </button>
            </div>
          )}

          {/* Step 3: Staff Invite */}
          {step === 'staff' && (
            <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1">Step 3 of 4</p>
              <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Invite your staff
              </h1>
              <p className="text-[#A1A8A1] text-sm mb-6">You can skip this and add staff later.</p>

              {!inviteLink ? (
                <div className="space-y-3">
                  <input
                    placeholder="Staff name (e.g. Aisha)"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                               text-[#FFFFFF] placeholder-[#6B726B]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder="Their phone number"
                    value={staffPhone}
                    onChange={e => setStaffPhone(e.target.value)}
                    className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                               text-[#FFFFFF] placeholder-[#6B726B]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                  <button
                    onClick={generateInvite}
                    disabled={loading}
                    className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                               disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
                  >
                    {loading ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full text-[#A1A8A1] text-sm py-2 hover:text-[#FFFFFF] transition-colors"
                  >
                    Skip for now →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#151E15] border border-[#1A211A] rounded-xl p-4">
                    <p className="text-[#A1A8A1] text-xs mb-2">Invite link for {staffName}:</p>
                    <p className="text-[#00C853] text-sm break-all font-mono">{inviteLink}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
                    className="w-full border border-[#00C853] text-[#00C853] font-semibold py-3 rounded-xl hover:bg-[#00C853]/10 transition-colors"
                  >
                    Copy Link
                  </button>
                  <p className="text-[#6B726B] text-xs text-center">
                    Send this link to {staffName} over WhatsApp or SMS
                  </p>
                  <button
                    onClick={() => setStep('notifications')}
                    className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                               hover:bg-[#00C853]/90 transition-all"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Notifications */}
          {step === 'notifications' && (
            <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
              <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1">Step 4 of 4</p>
              <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                Get your daily summary
              </h1>
              <p className="text-[#A1A8A1] text-sm mb-6">
                Every night at 9pm, we'll send you a summary of the day's sales, who sold what, and what's running low.
              </p>

              {/* iOS prompt */}
              {isIOS() && !isPWAInstalled() && (
                <div className="bg-[rgba(245,158,11,0.1)] border border-[#F59E0B] rounded-xl p-4 mb-4">
                  <p className="text-[#F59E0B] text-sm font-medium mb-1">iPhone users</p>
                  <p className="text-[#A1A8A1] text-sm">
                    To receive notifications, first add this app to your home screen:
                    tap the Share button → "Add to Home Screen" → open the app from there.
                  </p>
                </div>
              )}

              <div className="bg-[#151E15] rounded-xl p-4 mb-6 border border-[#1A211A]">
                <p className="text-[#FFFFFF] text-sm font-medium">Preview:</p>
                <p className="text-[#A1A8A1] text-xs mt-1">FreshMart — Daily Summary</p>
                <p className="text-[#A1A8A1] text-xs">₦184,000 from 23 sales today. Aisha ₦112k · Tunde ₦72k. Tap to view.</p>
              </div>

              <button
                onClick={setupNotifications}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           hover:bg-[#00C853]/90 transition-all mb-3"
              >
                Enable Daily Summaries
              </button>
              <button
                onClick={() => setStep('done')}
                className="w-full text-[#A1A8A1] text-sm py-2 hover:text-[#FFFFFF]"
              >
                Skip for now →
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] text-center shadow-card">
              <div className="w-16 h-16 bg-[rgba(0,200,83,0.15)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                You're all set!
              </h1>
              <p className="text-[#A1A8A1] text-sm mb-6">
                Your business is ready. Go to your dashboard to see everything.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           hover:bg-[#00C853]/90 transition-all"
              >
                Open Dashboard →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
