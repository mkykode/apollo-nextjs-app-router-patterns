import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
