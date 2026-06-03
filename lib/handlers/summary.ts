import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { Merchant } from '../types'

export async function handleSummary(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Today's sales
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('total, product_name, qty_sold')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())

  const totalRevenue = (todaysSales || []).reduce((sum, s) => sum + Number(s.total || 0), 0)
  const totalTransactions = (todaysSales || []).length

  // Outstanding debts
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('amount_owed')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')

  const totalOwed = (unpaidDebts || []).reduce((sum, d) => sum + Number(d.amount_owed), 0)

  // Out of stock products
  const { data: outOfStock } = await supabaseAdmin
    .from('products')
    .select('name')
    .eq('merchant_id', merchant.id)
    .eq('stock_qty', 0)

  let reply = `📊 *${merchant.business_name} — Today's Summary*\n`
  reply += `─────────────────────\n`
  reply += `💰 Sales: *${formatNaira(totalRevenue)}* (${totalTransactions} transactions)\n`
  reply += `📋 Debts owed to you: *${formatNaira(totalOwed)}*\n`

  if (outOfStock && outOfStock.length > 0) {
    const names = outOfStock.map(p => p.name).join(', ')
    reply += `🔴 Out of stock: ${names}\n`
  }

  if (totalRevenue === 0 && totalTransactions === 0) {
    reply += `\n_No sales logged today yet._`
  }

  reply += `\nType *history* to see recent entries.`

  await sendWhatsAppMessage(phone, reply)
}
