export interface PreparedHighlight {
    title: string;
    reason: string;
    filePath: string;
}
export declare function prepareHighlights(inputPath: string, durationSeconds: number): Promise<PreparedHighlight[]>;
//# sourceMappingURL=highlightUploadPipeline.d.ts.map