/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
