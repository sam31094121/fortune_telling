/* VisualGravityCore — OffscreenCanvas Worker
   所有 Canvas 2D 繪製在這裡跑，完全不佔主執行緒
   主執行緒只收 frame 訊息來更新 DOM / Audio */

let canvas = null;
let ctx = null;
let dpr = 1;
let startTime = null;
let rafId = null;
const totalCycle = 4800;

self.onmessage = function (e) {
  const msg = e.data;
  if (msg.type === 'init') {
    canvas = msg.canvas;
    ctx = canvas.getContext('2d');
    dpr = msg.dpr;
    startTime = msg.startTime;
    canvas.width = msg.width;
    canvas.height = msg.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rafId = requestAnimationFrame(draw);
  } else if (msg.type === 'resize') {
    if (!canvas || !ctx) return;
    dpr = msg.dpr;
    canvas.width = msg.width;
    canvas.height = msg.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else if (msg.type === 'skipIntro') {
    startTime = performance.now() - 5200;
  } else if (msg.type === 'stop') {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  } else if (msg.type === 'resume') {
    if (!rafId && canvas) rafId = requestAnimationFrame(draw);
  }
};

function draw(now) {
  if (!ctx || !canvas || !startTime) {
    rafId = requestAnimationFrame(draw);
    return;
  }

  const t = (now - startTime) % totalCycle;
  const elapsed = now - startTime;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Funnel vignette
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
  vg.addColorStop(0, 'rgba(255,255,255,0.0)');
  vg.addColorStop(0.2, 'rgba(255,255,255,0.01)');
  vg.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // breathing (0–2800ms)
  const breatheT = Math.min(1, Math.max(0, t / 2800));

  // contraction (2800–4600ms)
  const inT = t < 2800 ? 0 : Math.min(1, (t - 2800) / 1800);

  // explosion (4600–4800ms)
  const expT = t < 4600 ? 0 : Math.min(1, (t - 4600) / 200);

  // slight 3D warp during contraction/explosion
  const warp = (inT * 0.08 + expT * 0.15) * (1 - Math.abs(0.5 - breatheT));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1 + warp, 0, 0, 1 - warp, 0, 0);
  ctx.translate(-cx, -cy);

  // three directional energy flows
  const dirs = [
    { dx: 0,     dy: -1,  color: 'rgba(148,52,248,0.9)' },
    { dx: -0.86, dy: 0.5, color: 'rgba(214,170,88,0.95)' },
    { dx: 0.86,  dy: 0.5, color: 'rgba(255,255,240,0.98)' },
  ];

  dirs.forEach((dir) => {
    const progress = inT;
    const beamWidth = 60 * (1 - progress) + 6;
    const length = Math.hypot(w, h) * 0.9;
    const sx = cx + dir.dx * length * (1 + (1 - progress) * 0.05);
    const sy = cy + dir.dy * length * (1 + (1 - progress) * 0.05);

    const grd = ctx.createLinearGradient(sx, sy, cx, cy);
    const stopA = Math.max(0, 0.05 + (1 - progress) * 0.4);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    const lastComma = dir.color.lastIndexOf(',');
    const baseColor = lastComma >= 0 ? dir.color.slice(0, lastComma + 1) : dir.color;
    grd.addColorStop(stopA, baseColor + '0.15)');
    grd.addColorStop(Math.min(1, 1 - expT * 0.5), baseColor + '0.9)');

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (-dir.dy) * beamWidth, sy + dir.dx * beamWidth);
    ctx.lineTo(cx, cy);
    ctx.lineTo(sx - (-dir.dy) * beamWidth, sy - dir.dx * beamWidth);
    ctx.closePath();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  });

  ctx.restore();

  // core glow
  const coreSize = 20;
  const coreInner = coreSize * (1 + expT * 5 + inT * 0.4);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreInner * 4);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.08 + expT * 0.1, 'rgba(255,250,230,0.98)');
  glow.addColorStop(0.25 + expT * 0.2, 'rgba(220,190,255,0.28)');
  glow.addColorStop(0.45 + expT * 0.25, 'rgba(140,80,240,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, coreInner * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // chromatic rings
  for (let r = 0; r < 3; r++) {
    const radius = coreInner * (0.9 + r * 0.6 + expT * 2);
    const alpha = 0.18 - r * 0.04 + expT * 0.25;
    ctx.beginPath();
    ctx.lineWidth = 1 + r;
    ctx.strokeStyle =
      r === 0 ? `rgba(255,245,220,${alpha})`
      : r === 1 ? `rgba(214,170,88,${alpha * 0.7})`
      : `rgba(148,52,248,${alpha * 0.6})`;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // central fixed core — white center
  ctx.beginPath();
  ctx.arc(cx, cy, coreInner * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // platinum ring
  ctx.beginPath();
  ctx.arc(cx, cy, coreInner * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(230,230,255,0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // sparkles
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + now * 0.0002 * (i + 1);
    ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * (coreInner * (1.8 + i * 0.06)),
      cy + Math.sin(angle) * (coreInner * (1.8 + i * 0.06)),
      0.8 + i * 0.2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // dynamic vignette during contraction
  const edgeDark = 0.45 + inT * 0.45 + expT * 0.6;
  ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, edgeDark)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(w, h) * 0.8, 0, Math.PI * 2);
  ctx.rect(w, 0, -w, h);
  ctx.fill();

  // explosion particle rays
  if (expT > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rays = Math.min(36, 8 + Math.round(expT * 60));
    for (let r = 0; r < rays; r++) {
      const ang = (r / rays) * Math.PI * 2 + now * 0.0005 * r;
      const len = coreInner * (4 + expT * 18 + Math.random() * 6);
      ctx.strokeStyle = `rgba(255,240,220,${0.06 + expT * 0.6})`;
      ctx.lineWidth = 1 + Math.random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * coreInner * 0.6, cy + Math.sin(ang) * coreInner * 0.6);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 通知主執行緒做 DOM / Audio 更新
  self.postMessage({ type: 'frame', inT, expT, elapsed, now });

  rafId = requestAnimationFrame(draw);
}
