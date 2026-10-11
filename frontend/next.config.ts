import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from any source for receipt previews
  images: { unoptimized: true },
};

export default nextConfig;

