import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone server (only the files and
  // node_modules actually needed at runtime) so the Docker production image
  // stays small and doesn't ship the full dependency tree. See Dockerfile.
  output: "standalone",
  // ffmpeg-static/ffprobe-static resolve their bundled binary paths via
  // __dirname at require-time; letting Next.js bundle them into the
  // server chunk rewrites that to a virtual \ROOT\ path that doesn't
  // exist on disk, breaking video thumbnail/duration extraction
  // (src/lib/video-processing.ts). Keeping them external preserves their
  // real node_modules path.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  experimental: {
    // Default Server Action body limit is 1MB — too small for video/large
    // file uploads (uploadToFolder/uploadToInbox in src/app/actions/files.ts
    // submit files as multipart FormData through a Server Action). Without
    // this, uploads over ~1MB fail client-side with a generic
    // "Failed to fetch" before the action code ever runs.
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
