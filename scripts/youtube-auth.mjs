import { google } from 'googleapis';
import { createServer } from 'node:http';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';


const credentials = JSON.parse(
  await readFile('credentials/youtube-oauth-client.json', 'utf8')
);


const config = credentials.installed;
if (!config) throw new Error('Desktop app credentials not found.');


const state = randomBytes(32).toString('hex');
let oauth;


const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');


  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end('Not found');
    return;
  }


  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('Invalid authorization state.');
    server.close();
    return;
  }


  const error = url.searchParams.get('error');
  if (error) {
    res.writeHead(400).end('Google authorization was not completed. You can close this tab.');
    console.error('Google authorization was not completed:', error);
    server.close();
    return;
  }


  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Authorization code missing.');
    server.close();
    return;
  }


  try {
    const { tokens } = await oauth.getToken(code);
    await writeFile(
      'credentials/youtube-token.json',
      JSON.stringify(tokens, null, 2),
      { mode: 0o600 }
    );
    await chmod('credentials/youtube-token.json', 0o600);


    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>YouTube authorization successful. You can close this tab.</h2>');
    console.log('YouTube authorization successful. Token saved securely.');
  } catch (err) {
    res.writeHead(500).end('Authorization failed. Check Terminal for details.');
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});


server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;


  oauth = new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    redirectUri
  );


  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    state
  });


  console.log('Opening Google authorization in your browser...');
  console.log('If it does not open, copy this URL into your browser:\n', authUrl);


  const browser = spawn('open', [authUrl], { stdio: 'ignore', detached: true });
  browser.unref();
});
