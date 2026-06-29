import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertOctagon } from 'lucide-react'
import { headers } from 'next/headers'
import { OwnerSidebarNav, OwnerBottomNav } from './owner-nav'
import { SignOutButton } from '@/components/SignOutButton'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get staff member record and business
  const { data: staffMember } = await supabase
    .from('staff_members')
    .select('role, business_id, businesses(name, subscription_status, trial_ends_at)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staffMember) {
    redirect('/onboarding')
  }

  if (staffMember.role !== 'owner') {
    redirect('/log-sale')
  }

  const business = staffMember.businesses as any
  const isTrial = business?.subscription_status === 'trial'
  const isExpired = business?.subscription_status === 'expired'
  const trialEnds = new Date(business?.trial_ends_at || Date.now())
  const trialExpired = isTrial && new Date() > trialEnds

  // Check current pathname via headers
  const headerList = await headers()
  const activePath = headerList.get('x-pathname') || ''

  const hasAccessBlocked = isExpired || trialExpired

  return (
    <div className="min-h-screen bg-[#0A0F0A] lg:flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-60 flex-col bg-[#111811] border-r border-[#1A211A] fixed h-full p-5 z-20">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-[#00C853] rounded-xl flex items-center justify-center shrink-0">
            <span className="text-black font-bold text-sm" style={{ fontFamily: 'Space Grotesk' }}>M</span>
          </div>
          <span className="text-[#FFFFFF] font-semibold text-lg" style={{ fontFamily: 'Space Grotesk' }}>
            MyDailySales
          </span>
        </div>

        <OwnerSidebarNav hasAccessBlocked={hasAccessBlocked} />

        <div className="mt-auto pt-4 border-t border-[#1A211A]">
          <SignOutButton />
        </div>
      </aside>
 
      {/* Main content area */}
      <main className="flex-1 lg:ml-60 pb-20 lg:pb-0 min-h-screen flex flex-col">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-[#111811] border-b border-[#1A211A] px-4 py-3 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#00C853] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-xs" style={{ fontFamily: 'Space Grotesk' }}>M</span>
            </div>
            <span className="text-[#FFFFFF] font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>
              MyDailySales
            </span>
          </div>
          <SignOutButton size={14} className="bg-transparent hover:bg-transparent text-[#8A9E8A] hover:text-[#FF3D3D] transition-colors flex items-center gap-1.5 text-xs font-semibold px-2 py-1 w-auto" />
        </header>
        {hasAccessBlocked && !activePath.includes('/billing') ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
            <div className="w-16 h-16 bg-[rgba(239,68,68,0.1)] rounded-2xl flex items-center justify-center mb-6 border border-rgba(239,68,68,0.2)">
              <AlertOctagon className="text-[#EF4444]" size={32} />
            </div>
            <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Subscription Expired
            </h1>
            <p className="text-[#A1A8A1] text-sm max-w-sm mb-8">
              Your 14-day free trial has ended. Subscribe to a plan to continue accessing your dashboard.
            </p>
            <Link
              href="/billing"
              className="bg-[#00C853] text-black font-bold px-8 py-3.5 rounded-xl shadow-accent hover:filter hover:brightness-105 active:scale-95 transition-all"
            >
              Choose a Plan
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
 
      {/* Bottom navigation — mobile only */}
      <OwnerBottomNav hasAccessBlocked={hasAccessBlocked} />
    </div>
  )
}
