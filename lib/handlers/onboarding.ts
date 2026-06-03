import { supabaseAdmin } from '../supabase'
import { sendWhatsAppMessage } from '../whatsapp'
import { ParsedCommand, Merchant } from '../types'

export async function handleOnboarding(
  merchant: Merchant | null,
  phone: string,
  message: string,
  parsed: ParsedCommand
): Promise<void> {

  // ── BRAND NEW MERCHANT (first ever message) ──────
  if (!merchant) {
    // Create merchant record in 'naming' step
    await supabaseAdmin.from('merchants').insert({
      phone,
      onboarding_step: 'naming',
    })

    await sendWhatsAppMessage(phone,
      `👋 Welcome to MyDailySales!\n\n` +
      `I help you track sales, stock, and customer debts — all from WhatsApp.\n\n` +
      `Let's set you up in 2 minutes.\n\n` +
      `*What is your business name?*`
    )
    return
  }

  // ── STEP: WAITING FOR BUSINESS NAME ─────────────
  if (merchant.onboarding_step === 'naming') {
    const businessName = message.trim()
    if (businessName.length < 2) {
      await sendWhatsAppMessage(phone, `Please send your business name (e.g., "FreshMart" or "Mama Chisom Stores")`)
      return
    }

    await supabaseAdmin.from('merchants')
      .update({ business_name: businessName, onboarding_step: 'adding_products' })
      .eq('id', merchant.id)

    await sendWhatsAppMessage(phone,
      `Great! *${businessName}* is set up.\n\n` +
      `Now add your first products. Format:\n` +
      `\`add <name> <price> <qty>\`\n\n` +
      `Example: \`add garri 500 20\`\n\n` +
      `Add at least 1 product, then type *done* when finished.`
    )
    return
  }

  // ── STEP: ADDING PRODUCTS ────────────────────────
  if (merchant.onboarding_step === 'adding_products') {

    if (parsed.type === 'add_product') {
      // Check for duplicate product name
      const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('merchant_id', merchant.id)
          .ilike('name', parsed.name)
          .maybeSingle()

      if (existing) {
        await sendWhatsAppMessage(phone, `⚠️ You already have a product called "${parsed.name}". Try a different name or type *done* to finish.`)
        return
      }

      await supabaseAdmin.from('products').insert({
        merchant_id: merchant.id,
        name: parsed.name,
        price: parsed.price,
        stock_qty: parsed.qty,
      })

      await sendWhatsAppMessage(phone,
        `✅ *${parsed.name}* added.\n` +
        `Price: ₦${parsed.price.toLocaleString()} | Stock: ${parsed.qty}\n\n` +
        `Add another product or type *done* to finish.`
      )
      return
    }

    if (parsed.type === 'done') {
      // Check they have at least 1 product
      const { count } = await supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchant.id)

      if (!count || count === 0) {
        await sendWhatsAppMessage(phone, `Please add at least 1 product before finishing.\n\nFormat: \`add garri 500 20\``)
        return
      }

      await supabaseAdmin.from('merchants')
        .update({ onboarding_step: 'complete' })
        .eq('id', merchant.id)

      await sendWhatsAppMessage(phone,
        `🎉 *${merchant.business_name}* is ready!\n\n` +
        `Try logging your first sale now:\n` +
        `\`sell <product> <qty> <price>\`\n\n` +
        `Example: \`sell garri 2 500\`\n\n` +
        `Type *help* anytime to see all commands.`
      )
      return
    }

    // They sent something else during product setup
    await sendWhatsAppMessage(phone,
      `To add a product: \`add <name> <price> <qty>\`\n` +
      `Example: \`add garri 500 20\`\n\n` +
      `Type *done* when you've added all your products.`
    )
    return
  }
}
