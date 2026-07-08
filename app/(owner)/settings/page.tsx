'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Settings, Building, Bell, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('')
  const [summaryTime, setSummaryTime] = useState('21:00')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [hasSummaryTime, setHasSummaryTime] = useState(true)

  const supabase = createClient()

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let staffMember;

      const res = await supabase
        .from('staff_members')
        .select('business_id, businesses(name, summary_time)')
        .eq('user_id', user.id)
        .single()

      if (res.error) {
        if (res.error.code === '42703') {
          // Column summary_time doesn't exist, fallback query without summary_time
          setHasSummaryTime(false)
          const fallbackRes = await supabase
            .from('staff_members')
            .select('business_id, businesses(name)')
            .eq('user_id', user.id)
            .single()

          if (fallbackRes.error) throw fallbackRes.error
          staffMember = fallbackRes.data
        } else {
          throw res.error
        }
      } else {
        staffMember = res.data
        setHasSummaryTime(true)
      }

      if (staffMember?.business_id) {
        setBusinessId(staffMember.business_id)
        const biz = staffMember.businesses as any
        if (biz) {
          const actualBiz = Array.isArray(biz) ? biz[0] : biz
          setBusinessName(actualBiz?.name || '')
          setSummaryTime(actualBiz?.summary_time || '21:00')
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function handleUpdateBusiness(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !businessName.trim()) {
      toast.error('Business name cannot be empty')
      return
    }

    setSavingBusiness(true)
    try {
      const updateData: any = {
        name: businessName.trim(),
      }
      if (hasSummaryTime) {
        updateData.summary_time = summaryTime
      }

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId)

      if (error) throw error
      toast.success('Business settings updated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update business')
    } finally {
      setSavingBusiness(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password) {
      toast.error('Password cannot be empty')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error
      toast.success('Password updated successfully!')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-[#0A0F0A] px-4 py-8 lg:p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#0A0F0A] px-4 py-8 lg:p-8 overflow-y-auto pb-24">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="text-[#00C853]" size={24} />
          <h1 className="text-3xl font-bold text-[#FFFFFF]" style={{ fontFamily: 'Space Grotesk' }}>
            Settings
          </h1>
        </div>
        <p className="text-[#A1A8A1] text-sm">Manage your business profile and security preferences.</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Business Settings Card */}
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[rgba(0,200,83,0.05)] border border-[#00C853]/20 rounded-xl flex items-center justify-center text-[#00C853]">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-[#FFFFFF] text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Business Profile & Notifications
              </h2>
              <p className="text-[#6B726B] text-xs">Update your boutique name and daily alert timing.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateBusiness} className="space-y-4">
            <div>
              <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Enter Business Name"
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

            <div>
              <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                Daily Push Summary Time (WAT)
              </label>
              <select
                value={summaryTime}
                onChange={e => setSummaryTime(e.target.value)}
                disabled={!hasSummaryTime}
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors disabled:opacity-50"
              >
                <option value="17:00">5:00 PM (17:00)</option>
                <option value="18:00">6:00 PM (18:00)</option>
                <option value="19:00">7:00 PM (19:00)</option>
                <option value="20:00">8:00 PM (20:00)</option>
                <option value="21:00">9:00 PM (21:00) — Default</option>
                <option value="22:00">10:00 PM (22:00)</option>
                <option value="23:00">11:00 PM (23:00)</option>
              </select>
              <p className="text-[#6B726B] text-xs mt-2 flex items-center gap-1.5">
                <Bell size={12} className="text-[#00C853]" />
                {hasSummaryTime 
                  ? "Daily summaries will be sent via PWA notification at this scheduled time." 
                  : "Daily summary schedule configuration is disabled. Database migration (004) needs to be run to add summary_time column."}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingBusiness}
                className="bg-[#00C853] text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 active:scale-95 transition-all text-sm disabled:opacity-40"
              >
                {savingBusiness ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[rgba(239,68,68,0.05)] border border-[#EF4444]/20 rounded-xl flex items-center justify-center text-[#EF4444]">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-[#FFFFFF] text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Account Password
              </h2>
              <p className="text-[#6B726B] text-xs">Update your sign-in credentials to keep your dashboard secure.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

            <div>
              <label className="text-[#6B726B] text-xs font-semibold uppercase tracking-widest mb-2 block">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#151E15] border border-[#1A211A] rounded-xl px-4 py-3 text-[#FFFFFF] text-sm focus:outline-none focus:border-[#00C853] transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword || !password}
                className="bg-[#EF4444] text-white font-bold px-6 py-3 rounded-xl hover:brightness-105 active:scale-95 transition-all text-sm disabled:opacity-40"
              >
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
