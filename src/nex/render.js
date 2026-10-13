// AGENT 3: Montajchi — qo'shiqning naqarotidan 25–45 soniyalik 9:16 lirik video yasaydi.
// 4 ta shablon (Claude Docs rejasidagidek):
//   1 Planshet lirika   — pushti-binafsha gradient, qiya planshet ekranida muqova, aylanuvchi 3 qatorli lirika
//   2 Pleyer + tabiat   — qorong'i tabiat foni (sekin harakat), pastda musiqa pleyeri, bitta qator lirika
//   3 CD qutisi         — qora fon, aylanuvchi CD, lirika so'zma-so'z paydo bo'ladi
//   4 MiniDisc glitch   — neon fon + glitch, porlovchi aylanuvchi disk, glow lirika, ovoz to'lqini
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { nex } from './config.js';

const W = 1080;
const H = 1920;
const FPS = 30;

// ---------------- yordamchilar ----------------
const t2 = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${sec}`;
};
const esc = (s) => String(s).replace(/[{}\\]/g, '').replace(/\n/g, ' ');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hasCyr = (s) => /[Ѐ-ӿ]/.test(s);

function fontsFor(listen) {
  const cyr = hasCyr(listen.title + listen.lyrics.map((l) => l.text).join(' '));
  return cyr ? { bold: 'PT Sans', semi: 'PT Sans' } : { bold: 'Poppins ExtraBold', semi: 'Poppins SemiBold' };
}

function header(styles) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles.join('\n')}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}
// Style: nom, shrift, o'lcham, rang(&HAABBGGRR), kontur rangi, kontur, soya, joylashuv
const style = (name, font, size, color = '&H00FFFFFF', outline = '&H00000000', bord = 0, shad = 0, align = 5) =>
  `Style: ${name},${font},${size},${color},${color},${outline},&H80000000,0,0,0,0,100,100,0,0,1,${bord},${shad},${align},90,90,0,1`;
const ev = (layer, a, b, st, text) => `Dialogue: ${layer},${t2(a)},${t2(Math.max(b, a + 0.05))},${st},,0,0,0,,${text}\n`;

// Naqarot oynasidagi lirika qatorlari (videoning 0-soniyasiga siljitilgan)
function windowLyrics(listen, clip) {
  return listen.lyrics
    .filter((l) => l.end > clip.start + 0.2 && l.start < clip.start + clip.len - 0.3)
    .map((l) => ({ text: l.text, start: Math.max(0, l.start - clip.start), end: Math.min(clip.len, l.end - clip.start) }));
}

// Statik PNG'lar (har kadrda qayta hisoblanmasligi uchun bir marta yasaladi)
async function roundedPng(src, out, w, h, r, { crop = 'square' } = {}) {
  const fit = crop === 'square'
    ? `crop='min(iw,ih)':'min(iw,ih)',scale=${w}:${h}`
    : `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
  await ffmpeg(['-i', src, '-vf', fit, '-frames:v', '1', out + '.tmp.png']);
  // rangli rasm + yumaloq burchakli alfa (geq faqat alfa kanalini hisoblaydi)
  await ffmpeg(['-i', out + '.tmp.png', '-filter_complex',
    `[0]format=rgba,split[c][m];[m]format=gray,geq=lum='if(lte(hypot(max(${r}-X\\,X-${w - 1 - r})*gt(max(${r}-X\\,X-${w - 1 - r})\\,0)\\,max(${r}-Y\\,Y-${h - 1 - r})*gt(max(${r}-Y\\,Y-${h - 1 - r})\\,0))\\,${r})\\,255\\,0)'[a];[c][a]alphamerge`,
    '-frames:v', '1', out]);
  fs.rmSync(out + '.tmp.png', { force: true });
}

