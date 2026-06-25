import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, CreditCard, Users, BarChart3, AlertOctagon } from 'lucide-react'
import { headers } from 'next/headers'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
]

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

        <nav className="flex-1 space-y-0.5">
          {navItems.map(item => {
            return (
              <Link
                key={item.href}
                href={hasAccessBlocked ? '/billing' : item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                           transition-colors text-[#A1A8A1] hover:text-[#FFFFFF] hover:bg-[#151E15]`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 lg:ml-60 pb-20 lg:pb-0 min-h-screen">
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111811] border-t border-[#1A211A]
                      flex z-20 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(item => {
          return (
            <Link
              key={item.href}
              href={hasAccessBlocked ? '/billing' : item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors text-[#6B726B] hover:text-[#A1A8A1]`}
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
