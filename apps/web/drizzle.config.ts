import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from root .env file
config({ path: "../../.env" });

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
