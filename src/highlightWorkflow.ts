import bot from "./bot";
import { prepareHighlights } from "./highlightUploadPipeline";
import { uploadToYouTube } from "./youtubeUploader";
import { getUploadMode, savePendingHighlight } from "./uploadState";


export async function processHighlightsForChat(
    inputPath: string,
    durationSeconds: number,
    chatId: number
): Promise<{ mode: string; count: number }> {
    const mode = await getUploadMode(chatId);


    await bot.sendMessage(
        chatId,
        "🤖 AI is analysing your video and preparing the best highlights..."
    );


    const highlights = await prepareHighlights(
        inputPath,
        durationSeconds
    );


    if (highlights.length === 0) {
        await bot.sendMessage(
            chatId,
            "No worthwhile highlights were found in this video."
        );


        return { mode, count: 0 };
    }


    if (mode === "automatic") {
        await bot.sendMessage(
            chatId,
            `⚡ Automatic mode: uploading ${highlights.length} highlight(s) privately to YouTube.`
        );


        let uploadedCount = 0;


        for (const highlight of highlights) {
            const result = await uploadToYouTube(
                highlight.filePath,
                highlight.title,
                `AI-selected video highlight.\n\n${highlight.reason}`
            );


            uploadedCount++;


            await bot.sendMessage(
                chatId,
                `✅ Upload ${uploadedCount} of ${highlights.length} completed!\n\nTitle: ${highlight.title}\nYouTube: ${result.videoUrl}\nPrivacy: ${result.privacyStatus}`
            );
        }


        return { mode, count: uploadedCount };
    }


    await bot.sendMessage(
        chatId,
        `✋ Approval mode: ${highlights.length} highlight(s) are ready. Review each clip below.`
    );


    for (const highlight of highlights) {
        const pending = await savePendingHighlight(
            chatId,
            highlight.filePath,
            highlight.title,
            highlight.reason
        );


        await bot.sendVideo(
            chatId,
            highlight.filePath,
            {
                caption:
                    `🎬 ${highlight.title}\n\n` +
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
            }
        );
    }


    return { mode, count: highlights.length };
}
