export interface FormattedVideo {
    filePath: string;
    width: number;
    height: number;
    orientation: string;
    durationSeconds: number;
    fileSizeBytes: number;
}
export declare function formatForYouTubeShorts(inputPath: string, outputPath: string): Promise<FormattedVideo>;
//# sourceMappingURL=videoFormatter.d.ts.map