import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  WAMessageContent,
  proto,
  WASocket,
  Browsers,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as qrcode from 'qrcode-terminal'
import { setSocket } from './whatsapp'
import { routeMessage } from './router'
import path from 'path'

// In-memory store to cache messages/contacts (optional but helps)
const store = makeInMemoryStore({})

let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

export async function startBot(): Promise<WASocket> {
  // Auth state is saved in a folder so you don't have to re-scan QR every restart
  const authFolder = path.join(process.cwd(), 'auth_info_baileys')
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)

  // Get latest Baileys version
  const { version } = await fetchLatestBaileysVersion()
  console.log(`[Bot] Using Baileys v${version.join('.')}`)

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // We handle QR ourselves below
    logger: {
      // Silence most Baileys logs — only show errors
      level: 'error',
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (obj: any, msg: string) => console.error('[Baileys]', msg, obj),
      fatal: (obj: any, msg: string) => console.error('[Baileys FATAL]', msg, obj),
      child: () => ({ level: 'error', trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({}) as any }),
    } as any,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    defaultQueryTimeoutMs: 60000,
  })

  // Bind store to socket events
  store.bind(sock.ev)

  // Share the socket with whatsapp.ts so sendWhatsAppMessage can use it
  setSocket(sock)

  // ── CONNECTION UPDATES ───────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    // Print QR code to terminal when needed
    if (qr) {
      console.log('\n[Bot] Scan this QR code with your WhatsApp bot number:\n')
      qrcode.generate(qr, { small: true })
      console.log('\n[Bot] Open WhatsApp → three dots → Linked Devices → Link a Device\n')
    }

    if (connection === 'open') {
      console.log('[Bot] ✅ WhatsApp connected successfully!')
      reconnectAttempts = 0
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log(`[Bot] Connection closed. Status: ${statusCode}. Reconnect: ${shouldReconnect}`)

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000) // exponential backoff
        console.log(`[Bot] Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
        setTimeout(() => startBot(), delay)
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('[Bot] Logged out. Delete auth_info_baileys/ folder and restart to re-scan QR.')
      } else {
        console.log('[Bot] Max reconnect attempts reached. Restart the process.')
      }
    }
  })

  // ── SAVE CREDENTIALS ON UPDATE ──────────────────────────────────
  sock.ev.on('creds.update', saveCreds)

  // ── INCOMING MESSAGES ────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[Bot] messages.upsert event: type=${type}, count=${messages.length}`)
    // Only process new messages, not historical ones loaded on startup
    if (type !== 'notify') return

    for (const msg of messages) {
      console.log(`[Bot] msg details: fromMe=${msg.key.fromMe}, remoteJid=${msg.key.remoteJid}, hasMessage=${!!msg.message}`)
      // Skip messages sent by the bot itself
      if (msg.key.fromMe) continue

      // Skip group messages — bot is for individual chats only
      if (msg.key.remoteJid?.endsWith('@g.us')) continue
      if (!msg.key.remoteJid?.endsWith('@s.whatsapp.net') && !msg.key.remoteJid?.endsWith('@lid')) continue

      console.log(`[Bot] store contact lookup for ${msg.key.remoteJid}:`, JSON.stringify(store.contacts[msg.key.remoteJid!] || null))

      // Skip non-text messages
      const text = extractTextFromMessage(msg.message)
      console.log(`[Bot] extracted text: "${text}"`)
      if (!text || text.trim().length === 0) {
        // Reply to voice notes / images
        if (msg.key.remoteJid) {
          const phone = msg.key.remoteJid
          await sock.sendMessage(phone, {
            text: `Hi! I can only read text messages.\n\nType *help* to see what I can do.`
          })
        }
        continue
      }

      const jid = msg.key.remoteJid!
      console.log(`[Bot] Message from ${jid}: ${text.substring(0, 50)}`)

      // Route the message — don't await, process async
      routeMessage(jid, text).catch(err => {
        console.error(`[Bot] Error processing message from ${jid}:`, err)
      })
    }
  })

  return sock
}

/**
 * Extract plain text from any WhatsApp message type.
 * Handles regular text, extended text (links), and button replies.
 */
function extractTextFromMessage(
  message: WAMessageContent | null | undefined
): string | null {
  if (!message) return null

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  )
}
