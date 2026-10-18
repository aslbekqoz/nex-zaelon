// 4 — MiniDisc glitch: qop-qora fon, old tomondan metall MiniDisc kartriji, qopqoq (shutter) ochiq, ichida
// to'q ko'k iridessent disk aylanadi, markazida oppoq porlovchi nur. Xrom qirralar, Y2K uslubi; vaqti-vaqti bilan
// raqamli glitch va gorizontal skanlayn buzilishi (glitch keyin ffmpeg'da qo'shiladi).
export function scene() {
  const css = `
#haze{position:absolute;inset:0;background:radial-gradient(ellipse 60% 38% at 50% 45%,rgba(40,90,255,.16),transparent 70%)}
#md{position:absolute;left:170px;top:430px;width:740px;height:790px;border-radius:22px 22px 26px 26px;overflow:hidden;
  background:linear-gradient(165deg,#f3f6f9 0%,#aeb6bf 14%,#e6eaee 27%,#6c747d 44%,#c3cad2 62%,#7d858e 80%,#d9dee3 100%);
  box-shadow:0 70px 140px rgba(0,0,0,.95),0 0 0 2px rgba(255,255,255,.55) inset,0 0 0 5px rgba(0,0,0,.35) inset}
#brushed{position:absolute;inset:0;mix-blend-mode:multiply;opacity:.35;
  background:repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 1px,rgba(255,255,255,.05) 1px 3px,rgba(0,0,0,.04) 3px 4px)}
#label{position:absolute;left:70px;right:70px;top:56px;height:200px;border-radius:10px;
  background:linear-gradient(180deg,#2a2f36,#14171b);box-shadow:0 2px 0 rgba(255,255,255,.6),0 -1px 0 rgba(0,0,0,.6),inset 0 0 30px rgba(0,0,0,.6)}
#label .t{position:absolute;left:34px;right:34px;top:46px;font-weight:800;font-size:46px;line-height:1.05;color:#e8f1ff;
  text-shadow:0 0 18px rgba(90,160,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#label .a{position:absolute;left:34px;bottom:36px;font-weight:600;font-size:22px;letter-spacing:.45em;color:rgba(170,200,255,.65)}
#label .mark{position:absolute;right:30px;bottom:30px;width:54px;height:54px;border-radius:50%;
  border:3px solid rgba(160,200,255,.5);box-shadow:0 0 14px rgba(90,160,255,.6)}
#window{position:absolute;left:110px;right:110px;top:310px;height:400px;border-radius:14px;overflow:hidden;background:#02040c;
  box-shadow:0 0 0 3px rgba(0,0,0,.55),0 0 0 6px rgba(255,255,255,.35),inset 0 0 40px rgba(0,0,0,.9)}
#disc{position:absolute;left:50%;top:50%;width:760px;height:760px;margin:-380px;border-radius:50%;
  background:conic-gradient(from 0deg,#071a6b,#1d4fe0,#5fd0ff,#2233a8,#7b45ff,#0b1f8a,#2f8bff,#a0e6ff,#1a2fa3,#071a6b)}
#tracks{position:absolute;left:50%;top:50%;width:760px;height:760px;margin:-380px;border-radius:50%;mix-blend-mode:overlay;
  background:repeating-radial-gradient(circle,rgba(255,255,255,.18) 0 1px,rgba(0,0,0,.12) 1px 3px)}
#irid{position:absolute;inset:0;mix-blend-mode:screen;opacity:.55;
  background:conic-gradient(from 210deg at 50% 50%,transparent 0 20deg,rgba(255,120,255,.35) 35deg,transparent 55deg 200deg,rgba(120,255,240,.35) 220deg,transparent 245deg)}
#hub{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;border-radius:50%;
  background:radial-gradient(circle,#fff 0 22%,#e6f2ff 30%,rgba(140,190,255,.9) 46%,rgba(40,80,200,.0) 72%)}
#hubring{position:absolute;left:50%;top:50%;width:190px;height:190px;margin:-95px;border-radius:50%;
  box-shadow:0 0 0 3px rgba(200,225,255,.65),0 0 0 9px rgba(20,40,120,.5)}
#shutter{position:absolute;left:600px;top:290px;width:300px;height:440px;border-radius:12px;
  background:linear-gradient(90deg,#9aa3ac,#eef2f5 30%,#8b939c 60%,#cfd5db);box-shadow:-6px 0 18px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.5) inset}
#rail{position:absolute;left:60px;right:60px;top:290px;height:6px;border-radius:3px;background:rgba(0,0,0,.35)}
#spec{position:absolute;top:-20%;bottom:-20%;width:220px;mix-blend-mode:overlay;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.95),transparent);transform:skewX(-18deg)}
#bloom{position:absolute;left:540px;top:940px;width:900px;height:900px;margin:-450px;border-radius:50%;pointer-events:none;mix-blend-mode:screen;
  background:radial-gradient(circle,rgba(255,255,255,.55) 0 4%,rgba(150,200,255,.35) 10%,rgba(60,110,255,.12) 28%,transparent 55%)}
#scan{position:absolute;inset:0;pointer-events:none;z-index:80;opacity:.35;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 4px)}
#sweep{position:absolute;left:0;right:0;height:140px;z-index:81;pointer-events:none;mix-blend-mode:screen;
  background:linear-gradient(180deg,transparent,rgba(120,170,255,.08),transparent)}
#name{position:absolute;left:0;right:0;top:1330px;text-align:center}
#name .t{font-weight:800;font-size:64px;letter-spacing:.04em;color:#f4f8ff;text-transform:uppercase;
  text-shadow:0 0 22px rgba(80,150,255,.9),0 0 60px rgba(60,110,255,.6)}
#name .a{margin-top:14px;font-weight:600;font-size:24px;letter-spacing:.55em;color:rgba(170,200,255,.6)}
#grain{opacity:.18}`;
  const body = `<div id="haze"></div>
<div id="md"><div id="brushed"></div>
  <div id="label"><div class="t" id="lt"></div><div class="a">MD · 74</div><div class="mark"></div></div>
  <div id="rail"></div>
  <div id="window"><div id="disc"></div><div id="tracks"></div><div id="irid"></div><div id="hubring"></div><div id="hub"></div></div>
  <div id="shutter"></div>
  <div id="spec"></div>
</div>
<div id="bloom"></div>
<div id="name"><div class="t" id="nt"></div><div class="a">NEX ZAELON</div></div>
<div id="scan"></div><div id="sweep"></div>`;
  const script = `
$('#lt').textContent = D.title; $('#nt').textContent = D.title;
if (D.title.length > 14) $('#nt').style.fontSize = '50px';
if (D.title.length > 22) $('#nt').style.fontSize = '40px';
function render(t, i) {
  const b = bass(i), l = lvl(i);
  const ang = t * 80; // ~4.5 s da bir aylanish
  $('#disc').style.transform = 'rotate(' + ang + 'deg)';
  $('#tracks').style.transform = 'rotate(' + ang + 'deg)';
  // markaziy nur basga qarab yonadi
  const g = 0.82 + b * 0.35;
  $('#hub').style.transform = 'scale(' + g.toFixed(3) + ')';
  $('#bloom').style.opacity = (0.55 + b * 0.55).toFixed(3);
  $('#bloom').style.transform = 'scale(' + (0.9 + b * 0.18).toFixed(3) + ')';
  $('#haze').style.opacity = (0.6 + l * 0.6).toFixed(3);
  // xrom ustidan sekin o'tadigan yorug'lik chizig'i
  const sx = ((t * 0.16) % 1.6 - 0.3) * 1100;
  $('#spec').style.left = sx.toFixed(1) + 'px';
  // kartrij juda sekin "suzadi" (Y2K reklama kadri kabi)
  const y = Math.sin(t * 0.6) * 8, r = Math.sin(t * 0.45) * 0.6;
  $('#md').style.transform = 'translateY(' + y.toFixed(2) + 'px) rotate(' + r.toFixed(3) + 'deg)';
  $('#sweep').style.top = (((t * 260) % 2300) - 200).toFixed(1) + 'px';
  $('#name .t').style.textShadow = '0 0 ' + (18 + b * 22).toFixed(1) + 'px rgba(80,150,255,.9),0 0 ' + (50 + b * 40).toFixed(1) + 'px rgba(60,110,255,.6)';
  const fade = clamp(t / 0.5) * clamp((D.dur - t) / 1.2);
  $('#stage').style.opacity = fade.toFixed(3);
}`;
  return { css, body, script };
}

