import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

loadEnv({ path: path.resolve(process.cwd(), "../.env") });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
