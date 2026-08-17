/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile shared workspace packages (they ship TS/ESM source).
  transpilePackages: ['@sms/shared', '@sms/contracts'],
};

export default nextConfig;
