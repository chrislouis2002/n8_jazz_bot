import * as fs from "node:fs/promises";
import * as path from "node:path";
import { detectHighlights } from "./highlightDetector";
import { generateHighlightClip } from "./clipGenerator";


export interface GeneratedHighlight {
    filePath: string;
    startSeconds: number;
    endSeconds: number;
    reason: string;
    suggestedTitle: string;
}


export async function processVideoHighlights(
    inputPath: string,
    durationSeconds: number,
    outputDirectory: string
): Promise<GeneratedHighlight[]> {
    const input = path.resolve(inputPath);
    const outputDir = path.resolve(outputDirectory);


    const inputStats = await fs.stat(input);


    if (!inputStats.isFile() || inputStats.size <= 0) {
        throw new Error("Input video is empty or invalid");
    }


    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new Error("Invalid video duration");
    }


    await fs.mkdir(outputDir, { recursive: true });


    const highlights = await detectHighlights(input, durationSeconds);
    const generated: GeneratedHighlight[] = [];


    for (let i = 0; i < highlights.length; i++) {
        const highlight = highlights[i]!;
        const filename = `highlight-${String(i + 1).padStart(2, "0")}.mp4`;
        const outputPath = path.join(outputDir, filename);


        try {
            await fs.access(outputPath);
            throw new Error(`Output file already exists: ${outputPath}`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw error;
            }
        }


        const filePath = await generateHighlightClip(
            input,
            highlight.start_seconds,
            highlight.end_seconds,
            outputPath
        );


        generated.push({
            filePath,
            startSeconds: highlight.start_seconds,
            endSeconds: highlight.end_seconds,
            reason: highlight.reason,
            suggestedTitle: highlight.suggested_title,
        });
    }


    return generated;
}
