import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleDebtsList(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const { data: unpaid } = await supabaseAdmin
    .from('credit_book')
    .select('customer_name, amount_owed, created_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .order('amount_owed', { ascending: false })

  if (!unpaid || unpaid.length === 0) {
    await sendWhatsAppMessage(phone, `✅ No outstanding debts. Everyone has paid up!`)
    return
  }

  const total = unpaid.reduce((sum, d) => sum + Number(d.amount_owed), 0)
  const lines = unpaid.map(d => `• *${d.customer_name}*: ${formatNaira(Number(d.amount_owed))}`)

  await sendWhatsAppMessage(phone,
    `📋 *Outstanding Debts*\n\n` +
    `${lines.join('\n')}\n\n` +
    `Total owed to you: *${formatNaira(total)}*\n\n` +
    `To mark paid: \`paid <name> <amount>\``
  )
}
