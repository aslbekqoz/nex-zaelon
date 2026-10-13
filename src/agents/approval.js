// 5-AGENT: Telegram orqali ruxsat so'rash.
// Videoni sizga yuboradi, ✅ / ❌ tugmalarini bosishingizni kutadi.
// Belgilangan vaqtda javob bo'lmasa -> APPROVAL_DEFAULT (approve yoki reject).
// Xavfsizlik: faqat TELEGRAM_CHAT_ID dagi odam (siz) tugmani bosa oladi.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';
import * as tg from '../lib/telegram.js';
import { scheduling, nextSlot, nextLongSlot, fmtSlot } from '../lib/schedule.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function runApproval(runDir, outFile) {
  const runId = path.basename(runDir);
  const meta = readJson(path.join(runDir, 'metadata.json'));

  if (config.mock || !tg.telegramReady()) {
    log(`📲 Telegram ${config.mock ? '[MOCK]' : 'sozlanmagan'} -> standart qaror: ${config.approvalDefault}`);
    return writeJson(outFile, { decision: config.approvalDefault, by: config.mock ? 'mock' : 'no-telegram', at: new Date().toISOString() });
  }

  // Agar bu bosqich qayta ishga tushsa (masalan, internet uzilib), xabar QAYTA yuborilmaydi —
  // oldin yuborilgan xabar va uning muddati pending faylidan olinadi.
  const pendingFile = path.join(runDir, 'approval_pending.json');
  let pending = fs.existsSync(pendingFile) ? readJson(pendingFile) : null;
  let offset = pending?.offset || 0;

  if (!pending) {
    // Eski (oldingi) tugma bosishlarni e'tiborsiz qoldirish uchun offset'ni yangilaymiz
    const old = await tg.getUpdates(-1, 0);
    if (old.length) offset = old[old.length - 1].update_id + 1;

    const keyboard = { inline_keyboard: [[
      { text: '✅ Tasdiqlash', callback_data: `ok:${runId}` },
      { text: '❌ Rad etish', callback_data: `no:${runId}` },
    ]] };
    const qaFile = path.join(runDir, 'qa.json');
    const qa = fs.existsSync(qaFile) ? readJson(qaFile) : null;
    const qaLine = qa && !qa.skipped ? `🧪 Sifat: ${qa.average}/10${qa.redone?.length ? `, ${qa.redone.length} ta rasm qayta chizildi` : ''}\n` : '';
    const caption =
      `🎬 <b>${readJson(path.join(runDir, 'script.json')).format === 'long' ? 'Yangi UZUN video (16:9)' : 'Yangi video'} tayyor</b>\n\n<b>${esc(meta.title)}</b>\n\n${esc(meta.description.split('\n\nSources:')[0]).slice(0, 600)}\n\n` +
      qaLine +
      (() => {
        const slot = readJson(path.join(runDir, 'script.json')).format === 'long' ? nextLongSlot() : (scheduling() ? nextSlot() : null);
        return slot ? `📅 E'lon vaqti: <b>${fmtSlot(slot)}</b>\n` : '';
      })() +
      `⏳ ${config.approvalTimeoutMin} daqiqada javob bo'lmasa: <b>${config.approvalDefault === 'approve' ? 'yuklanadi' : 'yuklanmaydi'}</b>`;

    log('📲 Telegram: ruxsat so\'rayapman');
    let msg;
    const video = path.join(runDir, 'video.mp4');
    try {
      if (fs.statSync(video).size > 49 * 1024 * 1024) throw new Error('video 50MB dan katta');
      msg = await tg.sendVideo(video, caption, { reply_markup: keyboard });
    } catch (err) {
      log(`   Video yuborilmadi (${err.message}), thumbnail yuboraman`);
      msg = await tg.sendPhoto(path.join(runDir, 'thumbnail.jpg'), caption, { reply_markup: keyboard });
    }
    pending = { messageId: msg.message_id, offset, deadline: Date.now() + config.approvalTimeoutMin * 60_000 };
    writeJson(pendingFile, pending);
  } else {
    log('📲 Telegram: avval yuborilgan xabarga javob kutishda davom etaman');
  }
  const msg = { message_id: pending.messageId };

  const deadline = pending.deadline;
  let decision = null;
  while (!decision && Date.now() < deadline) {
    const wait = Math.max(1, Math.min(30, Math.floor((deadline - Date.now()) / 1000)));
    let updates = [];
    try {
      updates = await tg.getUpdates(offset, wait);
    } catch (err) {
      log(`   Telegram'ga ulanib bo'lmadi: ${err.message}. Kutishda davom etaman...`);
      await new Promise((r) => setTimeout(r, 10_000));
      continue;
    }
    for (const u of updates) {
      offset = u.update_id + 1;
      writeJson(pendingFile, { ...pending, offset });
      const cb = u.callback_query;
      if (!cb || !cb.data?.endsWith(`:${runId}`)) continue;
      if (String(cb.from.id) !== String(config.tgChatId)) {
        await tg.answerCallback(cb.id, '⛔ Sizda ruxsat yo\'q').catch(() => {});
        log(`   ⛔ Begona odam tugma bosdi (id ${cb.from.id}) — e'tiborsiz qoldirildi`);
        continue;
      }
      decision = cb.data.startsWith('ok:') ? 'approve' : 'reject';
      // Bu faqat tugmadagi "soat" belgisini o'chiradi. Internet sekin bo'lsa Telegram uni rad etadi —
      // lekin qaror allaqachon qabul qilingan, shuning uchun xatoni e'tiborsiz qoldiramiz.
      await tg.answerCallback(cb.id, decision === 'approve' ? 'Yuklanmoqda...' : 'Bekor qilindi').catch(() => {});
    }
  }

  const by = decision ? 'user' : 'timeout';
  decision = decision || config.approvalDefault;
  await tg.editMarkup(msg.message_id).catch(() => {});
  await tg.sendMessage(
    decision === 'approve'
      ? `✅ ${by === 'timeout' ? 'Javob bo\'lmadi — ' : ''}YouTube'ga yuklayapman...`
      : `❌ ${by === 'timeout' ? 'Javob bo\'lmadi — ' : ''}Video yuklanmaydi.`,
    { reply_to_message_id: msg.message_id },
  ).catch(() => {});
  log(`   Qaror: ${decision} (${by === 'user' ? 'siz bosdingiz' : 'vaqt tugadi'})`);
  writeJson(outFile, { decision, by, at: new Date().toISOString() });
  fs.rmSync(pendingFile, { force: true });
}
