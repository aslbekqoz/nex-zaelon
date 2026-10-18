// AGENT 3: Montajchi — qo'shiqning naqarotidan 25–45 soniyalik 9:16 video yasaydi (LIRIKASIZ).
// Har bir shablon — brauzerda kodda chizilgan "jonli" sahna (src/nex/scenes/tN.js), musiqaga mos harakatlanadi:
//   1 Planshet        — qorong'i stoldagi planshet, past burchakli qo'l kamerasi, pushti-binafsha suyuq gradient, pleyer
//   2 Okean           — shomdagi tund okean (FLUX rasmi), sekin to'lqinlar, oltin jilo, plyonka donasi, pastda pleyer
//   3 CD qutisi       — qora fon, tepadan ko'rinish, shaffof quti, diskda oq-qora muqova sekin aylanadi
//   4 MiniDisc glitch — xrom MiniDisc, ko'k iridessent disk, oq porlovchi markaz, vaqti-vaqti bilan glitch
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpeg } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { nex } from './config.js';
import { page } from './scenes/common.js';
import { analyzeAudio, renderFrames } from './frames.js';

const FPS = 30;
const SCENES = {
  1: () => import('./scenes/t1.js'),
  2: () => import('./scenes/t2.js'),
  3: () => import('./scenes/t3.js'),
  4: () => import('./scenes/t4.js'),
};

// Naqarot oynasini tanlash: naqarotdan biroz oldin boshlab, 25–45 soniya
export function pickClip(listen) {
  const { chorus, duration: dur } = listen;
  const start = Math.max(0, chorus.start - 0.4);
  let len = (chorus.end - chorus.start) + 3;
  len = Math.max(nex.minClip, Math.min(nex.maxClip, len));
  len = Math.min(len, dur - start);
  return { start, len: Math.round(len * 100) / 100 };
}

export async function runRender(runDir, audioFile, listen, template) {
  const clip = pickClip(listen);
  log(`🎬 Montaj: shablon ${template}, ${clip.start.toFixed(1)}s dan ${clip.len.toFixed(1)} soniya`);

  // 1) Audio: naqarot bo'lagi, yumshoq kirish/chiqish, YouTube balandligi (-14 LUFS)
  const wav = path.join(runDir, 'clip.wav');
  await ffmpeg(['-ss', String(clip.start), '-t', String(clip.len), '-i', audioFile, '-af',
    `afade=t=in:d=0.12,afade=t=out:st=${Math.max(0, clip.len - 1.6).toFixed(2)}:d=1.6,loudnorm=I=-14:TP=-1.5:LRA=11`,
    '-ar', '44100', '-ac', '2', wav]);

  // 2) Musiqa tahlili — sahna ovozga qarab "nafas oladi"
  const frames = Math.round(clip.len * FPS);
  const audio = await analyzeAudio(wav, FPS, frames);

  // 3) Sahna
  const mod = await SCENES[template]();
  const seed = [...(listen.title || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 997;
  const data = {
    cover: pathToFileURL(path.join(runDir, 'cover.jpg')).href,
    title: listen.title, dur: clip.len, total: listen.duration, offset: clip.start, seed, audio,
  };
  const html = page({ ...mod.scene(data), data });
  const t0 = Date.now();
  await renderFrames({
    html, workDir: runDir, fps: FPS, frames, audio: wav, out: path.join(runDir, 'video.mp4'),
    post: mod.post ? mod.post(clip.len, seed) : '',
    onProgress: (i, n) => log(`   … ${Math.round((i / n) * 100)}%`),
  });
  fs.rmSync(path.join(runDir, 'scene.html'), { force: true });
  log(`   ✅ video.mp4 tayyor (${Math.round((Date.now() - t0) / 1000)} s)`);
  return clip;
}
