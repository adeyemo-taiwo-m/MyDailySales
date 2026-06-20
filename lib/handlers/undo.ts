import { supabaseAdmin } from "../supabase";
import { sendWhatsAppMessage, formatNaira } from "../whatsapp";
import { Merchant } from "../types";

export async function handleUndo(merchant: Merchant): Promise<void> {
  const phone = merchant.phone;

  // Get the most recent non-undone sale
  const { data: lastSale, error } = await supabaseAdmin
    .from("sales_log")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastSale) {
    await sendWhatsAppMessage(phone, `↩ Nothing to undo. No sales logged yet.`);
    return;
  }

  // Soft-delete the sale
  await supabaseAdmin
    .from("sales_log")
    .update({ undone: true })
    .eq("id", lastSale.id);

  // Restore stock — get current qty first, then add back
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("stock_qty")
    .eq("id", lastSale.product_id)
    .maybeSingle();

  if (product) {
    await supabaseAdmin
      .from("products")
      .update({ stock_qty: (product.stock_qty || 0) + lastSale.qty_sold })
      .eq("id", lastSale.product_id);
  }

  // Get updated today's total
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todaysSales } = await supabaseAdmin
    .from("sales_log")
    .select("total")
    .eq("merchant_id", merchant.id)
    .eq("undone", false)
    .gte("logged_at", today.toISOString());

  const todayTotal = (todaysSales || []).reduce(
    (sum, s) => sum + (s.total || 0),
    0,
  );

  const loggedAt = new Date(lastSale.logged_at).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendWhatsAppMessage(
    phone,
    `↩ *Done. Last entry reversed.*\n\n` +
      `Removed: Sold ${lastSale.qty_sold} ${lastSale.product_name} @ ${formatNaira(lastSale.price_each)} (logged ${loggedAt})\n\n` +
      `Today total: *${formatNaira(todayTotal)}*`,
  );
}
