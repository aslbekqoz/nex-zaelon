// 2 — Okean: shom paytidagi qorong'i, tund okean (rasm har qo'shiq uchun FLUX'da chiziladi), suv sekin to'lqinlanadi,
// ko'piklarda iliq oltin yorug'lik jilolanadi, donador plyonka, xira teal/ko'mir ranglar, shtativ kadri.
// Pastki uchdan bir qism qorong'i va sokin — u yerda qo'shiq nomi va ingichka pleyer chizig'i.
export function scene() {
  const css = `
#sea{position:absolute;left:-40px;top:-40px;width:1160px;height:2000px;overflow:hidden}
#sea img{position:absolute;left:0;top:0;width:1160px;height:2000px;object-fit:cover;filter:saturate(.62) contrast(1.12) brightness(.82) sepia(.08)}
#waterWrap{position:absolute;left:-200px;top:0;width:1560px;height:2000px;filter:url(#wave);
  -webkit-mask:linear-gradient(180deg,transparent 0 30%,#000 46% 100%)}
#waterWrap img{position:absolute;top:0;width:1160px;height:2000px;object-fit:cover;filter:saturate(.62) contrast(1.12) brightness(.82) sepia(.08)}
#gold{position:absolute;inset:0;mix-blend-mode:soft-light;
  background:radial-gradient(ellipse 60% 18% at 50% 52%,rgba(255,190,110,.55),transparent 70%)}
#teal{position:absolute;inset:0;mix-blend-mode:color;opacity:.28;background:linear-gradient(180deg,#2c4a52,#1f3036 60%,#161b1d)}
#sky{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,24,26,.55),transparent 32%)}
#low{position:absolute;left:0;right:0;bottom:0;height:820px;background:linear-gradient(0deg,rgba(6,8,9,.94) 0%,rgba(6,8,9,.78) 45%,transparent 100%)}
#flick{position:absolute;inset:0;background:#000;opacity:0}
#info{position:absolute;left:96px;right:96px;bottom:250px}
#info .t{font-weight:600;font-size:60px;line-height:1.1;color:#eef2f1}
#info .a{margin-top:14px;font-weight:600;font-size:24px;letter-spacing:.42em;color:rgba(220,230,228,.6)}
#line{position:relative;margin-top:56px;height:3px;border-radius:2px;background:rgba(255,255,255,.22)}
#fill{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:rgba(255,236,205,.95)}
#dot{position:absolute;top:-6px;width:15px;height:15px;margin-left:-7px;border-radius:50%;background:#ffecd0;box-shadow:0 0 12px rgba(255,210,150,.9)}
#times{display:flex;justify-content:space-between;margin-top:18px;font-weight:600;font-size:20px;color:rgba(230,236,234,.6)}
#ctl{display:flex;justify-content:center;align-items:center;gap:90px;margin-top:34px}
#ctl svg{fill:rgba(240,244,243,.9)}
#grain{opacity:.32}`;
  const play = '<svg width="58" height="58" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const prev = '<svg width="38" height="38" viewBox="0 0 24 24"><path d="M6 6h2v12H6zM9.5 12 18 6v12z"/></svg>';
  const next = '<svg width="38" height="38" viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>';
  const body = `<svg width="0" height="0" style="position:absolute"><filter id="wave" x="0" y="0" width="100%" height="100%">
  <feTurbulence id="turb" type="fractalNoise" baseFrequency="0.0035 0.018" numOctaves="2" seed="3"/>
  <feDisplacementMap id="disp" in="SourceGraphic" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
<div id="sea"><img id="bg"><div id="waterWrap"><img id="wv"></div></div>
<div id="teal"></div><div id="gold"></div><div id="sky"></div><div id="low"></div>
<div id="info"><div class="t" id="tt"></div><div class="a">NEX ZAELON</div>
  <div id="line"><div id="fill"></div><div id="dot"></div></div>
  <div id="times"><span id="t0">0:00</span><span id="t1">0:00</span></div>
  <div id="ctl">${prev}${play}${next}</div></div>
<div id="flick"></div>`;
  const script = `
$('#bg').src = D.cover; $('#wv').src = D.cover;
$('#tt').textContent = D.title;
if (D.title.length > 20) $('#tt').style.fontSize = '48px';
$('#t1').textContent = mmss(D.total || D.dur);
function render(t, i) {
  const l = lvl(i), b = bass(i);
  // shtativ: kamera qimirlamaydi, faqat juda sekin "push-in" (sezilar-sezilmas)
  const z = 1 + t * 0.0022;
  $('#sea').style.transform = 'scale(' + z.toFixed(4) + ')';
  // suv harakati: shovqin maydoni rasmga nisbatan sekin suriladi -> to'lqinlanish, slow-motion
  const v = t * 22;
  $('#waterWrap').style.transform = 'translate(' + (-v).toFixed(2) + 'px,0)';
  $('#wv').style.left = (200 + v).toFixed(2) + 'px';
  $('#disp').setAttribute('scale', (22 + 8 * Math.sin(t * 0.5) + b * 6).toFixed(2));
  // ko'pikdagi oltin yorug'lik jilosi
  $('#gold').style.opacity = (0.55 + 0.25 * Math.sin(t * 0.8) + l * 0.25).toFixed(3);
  $('#gold').style.transform = 'translateX(' + (Math.sin(t * 0.21) * 60).toFixed(1) + 'px)';
  // plyonka miltillashi
  $('#flick').style.opacity = (0.03 + rnd(i * 1.37) * 0.05).toFixed(3);
  const p = clamp(((D.offset || 0) + t) / (D.total || D.dur));
  $('#fill').style.width = (p * 100).toFixed(2) + '%'; $('#dot').style.left = (p * 100).toFixed(2) + '%';
  $('#t0').textContent = mmss((D.offset || 0) + t);
  const fade = clamp(t / 0.8) * clamp((D.dur - t) / 1.4);
  $('#stage').style.opacity = fade.toFixed(3);
}`;
  return { css, body, script };
}
