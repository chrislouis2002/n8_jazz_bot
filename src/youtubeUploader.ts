import { google } from "googleapis";
import * as fs from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";


export interface YouTubeUploadResult {
    videoId: string;
    videoUrl: string;
    privacyStatus: string;
}


export async function uploadToYouTube(
    videoPath: string,
    title: string,
    description: string
): Promise<YouTubeUploadResult> {
    const absolutePath = path.resolve(videoPath);


    const stats = await fs.promises.stat(absolutePath);


    if (!stats.isFile() || stats.size <= 0) {
        throw new Error("YouTube upload file is empty or invalid");
    }


    const credentialsPath = path.join(
        process.cwd(),
        "credentials",
        "youtube-oauth-client.json"
    );


    const tokenPath = path.join(
        process.cwd(),
        "credentials",
        "youtube-token.json"
    );


    const clientData = JSON.parse(
        await fs.promises.readFile(credentialsPath, "utf8")
    ).installed;


    const token = JSON.parse(
        await fs.promises.readFile(tokenPath, "utf8")
    );


    const auth = new google.auth.OAuth2(
        clientData.client_id,
        clientData.client_secret
    );


    auth.setCredentials(token);


    const youtube = google.youtube({
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
            body: fs.createReadStream(absolutePath) as Readable
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
