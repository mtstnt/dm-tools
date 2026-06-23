import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to /tools
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/tools", request.url))
  }

  // Protect /tools routes
  if (pathname.startsWith("/tools")) {
    const authenticated = request.cookies.get("authenticated")
    if (!authenticated || authenticated.value !== "true") {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
