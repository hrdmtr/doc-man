import type { NextConfig } from "next";
import { execSync } from "child_process";

const gitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  env: {
    NEXT_PUBLIC_VERSION: gitHash,
  },
};

export default nextConfig;
