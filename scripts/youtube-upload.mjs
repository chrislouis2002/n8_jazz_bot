import { google } from "googleapis";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";


const videoPath = "outputs/short-001-original-quality.mp4";


const client = JSON.parse(
  await readFile("credentials/youtube-oauth-client.json", "utf8")
).installed;


const token = JSON.parse(
  await readFile("credentials/youtube-token.json", "utf8")
);


const auth = new google.auth.OAuth2(
  client.client_id,
  client.client_secret
);


auth.setCredentials(token);


const youtube = google.youtube({
  version: "v3",
  auth
});


const fileSize = (await stat(videoPath)).size;


console.log("Starting private YouTube upload...");
console.log("File size:", (fileSize / 1024 / 1024).toFixed(2), "MB");


const response = await youtube.videos.insert({
  part: ["snippet", "status"],
  requestBody: {
    snippet: {
      title: "N8 Video Automation - Private Upload Test",
      description: "Private test upload from my video automation system.",
      categoryId: "22"
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false
    }
  },
  media: {
    body: createReadStream(videoPath)
  }
});


console.log("\nUpload successful!");
console.log("Video ID:", response.data.id);
console.log("Privacy:", response.data.status?.privacyStatus);
console.log("Video URL:", `https://youtu.be/${response.data.id}`);
