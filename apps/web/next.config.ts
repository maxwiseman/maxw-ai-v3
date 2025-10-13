import { config } from "dotenv";
import type { NextConfig } from "next";

// Load environment variables from root .env file
config({ path: "../../.env" });

// Import env here to validate during build
import "./src/env";

const nextConfig: NextConfig = {
	typedRoutes: true,
};

export default nextConfig;
