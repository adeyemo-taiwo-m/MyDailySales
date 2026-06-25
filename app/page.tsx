'use client'
import Link from 'next/link'
import { LayoutDashboard, Users, CreditCard, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0F0A] text-[#FFFFFF] flex flex-col items-center justify-between p-6 md:p-12 relative overflow-hidden font-body">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[rgba(0,200,83,0.05)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[rgba(16,185,129,0.05)] blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#00C853] rounded-xl flex items-center justify-center font-bold text-black font-display shadow-accent">
            M
          </div>
          <span className="font-semibold text-lg tracking-wider font-display text-[#FFFFFF]">MyDailySales</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs uppercase tracking-widest text-[#A1A8A1] hover:text-[#FFFFFF] transition-colors font-mono font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-xs uppercase tracking-widest bg-[#00C853] text-black px-4 py-2 rounded-lg font-mono font-bold transition-all hover:filter hover:brightness-105 active:scale-95"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto z-10 py-16">
        
        {/* Left Info Column */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-6">
          <span className="inline-block px-3.5 py-1.5 text-xs uppercase tracking-widest text-[#00C853] bg-[rgba(0,200,83,0.1)] border border-[rgba(0,200,83,0.2)] rounded-full w-fit font-mono font-bold">
            Bloomberg Terminal Meets Moniepoint
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight font-display">
            Know your shop numbers.<br />
            <span className="text-[#00C853]">Every single day.</span>
          </h1>
          <p className="text-[#A1A8A1] text-base md:text-lg max-w-xl leading-relaxed">
            A premium, high-fidelity operations tool designed for busy Nigerian business owners. Track real-time sales, manage product inventory, audit outstanding customer credit, and receive nightly PWA push reports.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/signup"
              className="bg-[#00C853] text-black font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-accent hover:filter hover:brightness-105 active:scale-95 transition-all text-base"
            >
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="btn-secondary px-8 py-4 rounded-xl flex items-center justify-center text-base"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>

        {/* Right Feature Cards Column */}
        <div className="lg:col-span-5 w-full flex flex-col gap-4">
          <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card hover:border-[#2A322A] transition-all">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[rgba(0,200,83,0.1)] rounded-xl flex items-center justify-center shrink-0 border border-[rgba(0,200,83,0.2)]">
                <LayoutDashboard className="text-[#00C853]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[#FFFFFF] font-display text-base">Real-Time Owner Dashboard</h3>
                <p className="text-[#A1A8A1] text-sm mt-1 leading-relaxed">
                  Monitor live sales feeds as your staff logs transactions in real-time. Verify daily revenue, trends, and cash flow.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card hover:border-[#2A322A] transition-all">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[rgba(245,158,11,0.1)] rounded-xl flex items-center justify-center shrink-0 border border-[rgba(245,158,11,0.2)]">
                <CreditCard className="text-[#F59E0B]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[#FFFFFF] font-display text-base">Debts & Credit Ledger</h3>
                <p className="text-[#A1A8A1] text-sm mt-1 leading-relaxed">
                  Never lose track of outstanding customer balance. Log customer phone numbers and partial payments inline.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 shadow-card hover:border-[#2A322A] transition-all">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[rgba(59,130,246,0.1)] rounded-xl flex items-center justify-center shrink-0 border border-[rgba(59,130,246,0.2)]">
                <Users className="text-[#3B82F6]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[#FFFFFF] font-display text-base">Staff Sale Logging Terminal</h3>
                <p className="text-[#A1A8A1] text-sm mt-1 leading-relaxed">
                  Invite staff members with a 4-digit PIN access. Clean, touch-optimized logging screens with 5-minute undo mechanism.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-[#6B726B] font-mono py-6 border-t border-[#1A211A] mt-8 flex flex-col md:flex-row justify-between items-center max-w-5xl z-10 gap-2">
        <div>MyDailySales &copy; {new Date().getFullYear()} · Visually premium operations catalog</div>
        <div className="flex gap-4 text-[#A1A8A1]">
          <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-[#00C853]" /> Secured by Supabase RLS</span>
          <span className="flex items-center gap-1"><Zap size={12} className="text-[#00C853]" /> PWA Offline-Capable</span>
        </div>
      </footer>
    </main>
  )
}
