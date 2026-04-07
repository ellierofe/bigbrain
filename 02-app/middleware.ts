import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }
  return (auth as any)(req)
}

export const config = {
  // Protect everything except login, auth callbacks, and static assets
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
