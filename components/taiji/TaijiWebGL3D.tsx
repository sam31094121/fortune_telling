'use client';

/**
 * Tech Tai Chi 3D（Three.js WebGL 版）
 *
 * 只在 HIGH 效能等級掛載；MEDIUM/LOW/reduced-motion/無 WebGL 一律用 SVG 版（外層決定）。
 * 特性：拖曳旋轉、自動旋轉、能量環、發光粒子、電路紋理、浮動晶體、陰陽發光眼。
 * three 由 CDN 動態載入（zero-build，webpackIgnore 繞過打包）。
 * 生命週期：hidden 暫停、卸載完整 dispose（RAF/Listener/Texture/Geometry）。
 */

import { useEffect, useRef } from 'react';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

let threePromise: Promise<any> | null = null;

function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = import(/* webpackIgnore: true */ THREE_CDN);
  }
  return threePromise;
}

function createCircuitTexture(THREE: any, isYin: boolean) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isYin ? '#050510' : '#f0f0f8';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = isYin ? 'rgba(0, 240, 255, 0.35)' : 'rgba(255, 0, 170, 0.4)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < size; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  ctx.fillStyle = isYin ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 0, 170, 0.8)';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath(); ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

export default function TaijiWebGL3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return;

    let disposed = false;
    let raf: number | null = null;
    let cleanupFns: Array<() => void> = [];

    loadThree().then((THREE) => {
      if (disposed || !hostRef.current) return;

      const width = host.clientWidth || 320;
      const height = host.clientHeight || 320;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      // 俯視角：讓太極陰陽面正對觀者（卡片內第一眼即讀懂圖騰）
      camera.position.set(0, 6.4, 4.6);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'pan-y';

      // ===== 燈光 =====
      scene.add(new THREE.AmbientLight(0x111122, 0.4));
      const lightCyan = new THREE.PointLight(0x00f0ff, 2.5, 20);
      lightCyan.position.set(-2.5, 2, 3);
      scene.add(lightCyan);
      const lightMagenta = new THREE.PointLight(0xff00aa, 2.2, 20);
      lightMagenta.position.set(2.5, 1.5, 2);
      scene.add(lightMagenta);
      const lightCore = new THREE.PointLight(0xffffff, 1.8, 8);
      scene.add(lightCore);

      // ===== 太極核心 =====
      const taiChiGroup = new THREE.Group();
      scene.add(taiChiGroup);

      const yinTex = createCircuitTexture(THREE, true);
      const yangTex = createCircuitTexture(THREE, false);
      const yinMat = new THREE.MeshStandardMaterial({
        map: yinTex, emissive: new THREE.Color(0x003344), emissiveIntensity: 0.6,
        metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide,
      });
      const yangMat = new THREE.MeshStandardMaterial({
        map: yangTex, emissive: new THREE.Color(0x330022), emissiveIntensity: 0.5,
        metalness: 0.6, roughness: 0.2, side: THREE.DoubleSide,
      });
      const halfGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32, 1, false, 0, Math.PI);
      const yinMesh = new THREE.Mesh(halfGeo, yinMat);
      yinMesh.rotation.y = Math.PI;
      taiChiGroup.add(yinMesh);
      const yangMesh = new THREE.Mesh(halfGeo, yangMat);
      taiChiGroup.add(yangMesh);

      // 陰陽發光眼（正統：暗半配亮眼、亮半配暗眼）
      const eyeGeo = new THREE.SphereGeometry(0.28, 32, 32);
      const eyeYin = new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.8, metalness: 0.3, roughness: 0.1,
      }));
      eyeYin.position.set(0.7, 0.08, 0);
      taiChiGroup.add(eyeYin);
      const eyeYang = new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({
        color: 0x111111, emissive: 0xff00aa, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.2,
      }));
      eyeYang.position.set(-0.7, 0.08, 0);
      taiChiGroup.add(eyeYang);

      // 中心能量柱＋光暈
      const energyCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
      );
      taiChiGroup.add(energyCore);
      const coreGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 2.6, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }),
      );
      taiChiGroup.add(coreGlow);

      // ===== 能量環 =====
      const rings: any[] = [];
      const ringParams = [
        { radius: 2.1, tube: 0.025, speed: 0.4, color: 0x00f0ff },
        { radius: 2.45, tube: 0.02, speed: -0.28, color: 0xff00aa },
        { radius: 2.85, tube: 0.018, speed: 0.18, color: 0x00f0ff },
        { radius: 3.25, tube: 0.015, speed: -0.12, color: 0xaa00ff },
      ];
      ringParams.forEach((p, i) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(p.radius, p.tube, 16, 100),
          new THREE.MeshStandardMaterial({
            color: p.color, emissive: p.color, emissiveIntensity: 1.6,
            metalness: 0.8, roughness: 0.15, transparent: true, opacity: 0.85,
          }),
        );
        ring.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.08 : -0.06);
        ring.userData.speed = p.speed;
        taiChiGroup.add(ring);
        rings.push(ring);
      });

      // ===== 發光粒子 =====
      const particleCount = 600;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const colorCyan = new THREE.Color(0x00f0ff);
      const colorMagenta = new THREE.Color(0xff00aa);
      for (let i = 0; i < particleCount; i++) {
        const r = 3.5 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
        positions[i * 3 + 2] = r * Math.cos(phi);
        const c = Math.random() > 0.5 ? colorCyan : colorMagenta;
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
        size: 0.045, vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      scene.add(particles);

      // ===== 浮動晶體 =====
      const crystalGeo = new THREE.OctahedronGeometry(0.12, 0);
      const crystals: any[] = [];
      for (let i = 0; i < 8; i++) {
        const crystal = new THREE.Mesh(crystalGeo, new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x00f0ff : 0xff00aa,
          emissive: i % 2 === 0 ? 0x00f0ff : 0xff00aa,
          emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.9,
        }));
        const angle = (i / 8) * Math.PI * 2;
        crystal.position.set(Math.cos(angle) * 3.8, (Math.random() - 0.5) * 2.5, Math.sin(angle) * 3.8);
        crystal.userData = {
          angle, speed: 0.3 + Math.random() * 0.4,
          radius: 3.6 + Math.random() * 0.6, ySpeed: 0.4 + Math.random() * 0.5,
        };
        scene.add(crystal);
        crystals.push(crystal);
      }

      // ===== 拖曳旋轉（免 OrbitControls，含慣性阻尼與自動旋轉） =====
      let dragging = false;
      let lastX = 0; let lastY = 0;
      let velX = 0; let velY = 0;
      const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        velY = (e.clientX - lastX) * 0.006;
        velX = (e.clientY - lastY) * 0.004;
        lastX = e.clientX; lastY = e.clientY;
        taiChiGroup.rotation.y += velY;
        taiChiGroup.rotation.x = Math.max(-0.9, Math.min(0.9, taiChiGroup.rotation.x + velX));
      };
      const onUp = () => { dragging = false; };
      renderer.domElement.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      cleanupFns.push(() => {
        renderer.domElement.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      });

      // ===== Resize =====
      const resize = () => {
        const w = host.clientWidth || width;
        const h = host.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      cleanupFns.push(() => ro.disconnect());

      // ===== 主迴圈（唯一 RAF；hidden 暫停） =====
      const clock = new THREE.Clock();
      const tick = () => {
        const t = clock.getElapsedTime();

        if (!dragging) {
          taiChiGroup.rotation.y += 0.0035; // 自動旋轉
          velX *= 0.94; velY *= 0.94;      // 慣性衰減
          taiChiGroup.rotation.y += velY;
          taiChiGroup.rotation.x = Math.max(-0.9, Math.min(0.9, taiChiGroup.rotation.x + velX));
        }
        taiChiGroup.position.y = Math.sin(t * 0.7) * 0.12; // 自然浮沉

        rings.forEach((ring) => { ring.rotation.z += ring.userData.speed * 0.01; });
        particles.rotation.y = t * 0.03;
        crystals.forEach((crystal) => {
          const u = crystal.userData;
          const a = u.angle + t * u.speed * 0.4;
          crystal.position.x = Math.cos(a) * u.radius;
          crystal.position.z = Math.sin(a) * u.radius;
          crystal.position.y = Math.sin(t * u.ySpeed + u.angle) * 1.2;
          crystal.rotation.x = t * u.speed;
          crystal.rotation.y = t * u.speed * 1.4;
        });
        lightCore.intensity = 1.5 + Math.sin(t * 2.2) * 0.4;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onVisibility = () => {
        if (document.hidden) {
          if (raf != null) { cancelAnimationFrame(raf); raf = null; }
        } else if (raf == null && !disposed) {
          clock.getDelta();
          raf = requestAnimationFrame(tick);
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

      // ===== Dispose =====
      cleanupFns.push(() => {
        if (raf != null) cancelAnimationFrame(raf);
        scene.traverse((obj: any) => {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
          mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); });
        });
        renderer.dispose();
        renderer.domElement.remove();
      });
    }).catch(() => {
      /* CDN 載入失敗：保持空容器，外層 SVG 版本仍在（漸進增強） */
    });

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      cleanupFns = [];
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
