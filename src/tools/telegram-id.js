// Chat ID'ingizni topish: avval botingizga Telegram'da /start yozing, keyin:  npm run telegram-id
import { config } from '../config.js';

if (!config.tgToken) {
  console.error('❌ Avval .env ga TELEGRAM_BOT_TOKEN ni yozing.');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${config.tgToken}/getUpdates`);
const data = await res.json();
if (!data.ok) {
  console.error('❌ Telegram xatosi:', data.description);
  process.exit(1);
}
const chats = new Map();
for (const u of data.result) {
  const m = u.message || u.callback_query?.message;
  const from = u.message?.from || u.callback_query?.from;
  if (from) chats.set(from.id, `${from.first_name || ''} ${from.username ? '@' + from.username : ''}`.trim());
  if (m?.chat && !from) chats.set(m.chat.id, m.chat.title || '');
}
if (!chats.size) {
  console.log('Hech qanday xabar topilmadi. Botingizga Telegram\'da /start yozing va qayta ishga tushiring.');
} else {
  for (const [id, name] of chats) console.log(`👤 ${name}:  TELEGRAM_CHAT_ID=${id}`);
  console.log('\nO\'zingizga tegishli qatorni .env fayliga ko\'chiring.');
}
