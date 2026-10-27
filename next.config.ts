import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf"],
  // Ensure handbook .md/.pdf ship with the ask, handbook, and chat routes.
  outputFileTracingIncludes: {
    "/": ["./corpus/**/*", "./examples/de-qm-corpus/**/*"],
    "/ask": ["./corpus/**/*", "./examples/de-qm-corpus/**/*"],
    "/handbook": ["./corpus/**/*", "./examples/de-qm-corpus/**/*"],
    "/api/chat": ["./corpus/**/*", "./examples/de-qm-corpus/**/*"],
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
