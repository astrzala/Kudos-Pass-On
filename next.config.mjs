import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // Use the new turbopack config key instead of deprecated experimental.turbo
  turbopack: {
    // You can add custom Turbopack options here if needed
  },

  webpack: (config) => {
    // Explicit alias so @/… works in Azure Linux builds
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};

export default nextConfig;
