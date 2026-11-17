export type VideoOrientation = "vertical" | "horizontal" | "square";
export interface VideoInfo {
    filePath: string;
    width: number;
    height: number;
    orientation: VideoOrientation;
    durationSeconds: number;
    frameRate: number;
    videoCodec: string;
    fileSizeBytes: number;
}
export declare function inspectVideo(filePath: string): Promise<VideoInfo>;
//# sourceMappingURL=videoProcessor.d.ts.map