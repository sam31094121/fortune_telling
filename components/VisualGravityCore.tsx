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
        const isMobile = W < 768;

        // ── Scene ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x02030a);
        scene.fog = new THREE.FogExp2(0x02030a, 0.06);

        // ── Camera ───────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.z = 5.8;

        // ── Renderer ─────────────────────────────────────────────────────
        // 根據裝置調整抗鋸齒以平衡性能和質量
        const pixelRatio = isMobile ? 1 : Math.min(devicePixelRatio, 2);
        const renderer = new THREE.WebGLRenderer({
          antialias: !isMobile,
          powerPreference: 'high-performance',
          alpha: true,
          precision: 'highp',
          logarithmicDepthBuffer: false,
          stencil: false,
        });
        renderer.setSize(W, H);
        renderer.setPixelRatio(pixelRatio);
        renderer.shadowMap.enabled = false;
        renderer.info.autoReset = true;

        // Explicit color space + no tone mapping
        try {
          renderer.outputColorSpace = (THREE as any).SRGBColorSpace;
        } catch (_) { /* r152 fallback */ }
        renderer.toneMapping = THREE.NoToneMapping;
        if (cancelled) { renderer.dispose(); return; }
        container.appendChild(renderer.domElement);
        domEl = renderer.domElement;

        // ── Lights ───────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const keyL = new THREE.PointLight(0xffffff, 4.5, 16);
        keyL.position.set(1.5, 1.5, 4);
        scene.add(keyL);
        const fillL = new THREE.PointLight(0x8899ff, 1.8, 12);
        fillL.position.set(-2, -1.5, 2);
        scene.add(fillL);
        const backL = new THREE.PointLight(0x4466cc, 1.2, 10);
        backL.position.set(0, 0, -4);
        scene.add(backL);

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
        const sphGeo = new THREE.SphereGeometry(1.62, 128, 128);
        const sphMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            varying vec2 vUv;
            void main() {
              float x = (vUv.x - 0.5) * 2.0;
              float y = (vUv.y - 0.5) * 2.0;
              float r_yinHole  = sqrt(x*x + (y+0.5)*(y+0.5));
              float r_yangBump = sqrt(x*x + (y-0.5)*(y-0.5));
              bool yang;
              if (x < 0.0) { yang = r_yinHole  >= 0.5; }
              else          { yang = r_yangBump <  0.5; }
              if (sqrt(x*x + (y-0.5)*(y-0.5)) < 0.115) yang = false;
              if (sqrt(x*x + (y+0.5)*(y+0.5)) < 0.115) yang = true;
              vec3 col = yang
                ? vec3(0.96, 0.98, 1.00)
                : vec3(0.02, 0.02, 0.07);
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        });
        grp.add(new THREE.Mesh(sphGeo, sphMat));


        // ── Outer glow aura — like a glowing lightbulb releasing light ─────
        // Multiple concentric BackSide shells: bright near surface, fading out.
        // Colors blend the white-hole white & black-hole violet energy.
        const auraShells: { mesh: Mesh; baseOp: number; pulse: number }[] = [];
        const auraDefs = [
          { r: 1.70, color: 0xf2f5ff, op: 0.30, pulse: 0.08 }, // inner bright white-blue
          { r: 1.88, color: 0xb8c2ff, op: 0.20, pulse: 0.09 }, // mid violet-blue
          { r: 2.12, color: 0x8a80ff, op: 0.13, pulse: 0.10 }, // outer violet
          { r: 2.48, color: 0x6a74ff, op: 0.078, pulse: 0.12 }, // far halo
          { r: 2.95, color: 0x5262e0, op: 0.045, pulse: 0.14 }, // faint outermost bloom
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

        // ── Energy waves — 3D tilted rings propagating outward in space ────
        // Tilted on an elliptical plane so they read as depth, like shockwaves
        // radiating through 3D space from the core.
        const waveTex = buildRingTex(170, 195, 255);
        const WAVE_N = 4;
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
          m.rotation.x = Math.PI / 2.35; // tilt → 3D elliptical perspective
          grp.add(m);
          waves.push({ mesh: m, phase: i / WAVE_N });
        }

        // Vertical-plane waves (perpendicular tilt) for fuller 3D spherical feel
        const waveTex2 = buildRingTex(180, 160, 255);
        const WAVE2_N = 3;
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

        // ── Particles (star dust) ─────────────────────────────────────────
        const pN = isMobile ? 600 : 1800;
        const pArr = new Float32Array(pN * 3);
        for (let i = 0; i < pN; i++) {
          const pr = 2.8 + Math.random() * 4.5;
          const pt = Math.random() * Math.PI * 2;
          const pp = Math.acos(2 * Math.random() - 1);
          pArr[i * 3]     = pr * Math.sin(pp) * Math.cos(pt);
          pArr[i * 3 + 1] = pr * Math.sin(pp) * Math.sin(pt);
          pArr[i * 3 + 2] = pr * Math.cos(pp);
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
        const pMat = new THREE.PointsMaterial({
          color: 0xdde7ff, size: isMobile ? 0.028 : 0.018,
          transparent: true, opacity: 0.72,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // ── Energy dust (particle streams, no lines) ──────────────────────
        const fN = isMobile ? 300 : 900;
        const fPos = new Float32Array(fN * 3);
        const fPhase = new Float32Array(fN);
        for (let i = 0; i < fN; i++) {
          const angle = Math.random() * Math.PI * 2;
          const fr = 2.2 + Math.random() * 3.0;
          fPos[i * 3]     = Math.cos(angle) * fr;
          fPos[i * 3 + 1] = (Math.random() - 0.5) * fr * 0.8;
          fPos[i * 3 + 2] = Math.sin(angle) * fr * 0.6;
          fPhase[i] = Math.random() * Math.PI * 2;
        }
        const fGeo = new THREE.BufferGeometry();
        const fAttr = new THREE.BufferAttribute(fPos, 3);
        fAttr.setUsage(THREE.DynamicDrawUsage);
        fGeo.setAttribute("position", fAttr);
        const fMat = new THREE.PointsMaterial({
          color: 0xaabbee, size: 0.022,
          transparent: true, opacity: 0.0,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
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

        function frame() {
          animId = requestAnimationFrame(frame);
          const t = clock.getElapsedTime();

          // Y-axis rotation: one full turn every 6s so the whole taiji
          // structure (yang → yin → yang) is revealed within 6 seconds
          grp.rotation.y = t * (Math.PI * 2 / 6);
          // Fixed axis tilt + gentle sway → strong 3D spatial depth, the holes
          // orbit on a visible elliptical 3D path rather than a flat line
          grp.rotation.x = 0.16 + Math.sin(t * 0.5) * 0.05;
          grp.rotation.z = Math.sin(t * 0.4) * 0.12;

          // Breathing
          grp.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03);

          // ── Black hole — accretion disk spin + radiant lensing halo ──────
          diskMesh.rotation.z = t * 1.4;
          const bhPulse = 1 + Math.sin(t * 1.9) * 0.18;
          bhHaloSprite.scale.set(0.9 * bhPulse, 0.9 * bhPulse, 1);
          (bhHaloSprite.material as SpriteMaterial).opacity = 0.8 + Math.sin(t * 1.9) * 0.2;
          bhSprite.scale.set(1.5 * bhPulse, 1.5 * bhPulse, 1);
          (bhSprite.material as SpriteMaterial).opacity = 0.75 + Math.sin(t * 1.3) * 0.2;

          // ── White hole — intense radiant light burst ─────────────────────
          const wPulse = 1 + Math.sin(t * 1.6) * 0.22;
          whSprite.scale.set(wPulse * 1.8, wPulse * 1.8, 1);
          (whSprite.material as SpriteMaterial).opacity = 0.85 + Math.sin(t * 1.6) * 0.15;
          whCore.scale.set(0.8 + Math.sin(t * 2.4) * 0.12, 0.8 + Math.sin(t * 2.4) * 0.12, 1);
          whMat.emissiveIntensity = 3.0 + Math.sin(t * 2.2) * 1.2;
          // Twinkling lens-flare streaks
          const flareP = 0.55 + Math.abs(Math.sin(t * 1.1)) * 0.45;
          (whFlare.material as SpriteMaterial).opacity = flareP * 0.7;
          whFlare.scale.set(2.6 + Math.sin(t * 1.7) * 0.8, 0.12, 1);
          (whFlareV.material as SpriteMaterial).opacity = flareP * 0.5;
          whFlareV.scale.set(0.12, 1.9 + Math.sin(t * 1.5) * 0.6, 1);

          // Particles slow orbit
          particles.rotation.y += 0.0008;
          particles.rotation.z += 0.0004;

          // Energy dust absorption/release 8s cycle
          const fc    = t % 8;
          const fPull = fc < 3 ? fc / 3 : fc < 4 ? 1 : fc < 7 ? 1 - (fc - 4) / 3 : 0;
          fMat.opacity = fPull * 0.35;
          fibers.visible = fPull > 0.05;

          // Move dust particles inward during absorption
          const posArr = fAttr.array as Float32Array;
          for (let i = 0; i < fN; i++) {
            posArr[i * 3]     = fPos[i * 3]     * (1 - fPull * 0.68 + Math.sin(t * 0.8 + fPhase[i]) * 0.05);
            posArr[i * 3 + 1] = fPos[i * 3 + 1] * (1 - fPull * 0.68 + Math.cos(t * 0.6 + fPhase[i]) * 0.05);
            posArr[i * 3 + 2] = fPos[i * 3 + 2] * (1 - fPull * 0.68);
          }
          fAttr.needsUpdate = true;

          // Aura shells pulse — radiating light like a breathing lightbulb
          for (let i = 0; i < auraShells.length; i++) {
            const s = auraShells[i];
            const m = s.mesh.material as MeshBasicMaterial;
            m.opacity = s.baseOp + Math.sin(t * 0.9 - i * 0.6) * s.pulse;
            s.mesh.scale.setScalar(1 + Math.sin(t * 0.7 - i * 0.5) * 0.025);
          }
          // Halo & directional blooms breathe
          (haloSprite.material as SpriteMaterial).opacity = 0.38 + Math.sin(t * 0.6) * 0.10;
          haloSprite.scale.setScalar(6.6 + Math.sin(t * 0.5) * 0.7);
          (bloomWhite.material as SpriteMaterial).opacity = 0.32 + Math.sin(t * 1.6) * 0.12;
          (bloomViolet.material as SpriteMaterial).opacity = 0.32 + Math.sin(t * 1.3 + 1.0) * 0.12;

          // Energy waves — expand outward from core then fade, looping
          const WAVE_PERIOD = 4.2;
          for (let i = 0; i < waves.length; i++) {
            const w = waves[i];
            const p = ((t / WAVE_PERIOD) + w.phase) % 1; // 0→1 expansion progress
            const sc = 1.6 + p * 5.4;                    // grow from core outward
            w.mesh.scale.set(sc, sc, sc);
            const m = w.mesh.material as MeshBasicMaterial;
            m.opacity = Math.sin(p * Math.PI) * 0.85;    // fade in then out
          }
          for (let i = 0; i < waves2.length; i++) {
            const w = waves2[i];
            const p = ((t / WAVE_PERIOD) + w.phase) % 1;
            const sc = 1.6 + p * 5.0;
            w.mesh.scale.set(sc, sc, sc);
            const m = w.mesh.material as MeshBasicMaterial;
            m.opacity = Math.sin(p * Math.PI) * 0.55;
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
