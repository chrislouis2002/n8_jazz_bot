"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestClip = generateTestClip;
exports.generateHighlightClip = generateHighlightClip;
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const FFMPEG_PATH = path.join(process.cwd(), "tools", "ffmpeg", "ffmpeg");
async function generateTestClip(inputPath, outputPath) {
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
        await execFileAsync(FFMPEG_PATH, [
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
        ], {
            timeout: 120000,
            maxBuffer: 2 * 1024 * 1024,
        });
        const outputStats = await fs.stat(output);
        if (!outputStats.isFile() || outputStats.size <= 0) {
            throw new Error("Generated clip is empty or invalid");
        }
        return output;
    }
    catch (error) {
        await fs.rm(output, { force: true }).catch(() => undefined);
        throw error;
    }
}
async function generateHighlightClip(inputPath, startSeconds, endSeconds, outputPath) {
    const input = path.resolve(inputPath);
    const output = path.resolve(outputPath);
    if (!Number.isFinite(startSeconds) ||
        !Number.isFinite(endSeconds) ||
        startSeconds < 0 ||
        endSeconds <= startSeconds) {
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
        await execFileAsync(FFMPEG_PATH, [
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
        ], {
            timeout: 300000,
            maxBuffer: 2 * 1024 * 1024,
        });
        const outputStats = await fs.stat(output);
        if (!outputStats.isFile() || outputStats.size <= 0) {
            throw new Error("Generated highlight is empty or invalid");
        }
        return output;
    }
    catch (error) {
        await fs.rm(output, { force: true }).catch(() => undefined);
        throw error;
    }
}
//# sourceMappingURL=clipGenerator.js.map