async function discPng(src, out, size, hole) {
  const c = size / 2;
  await ffmpeg(['-i', src, '-filter_complex',
    `[0]crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size},format=rgba,split[c][m];` +
    `[m]format=gray,geq=lum='if(lte(hypot(X-${c}\\,Y-${c})\\,${c - 2})*gte(hypot(X-${c}\\,Y-${c})\\,${hole})\\,255\\,0)'[a];` +
    // markazdagi kumushrang halqa (CD ko'rinishi uchun)
    `[c][a]alphamerge,geq=r='if(between(hypot(X-${c}\\,Y-${c})\\,${hole}\\,${hole * 1.45})\\,190\\,r(X\\,Y))':` +
    `g='if(between(hypot(X-${c}\\,Y-${c})\\,${hole}\\,${hole * 1.45})\\,195\\,g(X\\,Y))':` +
    `b='if(between(hypot(X-${c}\\,Y-${c})\\,${hole}\\,${hole * 1.45})\\,205\\,b(X\\,Y))':a='alpha(X\\,Y)'`,
    '-frames:v', '1', out]);
}

// ---------------- SHABLONLAR ----------------

// 1 — Planshet lirika
async function template1(dir, listen, clip, F) {
  const tablet = path.join(dir, 'tablet.png');
  const screen = path.join(dir, 'screen.png');
  await roundedPng(path.join(dir, 'cover.jpg'), screen, 700, 700, 30);
  // planshet ramkasi: qora yumaloq to'rtburchak + ichida ekran, keyin qiya buriladi
  await ffmpeg(['-f', 'lavfi', '-i', 'color=c=0x111018:s=780x780', '-i', screen, '-filter_complex',
    `[0]format=rgba,split[b][m];[m]format=gray,geq=lum='if(lte(hypot(max(60-X\\,X-719)*gt(max(60-X\\,X-719)\\,0)\\,max(60-Y\\,Y-719)*gt(max(60-Y\\,Y-719)\\,0))\\,60)\\,255\\,0)'[a];` +
    `[b][a]alphamerge[frame];[frame][1]overlay=40:40,rotate=-7*PI/180:c=none:ow=rotw(7*PI/180):oh=roth(7*PI/180)`,
    '-frames:v', '1', tablet]);

  const lines = windowLyrics(listen, clip);
  let ass = header([
    style('Cur', F.bold, 74, '&H00FFFFFF', '&H00602080', 3, 0),
    style('Dim', F.semi, 50, '&H70FFFFFF', '&H00000000', 0, 0),
    style('Top', F.semi, 40, '&H30FFFFFF', '&H00000000', 0, 0),
    style('Title', F.bold, 56, '&H00FFFFFF', '&H00602080', 2, 0),
  ]);
  ass += ev(0, 0, clip.len, 'Top', `{\\pos(540,150)}${esc(nex.channelName.toUpperCase())}  ·  ♪`);
  ass += ev(0, 0, clip.len, 'Title', `{\\pos(540,225)}${esc(listen.title)}`);
  const Y = 1470;
  lines.forEach((l, i) => {
    const a = l.start;
    const b = lines[i + 1] ? Math.min(lines[i + 1].start, l.end + 1.2) : clip.len;
    const prev = lines[i - 1];
    const next = lines[i + 1];
    ass += ev(1, a, b, 'Cur', `{\\move(540,${Y + 70},540,${Y},0,220)\\fad(150,0)}${esc(l.text)}`);
    if (prev) ass += ev(1, a, b, 'Dim', `{\\move(540,${Y - 60},540,${Y - 135},0,220)}${esc(prev.text)}`);
    if (next) ass += ev(1, a, b, 'Dim', `{\\move(540,${Y + 205},540,${Y + 135},0,220)\\fad(250,0)}${esc(next.text)}`);
  });
  fs.writeFileSync(path.join(dir, 'subs.ass'), ass);

  return {
    inputs: ['-f', 'lavfi', '-i', `gradients=s=${W}x${H}:c0=0xff4fa3:c1=0x8b3dff:c2=0x2a0b5c:n=3:x0=0:y0=0:x1=${W}:y1=${H}:speed=0.008:d=${clip.len}:r=${FPS}`,
      '-loop', '1', '-i', tablet],
    filter: `[1:v]format=rgba,split[t][s];[s]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.45,gblur=sigma=28[sh];` +
      `[0:v][sh]overlay=x='(W-w)/2+30':y='390+14*sin(t*1.3)+40':shortest=1[b1];[b1][t]overlay=x='(W-w)/2':y='390+14*sin(t*1.3)':shortest=1[bg]`,
  };
}

