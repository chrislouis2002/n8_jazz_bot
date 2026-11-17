"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processHighlightsForChat = processHighlightsForChat;
const bot_1 = __importDefault(require("./bot"));
const highlightUploadPipeline_1 = require("./highlightUploadPipeline");
const youtubeUploader_1 = require("./youtubeUploader");
const uploadState_1 = require("./uploadState");
async function processHighlightsForChat(inputPath, durationSeconds, chatId) {
    const mode = await (0, uploadState_1.getUploadMode)(chatId);
    await bot_1.default.sendMessage(chatId, "🤖 AI is analysing your video and preparing the best highlights...");
    const highlights = await (0, highlightUploadPipeline_1.prepareHighlights)(inputPath, durationSeconds);
    if (highlights.length === 0) {
        await bot_1.default.sendMessage(chatId, "No worthwhile highlights were found in this video.");
        return { mode, count: 0 };
    }
    if (mode === "automatic") {
        await bot_1.default.sendMessage(chatId, `⚡ Automatic mode: uploading ${highlights.length} highlight(s) privately to YouTube.`);
        let uploadedCount = 0;
        for (const highlight of highlights) {
            const result = await (0, youtubeUploader_1.uploadToYouTube)(highlight.filePath, highlight.title, `AI-selected video highlight.\n\n${highlight.reason}`);
            uploadedCount++;
            await bot_1.default.sendMessage(chatId, `✅ Upload ${uploadedCount} of ${highlights.length} completed!\n\nTitle: ${highlight.title}\nYouTube: ${result.videoUrl}\nPrivacy: ${result.privacyStatus}`);
        }
        return { mode, count: uploadedCount };
    }
    await bot_1.default.sendMessage(chatId, `✋ Approval mode: ${highlights.length} highlight(s) are ready. Review each clip below.`);
    for (const highlight of highlights) {
        const pending = await (0, uploadState_1.savePendingHighlight)(chatId, highlight.filePath, highlight.title, highlight.reason);
        await bot_1.default.sendVideo(chatId, highlight.filePath, {
            caption: `🎬 ${highlight.title}\n\n` +
                `${highlight.reason.slice(0, 500)}\n\n` +
                "Would you like to upload this clip to YouTube?",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "✅ Approve upload",
                            callback_data: `approve_highlight:${pending.id}`
                        },
                        {
                            text: "⏭ Skip",
                            callback_data: `reject_highlight:${pending.id}`
                        }
                    ]
                ]
            }
        });
    }
    return { mode, count: highlights.length };
}
//# sourceMappingURL=highlightWorkflow.js.map