// 3 — CD qutisi: qop-qora fon, tepadan ko'rinish, shaffof plastik quti, ichida kumush CD sekin soat yo'nalishida
// aylanadi; diskka qo'shiq muqovasi oq-qora qilib bosilgan. Yumshoq studiya yorug'i, plastik qirralarida oq chaqnash.
export function scene() {
  const css = `
#light{position:absolute;inset:0;background:radial-gradient(ellipse 70% 45% at 50% 30%,rgba(255,255,255,.07),transparent 70%)}
#case{position:absolute;left:110px;top:500px;width:860px;height:758px;border-radius:12px;
  background:linear-gradient(140deg,rgba(255,255,255,.07),rgba(255,255,255,.015) 45%,rgba(255,255,255,.05));
  box-shadow:0 60px 120px rgba(0,0,0,.9),0 0 0 1.5px rgba(255,255,255,.22) inset}
#hinge{position:absolute;left:0;top:0;bottom:0;width:58px;border-radius:12px 0 0 12px;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.10) 0 2px,rgba(255,255,255,.02) 2px 7px),linear-gradient(90deg,#1b1b1d,#0d0d0e)}
#tray{position:absolute;left:78px;top:22px;right:22px;bottom:22px;border-radius:8px;background:radial-gradient(circle at 50% 50%,#121214,#070708 70%);
  box-shadow:0 0 0 1px rgba(255,255,255,.06) inset}
#rosette{position:absolute;left:50%;top:50%;width:130px;height:130px;margin:-65px;border-radius:50%;
  background:repeating-conic-gradient(rgba(255,255,255,.18) 0 6deg,transparent 6deg 30deg);opacity:.5}
#disc{position:absolute;left:50%;top:50%;width:660px;height:660px;margin:-330px;border-radius:50%}
#disc .base{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 20deg,#cfd3d8,#8c9198,#e9ecef,#7e848b,#d7dade,#9aa0a7,#f2f4f6,#868c93,#cfd3d8)}
#disc .rings{position:absolute;inset:0;border-radius:50%;
  background:repeating-radial-gradient(circle,rgba(255,255,255,.05) 0 1px,rgba(0,0,0,.04) 1px 3px)}
#print{position:absolute;inset:0;border-radius:50%;background-size:cover;background-position:center;
  filter:grayscale(1) contrast(1.45) brightness(1.05);
  -webkit-mask:radial-gradient(circle,transparent 0 35.5%,#000 36% 98.6%,transparent 99%)}
#hubclear{position:absolute;left:50%;top:50%;width:192px;height:192px;margin:-96px;border-radius:50%;
  background:radial-gradient(circle,transparent 0 41%,rgba(255,255,255,.10) 42% 47%,rgba(255,255,255,.04) 48% 92%,rgba(255,255,255,.22) 93% 95%,transparent 96%)}
#hole{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px;border-radius:50%;background:#050506;
  box-shadow:0 0 0 2px rgba(255,255,255,.25),0 0 18px rgba(0,0,0,.9) inset}
#sheen{position:absolute;inset:0;border-radius:50%;mix-blend-mode:screen;
  background:conic-gradient(from 300deg,transparent 0 8deg,rgba(255,255,255,.55) 14deg,transparent 22deg 165deg,rgba(255,255,255,.35) 175deg,transparent 186deg 360deg);
  -webkit-mask:radial-gradient(circle,transparent 0 15%,#000 16% 99%,transparent 99.5%)}
#lid{position:absolute;inset:0;border-radius:12px;pointer-events:none;
  background:linear-gradient(118deg,transparent 0 30%,rgba(255,255,255,.09) 34%,rgba(255,255,255,.02) 41%,transparent 47% 70%,rgba(255,255,255,.05) 74%,transparent 79%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.55),inset 2px 0 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(255,255,255,.12),inset -2px 0 0 rgba(255,255,255,.18)}
#edge{position:absolute;left:58px;top:0;bottom:0;width:2px;background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.1))}
#caption{position:absolute;left:0;right:0;top:1340px;text-align:center}
#caption .t{font-weight:600;font-size:44px;letter-spacing:.22em;text-transform:uppercase;color:#f2f2f2}
#caption .a{margin-top:18px;font-weight:600;font-size:24px;letter-spacing:.5em;color:rgba(255,255,255,.45)}
#caption .line{width:120px;height:1px;margin:30px auto 0;background:rgba(255,255,255,.25)}
#grain{opacity:.16}`;
  const body = `<div id="light"></div>
<div id="case"><div id="hinge"></div><div id="tray"><div id="rosette"></div>
  <div id="disc"><div class="base"></div><div class="rings"></div><div id="print"></div><div id="hubclear"></div><div id="hole"></div><div id="sheen"></div></div>
</div><div id="edge"></div><div id="lid"></div></div>
<div id="caption"><div class="t" id="title"></div><div class="a">NEX ZAELON</div><div class="line"></div></div>`;
  const script = `
$('#print').style.backgroundImage = 'url(' + D.cover + ')';
$('#title').textContent = D.title;
if (D.title.length > 18) $('#title').style.fontSize = '36px';
function render(t, i) {
  // disk: soat yo'nalishida, 1 aylanish ~ 7 soniya; sheen (yorug'lik aksi) joyida qoladi — haqiqiy CD kabi
  const ang = t * 51.4;
  $('#print').style.transform = 'rotate(' + ang + 'deg)';
  $('#disc .rings').style.transform = 'rotate(' + ang + 'deg)';
  $('#disc .base').style.transform = 'rotate(' + (ang * 0.15) + 'deg)';
  $('#hubclear').style.transform = 'rotate(' + ang + 'deg)';
  // studiya yorug'i musiqa bilan juda sekin "nafas oladi"
  const l = lvl(i);
  $('#light').style.opacity = (0.75 + l * 0.35).toFixed(3);
  $('#sheen').style.opacity = (0.75 + 0.25 * Math.sin(t * 0.9) + l * 0.15).toFixed(3);
  // yengil kirish/chiqish
  const fade = clamp(t / 0.6) * clamp((D.dur - t) / 1.2);
  $('#stage').style.opacity = fade.toFixed(3);
}`;
  return { css, body, script };
}
