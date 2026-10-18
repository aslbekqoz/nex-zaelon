// Sahnalar uchun umumiy HTML qobig'i: 1080x1920 kanva, shriftlar, plyonka donasi (grain), vinyetka, imzo.
// Har bir sahna window.render(t, i) funksiyasini beradi — brauzer har kadrni shu funksiya bilan chizadi,
// keyin kadr suratga olinadi. Vaqt to'liq bizning nazoratimizda (hech qanday CSS animatsiya yo'q), shuning
// uchun natija har safar bir xil va silliq chiqadi.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { nex } from '../config.js';

const font = (file) => pathToFileURL(path.join(nex.paths.fonts, file)).href;

export function page({ css = '', body = '', script = '', data = {} }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Poppins';font-weight:800;src:url('${font('Poppins-ExtraBold.ttf')}')}
@font-face{font-family:'Poppins';font-weight:600;src:url('${font('Poppins-SemiBold.ttf')}')}
@font-face{font-family:'PT Sans';font-weight:700;src:url('${font('PTSans-Bold.ttf')}')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#000}
body{font-family:'Poppins','PT Sans',sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.abs{position:absolute}
#stage{position:absolute;inset:0;overflow:hidden}
#grain{position:absolute;inset:-64px;pointer-events:none;mix-blend-mode:overlay;opacity:.22;z-index:90}
#vignette{position:absolute;inset:0;pointer-events:none;z-index:91;
  background:radial-gradient(ellipse 75% 60% at 50% 48%,transparent 55%,rgba(0,0,0,.55) 100%)}
#wm{position:absolute;left:0;right:0;bottom:64px;text-align:center;font-weight:600;font-size:26px;
  letter-spacing:.06em;color:rgba(255,255,255,.42);z-index:95}
${css}
</style></head><body>
<div id="stage">${body}</div>
<canvas id="grain" width="1208" height="2048"></canvas>
<div id="vignette"></div>
<div id="wm">@NexZaelonEdits</div>
<script>
const D = ${JSON.stringify(data)};
// --- yordamchilar ---
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
// deterministik "tasodif" (har safar bir xil natija)
function rnd(n) { const x = Math.sin(n * 127.1 + D.seed * 311.7) * 43758.5453; return x - Math.floor(x); }
// silliq shovqin — qo'l kamerasi tebranishi, yorug'lik o'zgarishi uchun
function noise1(t, k = 0) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lerp(rnd(i + k * 1000), rnd(i + 1 + k * 1000), u) * 2 - 1; }
function drift(t, speed, k) { return noise1(t * speed, k) * 0.65 + noise1(t * speed * 2.3, k + 7) * 0.35; }
// ovoz: kadr bo'yicha umumiy balandlik, bas va 24 ta chastota polosasi (0..1)
const A = D.audio || { level: [], bass: [], bands: [] };
const lvl = (i) => A.level[Math.min(i, A.level.length - 1)] || 0;
const bass = (i) => A.bass[Math.min(i, A.bass.length - 1)] || 0;
const band = (i, b) => (A.bands[Math.min(i, A.bands.length - 1)] || [])[b] || 0;
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// plyonka donasi: bitta shovqin kanvasi, har kadrda boshqa joyi ko'rsatiladi
const G = $('#grain'), gx = G.getContext('2d');
(function () { const img = gx.createImageData(G.width, G.height);
  for (let p = 0; p < img.data.length; p += 4) { const v = Math.random() * 255; img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255; }
  gx.putImageData(img, 0, 0); })();
function grain(i) { G.style.transform = 'translate(' + (-Math.floor(rnd(i * 3.1) * 60)) + 'px,' + (-Math.floor(rnd(i * 5.7) * 60)) + 'px)'; }

${script}
window.frame = (t, i) => { grain(i); render(t, i); };
</script></body></html>`;
}
