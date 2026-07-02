import "server-only";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { STORAGE_ROOT } from "@/lib/file-storage";

const execFileAsync = promisify(execFile);

// SRS.md FR-6.2: auto-generate thumbnails and display video duration.
// Uses the ffmpeg/ffprobe binaries bundled by ffmpeg-static/ffprobe-static
// (no system ffmpeg install required) — fluent-ffmpeg was deliberately
// avoided since it's an unmaintained wrapper; shelling out directly with
// execFile keeps this to two small, auditable functions.

export async function extractVideoDuration(videoPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    return Number.isFinite(seconds) ? Math.round(seconds) : null;
  } catch (e) {
    console.error("[video-processing] extractVideoDuration failed:", e);
    return null; // corrupt/unsupported video — don't block the upload over it
  }
}

export async function generateVideoThumbnail(videoPath: string): Promise<string | null> {
  if (!ffmpegPath) return null;

  const thumbnailFilename = `${randomUUID()}-thumb.jpg`;
  const thumbnailFullPath = path.join(STORAGE_ROOT, thumbnailFilename);

  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      videoPath,
      "-ss",
      "00:00:01",
      "-frames:v",
      "1",
      "-vf",
      "scale=320:-1",
      thumbnailFullPath,
    ]);
    return thumbnailFilename;
  } catch (e) {
    console.error("[video-processing] generateVideoThumbnail failed:", e);
    return null;
  }
}
