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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const bot_1 = __importDefault(require("./bot"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const videoProcessor_1 = require("./videoProcessor");
const clipGenerator_1 = require("./clipGenerator");
const videoDownloader_1 = require("./videoDownloader");
const PORT = process.env.PORT || 3000;
const app = (0, express_1.default)();
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const uploadsRoot = path.join(process.cwd(), "uploads");
async function sendTelegramFeedback(chatId, message) {
    try {
        await bot_1.default.sendMessage(chatId, message);
    }
    catch (error) {
        console.error("Could not send Telegram feedback:", error);
    }
}
function getTelegramChatId(value) {
    if (typeof value === "number" && Number.isSafeInteger(value)) {
        return value;
    }
    if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
        const parsed = Number(value.trim());
        if (Number.isSafeInteger(parsed)) {
            return parsed;
        }
    }
    return undefined;
}
function formatVideoReport(videoInfo) {
    const totalSeconds = Math.floor(videoInfo.durationSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const duration = hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const format = path.extname(videoInfo.filePath)
        .replace(".", "")
        .toUpperCase() || "Unknown";
    const sizeMB = (videoInfo.fileSizeBytes / (1024 * 1024)).toFixed(2);
    return [
        "✅ Video downloaded and inspected successfully!",
        "",
        `�� Resolution: ${videoInfo.width} × ${videoInfo.height}`,
        `📱 Orientation: ${videoInfo.orientation}`,
        `⏱ Duration: ${duration}`,
        `🎞 Frame rate: ${videoInfo.frameRate.toFixed(2)} FPS`,
        `🎬 Video codec: ${videoInfo.videoCodec}`,
        `📦 Format: ${format}`,
        `💾 File size: ${sizeMB} MB`,
        "",
        "Your video is ready for the next processing stage."
    ].join("\n");
}
app.use(express_1.default.json());
// Test route
app.get("/", (req, res) => {
    res.send("Hello World!");
});
// Telegram webhook
app.post("/webhook", (req, res) => {
    const message = req.body?.message;
    const messageText = message?.text || message?.caption || "";
    const hasVideo = Boolean(message?.video);
    console.log("Telegram webhook received:", messageText || (hasVideo ? "Video upload" : "Non-text update"));
    bot_1.default.processUpdate(req.body);
    const chatId = message?.chat?.id;
    if (typeof chatId === "number" && Number.isSafeInteger(chatId)) {
        if (hasVideo) {
            void sendTelegramFeedback(chatId, "Video received! I'm downloading and inspecting your file. I'll send you the results shortly.");
        }
        else if (/https?:\/\/\S+/i.test(messageText)) {
            void sendTelegramFeedback(chatId, "Link received! I'm downloading and inspecting your video. I'll send you the results shortly.");
        }
    }
    // Acknowledge Telegram immediately
    res.sendStatus(200);
    // Forward ordinary messages and video uploads to n8n
    if ((messageText.trim() && !messageText.trim().startsWith("/")) ||
        hasVideo) {
        fetch("http://localhost:5678/webhook/telegram", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body),
        })
            .then((response) => {
            if (!response.ok) {
                console.error("n8n forwarding failed:", response.status);
            }
            else {
                console.log("Message successfully forwarded to n8n!");
            }
        })
            .catch((error) => {
            console.error("Could not reach n8n:", error);
        });
    }
});
// Protected video-link endpoint for n8n
app.post("/process-link", async (req, res) => {
    const suppliedSecret = req.headers["x-upload-secret"];
    const expectedSecret = process.env.UPLOAD_SECRET;
    if (!expectedSecret ||
        typeof suppliedSecret !== "string" ||
        suppliedSecret !== expectedSecret) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
        });
    }
    const chatId = getTelegramChatId(req.body?.chat_id);
    const videoUrl = req.body?.url;
    if (typeof videoUrl !== "string" || !videoUrl.trim()) {
        if (chatId !== undefined) {
            await sendTelegramFeedback(chatId, "❌ I couldn't process your request because the video link is missing. Please send a valid video link.");
        }
        return res.status(400).json({
            success: false,
            error: "A video URL is required",
        });
    }
    try {
        const videoInfo = await (0, videoDownloader_1.downloadAndInspectVideo)(videoUrl);
        if (chatId !== undefined) {
            await sendTelegramFeedback(chatId, formatVideoReport(videoInfo));
        }
        return res.status(200).json({
            success: true,
            message: "Video downloaded and inspected successfully.",
            videoInfo,
        });
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : String(error);
        console.error("Video link processing failed:", message);
        if (chatId !== undefined) {
            await sendTelegramFeedback(chatId, `❌ I couldn't download or inspect this video.\n\nReason: ${message.slice(0, 700)}\n\nPlease check the link and try again.`);
        }
        return res.status(500).json({
            success: false,
            error: message,
        });
    }
});
// Protected Telegram video download endpoint for n8n
app.post("/process-telegram-video", async (req, res) => {
    const suppliedSecret = req.headers["x-upload-secret"];
    const expectedSecret = process.env.UPLOAD_SECRET;
    if (!expectedSecret ||
        typeof suppliedSecret !== "string" ||
        suppliedSecret !== expectedSecret) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
        });
    }
    const fileId = req.body?.file_id;
    const chatId = getTelegramChatId(req.body?.chat_id);
    if (typeof fileId !== "string" ||
        !fileId.trim() ||
        fileId.length > 1024) {
        return res.status(400).json({
            success: false,
            error: "A valid Telegram file_id is required",
        });
    }
    let tempDir;
    try {
        // Ask Telegram for the file information
        const fileInfo = await bot_1.default.getFile(fileId);
        if (typeof fileInfo.file_size !== "number" ||
            fileInfo.file_size <= 0) {
            return res.status(400).json({
                success: false,
                error: "Telegram did not provide a valid file size",
            });
        }
        // Reject oversized videos before downloading
        if (fileInfo.file_size > MAX_VIDEO_BYTES) {
            return res.status(413).json({
                success: false,
                error: "Video exceeds the 20 MB download limit",
            });
        }
        await fs.mkdir(uploadsRoot, { recursive: true });
        // Give each video its own folder to prevent filename collisions
        tempDir = await fs.mkdtemp(path.join(uploadsRoot, "telegram-"));
        const savedPath = await bot_1.default.downloadFile(fileId, tempDir);
        const resolvedDir = path.resolve(tempDir);
        const resolvedFile = path.resolve(savedPath);
        if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
            throw new Error("Downloaded file path failed validation");
        }
        const stats = await fs.stat(resolvedFile);
        if (!stats.isFile() || stats.size <= 0) {
            throw new Error("Downloaded file is empty or invalid");
        }
        // Check the actual downloaded size too
        if (stats.size > MAX_VIDEO_BYTES) {
            await fs.rm(tempDir, { recursive: true, force: true });
            tempDir = undefined;
            return res.status(413).json({
                success: false,
                error: "Downloaded video exceeds the 20 MB limit",
            });
        }
        console.log("Telegram video downloaded:", resolvedFile);
        const videoInfo = await (0, videoProcessor_1.inspectVideo)(resolvedFile);
        console.log("Telegram video metadata:", videoInfo);
        if (chatId !== undefined) {
            await sendTelegramFeedback(chatId, formatVideoReport(videoInfo));
            const clipPath = path.join(resolvedDir, "test-clip.mp4");
            const generatedClipPath = await (0, clipGenerator_1.generateTestClip)(resolvedFile, clipPath);
            await bot_1.default.sendVideo(chatId, generatedClipPath, {
                caption: "🎬 Your first 30-second test clip is ready!",
            });
        }
        return res.status(202).json({
            success: true,
            message: "Telegram video downloaded and inspected successfully.",
            filePath: resolvedFile,
            sizeBytes: stats.size,
            videoInfo,
        });
    }
    catch (error) {
        console.error("Telegram video download failed:", error);
        if (tempDir) {
            await fs.rm(tempDir, {
                recursive: true,
                force: true,
            }).catch(() => undefined);
        }
        if (chatId !== undefined) {
            const reason = error instanceof Error ? error.message : String(error);
            await sendTelegramFeedback(chatId, `❌ I could not download or inspect your video.\n\nReason: ${reason.slice(0, 500)}\n\nPlease try again.`);
        }
        return res.status(500).json({
            success: false,
            error: "Could not download the Telegram video",
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map