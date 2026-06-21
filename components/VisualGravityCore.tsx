"use client";

import React, { useEffect, useRef, useState } from "react";

export default function VisualGravityCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const coreTextRef = useRef<HTMLDivElement | null>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const startRef = useRef<number>(performance.now());
  const [introSkipped, setIntroSkipped] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const totalCycle = 4800; // ms (2.8 + 1.8 + 0.2 = 4.8s)
    // use startRef so skipIntro can shift the timeline
    startRef.current = startRef.current || performance.now();

    const focusRef = { current: false } as { current: boolean };
    const explodeRef = { current: false } as { current: boolean };

    function draw(now: number) {
      const t = (now - startRef.current) % totalCycle;
      const elapsed = now - startRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Funnel vignette (鈭桀漲敺葉憭桀憭???)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
      g.addColorStop(0, "rgba(255,255,255,0.0)");
      g.addColorStop(0.2, "rgba(255,255,255,0.01)");
      g.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // breathing (0 - 2800ms)
      const breatheT = Math.min(1, Math.max(0, t / 2800));
      const breatheScale = 1 + Math.sin(breatheT * Math.PI * 2) * 0.02; // 敺桀?憯葬/?

      // contraction (2800 - 4600ms)
      const inStart = 2800;
      const inEnd = 4600;
      const inDur = inEnd - inStart;
      const inT = t < inStart ? 0 : Math.min(1, (t - inStart) / inDur);

      // explosion (4600 - 4800ms)
      const expStart = 4600;
      const expEnd = 4800;
      const expDur = expEnd - expStart;
      const expT = t < expStart ? 0 : Math.min(1, (t - expStart) / expDur);

      // slight 3D warp during contraction/explosion
      const warp = (inT * 0.08 + expT * 0.15) * (1 - Math.abs(0.5 - breatheT));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.transform(1 + warp, 0, 0, 1 - warp, 0, 0);
      ctx.translate(-cx, -cy);

      // three directional energy flows
      const dirs = [
        { dx: 0, dy: -1, color: "rgba(148,52,248,0.9)" }, // 銝 蝝?
        { dx: -0.86, dy: 0.5, color: "rgba(214,170,88,0.95)" }, // 撌虫? ??
        { dx: 0.86, dy: 0.5, color: "rgba(255,255,240,0.98)" }, // ?喃? ?賡?
      ];

      dirs.forEach((dir, i) => {
        const progress = inT; // ?嗥葬?挾?券?
        const beamWidth = 60 * (1 - progress) + 6; // ?嗥葬??蝒?
        const length = Math.hypot(w, h) * 0.9;
        const sx = cx + dir.dx * length * (1 + (1 - progress) * 0.05);
        const sy = cy + dir.dy * length * (1 + (1 - progress) * 0.05);

        const grd = ctx.createLinearGradient(sx, sy, cx, cy);
        const stopA = Math.max(0, 0.05 + (1 - progress) * 0.4);
        grd.addColorStop(0, "rgba(0,0,0,0)");
        const lastComma = dir.color.lastIndexOf(",");
        const baseColor = lastComma >= 0 ? dir.color.slice(0, lastComma + 1) : dir.color;
        // replace alpha portion safely by slicing at last comma
        grd.addColorStop(stopA, baseColor + "0.15)");
        grd.addColorStop(1 - expT * 0.5, baseColor + "0.9)");

        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const leftX = sx + (-dir.dy) * beamWidth;
        const leftY = sy + dir.dx * beamWidth;
        const rightX = sx - (-dir.dy) * beamWidth;
        const rightY = sy - dir.dx * beamWidth;
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(cx, cy);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.globalCompositeOperation = "lighter";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      });

      ctx.restore();

      // update SVG turbulence/displacement for stronger 3D warp
      try {
        const turb = (document.getElementById("vgc-turb") as SVGElement | null);
        const disp = (document.getElementById("vgc-disp") as SVGElement | null);
        if (turb) {
          // baseFrequency: small normally, grows during contraction/explosion
          const base = 0.0008 + inT * 0.018 + expT * 0.06;
          turb.setAttribute("baseFrequency", base.toFixed(5));
        }
        if (disp) {
          const scale = Math.min(120, 6 + inT * 42 + expT * 220);
          disp.setAttribute("scale", String(Math.round(scale)));
        }
      } catch (e) {
        // ignore
      }

      // core glow (??翰?憭批???雿?蝵桐?雿宏)
      const coreSize = 20; // px (16~24 ?刻??
      const coreInner = coreSize * (1 + expT * 5 + inT * 0.4);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreInner * 4);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.08 + expT * 0.1, "rgba(255,250,230,0.98)");
      glow.addColorStop(0.25 + expT * 0.2, "rgba(220,190,255,0.28)");
      glow.addColorStop(0.45 + expT * 0.25, "rgba(140,80,240,0.08)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreInner * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // chromatic rings for stronger focal contrast
      for (let r = 0; r < 3; r++) {
        const radius = coreInner * (0.9 + r * 0.6 + expT * 2);
        ctx.beginPath();
        ctx.lineWidth = 1 + r;
        const alpha = 0.18 - r * 0.04 + expT * 0.25;
        const col = r === 0 ? "rgba(255,245,220," + alpha + ")" : r === 1 ? "rgba(214,170,88," + alpha * 0.7 + ")" : "rgba(148,52,248," + alpha * 0.6 + ")";
        ctx.strokeStyle = col;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // central fixed core (?賡??脣???銝剖?蝝)
      // white center
      ctx.beginPath();
      ctx.arc(cx, cy, coreInner * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // platinum ring
      ctx.beginPath();
      ctx.arc(cx, cy, coreInner * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(230,230,255,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // subtle sparkle
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + now * 0.0002 * (i + 1);
        const rx = cx + Math.cos(angle) * (coreInner * (1.8 + i * 0.06));
        const ry = cy + Math.sin(angle) * (coreInner * (1.8 + i * 0.06));
        ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.8 + i * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // dynamic vignette during contraction (edges darken)
      const edgeDark = 0.45 + inT * 0.45 + expT * 0.6;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.9, edgeDark)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(w, h) * 0.8, 0, Math.PI * 2);
      ctx.rect(w, 0, -w, h); // fill whole canvas mask
      ctx.fill();

      // explosion particle rays
      if (expT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rays = Math.min(36, 8 + Math.round(expT * 60));
        for (let r = 0; r < rays; r++) {
          const ang = (r / rays) * Math.PI * 2 + (now * 0.0005 * r);
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

      // toggle body classes for subtle text distortion
      try {
        const body = document.body;
        const focusOn = inT > 0.08; // when contraction begins, lock focus
        if (focusOn && !focusRef.current) {
          body.classList.add("vgc-focus");
          focusRef.current = true;
        } else if (!focusOn && focusRef.current) {
          body.classList.remove("vgc-focus");
          focusRef.current = false;
        }

        if (expT > 0 && !explodeRef.current) {
          body.classList.add("vgc-explode");
          explodeRef.current = true;
        } else if (expT === 0 && explodeRef.current) {
          body.classList.remove("vgc-explode");
          explodeRef.current = false;
        }
      } catch (e) {
        // ignore in non-browser contexts
      }

      // audio sync: gently increase gain during inT, strong burst on expT
      if (gainRef.current && audioCtxRef.current) {
        const ac = audioCtxRef.current;
        try {
          if (expT > 0) {
            gainRef.current.gain.setTargetAtTime(0.35, ac.currentTime, 0.02);
          } else if (inT > 0.02) {
            const target = 0.06 + inT * 0.08;
            gainRef.current.gain.setTargetAtTime(target, ac.currentTime, 0.12);
          } else {
            gainRef.current.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
          }
        } catch (e) {
          // ignore audio errors
        }
      }

      // --- core text (憭拙鈭? control ---
      try {
        const core = coreTextRef.current;
        if (core) {
          // appear after ~5000ms initial intro, also pulse on explosion
          const show = elapsed > 5000 || expT > 0.01;
          core.style.opacity = show ? "1" : "0";
          const chars = charRefs.current;
          for (let i = 0; i < 3; i++) {
            const el = chars[i];
            if (!el) continue;
            // base scale and slight float
            const baseScale = 1 + Math.sin((now + i * 120) * 0.002) * 0.012;
            // react to contraction (pull-in) and explosion (burst)
            const pull = 1 + inT * 0.08;
            const burst = 1 + expT * (0.9 + i * 0.15);
            const finalScale = baseScale * pull * burst;
            el.style.transform = `translate3d(0, ${-inT * 8 + i * 2}px, 0) scale(${finalScale})`;
            // letter glow and shadow increases on burst
            const glow = 0.12 + expT * 0.6 + i * 0.02;
            el.style.textShadow = `0 0 ${12 * glow}px rgba(255,245,220,${0.85 * glow}) , 0 0 ${28 * glow}px rgba(139,92,246,${0.5 * glow})`;
            // apply svg displacement filter stronger during explosion
            el.style.filter = `url(#vgc-displace)`;
            el.style.opacity = String(0.9 - inT * 0.3 + expT * 0.35);
            el.style.letterSpacing = `${0.02 + expT * 0.08}em`;
            el.style.transition = "transform 120ms linear, text-shadow 120ms linear, opacity 160ms linear";
          }
        }
      } catch (e) {
        // ignore DOM errors
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function startAudio() {
    if (audioStarted) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 45; // very low pulse
    gain.gain.value = 0.0001; // start almost silent
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gainRef.current = gain;
    // ramp a gentle pulsing envelope to give 'alive' feeling
    let on = true;
    const interval = setInterval(() => {
      if (!gainRef.current) return;
      gainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      const t = ctx.currentTime;
      if (on) {
        gainRef.current.gain.setValueAtTime(0.0001, t);
        gainRef.current.gain.linearRampToValueAtTime(0.08, t + 0.15);
        gainRef.current.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      }
      on = !on;
    }, 1400);

    // store interval on gain node for cleanup hack
    (gainRef.current as any)._pulseInterval = interval;
    setAudioStarted(true);
  }

  function skipIntro() {
    // advance timeline so intro and text are shown
    startRef.current = performance.now() - 5200;
    setIntroSkipped(true);
  }

  return (
    <div
      className="relative flex h-80 w-80 items-center justify-center"
      style={{ touchAction: "manipulation" }}
      onClick={startAudio}
      title={audioStarted ? "能量核心已啟動" : "點一下，啟動天地人能量核心"}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-full" style={{filter: 'url(#vgc-displace)'}} />
      {/* SVG filter for displacement warp */}
      <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
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
            boxShadow: "0 0 18px 6px rgba(200,170,255,0.18), 0 0 36px 12px rgba(255,245,220,0.08)",
            background: "radial-gradient(circle at 35% 30%, #ffffff, #f8f4ff 30%, #e0d8ff 70%)",
          }}
        />
        <div
          ref={coreTextRef}
          className="vgc-core-text absolute inset-0 pointer-events-none"
          style={{ opacity: 0 }}
        >
          <span
            ref={(el) => { charRefs.current[0] = el; }}
            className="vgc-core-char vgc-core-char-top"
            aria-hidden
          >
            天
          </span>
          <span
            ref={(el) => { charRefs.current[1] = el; }}
            className="vgc-core-char vgc-core-char-left"
            aria-hidden
          >
            地
          </span>
          <span
            ref={(el) => { charRefs.current[2] = el; }}
            className="vgc-core-char vgc-core-char-right"
            aria-hidden
          >
            人
          </span>
        </div>
      </div>
    </div>
  );
}



