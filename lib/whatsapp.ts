export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  console.log(`\n========================================\n💬 BOT REPLY TO ${to}:\n${message}\n========================================\n`)

  const phoneId = process.env.META_PHONE_NUMBER_ID || 'placeholder-phone-number-id'
  const META_API_URL = `https://graph.facebook.com/v19.0/${phoneId}/messages`

  const response = await fetch(META_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: message, preview_url: false },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('WhatsApp send failed:', error)
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }
}

// Format naira amounts: 14500 → "₦14,500"
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}
