// Nex Zaelon kanalini ulash (bir marta):  npm run nex:auth
// Brauzerda Nex Zaelon kanali bor Google akkauntni tanlang. Token .env ga NEX_YOUTUBE_REFRESH_TOKEN bo'lib yoziladi.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { google } from 'googleapis';
import { config, ROOT } from '../config.js';

const PORT = 53683;
const REDIRECT = `http://127.0.0.1:${PORT}`;
if (!config.ytClientId || !config.ytClientSecret) {
  console.error('❌ .env da YOUTUBE_CLIENT_ID va YOUTUBE_CLIENT_SECRET yo\'q.');
  process.exit(1);
}
const oauth = new google.auth.OAuth2(config.ytClientId, config.ytClientSecret, REDIRECT);
const url = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'select_account consent', // har safar akkaunt tanlash oynasi chiqsin (Did You Know Lab emas!)
  scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
});
console.log('\n👉 Havolani brauzerda oching va NEX ZAELON kanali bor akkauntni tanlang:\n');
console.log(url, '\n');

http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) return res.end('Kod topilmadi');
  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) throw new Error('refresh_token kelmadi — qayta urinib ko\'ring');
    oauth.setCredentials(tokens);
    const ch = await google.youtube({ version: 'v3', auth: oauth }).channels.list({ part: ['snippet'], mine: true });
    const name = ch.data.items?.[0]?.snippet?.title || '(kanal topilmadi)';
    const envPath = path.join(ROOT, '.env');
    let env = fs.readFileSync(envPath, 'utf8');
    env = /^NEX_YOUTUBE_REFRESH_TOKEN=.*$/m.test(env)
      ? env.replace(/^NEX_YOUTUBE_REFRESH_TOKEN=.*$/m, `NEX_YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`)
      : env.replace(/\n*$/, '\n') + `NEX_YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    fs.writeFileSync(envPath, env);
    res.end(`Tayyor! Ulangan kanal: ${name}. Bu oynani yopishingiz mumkin.`);
    console.log(`\n✅ Ulangan kanal: "${name}" — token .env ga yozildi.`);
    if (/did you know/i.test(name)) console.log('⚠️  Bu Did You Know Lab! Nex Zaelon emas. "npm run nex:auth" ni qayta bajaring va boshqa akkauntni tanlang.');
  } catch (err) {
    res.end('Xato: ' + err.message);
    console.error('❌', err.message);
  }
  process.exit(0);
}).listen(PORT, '127.0.0.1');
