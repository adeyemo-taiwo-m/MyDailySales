import { ParsedCommand } from './types'

// Normalize: lowercase, trim, collapse whitespace
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Extract optional @time tag from command: "sell garri 5 500 @2pm" → "2pm"
function extractTime(text: string): { cleaned: string; time?: string } {
  const timeMatch = text.match(/@(\S+)$/)
  if (timeMatch) {
    return { cleaned: text.replace(/@\S+$/, '').trim(), time: timeMatch[1] }
  }
  return { cleaned: text }
}

// Parse Nigerian number formats: "2500", "2,500", "2500naira", "2500 naira", "#2500"
function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/naira|₦|#/gi, '')
    .replace(/,/g, '')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function parseCommand(rawText: string): ParsedCommand {
  const { cleaned: text, time } = extractTime(normalize(rawText))

  // ── SELL ──────────────────────────────────────────
  // sell <product> <qty> <price>
  // Accepts: "sell garri 5 500", "sell garri 5 500naira"
  const sellMatch = text.match(/^sell\s+(.+?)\s+(\d+)\s+(.+)$/)
  if (sellMatch) {
    const product = sellMatch[1].trim()
    const qty = parseInt(sellMatch[2], 10)
    const price = parseAmount(sellMatch[3])
    if (qty > 0 && price !== null && price > 0) {
      return { type: 'sell', product, qty, price, time }
    }
  }

  // ── DEBT ──────────────────────────────────────────
  // debt <name> <amount>
  const debtMatch = text.match(/^debt\s+(.+?)\s+([#₦\d].*)$/)
  if (debtMatch) {
    const name = debtMatch[1].trim()
    const amount = parseAmount(debtMatch[2])
    if (name && amount !== null && amount > 0) {
      return { type: 'debt', name, amount }
    }
  }

  // ── PAID ──────────────────────────────────────────
  // paid <name> <amount>
  const paidMatch = text.match(/^paid\s+(.+?)\s+([#₦\d].*)$/)
  if (paidMatch) {
    const name = paidMatch[1].trim()
    const amount = parseAmount(paidMatch[2])
    if (name && amount !== null && amount > 0) {
      return { type: 'paid', name, amount }
    }
  }

  // ── STOCK ADD ────────────────────────────────────
  // stock add <product> <qty>
  const stockAddMatch = text.match(/^stock\s+add\s+(.+?)\s+(\d+)$/)
  if (stockAddMatch) {
    const product = stockAddMatch[1].trim()
    const qty = parseInt(stockAddMatch[2], 10)
    if (product && qty > 0) {
      return { type: 'stock_add', product, qty }
    }
  }

  // ── STOCK CHECK ──────────────────────────────────
  // stock check [product]  OR  stock  (no product = show all)
  if (text === 'stock') return { type: 'stock_check' }
  const stockCheckMatch = text.match(/^stock\s+check(?:\s+(.+))?$/)
  if (stockCheckMatch) {
    return { type: 'stock_check', product: stockCheckMatch[1]?.trim() }
  }

  // ── UNDO ─────────────────────────────────────────
  if (text === 'undo') return { type: 'undo' }

  // ── SUMMARY ──────────────────────────────────────
  if (text === 'summary' || text === 'report') return { type: 'summary' }

  // ── DEBTS ────────────────────────────────────────
  if (text === 'debts' || text === 'debt list' || text === 'owing') {
    return { type: 'debts' }
  }

  // ── HISTORY ──────────────────────────────────────
  if (text === 'history' || text === 'log') return { type: 'history' }

  // ── HELP ─────────────────────────────────────────
  if (text === 'help' || text === 'menu' || text === 'commands') {
    return { type: 'help' }
  }

  // ── ONBOARDING: ADD PRODUCT ──────────────────────
  // add <product> <price> <qty>
  const addProductMatch = text.match(/^add\s+(.+?)\s+(\S+)\s+(\d+)$/)
  if (addProductMatch) {
    const name = addProductMatch[1].trim()
    const price = parseAmount(addProductMatch[2])
    const qty = parseInt(addProductMatch[3], 10)
    if (name && price !== null && price > 0 && qty >= 0) {
      return { type: 'add_product', name, price, qty }
    }
  }

  // ── ONBOARDING: DONE ─────────────────────────────
  if (text === 'done' || text === 'finish' || text === 'complete') {
    return { type: 'done' }
  }

  // ── UNKNOWN ──────────────────────────────────────
  return { type: 'unknown', raw: rawText }
}
