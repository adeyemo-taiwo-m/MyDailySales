import { sendWhatsAppMessage } from '../whatsapp'
import { Merchant } from '../types'

export async function handleHelp(merchant: Merchant): Promise<void> {
  const phone = merchant.phone

  const helpText =
    `📖 *MyDailySales Commands*\n\n` +
    `*Log a sale:*\n\`sell <product> <qty> <price>\`\n_sell garri 5 500_\n\n` +
    `*Record a debt:*\n\`debt <name> <amount>\`\n_debt Emeka 3000_\n\n` +
    `*Mark debt paid:*\n\`paid <name> <amount>\`\n_paid Emeka 3000_\n\n` +
    `*Add stock:*\n\`stock add <product> <qty>\`\n_stock add garri 20_\n\n` +
    `*Check stock:*\n\`stock check\` or \`stock check garri\`\n\n` +
    `*Today's summary:*\n\`summary\`\n\n` +
    `*All debts:*\n\`debts\`\n\n` +
    `*Recent entries:*\n\`history\`\n\n` +
    `*Undo last sale:*\n\`undo\`\n\n` +
    `─────────────────────\n` +
    `Need help? Type your question and we'll guide you.`

  await sendWhatsAppMessage(phone, helpText)
}
