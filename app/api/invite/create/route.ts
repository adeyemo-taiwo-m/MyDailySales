import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { business_id, staff_name, staff_phone } = await request.json();

  // Verify requesting user is owner of this business
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("role, business_id")
    .eq("user_id", user.id)
    .single();

  if (
    !staffMember ||
    staffMember.role !== "owner" ||
    staffMember.business_id !== business_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service role to insert (bypasses RLS for token generation)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite, error } = await serviceSupabase
    .from("pending_invites")
    .insert({
      business_id,
      staff_name,
      staff_phone,
    })
    .select()
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: "Could not create invite" },
      { status: 500 },
    );
  }

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

  return NextResponse.json({ data: { link, token: invite.token } });
}
