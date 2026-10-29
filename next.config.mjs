/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['*.e2b.app', 'localhost:3000'],
    },
  },
};

export default nextConfig;
