import { supabaseAdmin } from './supabase'
import { sendWhatsAppMessage, phoneFromJid } from './whatsapp'
import { parseCommand } from './parser'
import { handleOnboarding } from './handlers/onboarding'
import { handleSell } from './handlers/sell'
import { handleDebt } from './handlers/debt'
import { handlePaid } from './handlers/paid'
import { handleStockAdd, handleStockCheck } from './handlers/stock'
import { handleUndo } from './handlers/undo'
import { handleSummary } from './handlers/summary'
import { handleHistory } from './handlers/history'
import { handleDebtsList } from './handlers/debts'
import { handleHelp } from './handlers/help'

export async function routeMessage(jid: string, text: string): Promise<void> {
  const phone = phoneFromJid(jid)

  try {
    // Load merchant using either the full JID or the plain phone number
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .or(`phone.eq.${jid},phone.eq.${phone}`)
      .maybeSingle()

    // Self-healing: if merchant has the legacy plain phone format in DB, update to full JID
    if (merchant && merchant.phone === phone) {
      await supabaseAdmin
        .from('merchants')
        .update({ phone: jid })
        .eq('id', merchant.id)
      merchant.phone = jid
    }

    const isOnboarding = !merchant || merchant.onboarding_step !== 'complete'

    if (isOnboarding) {
      const parsed = parseCommand(text)
      await handleOnboarding(merchant, jid, text, parsed)
      return
    }

    const parsed = parseCommand(text)

    switch (parsed.type) {
      case 'sell':
        await handleSell(merchant, parsed.product, parsed.qty, parsed.price)
        break
      case 'debt':
        await handleDebt(merchant, parsed.name, parsed.amount)
        break
      case 'paid':
        await handlePaid(merchant, parsed.name, parsed.amount)
        break
      case 'stock_add':
        await handleStockAdd(merchant, parsed.product, parsed.qty)
        break
      case 'stock_check':
        await handleStockCheck(merchant, parsed.product)
        break
      case 'undo':
        await handleUndo(merchant)
        break
      case 'summary':
        await handleSummary(merchant)
        break
      case 'debts':
        await handleDebtsList(merchant)
        break
      case 'history':
        await handleHistory(merchant)
        break
      case 'help':
        await handleHelp(merchant)
        break
      case 'unknown':
      default:
        await handleUnknownCommand(jid, text)
        break
    }
  } catch (error) {
    console.error(`Error routing message from ${jid}:`, error)
    // Don't crash — just log it
  }
}

async function handleUnknownCommand(jid: string, rawText: string): Promise<void> {
  const lower = rawText.toLowerCase().trim()

  let suggestion = ''
  if (lower.includes('sell') || lower.includes('sold')) {
    suggestion = `\nDid you mean: sell <product> <qty> <price>?`
  } else if (lower.includes('debt') || lower.includes('owe')) {
    suggestion = `\nDid you mean: debt <name> <amount>?`
  } else if (lower.includes('stock') || lower.includes('inventory')) {
    suggestion = `\nDid you mean: stock check  or  stock add <product> <qty>?`
  }

  await sendWhatsAppMessage(jid,
    `❓ I didn't understand: _"${rawText.substring(0, 50)}"_${suggestion}\n\n` +
    `Type *help* to see all commands with examples.`
  )
}