// Glitch: ffmpeg filtri — tasodifiy (lekin takrorlanuvchi) qisqa portlashlar: rang siljishi + gorizontal polosa siljishi
export function post(dur, seed = 1) {
  const r = (n) => { const x = Math.sin(n * 91.7 + seed * 13.3) * 43758.5453; return x - Math.floor(x); };
  const bursts = [];
  for (let t = 1.2, k = 0; t < dur - 1; k++) { bursts.push([t, 0.07 + r(k) * 0.16]); t += 1.6 + r(k + 50) * 2.8; }
  const en = bursts.map(([a, d]) => `between(t,${a.toFixed(2)},${(a + d).toFixed(2)})`).join('+') || '0';
  const parts = [`rgbashift=rh=-9:bh=9:rv=2:enable='${en}'`];
  bursts.forEach(([a, d], k) => {
    const y = Math.round(300 + r(k + 9) * 1300), h = Math.round(30 + r(k + 19) * 120), dx = Math.round((r(k + 29) - 0.5) * 120);
    parts.push(`split[m${k}][s${k}];[s${k}]crop=1080:${h}:0:${y}[c${k}];[m${k}][c${k}]overlay=${dx}:${y}:enable='between(t,${a.toFixed(2)},${(a + d).toFixed(2)})'`);
  });
  return parts.join(',');
}
