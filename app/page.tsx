'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('mds_phone')
    if (saved) {
      router.push('/dashboard')
    }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    setError('')

    // Normalize phone number (strip spaces, resolve country code)
    let normalized = phone.replace(/\s+/g, '')
    if (normalized.startsWith('0')) {
      normalized = '234' + normalized.slice(1)
    }
    if (normalized.startsWith('+')) {
      normalized = normalized.slice(1)
    }

    try {
      const res = await fetch(`/api/dashboard/summary?phone=${encodeURIComponent(normalized)}`)
      if (!res.ok) {
        throw new Error('Merchant not found')
      }
      const data = await res.json()
      localStorage.setItem('mds_phone', normalized)
      router.push('/dashboard')
    } catch (err) {
      setError('Number not registered yet. Please message our WhatsApp bot first to set up your account!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0e0c] text-[#f7f3ec] flex flex-col items-center justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            📊
          </div>
          <span className="font-semibold text-lg tracking-wider uppercase font-mono text-blue-500">MyDailySales</span>
        </div>
        <a 
          href="https://wa.me/your-bot-number" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs uppercase tracking-widest text-[#888] hover:text-blue-400 transition-colors font-mono"
        >
          WhatsApp Bot &rarr;
        </a>
      </header>

      {/* Hero & Login Section */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto z-10 py-8">
        
        {/* Left: Info */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-6">
          <span className="inline-block px-3 py-1 text-xs uppercase tracking-wider text-blue-400 bg-blue-950/40 border border-blue-900/50 rounded-full w-fit font-mono">
            Stage 1 Beta · WhatsApp Sales Tracker
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Track your shop sales, stock, and debts <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">right from WhatsApp.</span>
          </h1>
          <p className="text-[#888] text-base md:text-lg max-w-xl">
            Designed for busy Nigerian merchants. Text simple commands like <code className="text-blue-300 font-mono text-sm bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-900/40">sell garri 5 500</code>, and view your business records on this clean, instant dashboard.
          </p>

          {/* Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 bg-[#1a1816]/60 border border-[#2a2826] rounded-xl">
              <div className="text-blue-500 font-mono text-sm font-bold mb-1">01.</div>
              <h3 className="font-semibold text-sm mb-1">Message Bot</h3>
              <p className="text-xs text-[#666]">Send any text message to our WhatsApp bot to register.</p>
            </div>
            <div className="p-4 bg-[#1a1816]/60 border border-[#2a2826] rounded-xl">
              <div className="text-blue-500 font-mono text-sm font-bold mb-1">02.</div>
              <h3 className="font-semibold text-sm mb-1">Add Products</h3>
              <p className="text-xs text-[#666]">Log your stock and name your business inside the chat.</p>
            </div>
            <div className="p-4 bg-[#1a1816]/60 border border-[#2a2826] rounded-xl">
              <div className="text-blue-500 font-mono text-sm font-bold mb-1">03.</div>
              <h3 className="font-semibold text-sm mb-1">View Dashboard</h3>
              <p className="text-xs text-[#666]">Sign in here with your phone number to see stats.</p>
            </div>
          </div>
        </div>

        {/* Right: Login Box */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#161412] border border-[#2a2826] rounded-2xl p-8 relative shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Merchant Login</h2>
            <p className="text-xs text-[#888] mb-6">Enter the WhatsApp phone number you use to text the sales bot.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666] font-mono mb-2">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0812 345 6789 or +234..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f0e0c] border border-[#2a2826] text-[#f7f3ec] rounded-xl text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="p-3.5 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-500/10"
              >
                {loading ? 'Verifying Merchant...' : 'Access Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#2a2826] text-center">
              <a 
                href="https://wa.me/your-bot-number" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline font-medium"
              >
                Don't have an account? Start on WhatsApp &rarr;
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-[#444] font-mono py-4 z-10 border-t border-[#1a1816] mt-8">
        MyDailySales &copy; {new Date().getFullYear()} · Stage 1 Beta for Nigeria
      </footer>
    </main>
  )
}
