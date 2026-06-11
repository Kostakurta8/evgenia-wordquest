import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // dev builds skip the service worker — install/offline is a prod concern
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Dev runs Turbopack and ignores Serwist's injected webpack config (the SW
  // is disabled in dev anyway); production builds use `next build --webpack`.
  turbopack: {},
};

export default withSerwist(nextConfig);
