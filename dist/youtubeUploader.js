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
exports.uploadToYouTube = uploadToYouTube;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
async function uploadToYouTube(videoPath, title, description) {
    const absolutePath = path.resolve(videoPath);
    const stats = await fs.promises.stat(absolutePath);
    if (!stats.isFile() || stats.size <= 0) {
        throw new Error("YouTube upload file is empty or invalid");
    }
    const credentialsPath = path.join(process.cwd(), "credentials", "youtube-oauth-client.json");
    const tokenPath = path.join(process.cwd(), "credentials", "youtube-token.json");
    const clientData = JSON.parse(await fs.promises.readFile(credentialsPath, "utf8")).installed;
    const token = JSON.parse(await fs.promises.readFile(tokenPath, "utf8"));
    const auth = new googleapis_1.google.auth.OAuth2(clientData.client_id, clientData.client_secret);
    auth.setCredentials(token);
    const youtube = googleapis_1.google.youtube({
        version: "v3",
        auth
    });
    const response = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title: title.slice(0, 100),
                description,
                categoryId: "22"
            },
            status: {
                privacyStatus: "private",
                selfDeclaredMadeForKids: false
            }
        },
        media: {
            body: fs.createReadStream(absolutePath)
        }
    });
    const videoId = response.data.id;
    if (!videoId) {
        throw new Error("YouTube did not return a video ID");
    }
    return {
        videoId,
        videoUrl: `https://youtu.be/${videoId}`,
        privacyStatus: response.data.status?.privacyStatus ?? "unknown"
    };
}
//# sourceMappingURL=youtubeUploader.js.map