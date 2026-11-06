import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  output: process.env.NODE_ENV === "development" ? undefined : "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  ...(process.env.NODE_ENV === "development" && process.env.AKASHIC_REVIEW_PORT ? {
    async rewrites() {
      return [{ source: "/api/section-review/:path*", destination: `http://127.0.0.1:${process.env.AKASHIC_REVIEW_PORT}/api/section-review/:path*` }];
    },
  } : {}),
};

export default config;
