import type { NextConfig } from "next";
import { config } from "dotenv";

// Load environment variables from root .env file
config({ path: "../../.env" });

// Import env here to validate during build
import "./src/env";

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
