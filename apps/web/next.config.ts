import { config } from "dotenv";
import type { NextConfig } from "next";

// Load environment variables from root .env file
config({ path: "../../.env", quiet: true });

// Import env here to validate during build
import "./src/env";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // cacheComponents: true,
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.instructure.com" }],
  },
};

export default nextConfig;
