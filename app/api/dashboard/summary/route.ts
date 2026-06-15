import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSocket, phoneFromJid } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 })
  }

  const searchPhones = [phone]
  const normalized = phone.replace(/\D/g, '')
  if (normalized && !searchPhones.includes(normalized)) {
    searchPhones.push(normalized)
  }

  // Try to resolve JID via WhatsApp bot
  const sock = getSocket()
  if (sock) {
    try {
      const [result] = await sock.onWhatsApp(phone)
      if (result && result.exists) {
        searchPhones.push(result.jid)
        const plain = phoneFromJid(result.jid)
        if (!searchPhones.includes(plain)) {
          searchPhones.push(plain)
        }
      }
    } catch (err) {
      console.error('[API] failed to resolve JID via WhatsApp:', err)
    }
  }

  const orFilter = searchPhones.map(p => `phone.eq.${p}`).join(',')

  // Get merchant
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .or(orFilter)
    .maybeSingle()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Today's sales
  const { data: todaysSales } = await supabaseAdmin
    .from('sales_log')
    .select('product_name, qty_sold, price_each, total, logged_at')
    .eq('merchant_id', merchant.id)
    .eq('undone', false)
    .gte('logged_at', today.toISOString())
    .order('logged_at', { ascending: false })

  // Unpaid debts
  const { data: unpaidDebts } = await supabaseAdmin
    .from('credit_book')
    .select('customer_name, amount_owed, created_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'unpaid')
    .order('amount_owed', { ascending: false })

  // Products with stock
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, stock_qty, price, low_stock_threshold')
    .eq('merchant_id', merchant.id)
    .order('name')

  const todayTotal = (todaysSales || []).reduce((sum, s) => sum + Number(s.total || 0), 0)
  const totalOwed = (unpaidDebts || []).reduce((sum, d) => sum + Number(d.amount_owed || 0), 0)

  return NextResponse.json({
    merchant: { business_name: merchant.business_name, phone: phoneFromJid(merchant.phone) },
    today: {
      total: todayTotal,
      transactions: (todaysSales || []).length,
      sales: todaysSales || [],
    },
    debts: {
      total: totalOwed,
      entries: unpaidDebts || [],
    },
    products: products || [],
  })
}
