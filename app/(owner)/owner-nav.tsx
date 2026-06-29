'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, CreditCard, Users, BarChart3, ShoppingBag } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/log-sale', icon: ShoppingBag, label: 'Log Sale' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
]

export function OwnerSidebarNav({ hasAccessBlocked }: { hasAccessBlocked: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-1">
      {navItems.map(item => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={hasAccessBlocked ? '/billing' : item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                       ${isActive 
                         ? 'bg-[#00C853]/5 text-[#FFFFFF] border-l-[3px] border-[#00C853] rounded-l-none pl-[9px]' 
                         : 'text-[#A1A8A1] hover:text-[#FFFFFF] hover:bg-[#151E15]/50'
                       }`}
          >
            <item.icon size={18} className={isActive ? 'text-[#00C853]' : 'text-[#A1A8A1]'} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function OwnerBottomNav({ hasAccessBlocked }: { hasAccessBlocked: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111811] border-t border-[#1A211A]
                    flex z-20 pb-[env(safe-area-inset-bottom)]">
      {navItems.map(item => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={hasAccessBlocked ? '/billing' : item.href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors
                       ${isActive ? 'text-[#00C853]' : 'text-[#6B726B] hover:text-[#A1A8A1]'}`}
          >
            <item.icon size={20} className={isActive ? 'text-[#00C853]' : 'text-[#6B726B]'} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
