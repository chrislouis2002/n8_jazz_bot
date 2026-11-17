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
exports.inspectVideo = inspectVideo;
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const FFPROBE_PATH = path.join(process.cwd(), "tools", "ffmpeg", "ffprobe");
async function inspectVideo(filePath) {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile() || stats.size <= 0) {
        throw new Error("Video file is empty or invalid");
    }
    const { stdout } = await execFileAsync(FFPROBE_PATH, [
        "-v", "error",
        "-show_streams",
        "-show_format",
        "-of", "json",
        absolutePath,
    ], {
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
    });
    const metadata = JSON.parse(stdout);
    const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video");
    if (!videoStream ||
        !videoStream.width ||
        !videoStream.height) {
        throw new Error("Could not detect video dimensions");
    }
    const width = videoStream.width;
    const height = videoStream.height;
    let orientation;
    if (height > width) {
        orientation = "vertical";
    }
    else if (width > height) {
        orientation = "horizontal";
    }
    else {
        orientation = "square";
    }
    const frameRateParts = (videoStream.r_frame_rate || "0/1").split("/");
    const numerator = Number(frameRateParts[0]);
    const denominator = Number(frameRateParts[1]);
    const frameRate = denominator > 0 ? numerator / denominator : 0;
    const durationSeconds = Number(metadata.format?.duration);
    if (!Number.isFinite(durationSeconds) ||
        durationSeconds <= 0) {
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
//# sourceMappingURL=videoProcessor.js.map