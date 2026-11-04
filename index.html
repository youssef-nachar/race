<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#9bc9e7">
<title>Street Racing 41000 • 3D Multiplayer</title>
<link rel="stylesheet" href="./style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
<script type="module">
// Three.js no longer ships a reliable classic global build on many CDNs.
// Load the ES module, expose it as window.THREE, then start the classic game.js.
const sources = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm',
  'https://esm.sh/three@0.160.0',
  'https://unpkg.com/three@0.160.0/build/three.module.js'
];
let THREE = null;
for (const url of sources) {
  try {
    THREE = await import(url);
    if (THREE && THREE.Scene && THREE.WebGLRenderer) break;
    THREE = null;
  } catch (error) {
    console.warn('Three.js source unavailable:', url, error);
  }
}
if (THREE) {
  window.THREE = THREE;
  const game = document.createElement('script');
  game.src = './game.js';
  game.onerror = () => showThreeError('تعذر تحميل ملف game.js. تأكد أن الملف موجود بجانب index.html.');
  document.body.appendChild(game);
} else {
  showThreeError('تعذر تحميل مكتبة Three.js. تحقق من اتصال الإنترنت أو جرّب شبكة أخرى.');
}
function showThreeError(message) {
  const warning = document.createElement('div');
  warning.style.cssText = 'position:fixed;z-index:99999;inset:0;background:#101820;color:white;display:grid;place-items:center;padding:24px;text-align:center;font:16px system-ui';
  warning.innerHTML = '<div><h2>مشكلة في تشغيل اللعبة</h2><p></p><button style="padding:12px 20px;border:0;border-radius:10px">إعادة المحاولة</button></div>';
  warning.querySelector('p').textContent = message;
  warning.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(warning);
}
</script>
</head>
<body class="host">
<canvas id="gameCanvas"></canvas>
<div class="hud">
  <header><div class="brand"><span class="brand-mark">🏎️</span><div><strong>STREET RACING</strong><small>3D CITY • MULTIPLAYER 41000</small></div></div>
  <div class="top-actions"><span id="connection-pill" class="pill">● CONNECTING</span><button id="pause-btn" class="icon-btn" title="Pause">Ⅱ</button><button id="sound-btn" class="icon-btn" title="Toggle sound">♫</button></div></header>
  <section class="lobby glass" id="lobby">
    <div class="eyebrow">3D CITY RACING</div><h1>Bring your<br><em>crew.</em></h1>
    <p>Scan the QR code with each phone to turn it into a racing controller.</p>
    <div class="join-grid"><div id="qrcode" class="qr"></div><div><div class="label">ROOM CODE</div><div id="room-code" class="room-code">Generating…</div><div id="host-status" class="status">Starting connection…</div><button id="copy-link" class="secondary">COPY INVITE LINK ↗</button><button id="start-game-btn" class="primary start-game">START GAME <span>▶</span></button></div></div>
    <div class="lobby-footer"><span>UP TO 8 DRIVERS</span><span>WASD / ARROWS ALSO WORK</span></div>
  </section>
  <section class="race-hud" id="race-hud" hidden>
    <div class="race-title"><span class="eyebrow">LAP <b id="lap">1</b> / 3</span><strong id="timer">00:00.0</strong></div>
    <div id="leaderboard" class="leaderboard"></div><div class="race-message" id="race-message">3 • 2 • 1 • GO!</div>
  </section>
  <div class="bottom-hint" id="bottom-hint">WAITING FOR DRIVERS <span>✦</span> CONNECT A PHONE TO START</div>
</div>

</body></html>
