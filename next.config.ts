import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: "Strict-Transport-Security", value: "maxAge=31536000; includeSubDomains; preload"
    },
    {
        key: "X-Content-Type-Options", value: "nosniff"
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "X-Frame-Options", value: "DENY",
    },
    {
        key: "Permission-Policu", value: "camere=(), microphone=(), gelocation=()"
    }
]

const nextConfig: NextConfig = {
    typedRoutes: true,
    images: {
        remotePatterns: [
            // Restricted to the paths the Odyssey API serves, so the optimizer cannot be used as an open proxy.
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/apollographql/**" },
            { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: securityHeaders
            }
        ]
    }
};

export default nextConfig;
