export interface YouTubeUploadResult {
    videoId: string;
    videoUrl: string;
    privacyStatus: string;
}
export declare function uploadToYouTube(videoPath: string, title: string, description: string): Promise<YouTubeUploadResult>;
//# sourceMappingURL=youtubeUploader.d.ts.map