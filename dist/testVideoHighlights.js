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
require("dotenv/config");
const genai_1 = require("@google/genai");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from .env");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey });
    const videoPath = path.resolve("uploads/telegram-oM5HaE/file_2.mp4");
    if (!fs.existsSync(videoPath)) {
        throw new Error("Test video file not found");
    }
    console.log("Uploading video to Gemini...");
    const videoFile = await ai.files.upload({
        file: videoPath,
        config: { mimeType: "video/mp4" },
    });
    if (!videoFile.uri || !videoFile.mimeType) {
        throw new Error("Gemini upload returned an invalid file reference");
    }
    console.log("Video uploaded. Finding the best highlights...");
    const result = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        fileData: {
                            fileUri: videoFile.uri,
                            mimeType: videoFile.mimeType,
                        },
                    },
                    {
                        text: `Act as a careful professional short-form video editor.


Analyse the entire video and identify genuinely worthwhile standalone highlights.


ACCURACY IS MORE IMPORTANT THAN QUANTITY:
- Only describe events that are clearly visible or audible in the video.
- Never invent people, actions, conversations, reactions, prizes, money, results, or outcomes.
- Never assume what is inside a box, package, or container unless the contents are clearly shown.
- Do not turn a question, promise, joke, or claim into a confirmed event.
- If you cannot verify that something happened, do not include it.
- Every reason must describe observable evidence from the video.
- Select only moments that are interesting and make sense as standalone clips.
- Give each clip a clear beginning and ending.
- Avoid overlapping clips.
- Decide the number of clips based on quality, not a forced target.
- If no genuinely worthwhile, verifiable moments exist, return an empty clips array.


Return ONLY valid JSON in this format:


{
  "clips": [
    {
      "start_seconds": 0,
      "end_seconds": 30,
      "reason": "Describe only what is clearly visible or audible.",
      "suggested_title": "A short accurate title"
    }
  ]
}


Timestamps must be in seconds from the beginning of the original video.
Never invent events or timestamps.`
                    },
                ],
            },
        ],
    });
    console.log("\nGEMINI HIGHLIGHT RESULTS:\n");
    console.log(result.text);
    console.log("\nHIGHLIGHT ANALYSIS COMPLETED.");
}
main().catch((error) => {
    console.error("Highlight analysis failed:", error.message);
    process.exitCode = 1;
});
//# sourceMappingURL=testVideoHighlights.js.map