// 2 — Pleyer + tabiat
async function template2(dir, listen, clip, F) {
  const thumb = path.join(dir, 'thumb.png');
  const panel = path.join(dir, 'panel.png');
  await roundedPng(path.join(dir, 'cover.jpg'), thumb, 190, 190, 24);
  await ffmpeg(['-f', 'lavfi', '-i', 'color=c=black@0.55:s=960x380,format=rgba', '-filter_complex',
    `[0]split[b][m];[m]format=gray,geq=lum='if(lte(hypot(max(44-X\\,X-915)*gt(max(44-X\\,X-915)\\,0)\\,max(44-Y\\,Y-335)*gt(max(44-Y\\,Y-335)\\,0))\\,44)\\,140\\,0)'[a];[b][a]alphamerge`,
    '-frames:v', '1', panel]);

  const lines = windowLyrics(listen, clip);
  const PY = 1430; // panel tepasi
  let ass = header([
    style('Lyric', F.bold, 72, '&H00FFFFFF', '&H00000000', 0, 3),
    style('PTitle', F.bold, 46, '&H00FFFFFF', '&H00000000', 0, 0, 7),
    style('PArtist', F.semi, 36, '&H40FFFFFF', '&H00000000', 0, 0, 7),
    style('PTime', F.semi, 28, '&H50FFFFFF', '&H00000000', 0, 0, 7),
    style('Icon', F.semi, 10, '&H00FFFFFF', '&H00000000', 0, 0, 7),
  ]);
  ass += ev(0, 0, clip.len, 'PTitle', `{\\pos(330,${PY + 60})}${esc(listen.title)}`);
  ass += ev(0, 0, clip.len, 'PArtist', `{\\pos(330,${PY + 125})}${esc(nex.channelName)}`);
  // vaqt yozuvlari: har soniyada yangilanadi
  for (let s = 0; s < clip.len; s++) {
    ass += ev(0, s, Math.min(s + 1, clip.len), 'PTime', `{\\pos(100,${PY + 290})}${mmss(clip.start + s)}`);
  }
  ass += ev(0, 0, clip.len, 'PTime', `{\\an9\\pos(980,${PY + 290})}${mmss(listen.duration)}`);
  // tugmalar (vektor chizma): oldingi, pauza, keyingi
  const cx = 540, cy = PY + 345;
  ass += ev(0, 0, clip.len, 'Icon', `{\\pos(${cx - 190},${cy - 22})\\p1}m 40 0 l 40 44 l 8 22 m 0 0 l 6 0 l 6 44 l 0 44{\\p0}`);
  ass += ev(0, 0, clip.len, 'Icon', `{\\pos(${cx - 22},${cy - 26})\\p1}m 0 0 l 14 0 l 14 52 l 0 52 m 30 0 l 44 0 l 44 52 l 30 52{\\p0}`);
  ass += ev(0, 0, clip.len, 'Icon', `{\\pos(${cx + 150},${cy - 22})\\p1}m 0 0 l 32 22 l 0 44 m 34 0 l 40 0 l 40 44 l 34 44{\\p0}`);
  for (const l of lines) ass += ev(1, l.start, l.end + 0.3, 'Lyric', `{\\pos(540,${PY - 110})\\fad(200,200)}${esc(l.text)}`);
  // progress bar: oq chiziq chapdan o'ngga to'lib boradi (\\clip animatsiyasi)
  const by = PY + 255;
  ass += ev(0, 0, clip.len, 'Icon', `{\\an7\\pos(0,0)\\clip(100,${by},101,${by + 8})\\t(0,${Math.round(clip.len * 1000)},\\clip(100,${by},980,${by + 8}))\\p1}m 100 ${by} l 980 ${by} l 980 ${by + 8} l 100 ${by + 8}{\\p0}`);
  fs.writeFileSync(path.join(dir, 'subs.ass'), ass);

  const L = clip.len.toFixed(2);
  return {
    inputs: ['-loop', '1', '-framerate', String(FPS), '-i', path.join(dir, 'cover.jpg'), '-loop', '1', '-i', panel, '-loop', '1', '-i', thumb],
    filter: `[0:v]scale=1242:2208,crop=${W}:${H}:x='(iw-ow)*(0.5+0.5*sin(t/${L}*3.14159-1.5708))':y='(ih-oh)/2',` +
      `eq=brightness=-0.10:saturation=0.9,vignette=PI/4[n];` +
      `[n][1:v]overlay=60:${PY}:shortest=1[p];[p][2:v]overlay=110:${PY + 35}:shortest=1,` +
      // progress bar: kulrang fon + oq to'lgan qism
      `drawbox=x=100:y=${PY + 255}:w=880:h=8:color=white@0.25:t=fill[bg]`,
  };
}

