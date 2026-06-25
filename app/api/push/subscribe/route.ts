import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = await request.json();

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .single();

  if (!staffMember || staffMember.role !== "owner") {
    return NextResponse.json(
      { error: "Only owners receive notifications" },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      business_id: staffMember.business_id,
      subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
