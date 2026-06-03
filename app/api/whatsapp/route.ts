import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseCommand } from '@/lib/parser'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { handleOnboarding } from '@/lib/handlers/onboarding'
import { handleSell } from '@/lib/handlers/sell'
import { handleDebt } from '@/lib/handlers/debt'
import { handlePaid } from '@/lib/handlers/paid'
import { handleStockAdd, handleStockCheck } from '@/lib/handlers/stock'
import { handleUndo } from '@/lib/handlers/undo'
import { handleSummary } from '@/lib/handlers/summary'
import { handleHistory } from '@/lib/handlers/history'
import { handleDebtsList } from '@/lib/handlers/debts'
import { handleHelp } from '@/lib/handlers/help'

// ── GET: Meta webhook verification ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST: Receive inbound WhatsApp messages ──────────────────────────
export async function POST(req: NextRequest) {
  // Always return 200 immediately (Meta requires fast response to avoid retries)
  try {
    const body = await req.json()

    // Process asynchronously — don't await
    processMessage(body).catch(err => console.error('Message processing error:', err))

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook payload error:', error)
    return new NextResponse('Invalid JSON', { status: 400 })
  }
}

async function processMessage(body: any): Promise<void> {
  try {
    // Navigate Meta's nested payload structure
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // Only handle actual incoming messages (ignore status updates)
    if (!value?.messages || value.messages.length === 0) return
    if (value.statuses) return  // delivery receipts — skip

    const message = value.messages[0]

    // Only handle text messages (ignore voice notes, images, etc. in Stage 1)
    if (message.type !== 'text') {
      const phone = message.from
      await sendWhatsAppMessage(phone,
        `Hi! I can only read text messages for now.\n\n` +
        `Type *help* to see what I can do.`
      )
      return
    }

    const phone = message.from         // E.164 format: 2348012345678
    const text = message.text.body     // Raw message text

    // Load merchant by phone number
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    // Route: onboarding vs. main commands
    const isOnboarding = !merchant || merchant.onboarding_step !== 'complete'

    if (isOnboarding) {
      const parsed = parseCommand(text)
      await handleOnboarding(merchant, phone, text, parsed)
      return
    }

    // ── Parse and route command ────────────────────────────────────
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
        // Smart error: try to suggest the closest command
        await handleUnknownCommand(merchant.phone, text)
        break
    }
  } catch (error) {
    console.error('processMessage error:', error)
    // Don't crash — Meta will retry if we don't return 200
  }
}

async function handleUnknownCommand(phone: string, rawText: string): Promise<void> {
  const lower = rawText.toLowerCase().trim()

  // Try to suggest the closest matching command
  let suggestion = ''
  if (lower.includes('sell') || lower.includes('sold')) {
    suggestion = `\nDid you mean: \`sell <product> <qty> <price>\`?`
  } else if (lower.includes('debt') || lower.includes('owe')) {
    suggestion = `\nDid you mean: \`debt <name> <amount>\`?`
  } else if (lower.includes('stock') || lower.includes('inventory')) {
    suggestion = `\nDid you mean: \`stock check\` or \`stock add <product> <qty>\`?`
  }

  await sendWhatsAppMessage(phone,
    `❓ I didn't understand: _"${rawText.substring(0, 50)}"_${suggestion}\n\n` +
    `Type *help* to see all commands with examples.`
  )
}
