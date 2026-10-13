// Nex Zaelon (musiqa kanali) sozlamalari. Umumiy kalitlar (Gemini, Cloudflare, Telegram, Google client) .env dan.
import path from 'node:path';
import { ROOT } from '../config.js';

const env = process.env;
export const nex = {
  channelName: env.NEX_CHANNEL_NAME || 'Nex Zaelon',
  refreshToken: env.NEX_YOUTUBE_REFRESH_TOKEN || '',
  slots: (env.NEX_SLOTS || '11:30,17:30,23:30').split(',').map((s) => s.trim()).filter((s) => /^\d{2}:\d{2}$/.test(s)).sort(),
  privacy: env.NEX_PRIVACY || 'public',
  minClip: 25, // Shorts uzunligi (soniya)
  maxClip: 45,
  paths: {
    inbox: path.join(ROOT, 'nex-inbox'), // Flow'dan olingan mp3/wav shu yerga tashlanadi
    processed: path.join(ROOT, 'nex-inbox', 'done'),
    runs: path.join(ROOT, 'nex-runs'),
    plan: path.join(ROOT, 'src', 'nex', 'plan.json'),
    fonts: path.join(ROOT, 'fonts'),
  },
};

// Janr guruhi -> mos shablonlar (Claude Docs rejasidagi jadval) va heshteglar
export const GENRE_GROUPS = [
  { re: /lofi|jazz|dream|ambient|chill/i, templates: [2], tags: ['lofi', 'chill', 'studymusic', 'nightvibes'] },
  { re: /indie|acoustic|akustik|folk/i, templates: [2], tags: ['indie', 'acoustic', 'newmusic'] },
  { re: /rap|trap|boom ?bap|hip.?hop|drill/i, templates: [3], tags: ['rap', 'sadrap', 'hiphop'] },
  { re: /phonk|synthwave|hyperpop|house|edm|electro|emo|punk|techno/i, templates: [4], tags: ['phonk', 'synthwave', 'edm'] },
  { re: /pop|r&b|rnb|soul|afro|uzbek|city/i, templates: [1], tags: ['sadsongs', 'lyrics', 'rnb', 'pop'] },
];
export const groupOf = (genre) => GENRE_GROUPS.find((g) => g.re.test(genre || '')) || GENRE_GROUPS[4];
