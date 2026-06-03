import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleDebt(
  merchant: Merchant,
  customerName: string,
  amount: number
): Promise<void> {
  const phone = merchant.phone

  // Insert new debt entry
  await supabaseAdmin.from('credit_book').insert({
    merchant_id: merchant.id,
    customer_name: customerName,
    amount_owed: amount,
    status: 'unpaid',
  })

  // Get total owed to this merchant
  const { data: allDebts } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const totalOwed = (allDebts || []).reduce((sum, d) => sum + Number(d.amount_owed), 0)

  await sendWhatsAppMessage(phone,
    `📝 *${customerName}* owes ${formatNaira(amount)}.\n` +
    `Total owed to you: *${formatNaira(totalOwed)}*\n\n` +
    `When they pay, type: \`paid ${customerName} ${amount}\``
  )
}
