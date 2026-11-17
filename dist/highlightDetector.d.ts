export interface VideoHighlight {
    start_seconds: number;
    end_seconds: number;
    reason: string;
    suggested_title: string;
}
export declare function detectHighlights(inputPath: string, durationSeconds: number): Promise<VideoHighlight[]>;
//# sourceMappingURL=highlightDetector.d.ts.map