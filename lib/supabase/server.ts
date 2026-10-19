import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/**
 * Creates a Supabase client for server code: pages (Server Components),
 * Server Actions, and Route Handlers.
 *
 * The client reads and writes the user's session through this request's
 * cookies, so create a new one every time you need it. Never keep it in a
 * module-level variable, or one person's session could leak into someone
 * else's request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Pages (Server Components) are not allowed to set cookies, so this
          // throws there. That's fine: proxy.ts refreshes the session cookies
          // before every page request. Server Actions can set cookies, which
          // is how signing in and out update the session.
        }
      },
    },
  });
}
