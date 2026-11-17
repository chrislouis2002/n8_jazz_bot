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
exports.processVideoHighlights = processVideoHighlights;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const highlightDetector_1 = require("./highlightDetector");
const clipGenerator_1 = require("./clipGenerator");
async function processVideoHighlights(inputPath, durationSeconds, outputDirectory) {
    const input = path.resolve(inputPath);
    const outputDir = path.resolve(outputDirectory);
    const inputStats = await fs.stat(input);
    if (!inputStats.isFile() || inputStats.size <= 0) {
        throw new Error("Input video is empty or invalid");
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new Error("Invalid video duration");
    }
    await fs.mkdir(outputDir, { recursive: true });
    const highlights = await (0, highlightDetector_1.detectHighlights)(input, durationSeconds);
    const generated = [];
    for (let i = 0; i < highlights.length; i++) {
        const highlight = highlights[i];
        const filename = `highlight-${String(i + 1).padStart(2, "0")}.mp4`;
        const outputPath = path.join(outputDir, filename);
        try {
            await fs.access(outputPath);
            throw new Error(`Output file already exists: ${outputPath}`);
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
        const filePath = await (0, clipGenerator_1.generateHighlightClip)(input, highlight.start_seconds, highlight.end_seconds, outputPath);
        generated.push({
            filePath,
            startSeconds: highlight.start_seconds,
            endSeconds: highlight.end_seconds,
            reason: highlight.reason,
            suggestedTitle: highlight.suggested_title,
        });
    }
    return generated;
}
//# sourceMappingURL=highlightPipeline.js.map