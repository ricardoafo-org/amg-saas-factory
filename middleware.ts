import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin/** routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow public admin paths (login page)
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Check for pb_auth cookie
  const authCookie = request.cookies.get('pb_auth');

  if (!authCookie?.value) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic JWT structure check — full validation happens in getStaffCtx() on server
  // We only do a lightweight presence + structure check here to avoid PB round-trip per request
  const parts = authCookie.value.split('.');
  if (parts.length !== 3) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
