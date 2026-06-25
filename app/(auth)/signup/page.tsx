'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp'

export default function SignupPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function signupDemo() {
    setLoading(true)
    const formatted = formatPhone('08000000000')

    const { error: sendError } = await supabase.auth.signInWithOtp({
      phone: formatted,
      options: { shouldCreateUser: true },
    })

    if (sendError) {
      toast((t) => (
        <div className="text-sm p-1">
          <p className="font-bold text-warn mb-1">Demo OTP Setup Required</p>
          <p className="text-xs text-[#A1A8A1] leading-relaxed mb-2">
            To test with Demo Mode, please add this number and code in your Supabase project:
          </p>
          <div className="bg-[#151E15] p-2 rounded border border-[#2A322A] text-xs font-mono mb-2">
            Phone: +2348000000000<br />
            OTP Code: 123456
          </div>
          <p className="text-[11px] text-[#6B726B]">
            Go to: <strong>Auth ➔ Providers ➔ Phone ➔ Test Phone Numbers</strong> in Supabase Dashboard.
          </p>
        </div>
      ), { duration: 10000, id: 'demo-otp-hint' })
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: '123456',
      type: 'sms',
    })

    if (verifyError) {
      toast.error('Verify failed: Ensure code is 123456 for +2348000000000')
      setLoading(false)
      return
    }

    toast.success('Demo account created!')
    router.push('/onboarding')
    setLoading(false)
  }

  async function sendOTP() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
      options: { shouldCreateUser: true },
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
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token: otp,
      type: 'sms',
    })
    if (error) {
      toast.error('Invalid code.')
      setLoading(false)
      return
    }
    // New user → onboarding
    router.push('/onboarding')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[#00C853] rounded-xl flex items-center justify-center">
              <span className="text-black font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>M</span>
            </div>
            <span className="text-[#F0F4F0] font-semibold text-xl" style={{ fontFamily: 'Space Grotesk' }}>
              MyDailySales
            </span>
          </div>
        </div>

        <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
          <h1 className="text-[#F0F4F0] text-xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            {step === 'phone' ? 'Create your account' : 'Verify your number'}
          </h1>
          <p className="text-[#A1A8A1] text-sm mb-6">
            {step === 'phone'
              ? 'Your phone number is your login'
              : `Enter the code sent to ${phone}`}
          </p>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="text-[#6B726B] text-xs uppercase tracking-widest mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#1A211A]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#111811] px-2 text-[#6B726B] tracking-wider">Or explore</span>
                </div>
              </div>

              <button
                type="button"
                onClick={signupDemo}
                disabled={loading}
                className="w-full bg-transparent border border-[#2A322A] text-[#00C853] hover:bg-[#00C853]/10 font-semibold py-3.5 rounded-xl transition-all"
              >
                Explore with Demo Mode
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="number"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                autoFocus
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] text-2xl text-center tracking-[0.5em] placeholder-[#6B726B]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Verifying...' : 'Create Account'}
              </button>
              <button onClick={() => setStep('phone')}
                      className="w-full text-[#A1A8A1] text-sm py-2 hover:text-[#FFFFFF]">
                ← Change number
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[#6B726B] text-sm mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#00C853] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
