import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleHistory(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const { data: recent } = await supabaseAdmin
    .from('sales_log')
    .select('product_name, qty_sold, price_each, total, logged_at, undone')
    .eq('merchant_id', merchant.id)
    .order('logged_at', { ascending: false })
    .limit(5)

  if (!recent || recent.length === 0) {
    await sendWhatsAppMessage(phone, `No sales logged yet. Type \`sell <product> <qty> <price>\` to start.`)
    return
  }

  const lines = recent.map(s => {
    const time = new Date(s.logged_at).toLocaleString('en-NG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos'
    })
    const undoneTag = s.undone ? ' _(undone)_' : ''
    return `• ${s.qty_sold}x ${s.product_name} @ ${formatNaira(Number(s.price_each))} = *${formatNaira(Number(s.total))}*${undoneTag}\n  _${time}_`
  })

  await sendWhatsAppMessage(phone, `🕐 *Last ${recent.length} entries:*\n\n${lines.join('\n\n')}`)
}
