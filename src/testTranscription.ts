import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import * as path from "node:path";
import * as fs from "node:fs";


async function main() {
    const apiKey = process.env.GEMINI_API_KEY;


    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from .env");
    }


    const ai = new GoogleGenAI({ apiKey });


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