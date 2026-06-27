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
  const [error, setError] = useState(false)
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
      setError(false)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffMember, error: staffError } = await supabase
        .from('staff_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single()

      if (staffError) throw staffError

      if (staffMember?.business_id) {
        const { data, error: fetchError } = await supabase
          .from('debts')
          .select('*')
          .neq('status', 'paid')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        if (data) setDebts(data)
      }
    } catch (err) {
      console.error('Error loading debts:', err)
      setError(true)
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
      ) : error ? (
        <div className="bg-[#111811] border border-[#EF4444]/20 rounded-2xl p-12 text-center shadow-card">
          <p className="text-[#EF4444] mb-4">Something went wrong. Tap to retry.</p>
          <button
            onClick={() => loadDebts()}
            className="btn-secondary border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-white"
          >
            Retry
          </button>
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
            const isExpanded = showPayModal?.id === debt.id

            return (
              <div key={debt.id} className="bg-[#111811] border border-[#1A211A] rounded-2xl p-4 flex flex-col hover:border-[#2A322A] transition-colors shadow-card">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#FFFFFF]">{debt.customer_name}</p>
                      <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                    </div>
                    <p className="text-[#6B726B] text-xs font-mono mt-0.5">
                      {debt.customer_phone ? `${debt.customer_phone} · ` : ''}
                      Logged {new Date(debt.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[#A1A8A1] text-xs mt-1">
                      Paid: <span className="text-[#00C853] font-semibold">{formatNaira(debt.amount_paid)}</span> · Owed: <span className="text-[#FFFFFF]">{formatNaira(debt.amount_owed)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#F59E0B] font-display" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatNaira(balance)}
                      </p>
                      <p className="text-[#6B726B] text-[10px] uppercase tracking-wide">
                        Balance
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setShowPayModal(null)
                          setPayAmount('')
                        } else {
                          setShowPayModal(debt)
                          setPayAmount('')
                        }
                      }}
                      className="btn-secondary h-9 px-3 rounded-lg text-xs"
                    >
                      {isExpanded ? 'Cancel' : 'Pay'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1A211A] transition-all duration-300">
                    <form onSubmit={handleRecordPayment} className="flex flex-col sm:flex-row items-end gap-3">
                      <div className="flex-1 w-full">
                        <label className="label text-[#A1A8A1] text-xs font-mono mb-1.5 block">Record Payment (₦)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#6B726B] font-mono">₦</span>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 5000"
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            className="input w-full bg-[#151E15] border border-[#1A211A] text-white pl-8 pr-4 py-2.5 rounded-xl focus:border-[#00C853] focus:outline-none transition-colors text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => { setShowPayModal(null); setPayAmount('') }}
                          className="flex-1 sm:flex-initial btn-secondary h-[42px] px-4 rounded-xl text-xs flex items-center justify-center border border-[#1A211A]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={paying}
                          className="flex-1 sm:flex-initial btn-primary h-[42px] px-4 rounded-xl text-xs bg-[#00C853] text-black font-bold flex items-center justify-center hover:brightness-105 transition-all"
                        >
                          {paying ? 'Recording...' : 'Submit'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
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
    </div>
  )
}
