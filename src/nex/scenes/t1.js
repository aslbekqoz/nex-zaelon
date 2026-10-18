// 1 — Planshet: qorong'i stol ustida yotgan planshet, qo'l kamerasi ~30° past burchakdan, sekin tebranish va
// "fokus nafasi". Ekranda minimal pleyer: chapda kvadrat muqova, ostida tugmalar va ingichka progress chizig'i,
// o'ng yarmida xira (frosted) panel — qo'shiq nomi va musiqaga mos ekvalayzer. Ekran foni — pushti/magenta/binafsha
// suyuq yorug'likdek sekin oqadigan gradient; ekran nuri stolda aks etadi. Sayoz chuqurlik (DOF).
export function scene() {
  const css = `
#room{position:absolute;inset:0;background:radial-gradient(ellipse 90% 55% at 50% 58%,#1a0d1a 0%,#0a060a 55%,#030203 100%)}
#cam{position:absolute;inset:0;perspective:1500px;perspective-origin:50% 26%}
#world{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
#desk{position:absolute;left:-1400px;top:-1500px;width:2800px;height:3000px;
  background:
    radial-gradient(ellipse 30% 22% at 50% 50%,rgba(255,40,170,.32),rgba(150,30,200,.12) 45%,transparent 70%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0 3px,rgba(0,0,0,.05) 3px 11px,rgba(255,255,255,.01) 11px 17px),
    linear-gradient(180deg,#120c0f,#0b0709 60%,#070506)}
#glow{position:absolute;left:-760px;top:-560px;width:1520px;height:1120px;border-radius:50%;
  background:radial-gradient(ellipse at 50% 50%,rgba(255,50,170,.42),rgba(160,40,220,.18) 40%,transparent 70%)}
#tablet{position:absolute;left:-520px;top:-350px;width:1040px;height:700px;border-radius:54px;transform-style:preserve-3d;
  background:linear-gradient(145deg,#2a2a2e,#0c0c0e 40%,#18181b);
  box-shadow:0 0 0 2px #3a3a40,0 0 0 4px #0a0a0b,0 40px 80px rgba(0,0,0,.85)}
#screen{position:absolute;left:34px;top:34px;width:972px;height:632px;border-radius:24px;overflow:hidden;background:#1a0630}
.blob{position:absolute;width:900px;height:900px;margin:-450px;border-radius:50%}
#b1{background:radial-gradient(circle,rgba(255,45,149,.95),rgba(255,45,149,0) 62%)}
#b2{background:radial-gradient(circle,rgba(194,31,214,.9),rgba(194,31,214,0) 62%)}
#b3{background:radial-gradient(circle,rgba(91,33,255,.95),rgba(91,33,255,0) 62%)}
#b4{background:radial-gradient(circle,rgba(255,120,200,.55),rgba(255,120,200,0) 60%)}
#cover{position:absolute;left:58px;top:62px;width:340px;height:340px;border-radius:20px;background-size:cover;background-position:center;
  box-shadow:0 24px 50px rgba(30,0,40,.55),0 0 0 1px rgba(255,255,255,.18)}
#ctrl{position:absolute;left:58px;top:440px;width:340px;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 30px}
#ctrl svg{fill:#fff;opacity:.95}
#bar{position:absolute;left:58px;top:536px;width:340px;height:5px;border-radius:3px;background:rgba(255,255,255,.28)}
#fill{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#fff}
#knob{position:absolute;top:-6px;width:17px;height:17px;margin-left:-8px;border-radius:50%;background:#fff;box-shadow:0 0 10px rgba(255,255,255,.8)}
#tl,#tr{position:absolute;top:556px;font-weight:600;font-size:17px;color:rgba(255,255,255,.75)}
#tl{left:58px}#tr{left:338px;width:60px;text-align:right}
#panel{position:absolute;left:446px;top:62px;width:468px;height:508px;border-radius:26px;
  background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.05));box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
#pt{position:absolute;left:40px;right:30px;top:52px;font-weight:800;font-size:50px;line-height:1.08;color:#fff;text-shadow:0 4px 24px rgba(60,0,80,.45)}
#pa{position:absolute;left:40px;top:200px;font-weight:600;font-size:24px;letter-spacing:.3em;color:rgba(255,255,255,.72)}
#eq{position:absolute;left:40px;right:40px;bottom:46px;height:170px;display:flex;align-items:flex-end;gap:7px}
#eq i{flex:1;border-radius:6px;background:linear-gradient(0deg,rgba(255,255,255,.95),rgba(255,200,240,.65))}
#glare{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(115deg,transparent 0 28%,rgba(255,255,255,.13) 33%,rgba(255,255,255,.03) 42%,transparent 50%)}
#dofTop{position:absolute;left:0;right:0;top:0;height:760px;z-index:20;-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);
  -webkit-mask:linear-gradient(180deg,#000 0%,#000 40%,transparent 100%)}
#dofBot{position:absolute;left:0;right:0;bottom:0;height:620px;z-index:20;-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);
  -webkit-mask:linear-gradient(0deg,#000 0%,#000 35%,transparent 100%)}
#bokeh{position:absolute;inset:0;z-index:21;pointer-events:none;mix-blend-mode:screen}
#bokeh b{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,120,210,.35),rgba(255,120,210,0) 70%)}
#grain{opacity:.2}`;
  const bars = Array.from({ length: 16 }, () => '<i></i>').join('');
  const play = '<svg width="54" height="54" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const prev = '<svg width="36" height="36" viewBox="0 0 24 24"><path d="M6 6h2v12H6zM9.5 12 18 6v12z"/></svg>';
  const next = '<svg width="36" height="36" viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>';
  const body = `<div id="room"></div>
<div id="cam"><div id="world">
  <div id="desk"></div><div id="glow"></div>
  <div id="tablet"><div id="screen">
    <div class="blob" id="b1"></div><div class="blob" id="b2"></div><div class="blob" id="b3"></div><div class="blob" id="b4"></div>
    <div id="cover"></div>
    <div id="ctrl">${prev}${play}${next}</div>
    <div id="bar"><div id="fill"></div><div id="knob"></div></div><div id="tl">0:00</div><div id="tr">0:00</div>
    <div id="panel"><div id="pt"></div><div id="pa">NEX ZAELON</div><div id="eq">${bars}</div></div>
    <div id="glare"></div>
  </div></div>
</div></div>
<div id="dofTop"></div><div id="dofBot"></div><div id="bokeh"></div>`;
  const script = `
$('#cover').style.backgroundImage = 'url(' + D.cover + ')';
$('#pt').textContent = D.title;
if (D.title.length > 16) $('#pt').style.fontSize = '40px';
if (D.title.length > 26) $('#pt').style.fontSize = '32px';
$('#tr').textContent = mmss(D.total || D.dur);
const EQ = [...document.querySelectorAll('#eq i')];
// fokusdan tashqaridagi yorug' dog'lar (bokeh)
const BK = $('#bokeh');
for (let k = 0; k < 7; k++) { const e = document.createElement('b'); const s = 80 + rnd(k + 40) * 160;
  e.style.cssText = 'left:' + (rnd(k + 1) * 1000) + 'px;top:' + (rnd(k + 11) < 0.5 ? rnd(k + 21) * 420 : 1500 + rnd(k + 31) * 380) + 'px;width:' + s + 'px;height:' + s + 'px';
  BK.appendChild(e); }
function render(t, i) {
  // qo'l kamerasi: juda sekin, silliq siljish + mayda aylanish
  const dx = drift(t, 0.35, 1) * 16, dy = drift(t, 0.3, 2) * 12, rz = drift(t, 0.25, 3) * 0.7, rx = drift(t, 0.2, 4) * 1.2;
  $('#world').style.transform = 'translate(' + dx.toFixed(2) + 'px,' + (-70 + dy).toFixed(2) + 'px) scale(0.84) rotateX(' + (52 + rx).toFixed(3) + 'deg) rotateZ(' + (-7 + rz).toFixed(3) + 'deg)';
  // fokus "nafas oladi"
  const fb = 0.5 + 0.5 * Math.sin(t * 0.55);
  $('#dofTop').style.backdropFilter = $('#dofTop').style.webkitBackdropFilter = 'blur(' + (5 + fb * 4).toFixed(2) + 'px)';
  $('#dofBot').style.backdropFilter = $('#dofBot').style.webkitBackdropFilter = 'blur(' + (7 + (1 - fb) * 4).toFixed(2) + 'px)';
  // suyuq gradient
  const P = (k, ax, ay, sp) => [486 + Math.sin(t * sp + k) * ax, 316 + Math.cos(t * sp * 0.8 + k * 1.7) * ay];
  [[1, 380, 220, 0.42], [2, 420, 260, 0.33], [3, 360, 240, 0.51], [4, 300, 200, 0.27]].forEach(([k, ax, ay, sp]) => {
    const [x, y] = P(k * 1.9, ax, ay, sp); const el = $('#b' + k);
    el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
    el.style.transform = 'scale(' + (1 + 0.12 * Math.sin(t * 0.7 + k)).toFixed(3) + ')';
  });
  // progress
  const p = clamp(((D.offset || 0) + t) / (D.total || D.dur));
  $('#fill').style.width = (p * 100).toFixed(2) + '%'; $('#knob').style.left = (p * 100).toFixed(2) + '%';
  $('#tl').textContent = mmss((D.offset || 0) + t);
  // ekvalayzer — haqiqiy ovoz polosalari
  EQ.forEach((e, k) => { const v = band(i, Math.min(23, Math.round(k * 1.4 + 1))); e.style.height = (8 + v * 92).toFixed(1) + '%'; });
  // ekran nuri stolda — musiqa bilan
  const l = lvl(i), b = bass(i);
  $('#glow').style.opacity = (0.65 + l * 0.35 + b * 0.15).toFixed(3);
  $('#screen').style.filter = 'brightness(' + (0.95 + b * 0.1).toFixed(3) + ')';
  BK.style.opacity = (0.55 + l * 0.35).toFixed(3);
  const fade = clamp(t / 0.6) * clamp((D.dur - t) / 1.2);
  $('#stage').style.opacity = fade.toFixed(3);
}`;
  return { css, body, script };
}
