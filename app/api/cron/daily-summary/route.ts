import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export async function GET(request: NextRequest) {
  // Setup VAPID details lazily with build-safe fallbacks
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:hello@mydailysales.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY || ""
    );
  } catch (err) {
    console.warn("Failed to initialize web-push credentials:", err);
  }
  // Verify this is called by Vercel CRON (or your test)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().split("T")[0];

  // Get all active businesses that have push subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("business_id, subscription, businesses(name, subscription_status)");

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No subscriptions" });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    const biz = (sub as any).businesses;
    if (!biz || biz.subscription_status === "expired") {
      skipped++;
      continue;
    }

    // Fetch today's data for this business
    const [salesRes, lowStockRes, debtsRes] = await Promise.all([
      supabase
        .from("sales")
        .select("total, staff_id, staff_members(name)")
        .eq("business_id", sub.business_id)
        .gte("logged_at", today)
        .eq("is_undone", false),
      supabase
        .from("products")
        .select("name, stock_qty")
        .eq("business_id", sub.business_id)
        .lte("stock_qty", 5)
        .eq("is_active", true),
      supabase
        .from("debts")
        .select("amount_owed, amount_paid")
        .eq("business_id", sub.business_id)
        .neq("status", "paid"),
    ]);

    const sales = salesRes.data || [];
    if (sales.length === 0) {
      skipped++;
      continue;
    }

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const outstandingDebt = (debtsRes.data || []).reduce(
      (s, d) => s + (d.amount_owed - d.amount_paid),
      0,
    );

    // Staff breakdown
    const staffMap = new Map<string, { name: string; total: number }>();
    sales.forEach((sale) => {
      const name = (sale as any).staff_members?.name || "Staff";
      const existing = staffMap.get(sale.staff_id) || { name, total: 0 };
      staffMap.set(sale.staff_id, {
        ...existing,
        total: existing.total + sale.total,
      });
    });
    const staffParts = Array.from(staffMap.values())
      .sort((a, b) => b.total - a.total)
      .map((s) => `${s.name} ₦${Math.round(s.total / 1000)}k`)
      .join(" · ");

    const lowStockPart =
      (lowStockRes.data || []).length > 0
        ? ` · ${lowStockRes.data!.length} low stock`
        : "";

    const notificationPayload = JSON.stringify({
      title: `${biz.name} — Daily Summary`,
      body: `${formatNaira(totalRevenue)} from ${sales.length} sales. ${staffParts}${lowStockPart}. Tap to view.`,
      url: "/dashboard",
    });

    try {
      await webpush.sendNotification(
        sub.subscription as any,
        notificationPayload,
      );
      sent++;
    } catch (err: any) {
      console.error(
        `Push failed for business ${sub.business_id}:`,
        err.message,
      );
      // If subscription is invalid/expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("business_id", sub.business_id);
      }
    }
  }

  return NextResponse.json({ sent, skipped });
}

function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}
