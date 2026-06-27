import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  
  // Verify webhook is from Paystack
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async function getBusinessIdFromEmail(customerEmail: string): Promise<string | null> {
    let userPhoneMatch = null;
    if (customerEmail.endsWith("@mydailysales.com")) {
      userPhoneMatch = "+" + customerEmail.split("@")[0];
    }

    if (userPhoneMatch) {
      // Try matching business phone directly
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, phone");

      const matchBiz = businesses?.find((b: any) => b.phone === userPhoneMatch);
      if (matchBiz) return matchBiz.id;
    }

    // Fallback: search all users by email or phone
    try {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const users = userData?.users || [];
      const matchUser = users.find((u: any) => u.email === customerEmail || (userPhoneMatch && u.phone === userPhoneMatch));
      if (matchUser) {
        const { data: staff } = await supabase
          .from("staff_members")
          .select("business_id")
          .eq("user_id", matchUser.id)
          .eq("role", "owner")
          .maybeSingle();
        if (staff) return staff.business_id;
      }
    } catch (err) {
      console.error("listUsers lookup failed:", err);
    }


    return null;
  }

  if (
    event.event === "subscription.create" ||
    event.event === "charge.success"
  ) {
    const customerEmail = event.data?.customer?.email;
    if (customerEmail) {
      const bizId = await getBusinessIdFromEmail(customerEmail);
      if (bizId) {
        await supabase
          .from("businesses")
          .update({ subscription_status: "active" })
          .eq("id", bizId);
      }
    }
  }

  if (event.event === "subscription.disable") {
    const customerEmail = event.data?.customer?.email;
    if (customerEmail) {
      const bizId = await getBusinessIdFromEmail(customerEmail);
      if (bizId) {
        await supabase
          .from("businesses")
          .update({ subscription_status: "expired" })
          .eq("id", bizId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
