import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage, formatNaira } from '../whatsapp'
import { findBestMatch } from '../fuzzy'
import { Merchant } from '../types'

export async function handleStockAdd(
  merchant: Merchant,
  productInput: string,
  qty: number
): Promise<void> {
  const phone = merchant.phone

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, stock_qty')
    .eq('merchant_id', merchant.id)

  const match = findBestMatch(productInput, products || [])

  if (!match) {
    await sendWhatsAppMessage(phone,
      `❓ Product *"${productInput}"* not found.\n\n` +
      `To create it: \`add ${productInput} <price> ${qty}\``
    )
    return
  }

  const product = (products || []).find(p => p.id === match.id)!
  const newQty = (product.stock_qty || 0) + qty

  await supabaseAdmin.from('products')
    .update({ stock_qty: newQty })
    .eq('id', product.id)

  await sendWhatsAppMessage(phone,
    `✅ Added *${qty}* ${product.name}.\n` +
    `New stock: *${newQty}*`
  )
}

export async function handleStockCheck(
  merchant: Merchant,
  productInput?: string
): Promise<void> {
  const phone = merchant.phone

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, stock_qty, price, low_stock_threshold')
    .eq('merchant_id', merchant.id)
    .order('name')

  if (!products || products.length === 0) {
    await sendWhatsAppMessage(phone, `You haven't added any products yet.\n\nAdd one: \`add garri 500 20\``)
    return
  }

  if (productInput) {
    const match = findBestMatch(productInput, products.map(p => ({ id: p.name, name: p.name })))
    const product = products.find(p => p.name.toLowerCase() === match?.name?.toLowerCase())

    if (!product) {
      await sendWhatsAppMessage(phone, `❓ Product *"${productInput}"* not found.`)
      return
    }

    const status = product.stock_qty <= 0 ? '🔴 OUT' : product.stock_qty <= (product.low_stock_threshold || 5) ? '🟡 LOW' : '🟢'
    await sendWhatsAppMessage(phone,
      `📦 *${product.name}*\n` +
      `Stock: ${product.stock_qty} ${status}\n` +
      `Price: ${formatNaira(Number(product.price))}`
    )
    return
  }

  // Show all products
  const lines = products.map(p => {
    const status = p.stock_qty <= 0 ? '🔴 OUT' : p.stock_qty <= (p.low_stock_threshold || 5) ? '🟡' : '🟢'
    return `${status} *${p.name}*: ${p.stock_qty} left`
  })

  await sendWhatsAppMessage(phone, `📦 *Your Stock*\n\n${lines.join('\n')}`)
}
