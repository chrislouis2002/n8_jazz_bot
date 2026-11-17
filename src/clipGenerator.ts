import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";


const execFileAsync = promisify(execFile);


const FFMPEG_PATH = path.join(
    process.cwd(),
    "tools",
    "ffmpeg",
    "ffmpeg"
);


export async function generateTestClip(
    inputPath: string,
    outputPath: string
): Promise<string> {
    const input = path.resolve(inputPath);
    const output = path.resolve(outputPath);


    const inputStats = await fs.stat(input);


    if (!inputStats.isFile() || inputStats.size <= 0) {
        throw new Error("Input video is empty or invalid");
    }


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
                "-t", "30",
                "-map", "0:v:0",
                "-map", "0:a?",
                "-c", "copy",
                "-movflags", "+faststart",
                output,
            ],
            {
                timeout: 120000,
                maxBuffer: 2 * 1024 * 1024,
            }
        );


        const outputStats = await fs.stat(output);


        if (!outputStats.isFile() || outputStats.size <= 0) {
            throw new Error("Generated clip is empty or invalid");
        }


        return output;
    } catch (error) {
        await fs.rm(output, { force: true }).catch(() => undefined);
        throw error;
    }
}


export async function generateHighlightClip(
    inputPath: string,
    startSeconds: number,
    endSeconds: number,
    outputPath: string
): Promise<string> {
    const input = path.resolve(inputPath);
    const output = path.resolve(outputPath);


    if (
        !Number.isFinite(startSeconds) ||
        !Number.isFinite(endSeconds) ||
        startSeconds < 0 ||
        endSeconds <= startSeconds
    ) {
        throw new Error("Invalid highlight timestamps");
    }


    const inputStats = await fs.stat(input);


    if (!inputStats.isFile() || inputStats.size <= 0) {
        throw new Error("Input video is empty or invalid");
    }


    if (input === output) {
        throw new Error("Input and output paths must be different");
    }


    if (path.extname(output).toLowerCase() !== ".mp4") {
        throw new Error("Output file must use the MP4 extension");
    }


    await fs.mkdir(path.dirname(output), { recursive: true });


    const duration = endSeconds - startSeconds;


    try {
        await execFileAsync(
            FFMPEG_PATH,
            [
                "-hide_banner",
                "-loglevel", "error",
                "-n",
                "-ss", String(startSeconds),
                "-i", input,
                "-t", String(duration),
                "-map", "0:v:0",
                "-map", "0:a?",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output,
            ],
            {
                timeout: 300000,
                maxBuffer: 2 * 1024 * 1024,
            }
        );


        const outputStats = await fs.stat(output);


        if (!outputStats.isFile() || outputStats.size <= 0) {
            throw new Error("Generated highlight is empty or invalid");
        }


        return output;
    } catch (error) {
        await fs.rm(output, { force: true }).catch(() => undefined);
        throw error;
    }
}
