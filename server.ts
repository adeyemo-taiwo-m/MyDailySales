import { startBot } from './lib/bot'
import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

async function main() {
  console.log('[Server] Starting MyDailySales...')

  // Start the WhatsApp bot
  console.log('[Server] Connecting WhatsApp bot...')
  await startBot()

  // Start Next.js
  const app = next({ dev })
  const handle = app.getRequestHandler()
  await app.prepare()

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  server.listen(port, () => {
    console.log(`[Server] Next.js running on http://localhost:${port}`)
    console.log('[Server] Dashboard: http://localhost:3000/dashboard')
  })
}

main().catch(err => {
  console.error('[Server] Fatal error:', err)
  process.exit(1)
})
