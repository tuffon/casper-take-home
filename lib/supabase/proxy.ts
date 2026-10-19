import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

/**
 * Keeps the visitor's Supabase session fresh. Called from proxy.ts before
 * every page request.
 *
 * A Supabase session is two tokens stored in cookies: a short-lived access
 * token and a refresh token. When the access token is close to expiring,
 * this swaps it for a new one and writes the new cookies to:
 *   - the incoming request, so the page rendered for this request sees them
 *   - the outgoing response, so the browser stores them
 *
 * This does NOT decide who can see which page. Each protected page and
 * action checks the user itself (see auth/current-user.ts).
 */
export async function refreshSupabaseSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        // Rebuild the response so it carries the updated request cookies,
        // then send the new cookies to the browser too.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Supabase supplies "don't cache" headers so a CDN never serves one
        // person's session cookies to someone else.
        for (const [headerName, headerValue] of Object.entries(cacheHeaders)) {
          response.headers.set(headerName, headerValue);
        }
      },
    },
  });

  // getClaims() checks the session and refreshes it if needed, which calls
  // setAll above. Supabase warns not to run other code between creating the
  // client and this call, or users can get signed out at random.
  await supabase.auth.getClaims();

  // Return this exact response: a new one would drop the refreshed cookies.
  return response;
}
