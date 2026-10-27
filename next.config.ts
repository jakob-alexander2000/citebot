import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf"],
  // Ensure handbook .md/.pdf ship with the ask, handbook, and chat routes.
  outputFileTracingIncludes: {
    "/": ["./corpus/**/*", "./examples/de-qm-corpus/**/*", "./examples/nordlicht-corpus/**/*"],
    "/ask": ["./corpus/**/*", "./examples/de-qm-corpus/**/*", "./examples/nordlicht-corpus/**/*"],
    "/handbook": ["./corpus/**/*", "./examples/de-qm-corpus/**/*", "./examples/nordlicht-corpus/**/*"],
    "/api/chat": ["./corpus/**/*", "./examples/de-qm-corpus/**/*", "./examples/nordlicht-corpus/**/*"],
    "/onboard": [
      "./examples/nordlicht-corpus/**/*",
      "./examples/de-qm-corpus/**/*",
      "./docs/onboard.md",
    ],
    "/onboard/run": ["./docs/onboard.md"],
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
