import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Unauthenticated users can only access auth pages and invite pages
  const publicPaths = ["/login", "/signup", "/invite", "/auth/callback"];
  const isPublic = publicPaths.some((p) => path.startsWith(p));

  // Allow home page to be public or redirect to dashboard
  if (path === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/login", request.url)); // Middleware below will handle redirecting to dashboard/log-sale
    }
    return supabaseResponse;
  }

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users: check role and redirect accordingly
  if (user) {
    const { data: staffData } = await supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const hasStaffRecord = !!staffData;

    if (!hasStaffRecord) {
      // User is authenticated but has no staff/business record yet (needs onboarding)
      if (path !== "/onboarding" && !isPublic) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      if (path === "/login" || path === "/signup") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } else {
      // User is already onboarded
      if (path === "/onboarding") {
        return NextResponse.redirect(
          new URL(staffData.role === "staff" ? "/log-sale" : "/dashboard", request.url)
        );
      }
      if (path === "/login" || path === "/signup") {
        return NextResponse.redirect(
          new URL(staffData.role === "staff" ? "/log-sale" : "/dashboard", request.url)
        );
      }

      // Staff trying to access owner routes
      const ownerOnlyPaths = [
        "/dashboard",
        "/inventory",
        "/debts",
        "/staff",
        "/reports",
        "/billing"
      ];
      if (staffData.role === "staff" && ownerOnlyPaths.some((p) => path.startsWith(p))) {
        return NextResponse.redirect(new URL("/log-sale", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js).*)",
  ],
};
