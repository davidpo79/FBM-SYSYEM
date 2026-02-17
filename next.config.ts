import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rcbzgononcspqtthhvfy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Bundle FFmpeg binary for video composition
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],
};

export default nextConfig;
