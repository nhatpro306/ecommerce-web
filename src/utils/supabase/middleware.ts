import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabasePublicEnv();
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes that require authentication.
  const protectedPaths = ['/profile', '/checkout', '/admin'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    // Store the original URL to redirect back after login
    const returnTo = encodeURIComponent(request.nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/signin?returnTo=${returnTo}`, request.url)
    );
  }

  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin' || profile?.is_active === false) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
  }

  return response;
}
