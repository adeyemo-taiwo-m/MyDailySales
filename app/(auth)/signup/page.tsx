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

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isPasswordLongEnough = password.length >= 8
  const passwordsMatch = password === confirmPassword
  const canSubmit = name.trim() !== '' && isEmailValid && isPasswordLongEnough && passwordsMatch

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    })

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists. Sign in instead.')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    toast.success('Account created!')
    router.push('/onboarding')
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
        </div>

        <div className="bg-[#111811] rounded-2xl p-6 border border-[#1A211A] shadow-card">
          <h1 className="text-[#F0F4F0] text-xl font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            Create your account
          </h1>
          <p className="text-[#A1A8A1] text-sm mb-6">Start tracking your business sales</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amara Okafor"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] text-base placeholder-[#6B726B]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

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
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3
                           text-[#FFFFFF] text-base placeholder-[#6B726B]
                           focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

            <div>
              <label className="text-[#6B726B] text-xs font-medium uppercase tracking-widest mb-2 block">
                Password
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

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
        </div>

        <p className="text-center text-[#6B726B] text-sm mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#00C853] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
