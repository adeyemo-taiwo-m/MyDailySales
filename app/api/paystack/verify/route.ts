import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();
    if (!reference) {
      return NextResponse.json({ error: "Reference required" }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY env variable is not set");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Call Paystack API to verify the transaction reference
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    if (!paystackRes.ok) {
      const errorText = await paystackRes.text();
      console.error("Paystack verification API error:", errorText);
      return NextResponse.json({ error: "Failed to verify transaction with Paystack" }, { status: 502 });
    }

    const paystackData = await paystackRes.json();
    if (paystackData.data?.status === "success") {
      const customerEmail = paystackData.data.customer?.email;
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      let bizId = null;

      let userPhoneMatch = null;
      if (customerEmail && customerEmail.endsWith("@mydailysales.com")) {
        userPhoneMatch = "+" + customerEmail.split("@")[0];
      }

      if (userPhoneMatch) {
        // Try matching business phone directly
        const { data: businesses } = await supabase
          .from("businesses")
          .select("id, phone");

        const matchBiz = businesses?.find((b: any) => b.phone === userPhoneMatch);
        if (matchBiz) bizId = matchBiz.id;
      }

      if (!bizId) {
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
            if (staff) bizId = staff.business_id;
          }
        } catch (err) {
          console.error("listUsers lookup failed in verify endpoint:", err);
        }
      }

      if (bizId) {
        const { error: updateError } = await supabase
          .from("businesses")
          .update({ subscription_status: "active" })
          .eq("id", bizId);

        if (updateError) {
          console.error("Database update error:", updateError);
          return NextResponse.json({ error: "Failed to update business status" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      } else {
        console.error("Could not find matching business for customer:", customerEmail);
        return NextResponse.json({ error: "Business not found for user" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Transaction not successful" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Verification endpoint unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
