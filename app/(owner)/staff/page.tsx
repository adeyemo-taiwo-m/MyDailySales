'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffMember } from '@/types'
import toast from 'react-hot-toast'
import { Plus, UserMinus, UserCheck, Copy } from 'lucide-react'

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      if (user) {
        const { data: staffMember } = await supabase
          .from('staff_members')
          .select('business_id')
          .eq('user_id', user.id)
          .single()

        if (staffMember?.business_id) {
          const { data } = await supabase
            .from('staff_members')
            .select('*')
            .eq('business_id', staffMember.business_id)
            .order('joined_at')

          if (data) setStaffList(data)
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadStaff() }, [loadStaff])

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('business_id')
      .eq('user_id', user.id)
      .single()

    if (!staffMember) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: staffMember.business_id,
          staff_name: name.trim(),
          staff_phone: phone,
        }),
      }).then(r => r.json())

      if (res.error || !res.data?.link) {
        toast.error(res.error || 'Could not generate invite')
      } else {
        setInviteLink(res.data.link)
        toast.success('Invite link generated!')
      }
    } catch (err) {
      toast.error('Connection error')
    }
    setSubmitting(false)
  }

  async function toggleStaffStatus(staffId: string, currentActive: boolean) {
    const action = currentActive ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return

    const { error } = await supabase
      .from('staff_members')
      .update({ is_active: !currentActive })
      .eq('id', staffId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Staff member ${action}d`)
      setStaffList(prev =>
        prev.map(s => s.id === staffId ? { ...s, is_active: !currentActive } : s)
      )
    }
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-[#A1A8A1] text-sm">Manage business users</p>
          <h1 className="text-[#FFFFFF] text-2xl font-bold font-display">Staff</h1>
        </div>
        <button
          onClick={() => { setShowInviteModal(true); setInviteLink(''); setName(''); setPhone('') }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Invite Staff</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="skeleton h-[76px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {staffList.map(member => {
            const isSelf = member.user_id === currentUserId
            const statusLabel = member.is_active ? 'Active' : 'Inactive'
            const statusClass = member.is_active ? 'badge-green' : 'badge-gray'

            return (
              <div key={member.id} className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 flex justify-between items-center hover:border-[#2A322A] transition-colors shadow-card">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#FFFFFF]">{member.name}</p>
                    {isSelf && <span className="text-[10px] bg-rgba(255,255,255,0.06) text-[#A1A8A1] px-1.5 py-0.5 rounded">You</span>}
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <p className="text-[#6B726B] text-xs mt-0.5 capitalize">
                    Role: {member.role} · Joined {new Date(member.joined_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {!isSelf && member.role === 'staff' && (
                  <button
                    onClick={() => toggleStaffStatus(member.id, member.is_active)}
                    className={`btn-secondary h-9 px-3 rounded-lg text-xs flex items-center gap-1.5 ${
                      member.is_active ? 'text-[#EF4444] border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.1)]' : 'text-[#00C853] border-[rgba(0,200,83,0.2)] hover:bg-[rgba(0,200,83,0.1)]'
                    }`}
                  >
                    {member.is_active ? <UserMinus size={14} /> : <UserCheck size={14} />}
                    <span>{member.is_active ? 'Deactivate' : 'Reactivate'}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F0A]/85 backdrop-blur-sm">
          <div className="bg-[#151E15] border border-[#2A322A] w-full max-w-sm rounded-2xl p-6 shadow-modal">
            <h2 className="text-[#FFFFFF] text-lg font-bold font-display mb-4">Invite Staff Member</h2>
            
            {!inviteLink ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="label">Staff Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aisha Bello"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08012345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary"
                  >
                    {submitting ? 'Generating...' : 'Create Invite Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#151E15] border border-[#1A211A] rounded-xl p-4">
                  <p className="text-[#A1A8A1] text-xs mb-2">Invite link for {name}:</p>
                  <p className="text-[#00C853] text-sm break-all font-mono">{inviteLink}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!') }}
                    className="flex-1 btn-primary flex items-center justify-center gap-1.5"
                  >
                    <Copy size={14} />
                    <span>Copy Link</span>
                  </button>
                </div>
                <p className="text-[#6B726B] text-xs text-center">
                  Send this link to the staff member over WhatsApp or SMS to allow them to set their login PIN.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
