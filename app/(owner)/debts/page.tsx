'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Debt } from '@/types'
import { formatNaira } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Plus, CreditCard, User } from 'lucide-react'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogDebtModal, setShowLogDebtModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState<Debt | null>(null)
  
  // Log Debt form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [amountOwed, setAmountOwed] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Pay form state
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  const supabase = createClient()

  const loadDebts = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffMember } = await supabase
        .from('staff_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

      if (staffMember?.business_id) {
        const { data } = await supabase
          .from('debts')
          .select('*')
          .neq('status', 'paid')
          .order('created_at', { ascending: false })

        if (data) setDebts(data)
      }
    } catch (error) {
      console.error('Error loading debts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadDebts() }, [loadDebts])

  const totalOutstanding = debts.reduce((sum, d) => sum + (d.amount_owed - d.amount_paid), 0)

  async function handleLogDebt(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || !amountOwed) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('business_id, id')
      .eq('user_id', user.id)
      .single()

    if (!staffMember) {
      toast.error('Session error')
      setSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('debts')
      .insert({
        business_id: staffMember.business_id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        amount_owed: Number(amountOwed),
        amount_paid: 0,
        status: 'unpaid',
        created_by: staffMember.id,
      })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Debt logged!')
      setCustomerName('')
      setCustomerPhone('')
      setAmountOwed('')
      setShowLogDebtModal(false)
      loadDebts()
    }
    setSubmitting(false)
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!showPayModal || !payAmount) return
    setPaying(true)

    const debt = showPayModal
    const paymentNum = Number(payAmount)
    const newPaid = debt.amount_paid + paymentNum
    
    if (newPaid > debt.amount_owed) {
      toast.error('Payment exceeds total debt amount')
      setPaying(false)
      return
    }

    const newStatus = newPaid === debt.amount_owed ? 'paid' : 'partial'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session error')
      setPaying(false)
      return
    }

    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staffMember) {
      toast.error('Session error')
      setPaying(false)
      return
    }

    // Update debt status and paid amount
    const { error: updateError } = await supabase
      .from('debts')
      .update({ amount_paid: newPaid, status: newStatus })
      .eq('id', debt.id)

    if (updateError) {
      toast.error(updateError.message)
      setPaying(false)
      return
    }

    // Record debt payment
    await supabase
      .from('debt_payments')
      .insert({
        debt_id: debt.id,
        amount: paymentNum,
        recorded_by: staffMember.id,
      })

    toast.success('Payment recorded!')
    setPayAmount('')
    setShowPayModal(null)
    setPaying(false)
    loadDebts()
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-[#A1A8A1] text-sm">Customer Credit Accounts</p>
          <h1 className="text-[#FFFFFF] text-2xl font-bold font-display">Debts</h1>
        </div>
        <button
          onClick={() => setShowLogDebtModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Log Debt</span>
        </button>
      </div>

      {/* Outstanding Summary */}
      <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-5 mb-6 shadow-card">
        <p className="text-[#A1A8A1] text-xs uppercase tracking-widest mb-1 font-mono">Total Outstanding Debt</p>
        <p className="text-3xl font-bold text-[#F59E0B] font-display" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatNaira(totalOutstanding)}
        </p>
        <p className="text-[#6B726B] text-xs mt-1">Owed by {debts.length} customers</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-[76px]" />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <div className="bg-[#111811] border border-[#1A211A] rounded-2xl p-12 text-center shadow-card">
          <p className="text-[#00C853] font-semibold text-sm font-display mb-1">✅ Excellent! No outstanding debts.</p>
          <p className="text-[#6B726B] text-xs">Everyone has settled their account balance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map(debt => {
            const balance = debt.amount_owed - debt.amount_paid
            const badgeClass = debt.status === 'partial' ? 'badge-amber' : 'badge-red'
            const badgeLabel = debt.status === 'partial' ? 'Partial' : 'Unpaid'

            return (
              <div key={debt.id} className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 flex justify-between items-center hover:border-[#2A322A] transition-colors shadow-card">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#FFFFFF]">{debt.customer_name}</p>
                    <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                  </div>
                  <p className="text-[#6B726B] text-xs font-mono mt-0.5">
                    {debt.customer_phone ? `${debt.customer_phone} · ` : ''}
                    Logged {new Date(debt.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-[#F59E0B] font-display" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatNaira(balance)}
                    </p>
                    <p className="text-[#6B726B] text-[10px] uppercase tracking-wide">
                      Owed {formatNaira(debt.amount_owed)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPayModal(debt)}
                    className="btn-secondary h-9 px-3 rounded-lg text-xs"
                  >
                    Pay
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Debt Modal */}
      {showLogDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F0A]/85 backdrop-blur-sm">
          <div className="bg-[#151E15] border border-[#2A322A] w-full max-w-sm rounded-2xl p-6 shadow-modal">
            <h2 className="text-[#FFFFFF] text-lg font-bold font-display mb-4">Log New Debt</h2>
            <form onSubmit={handleLogDebt} className="space-y-4">
              <div>
                <label className="label">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunde Alabi"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Customer Phone (optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 08034567890"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Amount Owed</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#A1A8A1] font-mono">₦</span>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={amountOwed}
                    onChange={e => setAmountOwed(e.target.value)}
                    className="input pl-8"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogDebtModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary"
                >
                  {submitting ? 'Logging...' : 'Log Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0F0A]/85 backdrop-blur-sm">
          <div className="bg-[#151E15] border border-[#2A322A] w-full max-w-sm rounded-2xl p-6 shadow-modal">
            <h2 className="text-[#FFFFFF] text-lg font-bold font-display mb-2">Record Payment</h2>
            <p className="text-[#A1A8A1] text-xs mb-4">
              Enter payment received from <span className="text-[#FFFFFF] font-semibold">{showPayModal.customer_name}</span>. Total remaining: {formatNaira(showPayModal.amount_owed - showPayModal.amount_paid)}
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="label">Payment Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#A1A8A1] font-mono">₦</span>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="input pl-8"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="flex-1 btn-primary"
                >
                  {paying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
