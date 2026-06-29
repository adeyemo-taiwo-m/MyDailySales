'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  } else if (!cleaned.startsWith("234") && cleaned.length === 10) {
    cleaned = "234" + cleaned;
  }
  return cleaned;
}

export default function LoginPage() {
  const [roleTab, setRoleTab] = useState<'owner' | 'staff'>('owner')
  
  // Owner states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Staff states
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let authEmail = ''
    let authPassword = ''

    if (roleTab === 'owner') {
      if (!email || !password) {
        toast.error('Please enter email and password')
        setLoading(false)
        return
      }
      authEmail = email
      authPassword = password
    } else {
      if (!phone || pin.length < 4) {
        toast.error('Please enter phone number and 4-digit PIN')
        setLoading(false)
        return
      }
      const cleaned = cleanPhone(phone)
      authEmail = `${cleaned}@mydailysales.app`
      authPassword = `pin_${pin}`
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error(roleTab === 'owner' ? 'Incorrect email or password' : 'Incorrect phone or PIN')
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Check your email to confirm your account')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    // Check staff role
    const { data: staffData } = await supabase
      .from('staff_members')
      .select('role')
      .eq('user_id', data.user?.id)
      .maybeSingle()

    if (!staffData) {
      router.push('/onboarding')
    } else if (staffData.role === 'staff') {
      router.push('/log-sale')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error('Please enter your email address first.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Reset link sent to your email')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
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
            Welcome back
          </h1>
          <p className="text-[#A1A8A1] text-sm mb-5">Sign in to your account</p>

          {/* Role Tabs */}
          <div className="flex bg-[#151E15] border border-[#1A211A] rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setRoleTab('owner')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                roleTab === 'owner' 
                  ? 'bg-[#00C853] text-black shadow-sm' 
                  : 'text-[#8A9E8A] hover:text-[#FFFFFF]'
              }`}
            >
              Owner Login
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('staff')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                roleTab === 'staff' 
                  ? 'bg-[#00C853] text-black shadow-sm' 
                  : 'text-[#8A9E8A] hover:text-[#FFFFFF]'
              }`}
            >
              Staff Login
            </button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {roleTab === 'owner' ? (
              <>
                <div>
                  <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                    Email Address
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#8A9E8A] hover:text-[#00C853] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoFocus
                    className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                               text-[#FFFFFF] text-base placeholder-[#6B726B]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                    4-Digit PIN
                  </label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                               text-[#FFFFFF] text-center text-xl tracking-[1em] placeholder-[#6B726B]
                               focus:outline-none focus:border-[#00C853] transition-colors"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00C853] text-black font-semibold py-3.5 rounded-xl
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-[#00C853]/90 active:scale-[0.98] transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {roleTab === 'owner' && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#1A211A]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#111811] px-2 text-[#4A5E4A] tracking-wider">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-[#151E15] border border-[#2A322A] text-[#F0F4F0] font-semibold py-3.5 rounded-xl
                           hover:bg-[#1A221A] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}
        </div>

        {roleTab === 'owner' && (
          <p className="text-center text-[#6B726B] text-sm mt-6">
            Don't have an account?{' '}
            <a href="/signup" className="text-[#00C853] hover:underline">Create one</a>
          </p>
        )}
      </div>
    </div>
  )
}
