import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set NEXT_STATIC_EXPORT=true only for S3/CloudFront builds, not Vercel
  ...(process.env.NEXT_STATIC_EXPORT === "true" && { output: "export" }),
  async rewrites() {
    if (process.env.NEXT_STATIC_EXPORT === "true") return [];
    return [
      {
        source: '/api',
        destination: 'http://localhost:8000/api',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
