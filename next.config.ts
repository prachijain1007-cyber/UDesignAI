import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // Add your S3 bucket / CDN host here if STORAGE_DRIVER=s3, e.g.:
      // { protocol: "https", hostname: "your-bucket.s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
