/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;

