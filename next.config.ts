import type { NextConfig } from "next";

// create-next-app also turns on `cacheComponents` and `partialPrefetching`.
// We leave them off on purpose: with them on, every page that reads the
// sign-in cookie must be wrapped in <Suspense> and extra caching directives.
// Without them, Next.js simply renders cookie-reading pages fresh on every
// request, which is what an app behind a login wants anyway.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // Lets Tailwind process our CSS (set up by create-next-app).
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
