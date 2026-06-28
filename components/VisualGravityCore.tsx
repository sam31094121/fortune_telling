"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Mesh, MeshBasicMaterial, SpriteMaterial } from "three";

export default function VisualGravityCore() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const container: HTMLDivElement = mount;

    let animId = 0;
    let domEl: HTMLCanvasElement | null = null;
    let resizeFn: (() => void) | null = null;
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
        const isMobile = window.innerWidth < 768;

        // ── Scene ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x02030a);
        scene.fog = new THREE.FogExp2(0x02030a, 0.06);

        // ── Camera ───────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.z = 5.8;

        // ── Renderer ─────────────────────────────────────────────────────
        // ✨ 優化渲染配置 - 最大性能和流暢度
        const pixelRatio = isMobile ? 0.85 : Math.min(devicePixelRatio, 1.5);  // 降低像素比提升性能
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
        const sphGeo = new THREE.SphereGeometry(1.62, isMobile ? 56 : 88, isMobile ? 56 : 88);
        const sphMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vLocalPosition;
            void main() {
              vLocalPosition = position / 1.62;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            varying vec3 vLocalPosition;
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

              vec3 whiteTone = vec3(0.92, 0.96, 1.00);
              vec3 blackTone = vec3(0.008, 0.012, 0.035);
              vec3 col = mix(blackTone, whiteTone, yang);

              // 柔和的球面明暗與邊緣收束，增加深度但不破壞圖騰辨識度。
              float depthLight = 0.82 + max(vLocalPosition.z, 0.0) * 0.18;
              float rim = smoothstep(0.0, 0.72, 1.0 - max(vLocalPosition.z, 0.0));
              col *= depthLight;
              col += vec3(0.10, 0.14, 0.28) * rim * 0.16;
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

        // ✨ 增強能量波 - 更多波紋效果、更密集的能量環繞
        const waveTex = buildRingTex(170, 195, 255);
        const WAVE_N = isMobile ? 3 : 5;
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
        const WAVE2_N = isMobile ? 2 : 4;
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
        const WAVE3_N = isMobile ? 2 : 3;
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
        const pN = isMobile ? 280 : 1100;
        const pArr = new Float32Array(pN * 3);
        const pColors = new Float32Array(pN * 3);  // 新增：顏色變化
        for (let i = 0; i < pN; i++) {
          const pr = 2.8 + Math.random() * 5.2;
          const pt = Math.random() * Math.PI * 2;
          const pp = Math.acos(2 * Math.random() - 1);
          pArr[i * 3]     = pr * Math.sin(pp) * Math.cos(pt);
          pArr[i * 3 + 1] = pr * Math.sin(pp) * Math.sin(pt);
          pArr[i * 3 + 2] = pr * Math.cos(pp);

          // 粒子顏色變化：白色 → 藍色 → 紫色
          const colorType = Math.random();
          if (colorType < 0.4) {
            pColors[i * 3] = 1.0; pColors[i * 3 + 1] = 0.95; pColors[i * 3 + 2] = 1.0;  // 白
          } else if (colorType < 0.7) {
            pColors[i * 3] = 0.7; pColors[i * 3 + 1] = 0.8; pColors[i * 3 + 2] = 1.0;   // 藍
          } else {
            pColors[i * 3] = 0.6; pColors[i * 3 + 1] = 0.6; pColors[i * 3 + 2] = 0.9;   // 紫
          }
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
        pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));
        const pMat = new THREE.PointsMaterial({
          size: isMobile ? 0.035 : 0.022,
          transparent: true, opacity: 0.82,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
          vertexColors: true,  // 啟用頂點顏色
        });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // ✨ 增強能量塵埃 - 更多粒子、更動態的吸收/釋放
        const fN = isMobile ? 140 : 500;
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
        const clock = new THREE.Clock();

        // ✨ 優化的動畫循環 - 高效計算
        function frame() {
          animId = requestAnimationFrame(frame);
          const t = clock.getElapsedTime();

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

          // 維持太極正面辨識度，只用微量視差表現 3D 深度。
          grp.rotation.y = Math.sin(t * 0.24) * 0.08;
          grp.rotation.x = 0.06 + Math.sin(t * 0.19) * 0.035;
          grp.rotation.z = Math.sin(t * 0.16) * 0.055;

          // 低幅度能量呼吸，避免忽大忽小造成視覺失焦。
          const breatheIntensity = 0.014 + Math.sin(t * 0.42) * 0.004;
          grp.scale.setScalar(1 + Math.sin(t * 0.55) * breatheIntensity);

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
          particles.rotation.y += 0.0008;
          particles.rotation.z += 0.0004;

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
          haloSprite.scale.setScalar(7.2 + haloBreatheIntensity * 2.2);  // 仙氣膨脹

          // 白色光暈呼吸 - 仙氣純淨
          const whiteBreath = 0.50 + Math.sin(t * 0.34) * 0.48;  // 仙氣漂浮感
          (bloomWhite.material as SpriteMaterial).opacity = whiteBreath * 0.65;  // 更純淨透亮

          // 紫色光暈呼吸 - 仙氣優雅
          const violetBreath = 0.50 + Math.sin(t * 0.34 + 1.6) * 0.48;  // 優雅協調
          (bloomViolet.material as SpriteMaterial).opacity = violetBreath * 0.65;  // 仙氣層次

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
      if (resizeFn) window.removeEventListener("resize", resizeFn);
      // Remove all canvases including stale ones from HMR
      Array.from(container.querySelectorAll("canvas")).forEach(c => c.remove());
      domEl = null;
    };
  }, []);

  // Fallback: static yin-yang if WebGL fails
  if (failed) {
    return (
      <div
        className="relative flex h-80 w-80 items-center justify-center rounded-full overflow-hidden"
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
      className="relative h-80 w-80 overflow-hidden rounded-full"
      style={{ background: "#02030A" }}
    />
  );
}
