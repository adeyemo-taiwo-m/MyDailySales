import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  } else if (!cleaned.startsWith("234") && cleaned.length === 10) {
    cleaned = "234" + cleaned;
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  const { token, name, phone, pin, business_id } = await request.json();

  if (!token || !name || !phone || !pin || !business_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify token exists and is not expired
  const { data: invite } = await supabase
    .from("pending_invites")
    .select("*")
    .eq("token", token)
    .eq("business_id", business_id)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid or expired invite" },
      { status: 400 },
    );
  }

  const cleanedPhone = cleanPhone(phone);
  const email = `${cleanedPhone}@mydailysales.app`;
  const password = `pin_${pin}`;

  let userId: string;

  try {
    // Check if user already exists
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const users = userData?.users || [];
    const existingUser = users.find((u: any) => u.email === email);

    if (existingUser) {
      // Update password & pin metadata
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          user_metadata: { pin },
        }
      );
      if (updateError) throw updateError;
      userId = existingUser.id;
    } else {
      // Create new virtual user
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { pin },
      });
      if (createError || !created?.user) throw createError || new Error("Could not create user");
      userId = created.user.id;
    }
  } catch (err: any) {
    console.error("Admin user creation/update failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to manage staff credentials" },
      { status: 500 },
    );
  }

  // Create or reactivate staff_members record
  const { data: existingStaff } = await supabase
    .from("staff_members")
    .select("id")
    .eq("user_id", userId)
    .eq("business_id", business_id)
    .maybeSingle();

  let staffError;
  if (existingStaff) {
    const { error } = await supabase
      .from("staff_members")
      .update({ name, is_active: true })
      .eq("id", existingStaff.id);
    staffError = error;
  } else {
    const { error } = await supabase
      .from("staff_members")
      .insert({
        business_id,
        user_id: userId,
        name,
        role: "staff",
        is_active: true,
      });
    staffError = error;
  }

  if (staffError) {
    return NextResponse.json(
      { error: "Could not link staff member to business" },
      { status: 500 },
    );
  }

  // Delete the used invite
  await supabase.from("pending_invites").delete().eq("token", token);

  return NextResponse.json({ success: true });
}
