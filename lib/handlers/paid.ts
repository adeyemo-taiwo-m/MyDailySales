import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handlePaid(
  merchant: Merchant,
  customerInput: string,
  amount: number
): Promise<void> {
  const phone = merchant.phone

  // Get all unpaid debts for this merchant
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('id, customer_name, amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  if (!unpaidDebts || unpaidDebts.length === 0) {
    await sendWhatsAppMessage(phone, `✅ You have no outstanding debts recorded.`)
    return
  }

  // Deduplicate by name for fuzzy match
  const uniqueNames = [...new Map(unpaidDebts.map(d => [d.customer_name, { id: d.id, name: d.customer_name }])).values()]
  const match = findBestMatch(customerInput, uniqueNames)

  if (!match) {
    const names = unpaidDebts.slice(0, 5).map(d => d.customer_name).join(', ')
    await sendWhatsAppMessage(phone,
      `❓ I don't have a debt for *"${customerInput}"*.\n\n` +
      `People who owe you: ${names}\n\n` +
      `Type *debts* to see the full list.`
    )
    return
  }

  // Mark ALL debts from this customer as paid (full payment MVP)
  const customerDebts = unpaidDebts.filter(d => d.customer_name.toLowerCase() === match.name.toLowerCase())
  const totalPaid = customerDebts.reduce((sum, d) => sum + Number(d.amount_owed), 0)

  await supabaseAdmin.from('credit_book')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .ilike('customer_name', match.name)

  // Get remaining total
  const { data: remaining } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const stillOwed = (remaining || []).reduce((sum, d) => sum + Number(d.amount_owed), 0)

  await sendWhatsAppMessage(phone,
    `✅ *${match.name}* has paid ${formatNaira(totalPaid)}. Debt cleared.\n\n` +
    `Total still owed to you: *${formatNaira(stillOwed)}*`
  )
}
