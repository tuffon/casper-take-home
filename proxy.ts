import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

// Next.js runs this before every request that matches `config.matcher`.
// (In Next.js 16 this file replaced middleware.ts.) We only use it to keep
// the Supabase session cookies fresh; pages do their own access checks.
export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  // Everything except static files and images, which never need a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
