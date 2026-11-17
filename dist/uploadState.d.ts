export type UploadMode = "automatic" | "approval";
export interface PendingHighlight {
    id: string;
    chatId: number;
    filePath: string;
    title: string;
    reason: string;
}
export declare function getUploadMode(chatId: number): Promise<UploadMode>;
export declare function setUploadMode(chatId: number, mode: UploadMode): Promise<void>;
export declare function savePendingHighlight(chatId: number, filePath: string, title: string, reason: string): Promise<PendingHighlight>;
export declare function getPendingHighlight(id: string): Promise<PendingHighlight | undefined>;
export declare function removePendingHighlight(id: string): Promise<void>;
//# sourceMappingURL=uploadState.d.ts.map