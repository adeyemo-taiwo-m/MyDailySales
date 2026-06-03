import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handleSell(
  merchant: Merchant,
  productInput: string,
  qty: number,
  price: number
): Promise<void> {
  const phone = merchant.phone

  // Load all merchant products for fuzzy matching
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, stock_qty, price, low_stock_threshold')
    .eq('merchant_id', merchant.id)

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(phone,
      `❓ You haven't added any products yet.\n\n` +
      `Add one first: \`add ${productInput} ${price} 10\``
    )
    return
  }

  // Fuzzy match product name
  const match = findBestMatch(productInput, products)

  if (!match) {
    const productList = products.slice(0, 5).map(p => p.name).join(', ')
    await sendWhatsAppMessage(phone,
      `❓ I don't have *"${productInput}"* in your products.\n\n` +
      `Your products: ${productList}\n\n` +
      `Did you mean one of these? Or type \`add ${productInput} ${price} 0\` to create it.`
    )
    return
  }

  const product = products.find(p => p.id === match.id)!

  // Stock warning: selling more than available
  if (product.stock_qty !== null && qty > product.stock_qty && product.stock_qty >= 0) {
    await sendWhatsAppMessage(phone,
      `⚠️ You only have *${product.stock_qty}* ${product.name} in stock.\n\n` +
      `Log ${product.stock_qty} sold, or reply:\n` +
      `\`sell ${product.name} ${product.stock_qty} ${price}\``
    )
    return
  }

  // Write the sale
  await supabaseAdmin.from('sales_log').insert({
    merchant_id: merchant.id,
    product_id: product.id,
    product_name: product.name,
    qty_sold: qty,
    price_each: price,
  })

  // Deduct from stock
  const newStock = Math.max(0, (product.stock_qty || 0) - qty)
  await supabaseAdmin.from('products')
    .update({ stock_qty: newStock })
    .eq('id', product.id)

  // Get today's total (excluding undone)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('total')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + (s.total || 0), 0)
  const saleTotal = qty * price

  let reply = `✅ Sold *${qty} ${product.name}* @ ${formatNaira(price)} each = *${formatNaira(saleTotal)}*\n`
  reply += `Stock left: ${newStock} ${newStock <= 0 ? '— *OUT OF STOCK* ⚠️' : ''}\n`
  reply += `Today total: *${formatNaira(todayTotal)}*`

  if (newStock > 0 && newStock <= (product.low_stock_threshold || 5)) {
    reply += `\n\n⚠️ *Low stock warning:* Only ${newStock} ${product.name} left. Restock soon.`
  }

  await sendWhatsAppMessage(phone, reply)
}
