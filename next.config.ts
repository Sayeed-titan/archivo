import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static/ffprobe-static resolve their bundled binary paths via
  // __dirname at require-time; letting Next.js bundle them into the
  // server chunk rewrites that to a virtual \ROOT\ path that doesn't
  // exist on disk, breaking video thumbnail/duration extraction
  // (src/lib/video-processing.ts). Keeping them external preserves their
  // real node_modules path.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
