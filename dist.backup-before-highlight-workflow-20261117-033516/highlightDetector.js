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
exports.detectHighlights = detectHighlights;
const genai_1 = require("@google/genai");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
async function detectHighlights(inputPath, durationSeconds) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from .env");
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new Error("Video duration is invalid");
    }
    const videoPath = path.resolve(inputPath);
    if (!fs.existsSync(videoPath)) {
        throw new Error("Video file not found");
    }
    const ai = new genai_1.GoogleGenAI({ apiKey });
    console.log("Uploading video to Gemini...");
    const videoFile = await ai.files.upload({
        file: videoPath,
        config: { mimeType: "video/mp4" },
    });
    if (!videoFile.uri || !videoFile.mimeType) {
        throw new Error("Gemini upload returned an invalid file reference");
    }
    console.log("Finding the best highlights...");
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
- Only describe events clearly visible or audible in the video.
- Never invent people, actions, conversations, reactions, prizes, money, or outcomes.
- Never assume what is inside a box or package unless it is clearly shown.
- Do not turn a question, promise, joke, or claim into a confirmed event.
- Every reason must describe observable evidence.
- Select only interesting moments that make sense as standalone clips.
- Give each clip a clear beginning and ending.
- Avoid overlapping clips.
- Decide the number of clips based on quality, not a forced target.
- Return an empty clips array if there are no worthwhile moments.


Return ONLY valid JSON in this format:


{
  "clips": [
    {
      "start_seconds": 0,
      "end_seconds": 30,
      "reason": "What is clearly visible or audible",
      "suggested_title": "A short accurate title"
    }
  ]
}


Timestamps must be seconds from the beginning of the original video.
The video duration is ${durationSeconds} seconds.
Never invent events or timestamps.`
                    },
                ],
            },
        ],
    });
    const responseText = result.text?.trim();
    if (!responseText) {
        throw new Error("Gemini returned an empty highlight response");
    }
    const jsonText = responseText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    }
    catch {
        throw new Error("Gemini returned invalid JSON");
    }
    if (typeof parsed !== "object" ||
        parsed === null ||
        !("clips" in parsed) ||
        !Array.isArray(parsed.clips)) {
        throw new Error("Gemini response does not contain a valid clips array");
    }
    const clips = parsed.clips.map((clip, index) => {
        if (typeof clip !== "object" || clip === null) {
            throw new Error(`Highlight ${index + 1} is invalid`);
        }
        const item = clip;
        const start = item.start_seconds;
        const end = item.end_seconds;
        if (typeof start !== "number" ||
            typeof end !== "number" ||
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            start < 0 ||
            end <= start ||
            end > durationSeconds) {
            throw new Error(`Highlight ${index + 1} has invalid timestamps`);
        }
        if (typeof item.reason !== "string" ||
            !item.reason.trim() ||
            typeof item.suggested_title !== "string" ||
            !item.suggested_title.trim()) {
            throw new Error(`Highlight ${index + 1} is missing its description or title`);
        }
        return {
            start_seconds: start,
            end_seconds: end,
            reason: item.reason.trim(),
            suggested_title: item.suggested_title.trim(),
        };
    });
    clips.sort((a, b) => a.start_seconds - b.start_seconds);
    for (let i = 1; i < clips.length; i++) {
        const current = clips[i];
        const previous = clips[i - 1];
        if (current.start_seconds < previous.end_seconds) {
            throw new Error("Gemini returned overlapping highlights");
        }
    }
    console.log(`Validated ${clips.length} highlight(s).`);
    return clips;
}
//# sourceMappingURL=highlightDetector.js.map