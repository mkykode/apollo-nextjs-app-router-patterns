import { staticCsp } from "@/lib/buildCsp";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // this one already added by browsers by default
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
const nextConfig: NextConfig = {
  // Cache Components: nothing is cached unless it says "use cache", every route gets a
  // prerendered static shell, and dynamic data streams in under Suspense boundaries.
  // Route segment configs such as `dynamic = "force-dynamic"` are errors in this mode.
  cacheComponents: true,
  // A custom cacheLife profile, used by getCachedTrack. Built-in ones: seconds, minutes, hours,
  // days, weeks, max. stale: how long the client may reuse it without asking; revalidate: how
  // often the server refreshes in the background; expire: when a stale entry must block.
  cacheLife: {
    track: { stale: 60, revalidate: 60, expire: 3600 },
  },
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Restricted to the paths the Odyssey API serves, so the optimizer cannot be used as an open proxy.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/apollographql/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
    ],
  },
  // headers() {
  //   return [
  //     {
  //       source: "/:path*",
  //       headers: securityHeaders
  //     },
  //     {
  //       source: "/((?!account(?:/|$)).*)",
  //       headers: [
  //         {
  //           key: "Content-Security-Policy",
  //           value: staticCsp
  //         }
  //       ]
  //     }
  //     ]
  // }
};

export default nextConfig;
