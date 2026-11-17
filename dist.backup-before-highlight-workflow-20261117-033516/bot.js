"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const bot = new node_telegram_bot_api_1.default(process.env.BOT_TOKEN);
const webhookUrl = "https://swift-ocean-75b46bbe.tunnl.gg/webhook";
// Register the Telegram webhook
async function init() {
    try {
        const info = await bot.getWebhookInfo();
        if (info.url !== webhookUrl) {
            await bot.setWebhook(webhookUrl);
            console.log("Telegram webhook registered successfully!");
        }
        else {
            console.log("Telegram webhook already registered!");
        }
    }
    catch (error) {
        console.error("Webhook registration failed:", error);
    }
}
void init();
// Handle Telegram commands.
// Ordinary messages are forwarded to n8n by src/index.ts.
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const message = msg.text?.trim().toLowerCase();
    console.log("Incoming Telegram message:", message || "Non-text message");
    try {
        switch (message) {
            case "/start":
                await bot.sendMessage(chatId, `Hi ${msg.from?.username || msg.from?.first_name || "there"}! Send me a video link and I'll pass it to the automation workflow. Type /help for instructions.`);
                break;
            case "/help":
                await bot.sendMessage(chatId, "Send me a video link as a message. The automation workflow will receive it for processing.");
                break;
            default:
                // n8n will handle ordinary messages and video links.
                break;
        }
    }
    catch (error) {
        console.error("Message handling failed:", error);
    }
});
exports.default = bot;
//# sourceMappingURL=bot.js.map