import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: nothing is cached unless it says "use cache", every route gets a
  // prerendered static shell, and dynamic data streams in under Suspense boundaries.
  // Route segment configs such as `dynamic = "force-dynamic"` are errors in this mode.
  cacheComponents: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Restricted to the paths the Odyssey API serves, so the optimizer cannot be used as an open proxy.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/apollographql/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
    ],
  },
};

export default nextConfig;
