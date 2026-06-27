'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'

declare global {
  interface Window { PaystackPop: any }
}

export default function BillingPage() {
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Load Paystack Pop inline JS script
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    async function getUserEmail() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      } else if (user?.phone) {
        setUserEmail(`${user.phone.replace('+', '')}@mydailysales.com`)
      }
      setLoading(false)
    }
    getUserEmail()

    return () => {
      document.body.removeChild(script)
    }
  }, [supabase])

  function subscribe(plan: 'business' | 'growth') {
    if (typeof window.PaystackPop === 'undefined') {
      toast.error('Paystack SDK loading. Please try again.')
      return
    }

    const amount = plan === 'business' ? 8000 : 15000
    const planCode = plan === 'business'
      ? process.env.NEXT_PUBLIC_PAYSTACK_BUSINESS_PLAN!
      : process.env.NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN!

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail || 'owner@mydailysales.com',
      amount: amount * 100,
      currency: 'NGN',
      plan: planCode,
      callback: async (response: { reference: string }) => {
        toast.success('Payment received! Verifying subscription...')
        
        try {
          const res = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference }),
          })

          if (res.ok) {
            toast.success('Subscription active!')
            window.location.href = '/dashboard'
          } else {
            toast.error('Verification failed. We will activate in background via webhook soon.')
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 3000)
          }
        } catch (err) {
          toast.error('Network error during verification.')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 3000)
        }
      },
      onClose: () => {
        toast('Subscription process cancelled')
      },
    })
    handler.openIframe()
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-lg mx-auto text-center text-[#6B726B]">
        Loading plans...
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto">
      <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2 font-display">
        Choose a plan
      </h1>
      <p className="text-[#A1A8A1] text-sm mb-8">
        Your 14-day free trial has ended. Subscribe to continue.
      </p>

      <div className="space-y-4">
        {/* Business Plan */}
        <div className="bg-[#111811] border-2 border-[#00C853] rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[#FFFFFF] font-semibold text-lg">Business</p>
              <p className="text-[#A1A8A1] text-sm">Up to 3 staff</p>
            </div>
            <div className="text-right">
              <p className="text-[#00C853] text-2xl font-bold font-display">
                ₦8,000
              </p>
              <p className="text-[#A1A8A1] text-xs">per month</p>
            </div>
          </div>
          <button
            onClick={() => subscribe('business')}
            className="w-full bg-[#00C853] text-black font-semibold py-3 rounded-xl hover:bg-[#00C853]/90 transition-colors active:scale-95 duration-75"
          >
            Subscribe — ₦8,000/month
          </button>
        </div>

        {/* Growth Plan */}
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card hover:border-[#2A322A] transition-colors">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[#FFFFFF] font-semibold text-lg">Growth</p>
              <p className="text-[#A1A8A1] text-sm">Up to 8 staff · PDF reports</p>
            </div>
            <div className="text-right">
              <p className="text-[#FFFFFF] text-2xl font-bold font-display">
                ₦15,000
              </p>
              <p className="text-[#A1A8A1] text-xs">per month</p>
            </div>
          </div>
          <button
            onClick={() => subscribe('growth')}
            className="w-full bg-[#151E15] text-[#FFFFFF] font-semibold py-3 rounded-xl border border-[#2A322A] hover:bg-[#151E15]/90 transition-colors active:scale-95 duration-75"
          >
            Subscribe — ₦15,000/month
          </button>
        </div>
      </div>
    </div>
  )
}
