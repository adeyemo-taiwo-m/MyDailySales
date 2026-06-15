import type { WASocket } from '@whiskeysockets/baileys'

// Shared socket instance — set once when bot connects
let _socket: WASocket | null = null

export function setSocket(sock: WASocket): void {
  _socket = sock
}

export function getSocket(): WASocket | null {
  return _socket
}

/**
 * Send a WhatsApp text message via Baileys.
 * 
 * Phone format: Baileys uses JID format: "2348012345678@s.whatsapp.net"
 * The phone number coming from messages is already in this format.
 * For sending to a new number, convert: "08012345678" → "2348012345678@s.whatsapp.net"
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  if (!_socket) {
    console.error('WhatsApp socket not initialized — cannot send message')
    return
  }

  // Ensure correct JID format
  let jid = to
  if (!to.includes('@')) {
    if (to.startsWith('40') && to.length >= 13) {
      jid = `${to}@lid`
    } else {
      jid = `${to}@s.whatsapp.net`
    }
  }

  try {
    await _socket.sendMessage(jid, { text: message })
  } catch (error) {
    console.error(`Failed to send message to ${jid}:`, error)
    throw error
  }
}

// Format naira amounts: 14500 → "₦14,500"
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

/**
 * Extract the plain phone number from a Baileys JID.
 * "2348012345678@s.whatsapp.net" → "2348012345678"
 */
export function phoneFromJid(jid: string): string {
  return jid.split('@')[0]
}

/**
 * Convert a Nigerian number to E.164 format for storage.
 * "08012345678" → "2348012345678"
 * "2348012345678" → "2348012345678" (already correct)
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return '234' + digits.slice(1)
  if (digits.startsWith('234')) return digits
  return digits
}