// 3 — CD qutisi
async function template3(dir, listen, clip, F) {
  const disc = path.join(dir, 'disc.png');
  await discPng(path.join(dir, 'cover.jpg'), disc, 860, 80);
  const lines = windowLyrics(listen, clip);
  let ass = header([
    style('Word', F.bold, 78, '&H00FFFFFF', '&H00000000', 0, 0),
    style('Small', F.semi, 38, '&H50FFFFFF', '&H00000000', 0, 0),
    style('Name', F.bold, 54, '&H00FFFFFF', '&H00000000', 0, 0),
  ]);
  ass += ev(0, 0, clip.len, 'Name', `{\\pos(540,1700)}${esc(listen.title)}`);
  ass += ev(0, 0, clip.len, 'Small', `{\\pos(540,1765)}${esc(nex.channelName)}`);
  // so'zma-so'z: har so'z o'z vaqtida paydo bo'ladi (qator davomida teng taqsimlanadi)
  for (const l of lines) {
    const words = l.text.split(' ');
    const span = Math.max(0.4, (l.end - l.start) * 0.85);
    const txt = words.map((w, k) => {
      const ms = Math.round((k * span / words.length) * 1000);
      return `{\\alpha&HFF&\\t(${ms},${ms + 120},\\alpha&H00&)}${esc(w)}`;
    }).join(' ');
    ass += ev(1, l.start, l.end + 0.4, 'Word', `{\\pos(540,1380)\\fad(0,200)}${txt}`);
  }
  fs.writeFileSync(path.join(dir, 'subs.ass'), ass);
  return {
    inputs: ['-f', 'lavfi', '-i', `color=c=0x0a0a0c:s=${W}x${H}:d=${clip.len}:r=${FPS}`, '-loop', '1', '-i', disc],
    filter: `[1:v]format=rgba,rotate=a=t*0.9:c=none:ow=iw:oh=ih[d];[0:v]noise=alls=6:allf=t[bk];` +
      `[bk][d]overlay=(W-w)/2:180:shortest=1[bg]`,
  };
}

