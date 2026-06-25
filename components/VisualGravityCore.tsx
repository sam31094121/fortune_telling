"use client";

import React, { useEffect, useRef, useState } from "react";

export default function VisualGravityCore() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animId = 0;
    let domEl: HTMLCanvasElement | null = null;
    let resizeFn: (() => void) | null = null;

    async function boot() {
      try {
        // Dynamic import — avoids SSR crash
        const THREE = await import("three");

        // WebGL availability check
        const testC = document.createElement("canvas");
        const hasGL = testC.getContext("webgl") || testC.getContext("experimental-webgl");
        if (!hasGL) throw new Error("no-webgl");

        const W = mount.clientWidth  || 320;
        const H = mount.clientHeight || 320;
        const isMobile = W < 768;

        // ── Scene ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x02030a);
        scene.fog = new THREE.FogExp2(0x02030a, 0.06);

        // ── Camera ───────────────────────────────────────────────────────
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.z = 5.8;

        // ── Renderer ─────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        // Explicit color space + no tone mapping so white stays white
        try {
          renderer.outputColorSpace = (THREE as any).SRGBColorSpace;
        } catch (_) { /* r152 fallback */ }
        renderer.toneMapping = THREE.NoToneMapping;
        mount.appendChild(renderer.domElement);
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

        // ── Yin-Yang canvas texture ───────────────────────────────────────
        function buildYYTex() {
          const S = 1024, m = S / 2, r = m;

          // Draw yin-yang on temp canvas
          const tmp = document.createElement("canvas");
          tmp.width = tmp.height = S;
          const tx = tmp.getContext("2d")!;

          tx.fillStyle = "#050505";
          tx.beginPath();
          tx.arc(m, m, r, 0, Math.PI * 2);
          tx.fill();

          // Yang (white) S-path — clockwise arc = RIGHT half
          tx.fillStyle = "#FFFFFF";
          tx.beginPath();
          tx.arc(m, m, r, -Math.PI / 2, Math.PI / 2, false);
          tx.arc(m, m + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
          tx.arc(m, m - r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false);
          tx.closePath();
          tx.fill();

          // Yin dot in yang (black hole eye)
          tx.fillStyle = "#000000";
          tx.beginPath();
          tx.arc(m, m - r / 2, r * 0.13, 0, Math.PI * 2);
          tx.fill();

          // Yang dot in yin (white hole eye)
          tx.fillStyle = "#FFFFFF";
          tx.beginPath();
          tx.arc(m, m + r / 2, r * 0.13, 0, Math.PI * 2);
          tx.fill();

          // Flip horizontally so yang maps to U=0-0.5 (front-facing in Three.js sphere)
          const cv = document.createElement("canvas");
          cv.width = cv.height = S;
          const cx = cv.getContext("2d")!;
          cx.translate(S, 0);
          cx.scale(-1, 1);
          cx.drawImage(tmp, 0, 0);

          return new THREE.CanvasTexture(cv);
        }

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

        // ── Core group (rotates as one unit) ─────────────────────────────
        const grp = new THREE.Group();
        scene.add(grp);

        // Main yin-yang sphere
        const yyTex  = buildYYTex();
        try { (yyTex as any).colorSpace = (THREE as any).SRGBColorSpace; } catch (_) { /* ok */ }
        const sphGeo = new THREE.SphereGeometry(1.62, 128, 128);
        // MeshBasicMaterial: shows texture color directly, not affected by lights
        // This ensures yang (white) area is always visibly white
        const sphMat = new THREE.MeshBasicMaterial({ map: yyTex });
        grp.add(new THREE.Mesh(sphGeo, sphMat));


        // Outer glow shell
        const glowGeo = new THREE.SphereGeometry(1.78, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x7788cc, transparent: true, opacity: 0.052,
          side: THREE.BackSide, depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        grp.add(new THREE.Mesh(glowGeo, glowMat));

        // ── Black hole (in white area, upper front) ───────────────────────
        const bhMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0, roughness: 0.02, metalness: 1 })
        );
        bhMesh.position.set(0, 0.8, 1.38);
        grp.add(bhMesh);

        // Accretion disk
        const diskMesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.27, 0.033, 8, 64),
          new THREE.MeshBasicMaterial({
            color: 0x6644ee, transparent: true, opacity: 0.88,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        diskMesh.position.set(0, 0.8, 1.38);
        diskMesh.rotation.x = Math.PI / 2.6;
        grp.add(diskMesh);

        const bhSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(100, 130, 255), transparent: true, opacity: 0.72,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        bhSprite.position.set(0, 0.8, 1.38);
        bhSprite.scale.set(0.8, 0.8, 1);
        grp.add(bhSprite);

        // ── White hole (in dark area, lower front) ────────────────────────
        const whMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.8,
          roughness: 0.04, metalness: 0.15,
        });
        const whMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 32), whMat);
        whMesh.position.set(0, -0.8, 1.38);
        grp.add(whMesh);

        const whSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: buildGlowTex(248, 250, 252), transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        whSprite.position.set(0, -0.8, 1.38);
        whSprite.scale.set(1.3, 1.3, 1);
        grp.add(whSprite);

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

          // Y-axis rotation makes yin/yang alternate facing camera
          // Offset already puts yang at front at t=0; slow rotation shows both sides
          grp.rotation.y = t * 0.10;
          // Gentle Z tilt for 3D feel
          grp.rotation.z = Math.sin(t * 0.28) * 0.10;

          // Breathing
          grp.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03);

          // Accretion disk spin
          diskMesh.rotation.z = t * 1.1;

          // White hole pulse
          const wPulse = 1 + Math.sin(t * 1.6) * 0.2;
          whSprite.scale.set(wPulse * 1.3, wPulse * 1.3, 1);
          whMat.emissiveIntensity = 2.4 + Math.sin(t * 2.2) * 0.9;

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

          // Soul mist breathe
          (mistSprite.material as THREE.SpriteMaterial).opacity = 0.12 + Math.sin(t * 0.5) * 0.04;
          mistSprite.scale.setScalar(7.0 + Math.sin(t * 0.4) * 0.6);

          renderer.render(scene, camera);
        }

        frame();

        // ── Resize ───────────────────────────────────────────────────────
        resizeFn = () => {
          const nw = mount.clientWidth  || 320;
          const nh = mount.clientHeight || 320;
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
      cancelAnimationFrame(animId);
      if (resizeFn) window.removeEventListener("resize", resizeFn);
      if (domEl && mount.contains(domEl)) mount.removeChild(domEl);
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
