import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["unpdf", "pg"],
  // Handbook markdown and PDF ship with the ask, handbook, and chat routes.
  outputFileTracingIncludes: {
    "/": ["./examples/nordlicht-corpus/**/*"],
    "/ask": ["./examples/nordlicht-corpus/**/*"],
    "/handbook": ["./examples/nordlicht-corpus/**/*"],
    "/api/chat": ["./examples/nordlicht-corpus/**/*", "./data/passage-embeddings.json"],
    "/api/answer": ["./examples/nordlicht-corpus/**/*", "./examples/phone-kb/**/*", "./data/passage-embeddings.json"],
    "/api/upload": ["./data/passage-embeddings.json"],
    "/answer": ["./examples/nordlicht-corpus/**/*", "./examples/phone-kb/**/*", "./data/passage-embeddings.json"],
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
