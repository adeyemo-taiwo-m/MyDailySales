'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

interface SignOutButtonProps {
  className?: string
  size?: number
}

export function SignOutButton({ className, size = 18 }: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
      router.push('/login')
    } catch (err) {
      toast.error('Failed to sign out')
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className={className || "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#8A9E8A] hover:text-[#FF3D3D] hover:bg-red-500/5 transition-all duration-200 w-full text-left"}
    >
      <LogOut size={size} />
      <span>Sign Out</span>
    </button>
  )
}
