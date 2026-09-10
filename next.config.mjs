/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  eslint: {
    // the project has no eslint config; don't block builds on it
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