// 4 — MiniDisc glitch
async function template4(dir, listen, clip, F) {
  const disc = path.join(dir, 'disc.png');
  await discPng(path.join(dir, 'cover.jpg'), disc, 620, 60);
  const lines = windowLyrics(listen, clip);
  let ass = header([
    style('Glow', F.bold, 72, '&H00FF40FF', '&H00FF30E0', 10, 0),
    style('Main', F.bold, 72, '&H00FFFFFF', '&H00000000', 0, 0),
    style('GlR', F.bold, 72, '&H600000FF', '&H00000000', 0, 0),
    style('GlC', F.bold, 72, '&H60FFFF00', '&H00000000', 0, 0),
    style('Name', F.bold, 50, '&H00FFFFFF', '&H00FF30E0', 3, 0),
  ]);
  ass += ev(0, 0, clip.len, 'Name', `{\\pos(540,200)\\blur3}${esc(listen.title.toUpperCase())}`);
  for (const l of lines) {
    const y = 1330;
    ass += ev(1, l.start, l.end + 0.3, 'Glow', `{\\pos(540,${y})\\blur14\\fad(80,150)}${esc(l.text)}`);
    ass += ev(2, l.start, l.end + 0.3, 'Main', `{\\pos(540,${y})\\fad(80,150)}${esc(l.text)}`);
    // qator boshida qisqa "glitch": qizil/ko'k nusxalar yon tomonga siljiydi
    ass += ev(3, l.start, l.start + 0.14, 'GlR', `{\\pos(552,${y - 4})}${esc(l.text)}`);
    ass += ev(3, l.start, l.start + 0.14, 'GlC', `{\\pos(528,${y + 4})}${esc(l.text)}`);
  }
  fs.writeFileSync(path.join(dir, 'subs.ass'), ass);
  return {
    inputs: ['-loop', '1', '-framerate', String(FPS), '-i', path.join(dir, 'cover.jpg'), '-loop', '1', '-i', disc],
    // audio kirishi orkestr tomonidan oxirida qo'shiladi (indeks 2)
    filter: `[0:v]scale=${W}:${H},eq=brightness=-0.18:saturation=1.25,split[b0][b1];` +
      `[b1]rgbashift=rh=16:bh=-16:gv=6,noise=alls=30:allf=t[gl];` +
      `[b0][gl]overlay=0:0:enable='lt(mod(t\\,2.3)\\,0.12)+lt(mod(t+0.9\\,3.7)\\,0.08)':shortest=1,noise=alls=7:allf=t[bgv];` +
      `[1:v]format=rgba,rotate=a=t*1.2:c=none:ow=iw:oh=ih,split[d][dg];` +
      `[dg]colorchannelmixer=rr=1:gg=0.2:bb=1,gblur=sigma=26[glow];` +
      `[bgv][glow]overlay=(W-w)/2:430:shortest=1[g1];[g1][d]overlay=(W-w)/2:430:shortest=1[pre];` +
      `[2:a]showwaves=s=920x170:mode=cline:rate=${FPS}:colors=0x40FFFF|0xFF40FF:scale=sqrt,format=rgba[wv];` +
      `[pre][wv]overlay=80:1560:shortest=1[bg]`,
    needsAudio: true,
  };
}

const TEMPLATES = { 1: template1, 2: template2, 3: template3, 4: template4 };

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
  const F = fontsFor(listen);

  // 1) Audio: naqarot bo'lagi, yumshoq kirish/chiqish, YouTube balandligi (-14 LUFS)
  await ffmpeg(['-ss', String(clip.start), '-t', String(clip.len), '-i', audioFile, '-af',
    `afade=t=in:d=0.12,afade=t=out:st=${Math.max(0, clip.len - 1.6).toFixed(2)}:d=1.6,loudnorm=I=-14:TP=-1.5:LRA=11`,
    '-ar', '44100', '-ac', '2', path.join(runDir, 'clip.wav')]);

  // 2) Shablon: fon + subtitrlar
  const t = await TEMPLATES[template](runDir, listen, clip, F);
  const audioIdx = t.inputs.filter((x) => x === '-i').length;
  const filter = `${t.filter};[bg]subtitles=subs.ass:fontsdir=${nex.paths.fonts},` +
    `drawtext=fontfile=${path.join(nex.paths.fonts, 'Poppins-SemiBold.ttf')}:text='@NexZaelonEdits':fontsize=26:fontcolor=white@0.45:x=(w-tw)/2:y=h-70,` +
    `format=yuv420p[v]`;
  await ffmpeg([...t.inputs, '-i', 'clip.wav', '-filter_complex', filter.replace(/\[2:a\]/g, `[${audioIdx}:a]`),
    '-map', '[v]', '-map', `${audioIdx}:a`, '-t', String(clip.len), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'video.mp4'],
  { cwd: runDir });
  log('   ✅ video.mp4 tayyor');
  return clip;
}
