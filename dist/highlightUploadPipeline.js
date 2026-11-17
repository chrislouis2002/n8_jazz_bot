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
exports.prepareHighlights = prepareHighlights;
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const highlightPipeline_1 = require("./highlightPipeline");
const videoFormatter_1 = require("./videoFormatter");
async function prepareHighlights(inputPath, durationSeconds) {
    const input = path.resolve(inputPath);
    const baseDirectory = path.dirname(input);
    const runDirectory = path.join(baseDirectory, "ai-processing", (0, node_crypto_1.randomUUID)());
    const highlightsDirectory = path.join(runDirectory, "ai-highlights");
    const shortsDirectory = path.join(runDirectory, "youtube-shorts");
    console.log("Starting AI highlight detection...");
    const highlights = await (0, highlightPipeline_1.processVideoHighlights)(input, durationSeconds, highlightsDirectory);
    if (highlights.length === 0) {
        console.log("No worthwhile highlights were detected.");
        return [];
    }
    const prepared = [];
    for (let i = 0; i < highlights.length; i++) {
        const highlight = highlights[i];
        console.log(`Formatting highlight ${i + 1} of ${highlights.length}...`);
        const formattedPath = path.join(shortsDirectory, `short-${String(i + 1).padStart(2, "0")}.mp4`);
        const formatted = await (0, videoFormatter_1.formatForYouTubeShorts)(highlight.filePath, formattedPath);
        prepared.push({
            title: highlight.suggestedTitle,
            reason: highlight.reason,
            filePath: formatted.filePath,
        });
        console.log("Highlight prepared:", formatted.filePath);
    }
    return prepared;
}
//# sourceMappingURL=highlightUploadPipeline.js.map