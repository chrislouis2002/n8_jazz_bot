import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";


const execFileAsync = promisify(execFile);


const FFPROBE_PATH = path.join(
    process.cwd(),
    "tools",
    "ffmpeg",
    "ffprobe"
);


export type VideoOrientation =
    | "vertical"
    | "horizontal"
    | "square";


export interface VideoInfo {
    filePath: string;
    width: number;
    height: number;
    orientation: VideoOrientation;
    durationSeconds: number;
    frameRate: number;
    videoCodec: string;
    fileSizeBytes: number;
}


interface FFprobeOutput {
    streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
    }>;
    format?: {
        duration?: string;
    };
}


export async function inspectVideo(
    filePath: string
): Promise<VideoInfo> {
    const absolutePath = path.resolve(filePath);


    const stats = await fs.stat(absolutePath);


    if (!stats.isFile() || stats.size <= 0) {
        throw new Error("Video file is empty or invalid");
    }


    const { stdout } = await execFileAsync(
        FFPROBE_PATH,
        [
            "-v", "error",
            "-show_streams",
            "-show_format",
            "-of", "json",
            absolutePath,
        ],
        {
            timeout: 30000,
            maxBuffer: 2 * 1024 * 1024,
        }
    );


    const metadata = JSON.parse(stdout) as FFprobeOutput;


    const videoStream = metadata.streams?.find(
        (stream) => stream.codec_type === "video"
    );


    if (
        !videoStream ||
        !videoStream.width ||
        !videoStream.height
    ) {
        throw new Error("Could not detect video dimensions");
    }


    const width = videoStream.width;
    const height = videoStream.height;


    let orientation: VideoOrientation;


    if (height > width) {
        orientation = "vertical";
    } else if (width > height) {
        orientation = "horizontal";
    } else {
        orientation = "square";
    }


    const frameRateParts = (
        videoStream.r_frame_rate || "0/1"
    ).split("/");


    const numerator = Number(frameRateParts[0]);
    const denominator = Number(frameRateParts[1]);


    const frameRate =
        denominator > 0 ? numerator / denominator : 0;


    const durationSeconds = Number(
        metadata.format?.duration
    );


    if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
    ) {
        throw new Error("Could not detect video duration");
    }


    return {
        filePath: absolutePath,
        width,
        height,
        orientation,
        durationSeconds,
        frameRate,
        videoCodec: videoStream.codec_name || "unknown",
        fileSizeBytes: stats.size,
    };
}
