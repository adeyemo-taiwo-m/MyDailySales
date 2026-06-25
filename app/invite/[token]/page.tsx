'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { formatPhone } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function InvitePage() {
  const [invite, setInvite] = useState<{ staff_name: string; business_name: string; staff_phone: string } | null>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'loading' | 'setup' | 'otp' | 'invalid'>('loading')
  const [loading, setLoading] = useState(false)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadInvite() {
      const { data } = await supabase
        .from('pending_invites')
        .select('staff_name, staff_phone, business_id, businesses(name), expires_at')
        .eq('token', params.token as string)
        .single()

      if (!data || new Date(data.expires_at) < new Date()) {
        setStep('invalid')
        return
      }

      setInvite({
        staff_name: data.staff_name,
        staff_phone: data.staff_phone,
        business_name: (data as any).businesses?.name || '',
      })
      setStep('setup')
    }
    loadInvite()
  }, [params.token, supabase])

  async function sendOTP() {
    if (pin !== confirmPin || pin.length < 4) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(invite!.staff_phone),
    })

    if (error) {
      toast.error(error.message)
    } else {
      setStep('otp')
      toast.success('Code sent to your phone')
    }
    setLoading(false)
  }

  async function verifyAndJoin() {
    if (otp.length < 6) return
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: formatPhone(invite!.staff_phone),
      token: otp,
      type: 'sms',
    })

    if (authError || !authData.user) {
      toast.error('Invalid code')
      setLoading(false)
      return
    }

    // Get business_id from invite token
    const { data: inviteData } = await supabase
      .from('pending_invites')
      .select('business_id')
      .eq('token', params.token as string)
      .single()

    if (!inviteData) {
      toast.error('Invite not found')
      setLoading(false)
      return
    }

    // Create staff_members record via API route (needs service role)
    const response = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        user_id: authData.user.id,
        name: invite!.staff_name,
        business_id: inviteData.business_id,
      }),
    })

    if (!response.ok) {
      toast.error('Could not join business')
      setLoading(false)
      return
    }

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
          <p className="text-[#EF4444] text-xl mb-2">Link expired</p>
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

          {step === 'setup' && (
            <div className="space-y-4">
              <div>
                <label className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-2 block">
                  Your Name
                </label>
                <div className="bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3">
                  <p className="text-[#FFFFFF]">{invite?.staff_name}</p>
                </div>
              </div>
              <div>
                <label className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-2 block">
                  Set 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                             text-[#FFFFFF] text-center text-2xl tracking-[0.5em] placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
              </div>
              <div>
                <label className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-2 block">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`w-full bg-[#151E15] border rounded-xl px-4 py-3
                             text-[#FFFFFF] text-center text-2xl tracking-[0.5em] placeholder-[#6B726B]
                             focus:outline-none transition-colors ${
                    confirmPin.length === 4 && confirmPin !== pin
                      ? 'border-[#EF4444]'
                      : 'border-[#1A211A] focus:border-[#00C853]'
                  }`}
                />
                {confirmPin.length === 4 && confirmPin !== pin && (
                  <p className="text-[#EF4444] text-xs mt-1">PINs don't match</p>
                )}
              </div>
              <button
                onClick={sendOTP}
                disabled={loading || pin.length < 4 || pin !== confirmPin}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Sending code...' : 'Set PIN & Continue'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-[#A1A8A1] text-sm text-center">
                Enter the code sent to {invite?.staff_phone}
              </p>
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
                onClick={verifyAndJoin}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                           disabled:opacity-40 hover:bg-[#00C853]/90 transition-all"
              >
                {loading ? 'Joining...' : 'Join Business'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
