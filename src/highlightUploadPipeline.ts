import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { processVideoHighlights } from "./highlightPipeline";
import { formatForYouTubeShorts } from "./videoFormatter";


export interface PreparedHighlight {
    title: string;
    reason: string;
    filePath: string;
}


export async function prepareHighlights(
    inputPath: string,
    durationSeconds: number
): Promise<PreparedHighlight[]> {
    const input = path.resolve(inputPath);
    const baseDirectory = path.dirname(input);


    const runDirectory = path.join(
        baseDirectory,
        "ai-processing",
        randomUUID()
    );


    const highlightsDirectory = path.join(
        runDirectory,
        "ai-highlights"
    );


    const shortsDirectory = path.join(
        runDirectory,
        "youtube-shorts"
    );


    console.log("Starting AI highlight detection...");


    const highlights = await processVideoHighlights(
        input,
        durationSeconds,
        highlightsDirectory
    );


    if (highlights.length === 0) {
        console.log("No worthwhile highlights were detected.");
        return [];
    }


    const prepared: PreparedHighlight[] = [];


    for (let i = 0; i < highlights.length; i++) {
        const highlight = highlights[i]!;


        console.log(
            `Formatting highlight ${i + 1} of ${highlights.length}...`
        );


        const formattedPath = path.join(
            shortsDirectory,
            `short-${String(i + 1).padStart(2, "0")}.mp4`
        );


        const formatted = await formatForYouTubeShorts(
            highlight.filePath,
            formattedPath
        );


        prepared.push({
            title: highlight.suggestedTitle,
            reason: highlight.reason,
            filePath: formatted.filePath,
        });


        console.log("Highlight prepared:", formatted.filePath);
    }


    return prepared;
}
