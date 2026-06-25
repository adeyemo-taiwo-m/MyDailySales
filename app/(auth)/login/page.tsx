'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function sendOTP() {
    if (phone.length < 10) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
    })
    if (error) {
      toast.error(error.message)
    } else {
      setStep('otp')
      toast.success('Code sent!')
    }
    setLoading(false)
  }

  async function verifyOTP() {
    if (otp.length < 6) return
    setLoading(true)

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: 'sms',
    })

    if (error) {
      toast.error('Invalid code. Try again.')
      setLoading(false)
      return
    }

    // Determine where to send user based on role
    const { data: staffData } = await supabase
      .from('staff_members')
      .select('role')
      .eq('user_id', data.user?.id)
      .maybeSingle()

    if (!staffData) {
      // New user — no business yet
      router.push('/onboarding')
    } else if (staffData.role === 'staff') {
      router.push('/log-sale')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[#00C853] rounded-xl flex items-center justify-center">
              <span className="text-black font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>M</span>
            </div>
            <span className="text-[#F0F4F0] font-semibold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
              MyDailySales
            </span>
          </div>
          <p className="text-[#8A9E8A] text-sm">Know your numbers. Every day.</p>
        </div>

        <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
          <h1 className="text-[#F0F4F0] text-xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            {step === 'phone' ? 'Welcome back' : 'Enter your code'}
          </h1>
          <p className="text-[#A1A8A1] text-sm mb-6">
            {step === 'phone'
              ? 'Enter your business phone number'
              : `6-digit code sent to ${phone}`}
          </p>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  autoFocus
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-base placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  6-Digit Code
                </label>
                <input
                  type="number"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  autoFocus
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-2xl text-center tracking-[0.5em] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp('') }}
                className="w-full text-[#A1A8A1] text-sm py-2 hover:text-[#FFFFFF] transition-colors"
              >
                ← Use a different number
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[#6B726B] text-sm mt-6">
          New business?{' '}
          <a href="/signup" className="text-[#00C853] hover:underline">Create account</a>
        </p>
      </div>
    </div>
  )
}
