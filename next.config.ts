import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf"],
  // Ensure handbook .md/.pdf ship with the serverless chat + handbook routes
  outputFileTracingIncludes: {
    "/": ["./corpus/**/*", "./examples/de-qm-corpus/**/*"],
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
