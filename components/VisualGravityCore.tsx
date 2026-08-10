"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Mesh, MeshBasicMaterial, SpriteMaterial } from "three";

const MOBILE_VISUAL_BUILD = "tablet-unified-20260707-1";

const TABLET_VISUAL_PROFILE = Object.freeze({
  cameraZ: 7.15,
  pixelRatioCap: 2,
  sphereSegments: 112,
  waveCounts: [5, 4, 3] as const,
  particleCount: 1100,
  particleSize: 0.022,
  fiberCount: 500,
  tiltX: 0.06,
  tiltXDrift: 0.035,
  tiltYDrift: 0.08,
});

export default function VisualGravityCore() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const touchSpinSpeedRef = useRef(1.0);
  const [tapCount, setTapCount] = useState(0);
  const [showMantra, setShowMantra] = useState(false);
  const [showSuperMantra, setShowSuperMantra] = useState(false);
  const [showMegaMantra, setShowMegaMantra] = useState(false);
  const [showGreatMantra, setShowGreatMantra] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const effectTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const explosionActiveRef = useRef(false);
  const explosionLevelRef = useRef(1); // 1=正常爆發, 2=終極白金, 3=萬丈佛光, 4=萬佛朝宗終極大悲咒

  const audioCtxRef = useRef<AudioContext | null>(null);

  const scheduleEffectTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      effectTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    effectTimeoutsRef.current.add(timeout);
    return timeout;
  };

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playBowlSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const baseFreq = 292;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.52, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 4.8);
      osc2.stop(ctx.currentTime + 4.8);
    } catch (e) {
      console.warn('Web Audio Playback failed:', e);
    }
  };

  const playSuperBowlSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const oscLow = ctx.createOscillator();
      const oscHigh = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(144, ctx.currentTime);
      
      oscHigh.type = 'sine';
      oscHigh.frequency.setValueAtTime(432, ctx.currentTime);

      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(432 * 1.5, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);
      
      oscLow.connect(gainNode);
      oscHigh.connect(gainNode);
      oscHarmonic.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscLow.start();
      oscHigh.start();
      oscHarmonic.start();
      
      oscLow.stop(ctx.currentTime + 5.8);
      oscHigh.stop(ctx.currentTime + 5.8);
      oscHarmonic.stop(ctx.currentTime + 5.8);
    } catch (e) {
      console.warn('Web Audio Playback failed:', e);
    }
  };

  const playMegaBowlSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(144, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(292, ctx.currentTime);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(528, ctx.currentTime); // 528Hz 招福奇蹟頻率
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 7.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc3.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc3.start();
      
      osc1.stop(ctx.currentTime + 7.8);
      osc2.stop(ctx.currentTime + 7.8);
      osc3.stop(ctx.currentTime + 7.8);
    } catch (e) {
      console.warn('Web Audio Playback failed:', e);
    }
  };

  const playGreatCompassionSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const frequencies = [108, 216, 432, 528, 999];
      const gainNode = ctx.createGain();
      
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 4 ? 'triangle' : 'sine'; // 999Hz 採用柔和三角波，其餘正弦波
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 10.5);
      });
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 10.0);
      gainNode.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio Playback failed:', e);
    }
  };

  const handleTaiChiClick = () => {
    if (showGreatMantra) return; // 終極萬佛朝宗中不重複觸發

    setTapCount((prev) => {
      const next = prev + 1;
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setTapCount(0);
      }, 8000); // 增加寬限期至 8.0 秒，以便在層層發光下點完 24 下

      if (next === 3) {
        setShowMantra(true);
        explosionLevelRef.current = 1;
        explosionActiveRef.current = true;
        playBowlSound();
        
        scheduleEffectTimeout(() => {
          explosionActiveRef.current = false;
        }, 2000);

        scheduleEffectTimeout(() => {
          setShowMantra(false);
        }, 5200);
      } else if (next === 6) {
        setShowMantra(false);
        setShowSuperMantra(true);
        explosionLevelRef.current = 2;
        explosionActiveRef.current = true;
        playSuperBowlSound();

        scheduleEffectTimeout(() => {
          explosionActiveRef.current = false;
        }, 3000);

        scheduleEffectTimeout(() => {
          setShowSuperMantra(false);
        }, 6500);
      } else if (next === 12) {
        setShowMantra(false);
        setShowSuperMantra(false);
        setShowMegaMantra(true);
        explosionLevelRef.current = 3;
        explosionActiveRef.current = true;
        playMegaBowlSound();

        scheduleEffectTimeout(() => {
          explosionActiveRef.current = false;
        }, 4000);

        scheduleEffectTimeout(() => {
          setShowMegaMantra(false);
        }, 8000);
      } else if (next === 24) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setTapCount(0);
        setShowMantra(false);
        setShowSuperMantra(false);
        setShowMegaMantra(false);
        setShowGreatMantra(true);
        explosionLevelRef.current = 4;
        explosionActiveRef.current = true;
        playGreatCompassionSound();

        scheduleEffectTimeout(() => {
          explosionActiveRef.current = false;
        }, 5500);

        scheduleEffectTimeout(() => {
          setShowGreatMantra(false);
        }, 11000);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleResetAudio = () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
    window.addEventListener('reset-audio-context', handleResetAudio);

    const handleResetMist = () => {
      const existingMist = orbitLayer.querySelector('.taiji-celestial-mist');
      if (existingMist) {
        existingMist.remove();
      }
      const newMist = document.createElement('div');
      newMist.className = 'taiji-celestial-mist';
      newMist.setAttribute('aria-hidden', 'true');
      newMist.innerHTML = `
        <span class="taiji-celestial-wisp taiji-celestial-wisp--one"></span>
        <span class="taiji-celestial-wisp taiji-celestial-wisp--two"></span>
        <span class="taiji-celestial-wisp taiji-celestial-wisp--three"></span>
      `;
      orbitLayer.appendChild(newMist);
    };
    window.addEventListener('reset-celestial-mist', handleResetMist);

    const mount = mountRef.current;
    if (!mount) return;
    const container: HTMLDivElement = mount;

    // Mount the decorative orbit layer after hydration. Keeping the server-side
    // container empty avoids WebGL/DOM hydration races during development.
    container.setAttribute("role", "img");
    container.setAttribute("aria-label", "持續旋轉、三重光軌與金色仙氣環繞的立體太極圖騰");
    container.setAttribute("data-testid", "taiji-orbit-emblem");
    container.setAttribute("data-visual-profile", "tablet-unified");
    container.setAttribute("data-mobile-visual-build", MOBILE_VISUAL_BUILD);
    const orbitLayer = document.createElement("div");
    orbitLayer.className = "taiji-orbit-layer";
    orbitLayer.setAttribute("aria-hidden", "true");
    orbitLayer.innerHTML = `
      <div class="taiji-light-orbit taiji-light-orbit--cyan">
        <span class="taiji-light-orbit__head"></span>
      </div>
      <div class="taiji-light-orbit taiji-light-orbit--violet">
        <span class="taiji-light-orbit__head"></span>
      </div>
      <div class="taiji-light-orbit taiji-light-orbit--gold">
        <span class="taiji-light-orbit__head"></span>
      </div>
      <div class="taiji-light-orbit taiji-light-orbit--emerald">
        <span class="taiji-light-orbit__head"></span>
      </div>
      <div class="taiji-light-orbit taiji-light-orbit--rose">
        <span class="taiji-light-orbit__head"></span>
      </div>
      <div class="taiji-gold-waves">
        <span class="taiji-gold-wave"></span>
        <span class="taiji-gold-wave"></span>
        <span class="taiji-gold-wave"></span>
      </div>
      <div class="taiji-celestial-mist">
        <span class="taiji-celestial-wisp taiji-celestial-wisp--one"></span>
        <span class="taiji-celestial-wisp taiji-celestial-wisp--two"></span>
        <span class="taiji-celestial-wisp taiji-celestial-wisp--three"></span>
      </div>
    `;
    container.appendChild(orbitLayer);

    let animId = 0;
    let domEl: HTMLCanvasElement | null = null;
    let resizeFn: (() => void) | null = null;
    let visibilityHandler: (() => void) | null = null;
    let disposeThree: (() => void) | null = null;
    let cancelled = false;

    // ✨ 性能監控變數
    let frameCount = 0;
    let lastTime = Date.now();
    let fps = 60;

    // Clean any stale canvases from previous HMR mounts
    Array.from(container.querySelectorAll("canvas")).forEach(c => c.remove());

    async function boot() {
      try {
        // Dynamic import — avoids SSR crash
        const THREE = await import("three");

        // WebGL availability check
        const testC = document.createElement("canvas");
        const hasGL = testC.getContext("webgl") || testC.getContext("experimental-webgl");
        if (!hasGL) throw new Error("no-webgl");

        const W = container.clientWidth  || 320;
        const H = container.clientHeight || 320;
        // ── Scene ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x02030a);
        scene.fog = new THREE.FogExp2(0x02030a, 0.06);

        // ── Camera ───────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        // Leave enough breathing room for the layered luminous orbit paths.
        camera.position.z = TABLET_VISUAL_PROFILE.cameraZ;

        // ── Renderer ─────────────────────────────────────────────────────
        // Sharper supersampled rendering, capped to protect mobile GPUs.
        const isLowPowerDevice = window.matchMedia('(max-width: 768px)').matches
          || navigator.hardwareConcurrency <= 4
          || (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 2;
        const visualProfile = isLowPowerDevice
          ? {
              ...TABLET_VISUAL_PROFILE,
              pixelRatioCap: 1.15,
              sphereSegments: 72,
              waveCounts: [3, 2, 1] as const,
              particleCount: 320,
              fiberCount: 140,
              particleSize: 0.018,
            }
          : TABLET_VISUAL_PROFILE;
        const pixelRatio = Math.min(devicePixelRatio, visualProfile.pixelRatioCap);
        const renderer = new THREE.WebGLRenderer({
          antialias: true,  // 始終啟用抗鋸齒但优化方式
          powerPreference: 'high-performance',
          alpha: true,
          precision: 'highp',
          logarithmicDepthBuffer: false,
          stencil: false,
          failIfMajorPerformanceCaveat: false,
        });
        renderer.setSize(W, H);
        renderer.setPixelRatio(pixelRatio);
        renderer.shadowMap.enabled = false;
        renderer.info.autoReset = true;

        disposeThree = () => {
          scene.traverse((object: any) => {
            object.geometry?.dispose?.();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.filter(Boolean).forEach((material: any) => {
              Object.values(material).forEach((value: any) => value?.isTexture && value.dispose?.());
              material.dispose?.();
            });
          });
          renderer.dispose();
          renderer.forceContextLoss?.();
        };

        // 使用新版 Three.js 色彩空間設定，避免舊屬性造成相容性問題
        if ((renderer as any).useLegacyLights !== undefined) {
          (renderer as any).useLegacyLights = false;
        }

        // Explicit color space + no tone mapping
        try {
          renderer.outputColorSpace = (THREE as any).SRGBColorSpace;
        } catch (_) { /* r152 fallback */ }
        renderer.toneMapping = THREE.NoToneMapping;
        if (cancelled) { renderer.dispose(); return; }
        container.appendChild(renderer.domElement);
        domEl = renderer.domElement;
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.inset = "0";
        renderer.domElement.style.zIndex = "1";

        // ── Lights ───────────────────────────────────────────────────────
        // ✨ 增強光照以加強科技感
        scene.add(new THREE.AmbientLight(0xffffff, 0.65));
        const keyL = new THREE.PointLight(0xffffff, 5.5, 18);
        keyL.position.set(2.0, 2.0, 4.5);
        scene.add(keyL);
        const fillL = new THREE.PointLight(0x7799ff, 2.5, 14);
        fillL.position.set(-2.5, -1.8, 2.5);
        scene.add(fillL);
        const backL = new THREE.PointLight(0x5577dd, 1.8, 12);
        backL.position.set(0, 0, -5);
        scene.add(backL);
        // ✨ 新增：科技感藍紫光源
        const techL = new THREE.PointLight(0x6688ff, 2.2, 16);
        techL.position.set(1.5, -2.0, 3);
        scene.add(techL);
        const goldL = new THREE.PointLight(0xffc85c, 2.6, 16);
        goldL.position.set(-2.2, 1.6, 3.4);
        scene.add(goldL);

        // ── Glow sprite texture helper ────────────────────────────────────
        function buildGlowTex(R: number, G: number, B: number) {
          const S = 256, m2 = S / 2;
          const cv = document.createElement("canvas");
          cv.width = cv.height = S;
          const cx = cv.getContext("2d")!;
          const g = cx.createRadialGradient(m2, m2, 0, m2, m2, m2);
          g.addColorStop(0,    `rgba(${R},${G},${B},1)`);
          g.addColorStop(0.3,  `rgba(${R},${G},${B},0.55)`);
          g.addColorStop(0.7,  `rgba(${R},${G},${B},0.1)`);
          g.addColorStop(1,    `rgba(${R},${G},${B},0)`);
          cx.fillStyle = g;
          cx.fillRect(0, 0, S, S);
          return new THREE.CanvasTexture(cv);
        }

        // ── Ring wave texture — soft hollow ring (transparent center+edge) ─
        function buildRingTex(R: number, G: number, B: number) {
          const S = 256, m2 = S / 2;
          const cv = document.createElement("canvas");
          cv.width = cv.height = S;
          const cx = cv.getContext("2d")!;
          const g = cx.createRadialGradient(m2, m2, 0, m2, m2, m2);
          g.addColorStop(0.0,  `rgba(${R},${G},${B},0)`);
          g.addColorStop(0.62, `rgba(${R},${G},${B},0)`);
          g.addColorStop(0.80, `rgba(${R},${G},${B},0.9)`);
          g.addColorStop(0.90, `rgba(${R},${G},${B},0.35)`);
          g.addColorStop(1.0,  `rgba(${R},${G},${B},0)`);
          cx.fillStyle = g;
          cx.fillRect(0, 0, S, S);
          return new THREE.CanvasTexture(cv);
        }



        // ── Core group (rotates as one unit) ─────────────────────────────
        const grp = new THREE.Group();
        scene.add(grp);

        // Main yin-yang sphere — ShaderMaterial computes pattern in GLSL (no texture issues)
        const sphGeo = new THREE.SphereGeometry(
          1.62,
          TABLET_VISUAL_PROFILE.sphereSegments,
          TABLET_VISUAL_PROFILE.sphereSegments,
        );
        const sphMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vLocalPosition;
            varying vec3 vViewNormal;
            varying vec3 vViewDirection;
            void main() {
              vLocalPosition = position / 1.62;
              vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
              vViewNormal = normalize(normalMatrix * normal);
              vViewDirection = normalize(-viewPosition.xyz);
              gl_Position = projectionMatrix * viewPosition;
            }
          `,
          fragmentShader: `
            precision highp float;
            varying vec3 vLocalPosition;
            varying vec3 vViewNormal;
            varying vec3 vViewDirection;
            void main() {
              vec2 p = vLocalPosition.xy;
              float upper = distance(p, vec2(0.0, 0.5));
              float lower = distance(p, vec2(0.0, -0.5));

              // 以球體正面的局部座標繪製太極，旋轉時仍維持完整清楚的 S 曲線。
              float yang = step(0.0, p.x);
              if (upper < 0.5) yang = 1.0;
              if (lower < 0.5) yang = 0.0;
              if (upper < 0.115) yang = 0.0;
              if (lower < 0.115) yang = 1.0;

              vec3 whiteTone = vec3(0.94, 0.97, 1.00);
              vec3 blackTone = vec3(0.006, 0.010, 0.030);
              vec3 col = mix(blackTone, whiteTone, yang);

              // View-space lighting creates a rounded, polished sphere surface.
              vec3 N = normalize(vViewNormal);
              vec3 V = normalize(vViewDirection);
              vec3 L = normalize(vec3(-0.48, 0.62, 0.86));
              vec3 H = normalize(L + V);
              float diffuse = 0.58 + max(dot(N, L), 0.0) * 0.42;
              float specular = pow(max(dot(N, H), 0.0), 52.0);
              float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.35);
              float goldSide = smoothstep(-0.75, 0.85, N.x + N.y * 0.38);
              vec3 coolRim = vec3(0.22, 0.40, 0.95);
              vec3 goldRim = vec3(1.00, 0.64, 0.18);

              col *= diffuse;
              col += mix(coolRim, goldRim, goldSide) * fresnel * 0.28;
              col += mix(vec3(0.72, 0.86, 1.00), vec3(1.00, 0.78, 0.38), goldSide) * specular * 0.62;
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        });
        grp.add(new THREE.Mesh(sphGeo, sphMat));


        // ✨ 第 5 步：仙氣完美升級 - 五行 + 仙氣特殊層
        // 由內而外層層擴散，融合科技與仙氣
        const auraShells: { mesh: Mesh; baseOp: number; pulse: number }[] = [];
        const auraDefs = [
          // 核心仙氣層 - 白金
          { r: 1.72, color: 0xffffff, op: 0.28, pulse: 0.055 },  // 純白仙氣核心

          // 五行能量層 - 增強飽和度 + 仙氣感
          { r: 1.95, color: 0xe6ccff, op: 0.22, pulse: 0.065 },  // 粉紫仙氣
          { r: 2.20, color: 0xa8e6ff, op: 0.18, pulse: 0.075 },  // 天藍仙氣
          { r: 2.50, color: 0x80ffcc, op: 0.15, pulse: 0.085 },  // 青綠仙氣
          { r: 2.80, color: 0xffd4a3, op: 0.12, pulse: 0.095 },  // 金色仙氣

          // 外圍仙氣保護層 - 神聖融合
          { r: 3.15, color: 0xe6d9ff, op: 0.085, pulse: 0.105 }, // 淡紫仙氣
          { r: 3.50, color: 0xffd4a3, op: 0.045, pulse: 0.115 }, // 遠方金光
        ];
        for (const d of auraDefs) {
          const m = new THREE.Mesh(
            new THREE.SphereGeometry(d.r, 48, 48),
            new THREE.MeshBasicMaterial({
              color: d.color, transparent: true, opacity: d.op,
              side: THREE.BackSide, depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
          );
          grp.add(m);
          auraShells.push({ mesh: m, baseOp: d.op, pulse: d.pulse });
        }

        // Big soft halo sprite behind the sphere — the radiant "bulb" bloom
        const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(165, 180, 255), transparent: true, opacity: 0.42,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        haloSprite.position.set(0, 0, -0.6);
        haloSprite.scale.set(7.0, 7.0, 1);
        grp.add(haloSprite);

        // Warm white bloom biased toward white-hole side, cool violet toward black-hole
        const bloomWhite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(255, 255, 255), transparent: true, opacity: 0.35,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bloomWhite.position.set(0, -1.0, 0.2);
        bloomWhite.scale.set(4.0, 4.0, 1);
        grp.add(bloomWhite);

        const bloomViolet = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(135, 120, 255), transparent: true, opacity: 0.35,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bloomViolet.position.set(0, 1.0, 0.2);
        bloomViolet.scale.set(4.0, 4.0, 1);
        grp.add(bloomViolet);

        // Warm celestial bloom sits behind the core to separate the gold layer
        // from the cooler cyan and violet energy fields.
        const bloomGold = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(255, 196, 88), transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bloomGold.position.set(-0.35, 0.2, -0.35);
        bloomGold.scale.set(5.0, 5.0, 1);
        grp.add(bloomGold);

        // ✨ 增強能量波 - 更多波紋效果、更密集的能量環繞
        const waveTex = buildRingTex(170, 195, 255);
        const WAVE_N = visualProfile.waveCounts[0];
        const waves: { mesh: Mesh; phase: number }[] = [];
        for (let i = 0; i < WAVE_N; i++) {
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
              map: waveTex, transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending, depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          m.rotation.x = Math.PI / 2.35;
          grp.add(m);
          waves.push({ mesh: m, phase: i / WAVE_N });
        }

        // ✨ 垂直平面波 - 更多層次的 3D 球形感
        const waveTex2 = buildRingTex(180, 160, 255);
        const WAVE2_N = visualProfile.waveCounts[1];
        const waves2: { mesh: Mesh; phase: number }[] = [];
        for (let i = 0; i < WAVE2_N; i++) {
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
              map: waveTex2, transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending, depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          m.rotation.y = Math.PI / 2.6;
          m.rotation.z = Math.PI / 3.5;
          grp.add(m);
          waves2.push({ mesh: m, phase: i / WAVE2_N + 0.16 });
        }

        // ✨ 新增：對角線能量波 - 更豐富的層次感
        const waveTex3 = buildRingTex(160, 180, 240);
        const WAVE3_N = visualProfile.waveCounts[2];
        const waves3: { mesh: Mesh; phase: number }[] = [];
        for (let i = 0; i < WAVE3_N; i++) {
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
              map: waveTex3, transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending, depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          m.rotation.x = Math.PI / 3.2;
          m.rotation.y = Math.PI / 2.8;
          m.rotation.z = Math.PI / 4.0;
          grp.add(m);
          waves3.push({ mesh: m, phase: i / WAVE3_N + 0.08 });
        }

        // ── Black hole (in white area, upper front) ───────────────────────
        const bhMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0, roughness: 0.02, metalness: 1 })
        );
        bhMesh.position.set(0, 0.8, 1.38);
        grp.add(bhMesh);

        const BH_POS = new THREE.Vector3(0, 0.8, 1.42);

        // Bright accretion disk — glowing ring of light orbiting the dark core
        const diskMesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.045, 10, 72),
          new THREE.MeshBasicMaterial({
            color: 0x8a6cff, transparent: true, opacity: 1.0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        diskMesh.position.copy(BH_POS);
        diskMesh.rotation.x = Math.PI / 2.6;
        grp.add(diskMesh);

        // Lensing halo — bright light ring hugging the event horizon
        const bhHaloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildRingTex(150, 175, 255), transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bhHaloSprite.position.copy(BH_POS);
        bhHaloSprite.scale.set(0.95, 0.95, 1);
        grp.add(bhHaloSprite);

        // Outer radiant glow burst of the black hole
        const bhSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(120, 150, 255), transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bhSprite.position.copy(BH_POS);
        bhSprite.scale.set(1.5, 1.5, 1);
        grp.add(bhSprite);

        // ── White hole (in dark area, lower front) ────────────────────────
        const WH_POS = new THREE.Vector3(0, -0.8, 1.42);

        const whMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.4,
          roughness: 0.04, metalness: 0.15,
        });
        const whMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), whMat);
        whMesh.position.copy(WH_POS);
        grp.add(whMesh);

        // Intense white core
        const whCore = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(255, 255, 255), transparent: true, opacity: 1.0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        whCore.position.copy(WH_POS);
        whCore.scale.set(0.85, 0.85, 1);
        grp.add(whCore);

        // Radiant corona burst
        const whSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(235, 242, 255), transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        whSprite.position.copy(WH_POS);
        whSprite.scale.set(1.8, 1.8, 1);
        grp.add(whSprite);

        // Cross-flare light streak (lens flare) for star-like brilliance
        const whFlare = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(255, 255, 255), transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        whFlare.position.copy(WH_POS);
        whFlare.scale.set(3.0, 0.12, 1);
        grp.add(whFlare);
        const whFlareV = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(255, 255, 255), transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        whFlareV.position.copy(WH_POS);
        whFlareV.scale.set(0.12, 2.2, 1);
        grp.add(whFlareV);



        // ✨ 優化粒子特效 - 平衡視覺效果和性能
        const pN = visualProfile.particleCount;
        const pArr = new Float32Array(pN * 3);
        const pColors = new Float32Array(pN * 3);  // 新增：顏色變化
        for (let i = 0; i < pN; i++) {
          const pr = 2.8 + Math.random() * 5.2;
          const pt = Math.random() * Math.PI * 2;
          const pp = Math.acos(2 * Math.random() - 1);
          pArr[i * 3]     = pr * Math.sin(pp) * Math.cos(pt);
          pArr[i * 3 + 1] = pr * Math.sin(pp) * Math.sin(pt);
          pArr[i * 3 + 2] = pr * Math.cos(pp);

          // 四色交織粒子光譜：白色、黃金色、天藍色、粉紫色
          const colorType = Math.random();
          if (colorType < 0.35) {
            pColors[i * 3] = 1.0; pColors[i * 3 + 1] = 0.95; pColors[i * 3 + 2] = 1.0;  // 白
          } else if (colorType < 0.70) {
            pColors[i * 3] = 0.98; pColors[i * 3 + 1] = 0.82; pColors[i * 3 + 2] = 0.45; // 金色
          } else if (colorType < 0.85) {
            pColors[i * 3] = 0.7; pColors[i * 3 + 1] = 0.85; pColors[i * 3 + 2] = 1.0;   // 天藍
          } else {
            pColors[i * 3] = 0.78; pColors[i * 3 + 1] = 0.6; pColors[i * 3 + 2] = 0.95;  // 粉紫
          }
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
        pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));
        const pMat = new THREE.PointsMaterial({
          size: visualProfile.particleSize,
          transparent: true, opacity: 0.85,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
          vertexColors: true,  // 啟用頂點顏色
        });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // ✨ 增強能量塵埃 - 更多粒子、更動態的吸收/釋放
        const fN = visualProfile.fiberCount;
        const fPos = new Float32Array(fN * 3);
        const fPhase = new Float32Array(fN);
        const fColor = new Float32Array(fN * 3);  // 新增：顏色
        for (let i = 0; i < fN; i++) {
          const angle = Math.random() * Math.PI * 2;
          const fr = 2.2 + Math.random() * 3.5;
          fPos[i * 3]     = Math.cos(angle) * fr;
          fPos[i * 3 + 1] = (Math.random() - 0.5) * fr * 0.9;
          fPos[i * 3 + 2] = Math.sin(angle) * fr * 0.7;
          fPhase[i] = Math.random() * Math.PI * 2;

          // 能量塵埃顏色：白 → 藍 → 紫漸變
          const colorRand = Math.random();
          if (colorRand < 0.5) {
            fColor[i * 3] = 0.8; fColor[i * 3 + 1] = 0.85; fColor[i * 3 + 2] = 1.0;  // 白藍
          } else {
            fColor[i * 3] = 0.7; fColor[i * 3 + 1] = 0.7; fColor[i * 3 + 2] = 0.95;  // 紫藍
          }
        }
        const fGeo = new THREE.BufferGeometry();
        const fAttr = new THREE.BufferAttribute(fPos, 3);
        fAttr.setUsage(THREE.DynamicDrawUsage);
        fGeo.setAttribute("position", fAttr);
        fGeo.setAttribute("color", new THREE.BufferAttribute(fColor, 3));
        const fMat = new THREE.PointsMaterial({
          size: 0.028,
          transparent: true, opacity: 0.0,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
          vertexColors: true,  // 啟用頂點顏色
        });
        const fibers = new THREE.Points(fGeo, fMat);
        scene.add(fibers);

        // ── Soul mist (ambient volumetric fog sprite) ─────────────────────
        const mistSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(155, 180, 255), transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        mistSprite.scale.set(7.5, 7.5, 1);
        scene.add(mistSprite);

        // ── Animation ─────────────────────────────────────────────────────
        let particlesAngleY = 0;
        let particlesAngleZ = 0;
        let grpAngleZ = 0;
        const animationStartedAt = performance.now();

        // ✨ 優化的動畫循環 - 高效計算
        function frame(frameTime = performance.now()) {
          if (cancelled || document.hidden) {
            animId = 0;
            return;
          }
          animId = requestAnimationFrame(frame);
          const t = (frameTime - animationStartedAt) / 1000;

          // 性能監控
          frameCount++;
          const now = Date.now();
          if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
            // 控制台輸出FPS（開發用，生產環境可移除）
            if (fps < 30) console.warn(`⚠️ Low FPS: ${fps}`);
          }

          // 阻尼衰減回 1.0 基準公轉速度
          if (explosionActiveRef.current) {
            touchSpinSpeedRef.current = 
              explosionLevelRef.current === 4 ? 64.0 :
              explosionLevelRef.current === 3 ? 32.0 :
              explosionLevelRef.current === 2 ? 16.5 : 6.8;
          } else {
            touchSpinSpeedRef.current += (1.0 - touchSpinSpeedRef.current) * 0.032;
          }
          const speedMult = touchSpinSpeedRef.current;
 
          // All breakpoints share the same tablet composition and viewing angle.
          grp.rotation.y = Math.sin(t * 0.24) * TABLET_VISUAL_PROFILE.tiltYDrift;
          grp.rotation.x = TABLET_VISUAL_PROFILE.tiltX
            + Math.sin(t * 0.19) * TABLET_VISUAL_PROFILE.tiltXDrift;
          // 核心雙星太極公轉
          grpAngleZ -= (0.349 / 18) * speedMult;
          grp.rotation.z = grpAngleZ;
 
          // 低幅度能量呼吸，避免忽大忽小造成視覺失焦。
          const breatheIntensity = 0.014 + Math.sin(t * 0.42) * 0.004;
          let currentScale = 1 + Math.sin(t * 0.55) * breatheIntensity;
          if (explosionActiveRef.current) {
            currentScale *= 
              explosionLevelRef.current === 4 ? 4.5 :
              explosionLevelRef.current === 3 ? 3.0 :
              explosionLevelRef.current === 2 ? 2.3 : 1.6;
          }
          grp.scale.setScalar(currentScale);

          // ✨ 優化黑洞呼吸效果 - 與主節奏協調
          diskMesh.rotation.z = t * 1.6;
          const bhBreath = 0.5 + Math.sin(t * 0.5 - 0.3) * 0.4;
          bhHaloSprite.scale.set(0.85 + bhBreath * 0.35, 0.85 + bhBreath * 0.35, 1);
          (bhHaloSprite.material as SpriteMaterial).opacity = 0.75 + bhBreath * 0.25;
          bhSprite.scale.set(1.5 + bhBreath * 0.5, 1.5 + bhBreath * 0.5, 1);
          (bhSprite.material as SpriteMaterial).opacity = 0.70 + bhBreath * 0.25;

          // ✨ 優化白洞呼吸效果 - 與黑洞反向呼吸（和諧對比）
          const whBreath = 0.5 + Math.sin(t * 0.5 + 0.3) * 0.4;
          whSprite.scale.set(1.8 + whBreath * 0.6, 1.8 + whBreath * 0.6, 1);
          (whSprite.material as SpriteMaterial).opacity = 0.80 + whBreath * 0.22;
          whCore.scale.set(0.80 + whBreath * 0.25, 0.80 + whBreath * 0.25, 1);
          whMat.emissiveIntensity = 3.2 + whBreath * 1.0;
          // Twinkling lens-flare streaks
          const flareP = 0.55 + Math.abs(Math.sin(t * 1.1)) * 0.45;
          (whFlare.material as SpriteMaterial).opacity = flareP * 0.7;
          whFlare.scale.set(2.6 + Math.sin(t * 1.7) * 0.8, 0.12, 1);
          (whFlareV.material as SpriteMaterial).opacity = flareP * 0.5;
          whFlareV.scale.set(0.12, 1.9 + Math.sin(t * 1.5) * 0.6, 1);

          // Particles slow orbit
          particlesAngleY += 0.048 * speedMult * 0.0167;
          particlesAngleZ += 0.024 * speedMult * 0.0167;
          particles.rotation.y = particlesAngleY;
          particles.rotation.z = particlesAngleZ;

          // ✨ 增強能量吸收/釋放循環 - 更密集、更動態
          const fc    = t % 6;  // 加快循環速度
          const fPull = fc < 2 ? fc / 2 : fc < 3 ? 1 : fc < 5 ? 1 - (fc - 3) / 2 : 0;
          fMat.opacity = fPull * 0.50;  // 更亮
          fibers.visible = fPull > 0.03;

          // 能量粒子吸收更強烈、移動更動態
          const posArr = fAttr.array as Float32Array;
          for (let i = 0; i < fN; i++) {
            const pullStrength = fPull * 0.82;  // 更強的吸引力
            posArr[i * 3]     = fPos[i * 3]     * (1 - pullStrength + Math.sin(t * 1.0 + fPhase[i]) * 0.08);
            posArr[i * 3 + 1] = fPos[i * 3 + 1] * (1 - pullStrength + Math.cos(t * 0.8 + fPhase[i]) * 0.08);
            posArr[i * 3 + 2] = fPos[i * 3 + 2] * (1 - pullStrength + Math.sin(t * 0.6 + fPhase[i]) * 0.05);
          }
          fAttr.needsUpdate = true;

          // 五層共用同一個 24 秒氣功式呼吸：聚集 → 散發 → 回收。
          const energyCycle = (t % 24) / 24;
          const sharedEnergyBreath = 0.5 - 0.5 * Math.cos(energyCycle * Math.PI * 2);
          for (let i = 0; i < auraShells.length; i++) {
            const s = auraShells[i];
            const m = s.mesh.material as MeshBasicMaterial;
            const softFlow = 0.96 + Math.sin(t * 0.16 + i * 0.38) * 0.04;
            m.opacity = s.baseOp * (0.28 + sharedEnergyBreath * 0.72) * softFlow;
            s.mesh.scale.setScalar(0.955 + sharedEnergyBreath * (0.045 + s.pulse));
          }
          // ✨ 第 5 步：仙氣完美升級 - 神聖呼吸脈衝
          const breathePhase = Math.sin(t * 0.28);  // 仙氣呼吸（極慢、穩重）
          const haloBreatheIntensity = 0.5 + breathePhase * 0.60;  // 仙氣感脈衝

          // 主光暈呼吸 - 仙氣耀眼
          (haloSprite.material as SpriteMaterial).opacity = 0.40 + haloBreatheIntensity * 0.42;  // 更耀眼
          let currentHaloScale = 7.2 + haloBreatheIntensity * 2.2;
          if (explosionActiveRef.current) {
            currentHaloScale *= 
              explosionLevelRef.current === 4 ? 8.0 :
              explosionLevelRef.current === 3 ? 5.5 :
              explosionLevelRef.current === 2 ? 3.8 : 2.5;
          }
          haloSprite.scale.setScalar(currentHaloScale);  // 仙氣膨脹

          // 白色光暈呼吸 - 仙氣純淨
          const whiteBreath = 0.50 + Math.sin(t * 0.34) * 0.48;  // 仙氣漂浮感
          (bloomWhite.material as SpriteMaterial).opacity = whiteBreath * 0.65;  // 更純淨透亮

          // 紫色光暈呼吸 - 仙氣優雅
          const violetBreath = 0.50 + Math.sin(t * 0.34 + 1.6) * 0.48;  // 優雅協調
          (bloomViolet.material as SpriteMaterial).opacity = violetBreath * 0.65;  // 仙氣層次

          const goldBreath = 0.5 + Math.sin(t * 0.29 + 3.1) * 0.5;
          (bloomGold.material as SpriteMaterial).opacity = 0.10 + goldBreath * 0.18;
          bloomGold.scale.setScalar(4.7 + goldBreath * 1.1);

          // ✨ 優化波紋動畫 - 高效計算，減少三角函數調用
          const WAVE_PERIOD = 3.8;
          const tNorm = (t / WAVE_PERIOD);  // 預先計算

          for (let i = 0; i < waves.length; i++) {
            const w = waves[i];
            const p = (tNorm + w.phase) % 1;
            const pPi = p * Math.PI;
            const sc = 1.6 + p * 5.8;
            w.mesh.scale.set(sc, sc, sc);
            (w.mesh.material as MeshBasicMaterial).opacity = Math.sin(pPi) * 0.95;
          }
          for (let i = 0; i < waves2.length; i++) {
            const w = waves2[i];
            const p = (tNorm + w.phase) % 1;
            const pPi = p * Math.PI;
            const sc = 1.6 + p * 5.2;
            w.mesh.scale.set(sc, sc, sc);
            (w.mesh.material as MeshBasicMaterial).opacity = Math.sin(pPi) * 0.70;
          }
          for (let i = 0; i < waves3.length; i++) {
            const w = waves3[i];
            const p = (tNorm + w.phase) % 1;
            const pPi = p * Math.PI;
            const sc = 1.4 + p * 5.5;
            w.mesh.scale.set(sc, sc, sc);
            (w.mesh.material as MeshBasicMaterial).opacity = Math.sin(pPi) * 0.65;
          }

          // Soul mist breathe
          (mistSprite.material as SpriteMaterial).opacity = 0.12 + Math.sin(t * 0.5) * 0.04;
          mistSprite.scale.setScalar(7.0 + Math.sin(t * 0.4) * 0.6);



          renderer.render(scene, camera);
        }

        visibilityHandler = () => {
          if (document.hidden) {
            cancelAnimationFrame(animId);
            animId = 0;
          } else if (!cancelled && animId === 0) {
            frame();
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        frame();

        // ── Resize ───────────────────────────────────────────────────────
        resizeFn = () => {
          const nw = container.clientWidth  || 320;
          const nh = container.clientHeight || 320;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        };
        window.addEventListener("resize", resizeFn);

      } catch (err) {
        console.warn("[VisualGravityCore] fallback:", err);
        setFailed(true);
      }
    }

    boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      if (timerRef.current) clearTimeout(timerRef.current);
      effectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      effectTimeoutsRef.current.clear();
      if (resizeFn) window.removeEventListener("resize", resizeFn);
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('reset-audio-context', handleResetAudio);
      window.removeEventListener('reset-celestial-mist', handleResetMist);
      disposeThree?.();
      // Remove all canvases including stale ones from HMR
      Array.from(container.querySelectorAll("canvas")).forEach(c => c.remove());
      orbitLayer.remove();
      domEl = null;
    };
  }, []);

  // ─── 🔮 手機觸碰「科技仙氣芒光」發光粒子系統 (2D/3D 低耦合架構) ───
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const rippleRef = useRef<any | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const isCompactPointer = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const isVisualLoadReduced = () => {
    if (typeof document === 'undefined') return false;
    const body = document.body;
    return body.classList.contains('app-lite-effects')
      || body.classList.contains('app-low-power-device')
      || body.classList.contains('app-social-browser')
      || body.classList.contains('app-stress-mode')
      || body.classList.contains('app-scrolling')
      || body.classList.contains('app-touching');
  };

  // 渲染與更新粒子與漣漪
  const updateAndDraw = () => {
    if (document.hidden) {
      animFrameIdRef.current = 0;
      return;
    }
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let active = false;

    // 1. 繪製氣震波漣漪 (Aura Ripple)
    const ripple = rippleRef.current;
    if (ripple) {
      ripple.radius += 3.8;
      ripple.alpha -= 0.028;
      if (ripple.alpha > 0 && ripple.radius < ripple.maxRadius) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ripple.rgb}, ${ripple.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${ripple.rgb}, ${ripple.alpha})`;
        ctx.stroke();
        ctx.shadowBlur = 0;
        active = true;
      } else {
        rippleRef.current = null;
      }
    }

    // 2. 更新並繪製仙氣粒子 (Cosmic Sparkles)
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.018; // 微弱重力下沉
      p.vx += Math.sin(p.x * 0.05 + p.waveOffset) * 0.06; // 正弦 S 波仙氣擺動
      p.alpha -= p.decay;
      p.size = Math.max(0.1, p.size - 0.035);

      if (p.alpha > 0 && p.size > 0.1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace("ALPHA", p.alpha.toFixed(2));
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.glowColor;
        ctx.fill();
        ctx.shadowBlur = 0;
        active = true;
      } else {
        particles.splice(i, 1);
      }
    }

    if (active) {
      animFrameIdRef.current = requestAnimationFrame(updateAndDraw);
    } else {
      animFrameIdRef.current = 0;
    }
  };

  const triggerBurst = (clientX: number, clientY: number) => {
    touchSpinSpeedRef.current = 2.4; // 觸碰時旋轉加速
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 確保 Canvas 寬高設定正確，適應 Retina 視網膜高分屏
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const isCyan = Math.random() > 0.5;
    rippleRef.current = {
      x,
      y,
      radius: 5,
      maxRadius: 85,
      alpha: 0.8,
      rgb: isCyan ? "34, 211, 238" : "245, 158, 11",
    };

    const colorOptions = [
      { fill: "rgba(34, 211, 238, ALPHA)", glow: "#22d3ee" }, // 青色
      { fill: "rgba(245, 158, 11, ALPHA)", glow: "#f59e0b" },  // 金色
      { fill: "rgba(139, 92, 246, ALPHA)", glow: "#8b5cf6" },  // 紫色
      { fill: "rgba(236, 72, 153, ALPHA)", glow: "#ec4899" },  // 玫瑰粉
    ];

    const burstParticleCount = isVisualLoadReduced() ? 10 : isCompactPointer() ? 18 : 55;
    const newParticles = [];
    for (let i = 0; i < burstParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 3.5;
      const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        color: col.fill,
        glowColor: col.glow,
        size: 2.0 + Math.random() * 2.8,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        waveOffset: Math.random() * 100,
      });
    }

    particlesRef.current.push(...newParticles);
    const maxParticles = isVisualLoadReduced() ? 48 : 140;
    if (particlesRef.current.length > maxParticles) {
      particlesRef.current.splice(0, particlesRef.current.length - maxParticles);
    }

    if (animFrameIdRef.current === 0) {
      animFrameIdRef.current = requestAnimationFrame(updateAndDraw);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches[0]) {
      triggerBurst(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    triggerBurst(e.clientX, e.clientY);
  };

  useEffect(() => {
    // 1. 手機打開 Ready 800ms 後，自動首發大爆發一次芒光仙氣
    const autoBurstTimeout = setTimeout(() => {
      if (document.hidden || document.body.classList.contains('app-stress-mode') || document.body.classList.contains('app-touching')) return;
      const canvas = interactionCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        triggerBurst(rect.left + centerX, rect.top + centerY);
      }
    }, 800);

    // 2. 每隔 5 秒，太極自動進行一次輕量級的金色氣波呼吸
    const breathInterval = setInterval(() => {
      if (document.hidden || document.body.classList.contains('app-stress-mode') || document.body.classList.contains('app-touching')) return;
      const canvas = interactionCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const canvasX = centerX;
        const canvasY = centerY;

        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }

        // 常駐金色呼吸波
        rippleRef.current = {
          x: canvasX,
          y: canvasY,
          radius: 5,
          maxRadius: 75,
          alpha: 0.55,
          rgb: "245, 158, 11",
        };

        const colorOptions = [
          { fill: "rgba(245, 158, 11, ALPHA)", glow: "#f59e0b" },  // 金色
          { fill: "rgba(34, 211, 238, ALPHA)", glow: "#22d3ee" }, // 青色
        ];

        const breathParticleCount = isVisualLoadReduced() ? 3 : isCompactPointer() ? 6 : 18;
        const breathParticles = [];
        for (let i = 0; i < breathParticleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 2.0;
          const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
          breathParticles.push({
            x: canvasX,
            y: canvasY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.2,
            color: col.fill,
            glowColor: col.glow,
            size: 1.5 + Math.random() * 2.0,
            alpha: 0.85,
            decay: 0.01 + Math.random() * 0.015,
            waveOffset: Math.random() * 100,
          });
        }

        particlesRef.current.push(...breathParticles);
        const maxParticles = isVisualLoadReduced() ? 48 : 140;
        if (particlesRef.current.length > maxParticles) {
          particlesRef.current.splice(0, particlesRef.current.length - maxParticles);
        }

        if (animFrameIdRef.current === 0) {
          animFrameIdRef.current = requestAnimationFrame(updateAndDraw);
        }
      }
    }, isVisualLoadReduced() ? 9000 : 5000);

    return () => {
      clearTimeout(autoBurstTimeout);
      clearInterval(breathInterval);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Fallback: static yin-yang if WebGL fails
  if (failed) {
    return (
      <div
        className="relative flex aspect-square w-[min(20rem,calc(100vw-2rem))] items-center justify-center rounded-full overflow-hidden"
        style={{ background: "#02030A" }}
      >
        <div
          className="h-64 w-64 rounded-full"
          style={{
            background: "linear-gradient(135deg,#F8FAFC 50%,#050505 50%)",
            boxShadow: "0 0 50px rgba(180,200,255,0.25)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="relative h-80 w-80 mx-auto overflow-hidden rounded-full cursor-pointer select-none"
      style={{ background: "#02030A" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleTaiChiClick}
    >
      <canvas
        ref={interactionCanvasRef}
        className="absolute inset-0 z-30 pointer-events-none w-full h-full"
      />

      {/* 👑 觸碰 3 次爆發：六字真言梵文自轉全息法陣 (科技神秘感優化) */}
      {showMantra && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all duration-700 animate-fade-in overflow-hidden">
          {/* 📡 全息掃描光線線條 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_95%,rgba(245,158,11,0.15)_95%)] bg-[size:100%_15px] pointer-events-none opacity-40 animate-[cyberScan_6s_linear_infinite]" />
          
          {/* 🌀 雙重科幻旋轉刻度光環 */}
          <div className="absolute w-[240px] h-[240px] rounded-full border border-amber-500/20 border-dashed animate-spin" style={{ animationDuration: '45s' }} />
          <div className="absolute w-[220px] h-[220px] rounded-full border border-cyan-500/10 border-double animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />

          {/* 🌀 緩慢自轉的梵文六字大明咒結界 */}
          <div className="relative w-[230px] h-[230px] rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '28s' }}>
            <span 
              className="absolute text-2xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '6%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0.1s' }}
            >
              ॐ
            </span>
            <span 
              className="absolute text-xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '28%', left: '88%', transform: 'translate(-50%, -50%)', animationDelay: '0.3s' }}
            >
              म
            </span>
            <span 
              className="absolute text-xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '72%', left: '88%', transform: 'translate(-50%, -50%)', animationDelay: '0.6s' }}
            >
              णि
            </span>
            <span 
              className="absolute text-xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '94%', left: '50%', transform: 'translate(-50%, -50%)', animationDelay: '0.9s' }}
            >
              पद्
            </span>
            <span 
              className="absolute text-xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '72%', left: '12%', transform: 'translate(-50%, -50%)', animationDelay: '1.2s' }}
            >
              मे
            </span>
            <span 
              className="absolute text-xl font-serif text-amber-200 drop-shadow-[0_0_15px_rgba(245,158,11,0.85)] animate-pulse" 
              style={{ top: '28%', left: '12%', transform: 'translate(-50%, -50%)', animationDelay: '1.5s' }}
            >
              हूँ
            </span>
          </div>

          {/* 💎 位於核心的靜態全息加持横幅 */}
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative text-center px-4 py-3 rounded-2xl bg-slate-950/75 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)] max-w-[195px] overflow-hidden">
              {/* 角隅科技裝飾十字 */}
              <span className="absolute top-1 left-1 text-[7px] text-cyan-500/40 font-mono">+</span>
              <span className="absolute top-1 right-1 text-[7px] text-cyan-500/40 font-mono">+</span>
              <span className="absolute bottom-1 left-1 text-[7px] text-cyan-500/40 font-mono">+</span>
              <span className="absolute bottom-1 right-1 text-[7px] text-cyan-500/40 font-mono">+</span>

              <p className="text-[10px] font-mono text-cyan-400/90 tracking-widest opacity-80 animate-pulse">
                [SYS.DECRYPT: MODE_03]
              </p>
              <p className="mt-1 text-xs font-bold tracking-[0.2em] text-amber-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] font-serif">
                ॐ मणिपद्me हूँ
              </p>
              <p className="mt-1 text-[8.5px] font-semibold text-amber-400/90 tracking-[0.05em] font-serif">
                ✨ 觀音六字大明咒護持 ✨
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-cyan-500/10 text-[8.5px] text-cyan-200/80 tracking-wider font-mono leading-normal">
                [狀態] 磁場重組 · 諸難消散<br />[能量] 福慧加載中...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👑 觸碰 6 次終極大加持：六字真言全息金剛法界 (重力扭曲、極致科幻黑暗與光芒) */}
      {showSuperMantra && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md transition-all duration-700 animate-fade-in overflow-hidden">
          {/* 📡 數碼網格背景 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />
          
          {/* 🌀 金剛重力環動態 */}
          <div className="absolute w-[250px] h-[250px] rounded-full border border-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.1)] animate-ping" style={{ animationDuration: '3.5s' }} />
          <div className="absolute w-[240px] h-[240px] rounded-full bg-gradient-to-tr from-amber-500/10 via-white/20 to-cyan-500/10 opacity-35 blur-2xl animate-pulse" />
          
          <div className="relative z-10 text-center px-5 py-4 rounded-3xl bg-slate-950/80 border-2 border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.3)] max-w-[245px] animate-rise overflow-hidden">
            {/* 角隅科技裝飾十字 */}
            <span className="absolute top-1.5 left-1.5 text-[8px] text-amber-400/50 font-mono">+</span>
            <span className="absolute top-1.5 right-1.5 text-[8px] text-amber-400/50 font-mono">+</span>
            <span className="absolute bottom-1.5 left-1.5 text-[8px] text-amber-400/50 font-mono">+</span>
            <span className="absolute bottom-1.5 right-1.5 text-[8px] text-amber-400/50 font-mono">+</span>

            <span className="inline-block rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[8.5px] font-mono font-bold text-amber-300 animate-pulse">
              [ENERGY_STATUS: DECRYPT_OK]
            </span>
            
            {/* 白金發光全息梵文 */}
            <h3 className="mt-3.5 font-serif text-xl text-amber-200 tracking-widest drop-shadow-[0_0_12px_rgba(251,191,36,0.75)] animate-pulse">
              ॐ मणिपद्me हूँ
            </h3>
            
            <p className="mt-2.5 text-[9px] font-bold text-amber-400 font-serif border-t border-b border-cyan-500/10 py-1.5 tracking-wider uppercase">
              ✨ 今日全息福運天盤已啟 ✨
            </p>
            
            <p className="mt-2.5 text-[8.5px] leading-relaxed text-cyan-200/90 font-medium font-mono">
              [SYSTEM] 接引觀音大悲聖光波段，<br />
              [輸出] 賜予你今日一整天重力福運，<br />
              百無禁忌，諸事逢凶化吉！
            </p>
          </div>
        </div>
      )}

      {/* 👑 觸碰 12 次終極大加持：六字真言無量超維佛光法界 (封印碎裂 · 科技全息色散梵文飄舞) */}
      {showMegaMantra && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-slate-950/95 backdrop-blur-lg transition-all duration-1000 animate-fade-in overflow-hidden">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes cyberScan {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100%); }
            }
            @keyframes megaFloat1 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ff0055); }
              20% { opacity: 1; }
              100% { transform: translate(-100px, -110px) scale(1.6) rotate(-72deg); opacity: 0; filter: drop-shadow(0 0 10px #00ffcc); }
            }
            @keyframes megaFloat2 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #00ffcc); }
              20% { opacity: 1; }
              100% { transform: translate(100px, -110px) scale(1.6) rotate(60deg); opacity: 0; filter: drop-shadow(0 0 10px #ff0055); }
            }
            @keyframes megaFloat3 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ffc85c); }
              20% { opacity: 1; }
              100% { transform: translate(120px, -10px) scale(1.6) rotate(35deg); opacity: 0; filter: drop-shadow(0 0 10px #ffc85c); }
            }
            @keyframes megaFloat4 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ff0055); }
              20% { opacity: 1; }
              100% { transform: translate(90px, 90px) scale(1.6) rotate(-45deg); opacity: 0; filter: drop-shadow(0 0 10px #00ffcc); }
            }
            @keyframes megaFloat5 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #00ffcc); }
              20% { opacity: 1; }
              100% { transform: translate(-95px, 95px) scale(1.6) rotate(45deg); opacity: 0; filter: drop-shadow(0 0 10px #ff0055); }
            }
            @keyframes megaFloat6 {
              0% { transform: translate(-50%, -50%) scale(0.2) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ffc85c); }
              20% { opacity: 1; }
              100% { transform: translate(-120px, -10px) scale(1.6) rotate(-60deg); opacity: 0; filter: drop-shadow(0 0 10px #ffc85c); }
            }
          `}} />

          {/* 🌟 數碼全息掃描線 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_96%,rgba(34,211,238,0.25)_96%)] bg-[size:100%_12px] pointer-events-none animate-[cyberScan_4s_linear_infinite]" />

          {/* 🌟 封印碎裂科幻光環 (結界破裂) */}
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-400/60 animate-ping opacity-70" style={{ animationDuration: '0.9s' }} />
          <div className="absolute inset-4 rounded-full border border-double border-amber-500/40 animate-pulse opacity-40" />

          {/* 萬丈金剛科幻佛光背景 */}
          <div className="absolute w-[290px] h-[290px] rounded-full bg-gradient-radial from-amber-300/40 via-cyan-500/10 to-transparent opacity-90 blur-3xl animate-pulse" />

          {/* 飄浮漫天的全息色散梵文 (帶有霓虹科技陰影特效) */}
          <div className="absolute inset-0 pointer-events-none">
            <span 
              className="absolute text-3xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat1 6.5s ease-out forwards',
              }}
            >
              ॐ
            </span>
            <span 
              className="absolute text-2xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat2 6.5s ease-out forwards',
              }}
            >
              म
            </span>
            <span 
              className="absolute text-2xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat3 6.5s ease-out forwards',
              }}
            >
              णि
            </span>
            <span 
              className="absolute text-2xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat4 6.5s ease-out forwards',
              }}
            >
              पद्
            </span>
            <span 
              className="absolute text-2xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat5 6.5s ease-out forwards',
              }}
            >
              मे
            </span>
            <span 
              className="absolute text-2xl font-serif text-amber-200/90 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ 
                top: '50%', left: '50%',
                animation: 'megaFloat6 6.5s ease-out forwards',
              }}
            >
              हूँ
            </span>
          </div>

          {/* 💎 位於核心的全息佛光普照橫幅 */}
          <div className="relative z-20 text-center px-4 py-4 rounded-[2rem] bg-slate-950/85 border-2 border-cyan-400/40 shadow-[0_0_50px_rgba(34,211,238,0.35)] max-w-[250px] animate-rise overflow-hidden">
            <span className="absolute top-2 left-2 text-[7px] text-cyan-400/30 font-mono">+</span>
            <span className="absolute top-2 right-2 text-[7px] text-cyan-400/30 font-mono">+</span>
            
            <span className="inline-block rounded-full bg-gradient-to-r from-cyan-500 to-amber-300 px-3 py-0.5 text-[8.5px] font-black text-slate-950 uppercase tracking-widest shadow-md">
              [STATUS: SYSTEM_SHATTERED_100%]
            </span>
            
            <p className="mt-3.5 text-xs font-bold text-amber-300 font-serif border-b border-cyan-500/20 pb-2 tracking-widest uppercase">
              ॐ ॐ मणिपद्me हूँ
            </p>
            
            <p className="mt-3 text-[9px] leading-relaxed text-amber-100 font-medium font-mono">
              [天宿福光] 佛光返照，超維降臨！<br />
              [指令] 接引無量大悲能量本願，<br />
              賜予你今日百無禁忌、天官賜福、<br />
              大吉大利，好運維度拉滿！
            </p>
          </div>
        </div>
      )}

      {/* 👑 觸碰 24 次終極天宿爆發：大悲咒梵文 · 萬佛朝宗無量佛光 (再度升級極致) */}
      {showGreatMantra && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-slate-950/98 backdrop-blur-xl transition-all duration-1000 animate-fade-in overflow-hidden">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes extremeScan {
              0% { transform: translateY(-100%) scaleY(1); opacity: 0.3; }
              50% { opacity: 0.8; }
              100% { transform: translateY(100%) scaleY(1.5); opacity: 0.1; }
            }
            @keyframes greatFloat1 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #f59e0b) hue-rotate(0deg); }
              10% { opacity: 1; }
              100% { transform: translate(-130px, -140px) scale(1.9) rotate(-108deg); opacity: 0; filter: drop-shadow(0 0 15px #f59e0b) hue-rotate(360deg); }
            }
            @keyframes greatFloat2 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #06b6d4); }
              10% { opacity: 1; }
              100% { transform: translate(130px, -140px) scale(1.9) rotate(90deg); opacity: 0; filter: drop-shadow(0 0 15px #06b6d4); }
            }
            @keyframes greatFloat3 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #a855f7); }
              10% { opacity: 1; }
              100% { transform: translate(150px, -15px) scale(1.9) rotate(45deg); opacity: 0; filter: drop-shadow(0 0 15px #a855f7); }
            }
            @keyframes greatFloat4 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ec4899); }
              10% { opacity: 1; }
              100% { transform: translate(110px, 120px) scale(1.9) rotate(-60deg); opacity: 0; filter: drop-shadow(0 0 15px #ec4899); }
            }
            @keyframes greatFloat5 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #10b981); }
              10% { opacity: 1; }
              100% { transform: translate(-110px, 120px) scale(1.9) rotate(60deg); opacity: 0; filter: drop-shadow(0 0 15px #10b981); }
            }
            @keyframes greatFloat6 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #f59e0b); }
              10% { opacity: 1; }
              100% { transform: translate(-150px, -15px) scale(1.9) rotate(-90deg); opacity: 0; filter: drop-shadow(0 0 15px #f59e0b); }
            }
            @keyframes greatFloat7 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #ffffff); }
              10% { opacity: 1; }
              100% { transform: translate(0px, -165px) scale(2.2) rotate(180deg); opacity: 0; filter: drop-shadow(0 0 20px #f59e0b); }
            }
            @keyframes greatFloat8 {
              0% { transform: translate(-50%, -50%) scale(0.1) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 2px #06b6d4); }
              10% { opacity: 1; }
              100% { transform: translate(0px, 165px) scale(2.2) rotate(-180deg); opacity: 0; filter: drop-shadow(0 0 20px #06b6d4); }
            }
            @keyframes buddhaRadiation {
              0% { transform: rotate(0deg) scale(0.9); opacity: 0.15; }
              50% { transform: rotate(180deg) scale(1.1); opacity: 0.45; }
              100% { transform: rotate(360deg) scale(0.9); opacity: 0.15; }
            }
          `}} />

          {/* 🌟 數碼全息掃描線 */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_97%,rgba(245,158,11,0.3)_97%)] bg-[size:100%_10px] pointer-events-none animate-[extremeScan_3s_linear_infinite]" />

          {/* 🌟 萬佛朝宗金色佛光輪 (向四周旋轉散射的千道聖光) */}
          <div 
            className="absolute w-[360px] h-[360px] rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(245,158,11,0.08)_0deg_15deg,transparent_15deg_30deg)] pointer-events-none" 
            style={{ animation: 'buddhaRadiation 15s linear infinite' }}
          />

          {/* 🌟 萬佛朝宗多重同心圓科技法輪 */}
          <div className="absolute w-[280px] h-[280px] rounded-full border-2 border-dashed border-amber-400/40 animate-spin" style={{ animationDuration: '60s' }} />
          <div className="absolute w-[260px] h-[260px] rounded-full border border-dotted border-cyan-400/30 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }} />
          <div className="absolute w-[240px] h-[240px] rounded-full border border-double border-purple-500/20 animate-spin" style={{ animationDuration: '40s' }} />

          {/* 萬丈超維佛光背景 */}
          <div className="absolute w-[320px] h-[320px] rounded-full bg-gradient-radial from-amber-200/50 via-cyan-500/10 to-transparent opacity-95 blur-3xl animate-pulse" />

          {/* 飄浮漫天的千手觀音大悲咒咒心梵文 (帶有霓虹科技陰影特效) */}
          <div className="absolute inset-0 pointer-events-none">
            <span 
              className="absolute text-4xl font-serif text-amber-200/90 drop-shadow-[0_0_20px_rgba(251,191,36,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat1 8.5s ease-out forwards' }}
            >
              ह्रीः
            </span>
            <span 
              className="absolute text-3xl font-serif text-cyan-200/90 drop-shadow-[0_0_20px_rgba(34,211,238,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat2 8.5s ease-out forwards' }}
            >
              ॐ
            </span>
            <span 
              className="absolute text-3xl font-serif text-purple-200/90 drop-shadow-[0_0_20px_rgba(168,85,247,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat3 8.5s ease-out forwards' }}
            >
              व
            </span>
            <span 
              className="absolute text-3xl font-serif text-pink-200/90 drop-shadow-[0_0_20px_rgba(236,72,153,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat4 8.5s ease-out forwards' }}
            >
              ज्र
            </span>
            <span 
              className="absolute text-3xl font-serif text-emerald-200/90 drop-shadow-[0_0_20px_rgba(16,185,129,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat5 8.5s ease-out forwards' }}
            >
              ध
            </span>
            <span 
              className="absolute text-3xl font-serif text-amber-200/90 drop-shadow-[0_0_20px_rgba(251,191,36,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat6 8.5s ease-out forwards' }}
            >
              र्म
            </span>
            <span 
              className="absolute text-4xl font-serif text-amber-100 drop-shadow-[0_0_25px_rgba(255,255,255,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat7 8.5s ease-out forwards' }}
            >
              ह्र
            </span>
            <span 
              className="absolute text-4xl font-serif text-cyan-100 drop-shadow-[0_0_25px_rgba(34,211,238,1.0)]"
              style={{ top: '50%', left: '50%', animation: 'greatFloat8 8.5s ease-out forwards' }}
            >
              ीः
            </span>
          </div>

          {/* 💎 位於核心的千手千眼大悲法輪橫幅 */}
          <div className="relative z-20 text-center px-4 py-4.5 rounded-[2rem] bg-slate-950/90 border-2 border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.45)] max-w-[260px] animate-rise overflow-hidden">
            <span className="absolute top-2 left-2 text-[8px] text-amber-400/40 font-mono">+</span>
            <span className="absolute top-2 right-2 text-[8px] text-amber-400/40 font-mono">+</span>
            
            <span className="inline-block rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-cyan-400 px-3 py-0.5 text-[8px] font-black text-slate-950 uppercase tracking-widest shadow-md animate-pulse">
              [STATUS: AVALOKITESVARA_ULTIMATE_AWAKEN]
            </span>
            
            <p className="mt-3 text-[11px] font-bold text-amber-300 font-serif border-b border-amber-500/20 pb-2 tracking-[0.2em] uppercase">
              ॐ वज्रधर्म ह्रीः
            </p>
            
            <p className="mt-3 text-[8.5px] leading-relaxed text-amber-100/90 font-medium font-mono">
              [極致法界] 萬佛朝宗 · 無量佛光！<br />
              [本願] 接引千手千眼無礙大悲聖水，<br />
              淨化三業，賜予你至高無上之<br />
              宇宙福緣灌頂，今日百無禁忌！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
