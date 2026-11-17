import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { inspectVideo, VideoInfo } from "./videoProcessor";


const execFileAsync = promisify(execFile);


const YTDLP_PATH = path.join(
    process.cwd(),
    "tools",
    "bin",
    "yt-dlp"
);


const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000;


function isPublicAddress(address: string): boolean {
    const family = isIP(address);


    if (family === 4) {
        const parts = address.split(".").map(Number);
        if (parts.length !== 4) return false;


        const a = parts[0];
        const b = parts[1];
        const c = parts[2];


        if (a === undefined || b === undefined || c === undefined) {
            return false;
        }


        if (
            a === 0 ||
            a === 10 ||
            a === 127 ||
            a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 192 && b === 0 && c === 0) ||
            (a === 192 && b === 0 && c === 2) ||
            (a === 198 && (b === 18 || b === 19)) ||
            (a === 198 && b === 51 && c === 100) ||
            (a === 203 && b === 0 && c === 113)
        ) {
            return false;
        }


        return true;
    }


    if (family === 6) {
        const firstGroup = parseInt(
            address.split(":").filter(Boolean)[0] || "0",
            16
        );


        if (firstGroup < 0x2000 || firstGroup > 0x3fff) {
            return false;
        }


        const normalized = address.toLowerCase();


        if (
            normalized.startsWith("2001:db8:") ||
            normalized.startsWith("2001:10:") ||
            normalized.startsWith("2001:20:")
        ) {
            return false;
        }


        return true;
    }


    return false;
}


async function validateVideoUrl(value: string): Promise<URL> {
    let url: URL;


    try {
        url = new URL(value.trim());
    } catch {
        throw new Error("Invalid video URL");
    }


    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only HTTP and HTTPS links are accepted");
    }


    if (url.username || url.password) {
        throw new Error("URLs containing credentials are not accepted");
    }


    if (url.port && !["80", "443"].includes(url.port)) {
        throw new Error("Non-standard URL ports are not accepted");
    }


    const hostname = url.hostname
        .replace(/^\[|\]$/g, "")
        .toLowerCase();


    if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
    ) {
        throw new Error("Local network URLs are not accepted");
    }


    if (isIP(hostname)) {
        if (!isPublicAddress(hostname)) {
            throw new Error("Private or unsafe IP addresses are not accepted");
        }
    } else {
        let addresses;


        try {
            addresses = await lookup(hostname, {
                all: true,
                verbatim: true,
            });
        } catch {
            throw new Error("Could not resolve the video website");
        }


        if (
            addresses.length === 0 ||
            addresses.some(item => !isPublicAddress(item.address))
        ) {
            throw new Error("The video website resolves to an unsafe address");
        }
    }


    return url;
}


export async function downloadAndInspectVideo(
    videoUrl: string
): Promise<VideoInfo> {
    const url = await validateVideoUrl(videoUrl);


    const uploadsRoot = path.join(process.cwd(), "uploads");
    const downloadDir = path.join(
        uploadsRoot,
        `video-link-${randomUUID()}`
    );


    await fs.mkdir(downloadDir, { recursive: true });


    try {
        await execFileAsync(
            YTDLP_PATH,
            [
                "--proxy",
                "",
                "--no-playlist",
                "--no-part",
                "--no-progress",
                "--no-warnings",
                "--no-write-info-json",
                "--no-write-thumbnail",
                "--no-write-subs",
                "--no-write-auto-subs",
                "--socket-timeout", "30",
                "--retries", "1",
                "--fragment-retries", "1",
                "--max-filesize", "20M",
                "--format", "best[ext=mp4]/best",
                "--output", path.join(downloadDir, "source.%(ext)s"),
                url.toString(),
            ],
            {
                cwd: process.cwd(),
                timeout: DOWNLOAD_TIMEOUT_MS,
                maxBuffer: 4 * 1024 * 1024,
            }
        );


        const entries = await fs.readdir(downloadDir);


        const downloadedFiles = entries.filter(
            name =>
                name.startsWith("source.") &&
                !name.endsWith(".part")
        );


        if (downloadedFiles.length !== 1) {
            throw new Error("Could not identify one downloaded video");
        }


        const downloadedFile = downloadedFiles[0];
        if (!downloadedFile) {
            throw new Error("Downloaded video file was not found");
        }

        const filePath = path.join(downloadDir, downloadedFile);


        const stats = await fs.stat(filePath);


        if (!stats.isFile() || stats.size <= 0) {
            throw new Error("Downloaded video is empty or invalid");
        }


        if (stats.size > MAX_VIDEO_BYTES) {
            throw new Error("Downloaded video exceeds the 20 MB limit");
        }


        return await inspectVideo(filePath);


    } catch (error) {
        await fs.rm(downloadDir, {
            recursive: true,
            force: true,
        });


        const message = error instanceof Error
            ? error.message
            : String(error);


        throw new Error(`Video download failed: ${message}`);
    }
}
