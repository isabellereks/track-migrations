import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "d3-geo",
      "@number-flow/react",
      "topojson-client",
    ],
  },
};

export default nextConfig;
