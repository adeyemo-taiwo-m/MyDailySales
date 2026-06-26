'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'

type Step = 'loading' | 'invalid' | 'confirm' | 'otp' | 'pin'

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "+234" + cleaned.slice(1);
  if (cleaned.startsWith("234")) return "+" + cleaned;
  return "+" + cleaned;
}

export default function InvitePage() {
  const [invite, setInvite] = useState<{ 
    staff_name: string 
    staff_phone: string 
    business_name: string 
    business_id: string 
  } | null>(null)
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<Step>('loading')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  // 1. Fetch and validate the invite token on mount
  useEffect(() => {
    async function loadInvite() {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('staff_name, staff_phone, business_id, businesses(name), expires_at')
        .eq('token', params.token as string)
        .single()

      if (error || !data || new Date(data.expires_at) < new Date()) {
        setStep('invalid')
        return
      }

      setInvite({
        staff_name: data.staff_name,
        staff_phone: data.staff_phone,
        business_id: data.business_id,
        business_name: (data as any).businesses?.name || '',
      })
      setStep('confirm')
    }
    loadInvite()
  }, [params.token, supabase])

  // 2. Automatically send OTP when the step changes to 'otp'
  useEffect(() => {
    if (step === 'otp' && invite?.staff_phone && !otpSent) {
      setOtpSent(true)
      sendOTP()
    }
  }, [step, invite?.staff_phone, otpSent])

  async function sendOTP() {
    setLoading(true)
    const formattedPhone = formatPhone(invite!.staff_phone)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Verification code sent to your phone!')
    }
    setLoading(false)
  }

  async function verifyOtp() {
    if (otp.length < 6) return
    setLoading(true)

    const formattedPhone = formatPhone(invite!.staff_phone)
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    })

    if (error) {
      toast.error('Invalid code. Try again.')
      setLoading(false)
      return
    }

    toast.success('Phone verified!')
    setStep('pin')
    setLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    if (pin.length < 4 || confirmPin.length < 4) return
    if (pin !== confirmPin) {
      toast.error("PINs do not match")
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session not found. Try verifying your phone again.')
      setLoading(false)
      return
    }

    // Save the PIN to user metadata
    const { error: metaError } = await supabase.auth.updateUser({
      data: { pin: pin }
    })

    if (metaError) {
      toast.error('Failed to save security PIN.')
      setLoading(false)
      return
    }

    // Call accept invite endpoint
    const response = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        user_id: user.id,
        name: invite.staff_name,
        business_id: invite.business_id,
      }),
    })

    if (!response.ok) {
      toast.error('Could not join business')
      setLoading(false)
      return
    }

    toast.success(`Welcome to ${invite.business_name}!`)
    router.push('/log-sale')
    setLoading(false)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
        <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] text-center max-w-sm w-full shadow-card">
          <p className="text-[#EF4444] text-xl mb-2 font-semibold">Link expired</p>
          <p className="text-[#A1A8A1] text-sm">Ask your employer to generate a new invite link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[rgba(0,200,83,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-[#FFFFFF] text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              You're invited!
            </h1>
            <p className="text-[#A1A8A1] text-sm mt-1">
              Join <span className="text-[#00C853]">{invite?.business_name}</span> on MyDailySales
            </p>
          </div>

          {/* Step 3: Confirm Invitation details */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Your Name
                </label>
                <div className="bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3">
                  <p className="text-[#FFFFFF]">{invite?.staff_name}</p>
                </div>
              </div>

              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Business Name
                </label>
                <div className="bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3">
                  <p className="text-[#FFFFFF]">{invite?.business_name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('otp')}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-[#A1A8A1] text-xs text-center">
                We're sending a verification code to your phone number: <span className="text-[#FFFFFF] font-semibold">{invite?.staff_phone}</span>
              </p>
              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  6-Digit Code
                </label>
                <input
                  type="number"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  autoFocus
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-2xl text-center tracking-[0.5em] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={sendOTP}
                disabled={loading}
                className="w-full text-[#8A9E8A] text-sm py-2 hover:text-[#FFFFFF] transition-colors"
              >
                Resend Code
              </button>
            </div>
          )}

          {/* Step 5: PIN Setup */}
          {step === 'pin' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <p className="text-[#A1A8A1] text-xs text-center">
                Set a 4-digit PIN to secure your fast sales logging access.
              </p>
              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Set 4-Digit PIN
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoFocus
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-center text-xl tracking-[1em] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>

              <div>
                <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="••••"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-center text-xl tracking-[1em] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
                {confirmPin.length === 4 && confirmPin !== pin && (
                  <p className="text-xs text-[#FF3D3D] mt-1.5 font-medium">
                    PINs don't match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || pin.length < 4 || pin !== confirmPin}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
              >
                {loading ? 'Joining...' : 'Join Business'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
