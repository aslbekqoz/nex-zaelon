// Bir marta ishlatiladi: YouTube kanalingizga yuklash ruxsatini olib,
// refresh token'ni .env fayliga yozib qo'yadi.  Ishga tushirish:  npm run auth
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { google } from 'googleapis';
import { config, ROOT } from '../config.js';

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;

if (!config.ytClientId || !config.ytClientSecret) {
  console.error('❌ Avval .env ga YOUTUBE_CLIENT_ID va YOUTUBE_CLIENT_SECRET ni yozing.');
  process.exit(1);
}

const oauth = new google.auth.OAuth2(config.ytClientId, config.ytClientSecret, REDIRECT);
const url = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload', // video yuklash
    'https://www.googleapis.com/auth/youtube.readonly', // kanal ma'lumotlarini o'qish
    'https://www.googleapis.com/auth/yt-analytics.readonly', // statistika (Tahlilchi agent)
  ],
});

console.log('\n👉 Shu havolani brauzerda oching va kanalingiz bilan kiring:\n');
console.log(url, '\n');
console.log(`(Javob kutilyapti: ${REDIRECT})`);

http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) return res.end('Kod topilmadi');
  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) throw new Error('refresh_token kelmadi. Google akkauntingizda ilovaga berilgan ruxsatni olib tashlab, qayta urinib ko\'ring.');
    const envPath = path.join(ROOT, '.env');
    let env = fs.readFileSync(envPath, 'utf8');
    env = /^YOUTUBE_REFRESH_TOKEN=.*$/m.test(env)
      ? env.replace(/^YOUTUBE_REFRESH_TOKEN=.*$/m, `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`)
      : env + `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    fs.writeFileSync(envPath, env);
    res.end('Tayyor! Bu oynani yopishingiz mumkin.');
    console.log('\n✅ Refresh token .env fayliga yozildi. Endi YouTube agenti ishlaydi.');
  } catch (err) {
    res.end('Xato: ' + err.message);
    console.error('❌', err.message);
  }
  process.exit(0);
}).listen(PORT, '127.0.0.1');
