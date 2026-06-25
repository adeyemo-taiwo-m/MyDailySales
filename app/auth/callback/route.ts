import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: staffData } = await supabase
          .from('staff_members')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!staffData) {
          return NextResponse.redirect(`${origin}/onboarding`)
        } else if (staffData.role === 'staff') {
          return NextResponse.redirect(`${origin}/log-sale`)
        } else {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`)
}
