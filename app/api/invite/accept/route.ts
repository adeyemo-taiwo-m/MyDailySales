import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { token, user_id, name, business_id } = await request.json();

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

  // Create staff_members record
  const { error: staffError } = await supabase.from("staff_members").insert({
    business_id,
    user_id,
    name,
    role: "staff",
  });

  if (staffError) {
    return NextResponse.json(
      { error: "Could not create staff record" },
      { status: 500 },
    );
  }

  // Delete the used invite
  await supabase.from("pending_invites").delete().eq("token", token);

  return NextResponse.json({ success: true });
}
