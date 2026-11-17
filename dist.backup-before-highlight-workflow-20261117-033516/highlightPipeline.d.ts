export interface GeneratedHighlight {
    filePath: string;
    startSeconds: number;
    endSeconds: number;
    reason: string;
    suggestedTitle: string;
}
export declare function processVideoHighlights(inputPath: string, durationSeconds: number, outputDirectory: string): Promise<GeneratedHighlight[]>;
//# sourceMappingURL=highlightPipeline.d.ts.map