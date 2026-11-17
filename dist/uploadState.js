"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadMode = getUploadMode;
exports.setUploadMode = setUploadMode;
exports.savePendingHighlight = savePendingHighlight;
exports.getPendingHighlight = getPendingHighlight;
exports.removePendingHighlight = removePendingHighlight;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const statePath = path.join(process.cwd(), ".local", "upload-state.json");
let state;
let saveQueue = Promise.resolve();
async function loadState() {
    if (state)
        return state;
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    try {
        const content = await fs.readFile(statePath, "utf8");
        const parsed = JSON.parse(content);
        state = {
            modes: parsed.modes ?? {},
            pendingHighlights: parsed.pendingHighlights ?? {},
        };
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        state = {
            modes: {},
            pendingHighlights: {},
        };
    }
    return state;
}
async function saveState() {
    const current = await loadState();
    saveQueue = saveQueue.then(async () => {
        const temporaryPath = `${statePath}.tmp`;
        await fs.writeFile(temporaryPath, JSON.stringify(current, null, 2), { mode: 0o600 });
        await fs.rename(temporaryPath, statePath);
    });
    return saveQueue;
}
async function getUploadMode(chatId) {
    const current = await loadState();
    return current.modes[String(chatId)] ?? "approval";
}
async function setUploadMode(chatId, mode) {
    const current = await loadState();
    current.modes[String(chatId)] = mode;
    await saveState();
}
async function savePendingHighlight(chatId, filePath, title, reason) {
    const current = await loadState();
    const highlight = {
        id: (0, node_crypto_1.randomUUID)(),
        chatId,
        filePath,
        title,
        reason,
    };
    current.pendingHighlights[highlight.id] = highlight;
    await saveState();
    return highlight;
}
async function getPendingHighlight(id) {
    const current = await loadState();
    return current.pendingHighlights[id];
}
async function removePendingHighlight(id) {
    const current = await loadState();
    delete current.pendingHighlights[id];
    await saveState();
}
//# sourceMappingURL=uploadState.js.map