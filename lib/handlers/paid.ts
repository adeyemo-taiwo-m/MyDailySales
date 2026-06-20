import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { findBestMatch } from "../fuzzy";
import { Merchant } from "../types";

export async function handlePaid(
  merchant: Merchant,
  customerInput: string,
  amount: number,
): Promise<void> {
  const phone = merchant.phone;

  const { data: unpaidDebts } = await supabaseAdmin
    .from("credit_book")
    .select("id, customer_name, amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  if (!unpaidDebts || unpaidDebts.length === 0) {
    await sendWhatsAppMessage(
      phone,
      `✅ You have no outstanding debts recorded.`,
    );
    return;
  }

  // Step 1: fuzzy match the customer name
  const uniqueNames = [
    ...new Map(
      unpaidDebts.map((d) => [
        d.customer_name,
        { id: d.id, name: d.customer_name },
      ]),
    ).values(),
  ];
  const nameMatch = findBestMatch(customerInput, uniqueNames);

  if (!nameMatch) {
    const names = unpaidDebts
      .slice(0, 5)
      .map((d) => d.customer_name)
      .join(", ");
    await sendWhatsAppMessage(
      phone,
      `❓ No debt found for *"${customerInput}"*.\n\n` +
        `People who owe you: ${names}\n\n` +
        `Type *debts* to see the full list.`,
    );
    return;
  }

  // Step 2: among debts for this customer, find the one matching the amount
  const customerDebts = unpaidDebts.filter(
    (d) => d.customer_name.toLowerCase() === nameMatch.name.toLowerCase(),
  );

  // Find closest matching debt by amount
  const exactDebt = customerDebts.find((d) => d.amount_owed === amount);
  const targetDebt =
    exactDebt ||
    customerDebts.reduce((closest, d) =>
      Math.abs(d.amount_owed - amount) < Math.abs(closest.amount_owed - amount)
        ? d
        : closest,
    );

  // Mark only this specific debt as paid
  await supabaseAdmin
    .from("credit_book")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", targetDebt.id);

  // Get remaining total
  const { data: remaining } = await supabaseAdmin
    .from("credit_book")
    .select("amount_owed")
    .eq("merchant_id", merchant.id)
    .eq("status", "unpaid");

  const stillOwed = (remaining || []).reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  // Check if customer has more unpaid debts
  const remainingForCustomer = customerDebts.filter(
    (d) => d.id !== targetDebt.id,
  );
  const customerStillOwes = remainingForCustomer.reduce(
    (sum, d) => sum + d.amount_owed,
    0,
  );

  let reply = `✅ *${nameMatch.name}* paid ${formatNaira(targetDebt.amount_owed)}. Debt cleared.\n\n`;

  if (customerStillOwes > 0) {
    reply += `⚠️ ${nameMatch.name} still owes ${formatNaira(customerStillOwes)} from other entries.\n\n`;
  }

  reply += `Total still owed to you: *${formatNaira(stillOwed)}*`;

  await sendWhatsAppMessage(phone, reply);
}
