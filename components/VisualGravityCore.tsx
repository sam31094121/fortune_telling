"use client";

import { useEffect, useRef, useState } from "react";

type FlameMode = "light" | "dark";

export default function VisualGravityCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startRef = useRef(0);
  const [audioStarted, setAudioStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawAtmosphere(cx: number, cy: number, radius: number) {
      const bg = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius * 1.9);
      bg.addColorStop(0, "rgba(255,255,255,0.08)");
      bg.addColorStop(0.28, "rgba(122,88,210,0.14)");
      bg.addColorStop(0.68, "rgba(11,12,26,0.66)");
      bg.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }

    function drawTechEnergyField(cx: number, cy: number, radius: number, time: number, breathe: number) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = "lighter";

      const pulse = 0.62 + breathe * 0.38;
      const halo = ctx.createRadialGradient(0, 0, radius * 0.16, 0, 0, radius * 1.46);
      halo.addColorStop(0, `rgba(255,250,220,${0.22 + pulse * 0.1})`);
      halo.addColorStop(0.24, `rgba(136,196,255,${0.11 + pulse * 0.06})`);
      halo.addColorStop(0.56, `rgba(126,92,230,${0.12 + pulse * 0.04})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.46, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const drift = time * (0.22 + i * 0.035) + i * Math.PI * 0.8;
        const x = Math.cos(drift) * radius * (0.18 + i * 0.13);
        const y = Math.sin(drift * 0.82) * radius * (0.1 + i * 0.07);
        const flow = ctx.createRadialGradient(x, y, 0, x, y, radius * (0.46 + i * 0.08));
        flow.addColorStop(0, `rgba(255,248,220,${0.15 - i * 0.013})`);
        flow.addColorStop(0.34, `rgba(150,205,255,${0.09 - i * 0.008})`);
        flow.addColorStop(0.7, `rgba(126,92,230,${0.07 - i * 0.006})`);
        flow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = flow;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * (0.62 + i * 0.08), radius * (0.18 + i * 0.025), drift * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawBeveledDisc(cx: number, cy: number, radius: number) {
      ctx.save();

      const shadow = ctx.createRadialGradient(cx, cy + radius * 0.28, radius * 0.2, cx, cy + radius * 0.44, radius * 1.18);
      shadow.addColorStop(0, "rgba(0,0,0,0.58)");
      shadow.addColorStop(0.6, "rgba(0,0,0,0.22)");
      shadow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(cx, cy + radius * 0.35, radius * 1.08, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 5; i >= 1; i--) {
        const y = cy + i * 2.1;
        const side = ctx.createLinearGradient(cx - radius, y, cx + radius, y);
        side.addColorStop(0, "rgba(5,5,10,0.78)");
        side.addColorStop(0.46, "rgba(56,42,106,0.48)");
        side.addColorStop(1, "rgba(255,232,170,0.32)");
        ctx.fillStyle = side;
        ctx.beginPath();
        ctx.arc(cx, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawTaijiPath(cx: number, cy: number, radius: number) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
    }

    function drawTaijiBody(cx: number, cy: number, radius: number, time: number, breathe: number) {
      const topY = cy - radius * 0.5;
      const bottomY = cy + radius * 0.5;

      ctx.save();
      drawTaijiPath(cx, cy, radius);
      ctx.clip();

      const darkBase = ctx.createRadialGradient(cx - radius * 0.32, bottomY, 0, cx - radius * 0.18, bottomY, radius * 1.05);
      darkBase.addColorStop(0, "rgba(0,0,0,1)");
      darkBase.addColorStop(0.34, "rgba(3,4,12,0.99)");
      darkBase.addColorStop(0.64, "rgba(42,25,92,0.76)");
      darkBase.addColorStop(1, "rgba(4,4,12,0.94)");
      ctx.fillStyle = darkBase;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      const lightBase = ctx.createRadialGradient(cx + radius * 0.32, topY, 0, cx + radius * 0.18, topY, radius * 1.08);
      lightBase.addColorStop(0, "rgba(255,255,255,1)");
      lightBase.addColorStop(0.28, "rgba(255,250,220,1)");
      lightBase.addColorStop(0.62, "rgba(238,190,92,0.9)");
      lightBase.addColorStop(1, "rgba(96,62,24,0.68)");
      ctx.fillStyle = lightBase;
      ctx.fillRect(cx, cy - radius, radius, radius * 2);

      ctx.fillStyle = "rgba(5,6,14,0.96)";
      ctx.beginPath();
      ctx.arc(cx, topY, radius * 0.5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(cx, bottomY, radius * 0.5, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,252,232,0.97)";
      ctx.beginPath();
      ctx.arc(cx, topY, radius * 0.5, Math.PI * 1.5, Math.PI * 0.5);
      ctx.arc(cx, bottomY, radius * 0.5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();

      const whiteCoreX = cx + Math.cos(time * 0.45) * radius * 0.015;
      const blackCoreX = cx - Math.cos(time * 0.45) * radius * 0.015;

      const darkEye = ctx.createRadialGradient(blackCoreX, topY, 0, blackCoreX, topY, radius * 0.22);
      darkEye.addColorStop(0, "rgba(0,0,0,1)");
      darkEye.addColorStop(0.62, "rgba(4,5,13,0.96)");
      darkEye.addColorStop(1, "rgba(65,42,120,0)");
      ctx.fillStyle = darkEye;
      ctx.beginPath();
      ctx.arc(blackCoreX, topY, radius * (0.105 + breathe * 0.008), 0, Math.PI * 2);
      ctx.fill();

      const lightEye = ctx.createRadialGradient(whiteCoreX, bottomY, 0, whiteCoreX, bottomY, radius * 0.25);
      lightEye.addColorStop(0, "rgba(255,255,255,1)");
      lightEye.addColorStop(0.45, "rgba(255,234,158,0.96)");
      lightEye.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = lightEye;
      ctx.beginPath();
      ctx.arc(whiteCoreX, bottomY, radius * (0.108 + breathe * 0.012), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const gloss = ctx.createLinearGradient(cx - radius * 0.72, cy - radius, cx + radius * 0.55, cy + radius * 0.24);
      gloss.addColorStop(0, "rgba(255,255,255,0.42)");
      gloss.addColorStop(0.28, "rgba(255,255,255,0.12)");
      gloss.addColorStop(0.6, "rgba(255,255,255,0)");
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.ellipse(cx - radius * 0.16, cy - radius * 0.38, radius * 0.76, radius * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();

      const innerVignette = ctx.createRadialGradient(cx, cy, radius * 0.38, cx, cy, radius * 1.02);
      innerVignette.addColorStop(0, "rgba(0,0,0,0)");
      innerVignette.addColorStop(0.72, "rgba(0,0,0,0.04)");
      innerVignette.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = innerVignette;
      drawTaijiPath(cx, cy, radius);
      ctx.fill();

      ctx.restore();

      const rim = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      rim.addColorStop(0, "rgba(255,255,255,0.78)");
      rim.addColorStop(0.28, "rgba(255,231,164,0.9)");
      rim.addColorStop(0.55, "rgba(28,24,46,0.86)");
      rim.addColorStop(1, "rgba(255,255,255,0.48)");

      ctx.lineWidth = radius * 0.045;
      ctx.strokeStyle = rim;
      drawTaijiPath(cx, cy, radius);
      ctx.stroke();

      ctx.lineWidth = radius * 0.011;
      ctx.strokeStyle = "rgba(255,255,255,0.64)";
      drawTaijiPath(cx, cy, radius * 0.965);
      ctx.stroke();
    }

    function drawEnergyWisps(cx: number, cy: number, radius: number, time: number, mode: FlameMode) {
      const isLight = mode === "light";
      const count = 7;
      ctx.save();
      ctx.globalCompositeOperation = isLight ? "lighter" : "source-over";

      for (let i = 0; i < count; i++) {
        const phase = (time * (isLight ? 0.11 : 0.095) + i * 0.173) % 1;
        const angle = (isLight ? -0.35 : Math.PI + 0.25) + Math.sin(time * 1.2 + i) * 0.56;
        const travel = radius * (isLight ? 0.2 + phase * 0.66 : 0.78 - phase * 0.45);
        const x = cx + Math.cos(angle) * travel;
        const y = cy + Math.sin(angle) * travel * 0.48;
        const size = radius * (0.012 + (1 - Math.abs(phase - 0.5)) * 0.022);
        const alpha = isLight ? 0.08 + (1 - phase) * 0.13 : 0.08 + phase * 0.13;

        const flame = ctx.createRadialGradient(x, y, 0, x, y, size * 4.2);
        if (isLight) {
          flame.addColorStop(0, `rgba(255,255,255,${alpha + 0.18})`);
          flame.addColorStop(0.42, `rgba(255,222,145,${alpha})`);
          flame.addColorStop(1, "rgba(255,255,255,0)");
        } else {
          flame.addColorStop(0, `rgba(0,0,0,${alpha + 0.26})`);
          flame.addColorStop(0.5, `rgba(54,35,103,${alpha})`);
          flame.addColorStop(1, "rgba(0,0,0,0)");
        }

        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.95, size * 2.8, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawHumanCore(cx: number, cy: number, radius: number, time: number, breathe: number) {
      const pulse = 0.6 + breathe * 0.4;

      // 十字光束（垂直 + 水平鏡頭光暈，把焦點往外撐開）
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const verticalBeam = ctx.createLinearGradient(cx, cy - radius * 0.82, cx, cy + radius * 0.82);
      verticalBeam.addColorStop(0, "rgba(255,255,255,0)");
      verticalBeam.addColorStop(0.42, `rgba(255,236,174,${0.14 + breathe * 0.1})`);
      verticalBeam.addColorStop(0.5, `rgba(255,255,255,${0.32 + breathe * 0.2})`);
      verticalBeam.addColorStop(0.58, `rgba(156,202,255,${0.14 + breathe * 0.09})`);
      verticalBeam.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = verticalBeam;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (0.05 + breathe * 0.012), radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();

      const horizontalBeam = ctx.createLinearGradient(cx - radius * 0.95, cy, cx + radius * 0.95, cy);
      horizontalBeam.addColorStop(0, "rgba(255,255,255,0)");
      horizontalBeam.addColorStop(0.5, `rgba(255,244,206,${0.18 + breathe * 0.12})`);
      horizontalBeam.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = horizontalBeam;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 0.95, radius * (0.024 + breathe * 0.01), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 外層放射光暈（更大更亮）
      const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.62);
      outerGlow.addColorStop(0, `rgba(255,255,255,${0.5 + pulse * 0.3})`);
      outerGlow.addColorStop(0.18, `rgba(255,240,188,${0.34 + pulse * 0.22})`);
      outerGlow.addColorStop(0.5, `rgba(150,120,255,${0.16 + pulse * 0.07})`);
      outerGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // 旋轉星芒（4 道，強化焦點銳利爆發感）
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.12);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        const spike = ctx.createLinearGradient(0, 0, 0, -radius * 0.8);
        spike.addColorStop(0, `rgba(255,255,255,${0.46 + breathe * 0.3})`);
        spike.addColorStop(0.5, `rgba(255,234,170,${0.12 + breathe * 0.08})`);
        spike.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = spike;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-radius * 0.02, -radius * 0.2);
        ctx.lineTo(0, -radius * 0.8);
        ctx.lineTo(radius * 0.02, -radius * 0.2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 核心強光
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.42);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.14, "rgba(255,240,180,0.95)");
      glow.addColorStop(0.44, "rgba(150,120,255,0.26)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (0.3 + breathe * 0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // 中心眼（暗核 + 金邊）
      ctx.fillStyle = "rgba(4,4,9,0.8)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = radius * 0.012;
      ctx.strokeStyle = "rgba(255,236,180,1)";
      ctx.stroke();

      // 最內熱白核（焦點的焦點）
      const hotCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.13);
      hotCore.addColorStop(0, `rgba(255,255,255,${0.92 + breathe * 0.08})`);
      hotCore.addColorStop(0.5, `rgba(255,246,214,${0.5 + breathe * 0.22})`);
      hotCore.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hotCore;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    function draw(now: number) {
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) * 0.001;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.39;
      const breathe = (Math.sin(t * 1.1) + 1) / 2;

      ctx.clearRect(0, 0, w, h);
      drawAtmosphere(cx, cy, radius);
      drawTechEnergyField(cx, cy, radius, t, breathe);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t * 0.26) * 0.055);
      ctx.transform(1.05 + breathe * 0.015, -0.035, 0.085, 0.78 + breathe * 0.02, 0, 0);
      ctx.translate(-cx, -cy);

      drawBeveledDisc(cx, cy, radius);
      drawEnergyWisps(cx - radius * 0.34, cy + radius * 0.08, radius, t, "dark");
      drawEnergyWisps(cx + radius * 0.34, cy - radius * 0.08, radius, t, "light");
      drawTaijiBody(cx, cy, radius, t, breathe);

      ctx.restore();
      drawHumanCore(cx, cy, radius, t, breathe);

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      const pulseInterval = (gainRef.current as (GainNode & { _pulseInterval?: number }) | null)?._pulseInterval;
      if (pulseInterval) clearInterval(pulseInterval);
    };
  }, []);

  function startAudio() {
    if (audioStarted) return;

    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ac = new AudioCtor();
    audioCtxRef.current = ac;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 48;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();

    gainRef.current = gain;

    const interval = window.setInterval(() => {
      if (!gainRef.current) return;
      const t = ac.currentTime;
      gainRef.current.gain.cancelScheduledValues(t);
      gainRef.current.gain.setValueAtTime(0.0001, t);
      gainRef.current.gain.linearRampToValueAtTime(0.04, t + 0.18);
      gainRef.current.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    }, 1700);

    (gainRef.current as GainNode & { _pulseInterval?: number })._pulseInterval = interval;
    setAudioStarted(true);
  }

  return (
    <button
      type="button"
      className="group relative flex h-80 w-80 items-center justify-center rounded-full outline-none"
      style={{ touchAction: "manipulation" }}
      onClick={startAudio}
      title={audioStarted ? "Taiji Tiandiren core activated" : "Tap to activate Taiji Tiandiren core"}
      aria-label="3D Taiji Tiandiren core animation"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-full" />

      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.09),transparent_42%,rgba(0,0,0,0.28)_70%,transparent_76%)]" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border border-amber-100/40 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.92),rgba(255,222,140,0.45)_34%,rgba(7,7,13,0.72)_72%)] shadow-[0_0_26px_rgba(255,226,160,0.28)] transition-transform duration-500 group-hover:scale-105" />
      </div>
    </button>
  );
}
