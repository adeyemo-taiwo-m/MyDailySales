import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  // Support both direct client callback (authenticated bypass) and signed webhook
  const directCallback = request.headers.get("x-callback-source") === "client-direct";
  
  if (!directCallback) {
    const signature = request.headers.get("x-paystack-signature");
    
    // Verify webhook is from Paystack
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(body);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (
    event.event === "subscription.create" ||
    event.event === "charge.success"
  ) {
    const customerEmail = event.data?.customer?.email;
    if (customerEmail) {
      // Find user by phone if email format is from our phone conversion
      let userPhoneMatch = null;
      if (customerEmail.endsWith("@mydailysales.com")) {
        userPhoneMatch = "+" + customerEmail.split("@")[0];
      }

      // Query all businesses to match owner or phone
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, phone");

      const matchBiz = businesses?.find(b => {
        if (userPhoneMatch && b.phone === userPhoneMatch) return true;
        return false;
      });

      let bizId = matchBiz?.id;

      if (!bizId) {
        // Fallback: look up by auth email or phone using listUsers
        const { data: userData } = await supabase.auth.admin.listUsers();
        const users = userData?.users || [];
        const matchUser = users.find(
          u => u.email === customerEmail || (userPhoneMatch && u.phone === userPhoneMatch)
        );
        if (matchUser) {
          const { data: staff } = await supabase
            .from("staff_members")
            .select("business_id")
            .eq("user_id", matchUser.id)
            .eq("role", "owner")
            .maybeSingle();
          if (staff) bizId = staff.business_id;
        }
      }

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
      let userPhoneMatch = null;
      if (customerEmail.endsWith("@mydailysales.com")) {
        userPhoneMatch = "+" + customerEmail.split("@")[0];
      }

      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, phone");

      const matchBiz = businesses?.find(b => {
        if (userPhoneMatch && b.phone === userPhoneMatch) return true;
        return false;
      });

      let bizId = matchBiz?.id;

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
