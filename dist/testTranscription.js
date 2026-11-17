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
    const audioPath = path.resolve("uploads/test-audio.mp3");
    if (!fs.existsSync(audioPath)) {
        throw new Error("Test audio file not found");
    }
    console.log("Uploading audio to Gemini...");
    const audioFile = await ai.files.upload({
        file: audioPath,
        config: {
            mimeType: "audio/mpeg",
        },
    });
    console.log("Audio uploaded. Starting transcription...");
    if (!audioFile.uri || !audioFile.mimeType) {
        throw new Error("Gemini upload did not return a valid audio URI and MIME type");
    }
    const result = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        fileData: {
                            fileUri: audioFile.uri,
                            mimeType: audioFile.mimeType,
                        },
                    },
                    {
                        text: "Transcribe all spoken words in this audio accurately. Preserve the original wording.",
                    },
                ],
            },
        ],
    });
    console.log("\\nTRANSCRIPT:\\n");
    console.log(result.text);
    console.log("\\nTRANSCRIPTION COMPLETED.");
}
main().catch((error) => {
    console.error("Transcription failed:", error.message);
    process.exitCode = 1;
});
//# sourceMappingURL=testTranscription.js.map