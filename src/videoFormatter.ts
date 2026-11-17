import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { inspectVideo } from "./videoProcessor";


const execFileAsync = promisify(execFile);


const FFMPEG_PATH = path.join(
    process.cwd(),
    "tools",
    "ffmpeg",
    "ffmpeg"
);


export interface FormattedVideo {
    filePath: string;
    width: number;
    height: number;
    orientation: string;
    durationSeconds: number;
    fileSizeBytes: number;
}


export async function formatForYouTubeShorts(
    inputPath: string,
    outputPath: string
): Promise<FormattedVideo> {
    const input = path.resolve(inputPath);
    const output = path.resolve(outputPath);


    const videoInfo = await inspectVideo(input);


    if (input === output) {
        throw new Error("Input and output paths must be different");
    }


    if (path.extname(output).toLowerCase() !== ".mp4") {
        throw new Error("Output file must use the MP4 extension");
    }


    await fs.mkdir(path.dirname(output), { recursive: true });


    try {
        await execFileAsync(
            FFMPEG_PATH,
            [
                "-hide_banner",
                "-loglevel", "error",
                "-n",
                "-i", input,
                "-map", "0:v:0",
                "-map", "0:a?",
                "-vf",
                "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output,
            ],
            {
                timeout: 600000,
                maxBuffer: 2 * 1024 * 1024,
            }
        );


        const outputStats = await fs.stat(output);


        if (!outputStats.isFile() || outputStats.size <= 0) {
            throw new Error("Formatted video is empty or invalid");
        }


        return {
            filePath: output,
            width: 1080,
            height: 1920,
            orientation: videoInfo.orientation,
            durationSeconds: videoInfo.durationSeconds,
            fileSizeBytes: outputStats.size,
        };
    } catch (error) {
        await fs.rm(output, { force: true }).catch(() => undefined);
        throw error;
    }
}
