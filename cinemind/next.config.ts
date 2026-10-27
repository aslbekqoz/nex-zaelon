import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs the self-contained server Next traces into .next/standalone
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["pg", "nodemailer", "sharp"],
  experimental: {
    serverActions: {
      // Profile pictures are uploaded through a server action (5 MB files plus form overhead)
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
