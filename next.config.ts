import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / Prisma packages external so the SQLite binding isn't bundled.
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/client",
  ],
};

export default nextConfig;
