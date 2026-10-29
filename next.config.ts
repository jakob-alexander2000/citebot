import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf"],
  // Handbook markdown and PDF ship with the ask, handbook, and chat routes.
  outputFileTracingIncludes: {
    "/": ["./examples/nordlicht-corpus/**/*"],
    "/ask": ["./examples/nordlicht-corpus/**/*"],
    "/handbook": ["./examples/nordlicht-corpus/**/*"],
    "/api/chat": ["./examples/nordlicht-corpus/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
