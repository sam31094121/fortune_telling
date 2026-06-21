"use client";

import React, { useEffect, useRef, useState } from "react";

export default function VisualGravityCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const coreTextRef = useRef<HTMLDivElement | null>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const startRef = useRef<number>(performance.now());
  const transferredRef = useRef(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.style.willChange = "transform";

    const turbEl = document.getElementById("vgc-turb") as SVGElement | null;
    const dispEl = document.getElementById("vgc-disp") as SVGElement | null;
    const focusRef = { current: false } as { current: boolean };
    const explodeRef = { current: false } as { current: boolean };

    // --- OffscreenCanvas path (Chrome / Edge / Firefox 105+) ---
    if (typeof (canvas as any).transferControlToOffscreen === 'function') {
      let worker: Worker;

      if (!transferredRef.current) {
        // 第一次：transfer canvas 並建立 Worker
        transferredRef.current = true;
        const offscreen = (canvas as any).transferControlToOffscreen() as OffscreenCanvas;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        worker = new Worker('/vgc-worker.js');
        workerRef.current = worker;
        worker.postMessage(
          { type: 'init', canvas: offscreen,
            width: Math.max(1, Math.floor(rect.width * dpr)),
            height: Math.max(1, Math.floor(rect.height * dpr)),
            dpr, startTime: startRef.current },
          [offscreen]
        );
      } else {
        // Strict Mode 第二次：Worker 仍存活，重新掛 onmessage 並繼續
        worker = workerRef.current!;
        worker.postMessage({ type: 'resume' });
      }

      worker.onmessage = function (e) {
        const { type, inT, expT, elapsed, now } = e.data;
        if (type !== 'frame') return;

        // SVG filter — 只在動畫激活時更新
        if ((inT > 0.001 || expT > 0.001) && turbEl && dispEl) {
          turbEl.setAttribute('baseFrequency', (0.0008 + inT * 0.018 + expT * 0.06).toFixed(5));
          dispEl.setAttribute('scale', String(Math.round(Math.min(120, 6 + inT * 42 + expT * 220))));
        }

        // body class toggle
        const body = document.body;
        const focusOn = inT > 0.08;
        if (focusOn && !focusRef.current) { body.classList.add('vgc-focus'); focusRef.current = true; }
        else if (!focusOn && focusRef.current) { body.classList.remove('vgc-focus'); focusRef.current = false; }
        if (expT > 0 && !explodeRef.current) { body.classList.add('vgc-explode'); explodeRef.current = true; }
        else if (expT === 0 && explodeRef.current) { body.classList.remove('vgc-explode'); explodeRef.current = false; }

        // audio sync
        if (gainRef.current && audioCtxRef.current) {
          try {
            const ac = audioCtxRef.current;
            if (expT > 0) gainRef.current.gain.setTargetAtTime(0.35, ac.currentTime, 0.02);
            else if (inT > 0.02) gainRef.current.gain.setTargetAtTime(0.06 + inT * 0.08, ac.currentTime, 0.12);
            else gainRef.current.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
          } catch (_) {}
        }

        // core text — 天地人字體動畫
        try {
          const core = coreTextRef.current;
          if (core) {
            core.style.opacity = '1';
            const chars = charRefs.current;
            for (let i = 0; i < 3; i++) {
              const el = chars[i];
              if (!el) continue;
              const baseScale = 1 + Math.sin((now + i * 120) * 0.002) * 0.012;
              const pull = 1 + inT * 0.08;
              const burst = 1 + expT * (0.9 + i * 0.15);
              el.style.transform = `translate3d(0, ${-inT * 8 + i * 2}px, 0) scale(${baseScale * pull * burst})`;
              const glow = 0.12 + expT * 0.6 + i * 0.02;
              el.style.textShadow = `0 0 ${12 * glow}px rgba(255,245,220,${0.85 * glow}), 0 0 ${28 * glow}px rgba(139,92,246,${0.5 * glow})`;
              el.style.opacity = String(0.9 - inT * 0.3 + expT * 0.35);
            }
          }
        } catch (_) {}
      };

      function resizeWorker() {
        const d = window.devicePixelRatio || 1;
        const r = canvas.getBoundingClientRect();
        worker.postMessage({
          type: 'resize',
          width: Math.max(1, Math.floor(r.width * d)),
          height: Math.max(1, Math.floor(r.height * d)),
          dpr: d,
        });
      }

      window.addEventListener('resize', resizeWorker);

      return () => {
        // 只暫停 RAF，不 terminate — Strict Mode cleanup 後還需要 Worker 繼續
        worker.postMessage({ type: 'stop' });
        if ((gainRef.current as any)?._pulseInterval) clearInterval((gainRef.current as any)._pulseInterval);
        window.removeEventListener('resize', resizeWorker);
      };
    }

    // --- Fallback: 主執行緒 RAF（不支援 OffscreenCanvas 的環境）---
    const ctx = canvas.getContext('2d')!;
    let dpr = window.devicePixelRatio || 1;
    const totalCycle = 4800;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(now: number) {
      const t = (now - startRef.current) % totalCycle;
      const elapsed = now - startRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
      vg.addColorStop(0, 'rgba(255,255,255,0.0)');
      vg.addColorStop(0.2, 'rgba(255,255,255,0.01)');
      vg.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      const breatheT = Math.min(1, Math.max(0, t / 2800));
      const inT = t < 2800 ? 0 : Math.min(1, (t - 2800) / 1800);
      const expT = t < 4600 ? 0 : Math.min(1, (t - 4600) / 200);

      const warp = (inT * 0.08 + expT * 0.15) * (1 - Math.abs(0.5 - breatheT));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1 + warp, 0, 0, 1 - warp, 0, 0);
      ctx.translate(-cx, -cy);

      const dirs = [
        { dx: 0, dy: -1, color: 'rgba(148,52,248,0.9)' },
        { dx: -0.86, dy: 0.5, color: 'rgba(214,170,88,0.95)' },
        { dx: 0.86, dy: 0.5, color: 'rgba(255,255,240,0.98)' },
      ];

      dirs.forEach((dir) => {
        const beamWidth = 60 * (1 - inT) + 6;
        const length = Math.hypot(w, h) * 0.9;
        const sx = cx + dir.dx * length * (1 + (1 - inT) * 0.05);
        const sy = cy + dir.dy * length * (1 + (1 - inT) * 0.05);
        const grd = ctx.createLinearGradient(sx, sy, cx, cy);
        const stopA = Math.max(0, 0.05 + (1 - inT) * 0.4);
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

      if ((inT > 0.001 || expT > 0.001) && turbEl && dispEl) {
        turbEl.setAttribute('baseFrequency', (0.0008 + inT * 0.018 + expT * 0.06).toFixed(5));
        dispEl.setAttribute('scale', String(Math.round(Math.min(120, 6 + inT * 42 + expT * 220))));
      }

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

      for (let r = 0; r < 3; r++) {
        const radius = coreInner * (0.9 + r * 0.6 + expT * 2);
        const alpha = 0.18 - r * 0.04 + expT * 0.25;
        ctx.beginPath();
        ctx.lineWidth = 1 + r;
        ctx.strokeStyle = r === 0 ? `rgba(255,245,220,${alpha})` : r === 1 ? `rgba(214,170,88,${alpha * 0.7})` : `rgba(148,52,248,${alpha * 0.6})`;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, coreInner * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, coreInner * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(230,230,255,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + now * 0.0002 * (i + 1);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * (coreInner * (1.8 + i * 0.06)), cy + Math.sin(angle) * (coreInner * (1.8 + i * 0.06)), 0.8 + i * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      const edgeDark = 0.45 + inT * 0.45 + expT * 0.6;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, edgeDark)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(w, h) * 0.8, 0, Math.PI * 2);
      ctx.rect(w, 0, -w, h);
      ctx.fill();

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

      try {
        const body = document.body;
        const focusOn = inT > 0.08;
        if (focusOn && !focusRef.current) { body.classList.add('vgc-focus'); focusRef.current = true; }
        else if (!focusOn && focusRef.current) { body.classList.remove('vgc-focus'); focusRef.current = false; }
        if (expT > 0 && !explodeRef.current) { body.classList.add('vgc-explode'); explodeRef.current = true; }
        else if (expT === 0 && explodeRef.current) { body.classList.remove('vgc-explode'); explodeRef.current = false; }
      } catch (_) {}

      if (gainRef.current && audioCtxRef.current) {
        try {
          const ac = audioCtxRef.current;
          if (expT > 0) gainRef.current.gain.setTargetAtTime(0.35, ac.currentTime, 0.02);
          else if (inT > 0.02) gainRef.current.gain.setTargetAtTime(0.06 + inT * 0.08, ac.currentTime, 0.12);
          else gainRef.current.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
        } catch (_) {}
      }

      try {
        const core = coreTextRef.current;
        if (core) {
          core.style.opacity = '1';
          const chars = charRefs.current;
          for (let i = 0; i < 3; i++) {
            const el = chars[i];
            if (!el) continue;
            const baseScale = 1 + Math.sin((now + i * 120) * 0.002) * 0.012;
            const pull = 1 + inT * 0.08;
            const burst = 1 + expT * (0.9 + i * 0.15);
            el.style.transform = `translate3d(0, ${-inT * 8 + i * 2}px, 0) scale(${baseScale * pull * burst})`;
            const glow2 = 0.12 + expT * 0.6 + i * 0.02;
            el.style.textShadow = `0 0 ${12 * glow2}px rgba(255,245,220,${0.85 * glow2}), 0 0 ${28 * glow2}px rgba(139,92,246,${0.5 * glow2})`;
            el.style.opacity = String(0.9 - inT * 0.3 + expT * 0.35);
          }
        }
      } catch (_) {}

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if ((gainRef.current as any)?._pulseInterval) clearInterval((gainRef.current as any)._pulseInterval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  function startAudio() {
    if (audioStarted) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ac = new AudioCtx();
    audioCtxRef.current = ac;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 45;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gainRef.current = gain;
    let on = true;
    const interval = setInterval(() => {
      if (!gainRef.current) return;
      gainRef.current.gain.cancelScheduledValues(ac.currentTime);
      const t = ac.currentTime;
      if (on) {
        gainRef.current.gain.setValueAtTime(0.0001, t);
        gainRef.current.gain.linearRampToValueAtTime(0.08, t + 0.15);
        gainRef.current.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      }
      on = !on;
    }, 1400);
    (gainRef.current as any)._pulseInterval = interval;
    setAudioStarted(true);
  }

  function skipIntro() {
    startRef.current = performance.now() - 5200;
    workerRef.current?.postMessage({ type: 'skipIntro' });
    setIntroSkipped(true);
  }

  return (
    <div
      className="relative flex h-80 w-80 items-center justify-center"
      style={{ touchAction: 'manipulation' }}
      onClick={startAudio}
      title={audioStarted ? '能量核心已啟動' : '點一下，啟動天地人能量核心'}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full rounded-full"
        style={{ filter: 'url(#vgc-displace)' }}
      />
      {/* SVG filter for displacement warp */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="vgc-displace">
          <feTurbulence id="vgc-turb" baseFrequency="0.0008" numOctaves="2" seed="2" />
          <feDisplacementMap id="vgc-disp" in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="pointer-events-none z-10 flex items-center justify-center">
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 9999,
            boxShadow: '0 0 18px 6px rgba(200,170,255,0.18), 0 0 36px 12px rgba(255,245,220,0.08)',
            background: 'radial-gradient(circle at 35% 30%, #ffffff, #f8f4ff 30%, #e0d8ff 70%)',
          }}
        />
        <div
          ref={coreTextRef}
          className="vgc-core-text absolute inset-0 pointer-events-none"
          style={{ opacity: 1 }}
        >
          <span ref={(el) => { charRefs.current[0] = el; }} className="vgc-core-char vgc-core-char-top" aria-hidden>天</span>
          <span ref={(el) => { charRefs.current[1] = el; }} className="vgc-core-char vgc-core-char-left" aria-hidden>地</span>
          <span ref={(el) => { charRefs.current[2] = el; }} className="vgc-core-char vgc-core-char-right" aria-hidden>人</span>
        </div>
      </div>
    </div>
  );
}
