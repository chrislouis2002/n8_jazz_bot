import TelegramBot from "node-telegram-bot-api";
import { getUploadMode, setUploadMode, getPendingHighlight, removePendingHighlight } from "./uploadState";
import { uploadToYouTube } from "./youtubeUploader";


const bot = new TelegramBot(process.env.BOT_TOKEN!);


const webhookUrl = "https://swift-ocean-75b46bbe.tunnl.gg/webhook";
const uploadsInProgress = new Set<string>();


async function init() {
    try {
        const info = await bot.getWebhookInfo();


        if (info.url !== webhookUrl) {
            await bot.setWebhook(webhookUrl);
            console.log("Telegram webhook registered successfully!");
        } else {
            console.log("Telegram webhook already registered!");
        }
    } catch (error) {
        console.error("Webhook registration failed:", error);
    }
}


void init();


bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const message = msg.text?.trim().toLowerCase();


    console.log("Incoming Telegram message:", message || "Non-text message");


    try {
        switch (message) {
            case "/start":
                await bot.sendMessage(
                    chatId,
                    "Welcome! Send me a video link or video file to find highlights. Use /mode to choose how YouTube uploads work."
                );
                break;


            case "/help":
                await bot.sendMessage(
                    chatId,
                    "Send me a video link or video file to find highlights.\n\nUse /mode to choose Automatic upload or Approval first."
                );
                break;


            case "/mode": {
                const currentMode = await getUploadMode(chatId);


                await bot.sendMessage(
                    chatId,
                    `Your current upload mode is: ${currentMode === "automatic" ? "Automatic upload" : "Approval first"}.\n\nChoose your preferred mode:`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: currentMode === "automatic" ? "✓ Automatic upload" : "Automatic upload",
                                        callback_data: "upload_mode:automatic"
                                    }
                                ],
                                [
                                    {
                                        text: currentMode === "approval" ? "✓ Approval first" : "Approval first",
                                        callback_data: "upload_mode:approval"
                                    }
                                ]
                            ]
                        }
                    }
                );
                break;
            }


            default:
                // n8n handles ordinary messages and video links.
                break;
        }
    } catch (error) {
        console.error("Message handling failed:", error);
    }
});


bot.on("callback_query", async (query) => {
    const data = query.data;
    const chatId = query.message?.chat.id;


    if (!data || chatId === undefined) {
        await bot.answerCallbackQuery(query.id, {
            text: "This action is no longer available."
        });
        return;
    }


    try {
        if (data === "upload_mode:automatic" || data === "upload_mode:approval") {
            const mode = data.split(":")[1] as "automatic" | "approval";


            await setUploadMode(chatId, mode);


            await bot.answerCallbackQuery(query.id, {
                text: "Your preference has been saved."
            });


            await bot.sendMessage(
                chatId,
                mode === "automatic"
                    ? "⚡ Automatic mode saved. Future highlights will upload to YouTube automatically as private videos."
                    : "✋ Approval mode saved. I'll send you the clips first and wait for your approval."
            );


            return;
        }


        if (data.startsWith("reject_highlight:")) {
            const id = data.slice("reject_highlight:".length);
            const pending = await getPendingHighlight(id);


            if (!pending || pending.chatId !== chatId) {
                await bot.answerCallbackQuery(query.id, {
                    text: "This clip is no longer awaiting approval."
                });
                return;
            }


            await removePendingHighlight(id);


            await bot.answerCallbackQuery(query.id, {
                text: "Clip skipped."
            });


            await bot.sendMessage(
                chatId,
                `⏭ Skipped: ${pending.title}`
            );


            return;
        }


        if (data.startsWith("approve_highlight:")) {
            const id = data.slice("approve_highlight:".length);


            if (uploadsInProgress.has(id)) {
                await bot.answerCallbackQuery(query.id, {
                    text: "This clip is already being uploaded."
                });
                return;
            }


            const pending = await getPendingHighlight(id);


            if (!pending || pending.chatId !== chatId) {
                await bot.answerCallbackQuery(query.id, {
                    text: "This approval has expired or is invalid."
                });
                return;
            }


            uploadsInProgress.add(id);


            await bot.answerCallbackQuery(query.id, {
                text: "Uploading your approved clip privately..."
            });


            try {
                const result = await uploadToYouTube(
                    pending.filePath,
                    pending.title,
                    `AI-selected video highlight.\n\n${pending.reason}`
                );


                await removePendingHighlight(id);


                await bot.sendMessage(
                    chatId,
                    `✅ Your approved clip has been uploaded!\n\nTitle: ${pending.title}\nYouTube: ${result.videoUrl}\nPrivacy: ${result.privacyStatus}`
                );
            } finally {
                uploadsInProgress.delete(id);
            }


            return;
        }


        await bot.answerCallbackQuery(query.id, {
            text: "Unknown action."
        });
    } catch (error) {
        console.error("Telegram button action failed:", error);


        await bot.answerCallbackQuery(query.id, {
            text: "Something went wrong. Please try again."
        }).catch(() => undefined);


        await bot.sendMessage(
            chatId,
            `❌ The action failed: ${error instanceof Error ? error.message : String(error)}`
        ).catch(() => undefined);
    }
});


export default bot;
