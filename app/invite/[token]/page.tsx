'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InvitePage() {
  const [invite, setInvite] = useState<{ staff_name: string; business_name: string; business_id: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<'loading' | 'setup' | 'invalid'>('loading')
  const [loading, setLoading] = useState(false)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadInvite() {
      const { data } = await supabase
        .from('pending_invites')
        .select('staff_name, business_id, businesses(name), expires_at')
        .eq('token', params.token as string)
        .single()

      if (!data || new Date(data.expires_at) < new Date()) {
        setStep('invalid')
        return
      }

      setInvite({
        staff_name: data.staff_name,
        business_id: data.business_id,
        business_name: (data as any).businesses?.name || '',
      })
      setStep('setup')
    }
    loadInvite()
  }, [params.token, supabase])

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isPasswordLongEnough = password.length >= 8
  const passwordsMatch = password === confirmPassword
  const canSubmit = email.trim() !== '' && isEmailValid && isPasswordLongEnough && passwordsMatch

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !invite) return
    setLoading(true)

    // Try signing up
    let authRes = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: invite.staff_name,
        },
      },
    })

    // If email already exists, sign in instead
    if (authRes.error?.message.includes('User already registered')) {
      authRes = await supabase.auth.signInWithPassword({
        email,
        password,
      })
    }

    if (authRes.error || !authRes.data.user) {
      toast.error(authRes.error?.message || 'Authentication failed')
      setLoading(false)
      return
    }

    // Call accept invite endpoint
    const response = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: params.token,
        user_id: authRes.data.user.id,
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

          <form onSubmit={handleJoin} className="space-y-4">
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
                Your Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] text-base placeholder-[#6B726B]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

            <div>
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Set a Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl pl-4 pr-12 py-3
                             text-[#FFFFFF] text-base placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9E8A] hover:text-[#FFFFFF] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className={`text-xs mt-1.5 font-medium transition-colors duration-200`} style={{ color: isPasswordLongEnough ? '#00C853' : '#4A5E4A' }}>
                At least 8 characters
              </p>
            </div>

            <div>
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl pl-4 pr-12 py-3
                             text-[#FFFFFF] text-base placeholder-[#6B726B]
                             focus:outline-none focus:border-[#00C853] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9E8A] hover:text-[#FFFFFF] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p className="text-xs text-[#FF3D3D] mt-1.5 font-medium">
                  Passwords don't match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
            >
              {loading ? 'Joining business...' : 'Set Password & Join'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
