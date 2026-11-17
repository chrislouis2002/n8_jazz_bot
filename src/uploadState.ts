import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";


export type UploadMode = "automatic" | "approval";


export interface PendingHighlight {
    id: string;
    chatId: number;
    filePath: string;
    title: string;
    reason: string;
}


interface StoredState {
    modes: Record<string, UploadMode>;
    pendingHighlights: Record<string, PendingHighlight>;
}


const statePath = path.join(
    process.cwd(),
    ".local",
    "upload-state.json"
);


let state: StoredState | undefined;
let saveQueue: Promise<void> = Promise.resolve();


async function loadState(): Promise<StoredState> {
    if (state) return state;


    await fs.mkdir(path.dirname(statePath), { recursive: true });


    try {
        const content = await fs.readFile(statePath, "utf8");
        const parsed = JSON.parse(content);


        state = {
            modes: parsed.modes ?? {},
            pendingHighlights: parsed.pendingHighlights ?? {},
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }


        state = {
            modes: {},
            pendingHighlights: {},
        };
    }


    return state;
}


async function saveState(): Promise<void> {
    const current = await loadState();


    saveQueue = saveQueue.then(async () => {
        const temporaryPath = `${statePath}.tmp`;


        await fs.writeFile(
            temporaryPath,
            JSON.stringify(current, null, 2),
            { mode: 0o600 }
        );


        await fs.rename(temporaryPath, statePath);
    });


    return saveQueue;
}


export async function getUploadMode(
    chatId: number
): Promise<UploadMode> {
    const current = await loadState();


    return current.modes[String(chatId)] ?? "approval";
}


export async function setUploadMode(
    chatId: number,
    mode: UploadMode
): Promise<void> {
    const current = await loadState();


    current.modes[String(chatId)] = mode;


    await saveState();
}


export async function savePendingHighlight(
    chatId: number,
    filePath: string,
    title: string,
    reason: string
): Promise<PendingHighlight> {
    const current = await loadState();


    const highlight: PendingHighlight = {
        id: randomUUID(),
        chatId,
        filePath,
        title,
        reason,
    };


    current.pendingHighlights[highlight.id] = highlight;


    await saveState();


    return highlight;
}


export async function getPendingHighlight(
    id: string
): Promise<PendingHighlight | undefined> {
    const current = await loadState();


    return current.pendingHighlights[id];
}


export async function removePendingHighlight(
    id: string
): Promise<void> {
    const current = await loadState();


    delete current.pendingHighlights[id];


    await saveState();
}
