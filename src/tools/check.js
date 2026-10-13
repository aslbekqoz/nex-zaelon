// Hamma narsa to'g'ri sozlanganini tekshirish:  npm run check
import { config } from '../config.js';
import { run } from '../lib/ffmpeg.js';
import { askJson } from '../lib/gemini.js';
import { youtubeAuth } from '../agents/upload.js';

const ok = (m) => console.log(`✅ ${m}`);
const bad = (m) => console.log(`❌ ${m}`);

async function check(name, fn) {
  try { ok(`${name}: ${(await fn()) || 'ishlayapti'}`); } catch (e) { bad(`${name}: ${e.message.slice(0, 200)}`); }
}

await check('ffmpeg', async () => (await run('ffmpeg', ['-version'])).split('\n')[0]);
await check('Gemini', async () => {
  const r = await askJson({ system: 'Reply in JSON.', prompt: 'Return {"ok":true}' });
  return r.ok ? 'javob keldi' : JSON.stringify(r);
});
await check('Cloudflare', async () => {
  if (!config.cfAccountId || !config.cfToken) throw new Error('.env da kalitlar yo\'q');
  const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers: { Authorization: `Bearer ${config.cfToken}` } });
  const d = await r.json();
  if (!d.success) throw new Error(JSON.stringify(d.errors));
  return `token holati: ${d.result.status}`;
});
await check('Telegram', async () => {
  if (!config.tgToken) throw new Error('.env da TELEGRAM_BOT_TOKEN yo\'q');
  const d = await (await fetch(`https://api.telegram.org/bot${config.tgToken}/getMe`)).json();
  if (!d.ok) throw new Error(d.description);
  if (!config.tgChatId) throw new Error(`bot @${d.result.username} topildi, lekin TELEGRAM_CHAT_ID yo'q (npm run telegram-id)`);
  return `@${d.result.username}`;
});
await check('YouTube', async () => {
  await youtubeAuth().getAccessToken();
  return 'token yangilandi';
});
await check('YouTube Analytics', async () => {
  const { google } = await import('googleapis');
  const api = google.youtubeAnalytics({ version: 'v2', auth: youtubeAuth() });
  const today = new Date().toISOString().slice(0, 10);
  const r = await api.reports.query({ ids: 'channel==MINE', startDate: '2026-01-01', endDate: today, metrics: 'views' });
  return `kanal jami ko'rishlar: ${r.data.rows?.[0]?.[0] ?? 0}`;
});
