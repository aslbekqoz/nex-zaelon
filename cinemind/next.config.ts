import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "nodemailer", "sharp"],
  experimental: {
    serverActions: {
      // Profile pictures are uploaded through a server action (5 MB files plus form overhead)
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
