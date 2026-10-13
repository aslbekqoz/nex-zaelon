// Telegram Bot API bilan ishlash uchun kichik yordamchi (kutubxonasiz).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const api = (method) => `https://api.telegram.org/bot${config.tgToken}/${method}`;

export const telegramReady = () => Boolean(config.tgToken && config.tgChatId);

async function call(method, params = {}) {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

async function upload(method, field, file, params = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) {
    form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  form.append(field, new Blob([fs.readFileSync(file)]), path.basename(file));
  const res = await fetch(api(method), { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

export const sendMessage = (text, extra = {}) =>
  call('sendMessage', { chat_id: config.tgChatId, text, parse_mode: 'HTML', ...extra });

export const sendPhoto = (file, caption, extra = {}) =>
  upload('sendPhoto', 'photo', file, { chat_id: config.tgChatId, caption, parse_mode: 'HTML', ...extra });

export const sendVideo = (file, caption, extra = {}) =>
  upload('sendVideo', 'video', file, { chat_id: config.tgChatId, caption, parse_mode: 'HTML', supports_streaming: true, ...extra });

export const getUpdates = (offset, timeout = 30) =>
  call('getUpdates', { offset, timeout, allowed_updates: ['callback_query', 'message'] });

export const answerCallback = (id, text) => call('answerCallbackQuery', { callback_query_id: id, text });

export const editMarkup = (messageId, reply_markup = { inline_keyboard: [] }) =>
  call('editMessageReplyMarkup', { chat_id: config.tgChatId, message_id: messageId, reply_markup });

// Xabar yuborishda xato bo'lsa ham tizim to'xtamasin
export async function notify(text) {
  if (!telegramReady() || config.mock) return;
  try { await sendMessage(text); } catch { /* internet yo'q bo'lsa jim o'tamiz, log.txt da bor */ }
}
