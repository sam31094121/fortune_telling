'use client';

import { useEffect, useRef } from 'react';
import { Taiji24SoundEngine } from '@/lib/taiji24-sound-engine';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const TAIJI_TEXTURE_URL = '/assets/taiji/esoteric-taijitu-public-domain.svg';

let threePromise: Promise<any> | null = null;

function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = import(/* webpackIgnore: true */ THREE_CDN);
  }
  return threePromise;
}

function makeGlowMaterial(THREE: any, color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function setObjectOpacity(object: any, opacity: number) {
  object.traverse((node: any) => {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material: any) => {
      material.transparent = true;
      material.opacity = opacity;
    });
  });
}

function createTrigramGate(THREE: any, color: number, pattern: number[]) {
  const gate = new THREE.Group();
  const material = makeGlowMaterial(THREE, color, 0.78);
  const solidBarGeo = new THREE.BoxGeometry(0.52, 0.045, 0.05);
  const brokenBarGeo = new THREE.BoxGeometry(0.2, 0.045, 0.05);

  pattern.forEach((solid, row) => {
    const y = (1 - row) * 0.17;
    if (solid) {
      const bar = new THREE.Mesh(solidBarGeo, material);
      bar.position.y = y;
      gate.add(bar);
    } else {
      const left = new THREE.Mesh(brokenBarGeo, material);
      const right = new THREE.Mesh(brokenBarGeo, material);
      left.position.set(-0.16, y, 0);
      right.position.set(0.16, y, 0);
      gate.add(left, right);
    }
  });

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.006, 8, 44),
    makeGlowMaterial(THREE, color, 0.18),
  );
  halo.rotation.x = Math.PI / 2;
  gate.add(halo);
  return gate;
}

function createDefaultTaijiTexture(THREE: any) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#02040a';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx, cy - radius, radius, radius * 2);

  ctx.fillStyle = '#02040a';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, radius / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy - radius / 2, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#02040a';
  ctx.beginPath();
  ctx.arc(cx, cy + radius / 2, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(226, 246, 255, 0.86)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

export default function TaijiWebGL3D({
  className,
  variant = 'full',
  textureUrl = TAIJI_TEXTURE_URL,
  videoUrl,
}: {
  className?: string;
  variant?: 'full' | 'banner';
  textureUrl?: string;
  videoUrl?: string;
}) {
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
      const isBanner = variant === 'banner';

      const scene = new THREE.Scene();
      const bannerFrustum = 7.2;
      const camera = isBanner
        ? new THREE.OrthographicCamera(
          (-bannerFrustum * (width / height)) / 2,
          (bannerFrustum * (width / height)) / 2,
          bannerFrustum / 2,
          -bannerFrustum / 2,
          0.1,
          80,
        )
        : new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
      camera.position.set(0, isBanner ? 2.6 : 2.8, isBanner ? 12.5 : 10.5);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.03;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.dataset.engine = 'three.js r170';
      renderer.domElement.dataset.taijiScene = 'mounting';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'pan-y';
      host.appendChild(renderer.domElement);

      const world = new THREE.Group();
      if (isBanner) world.scale.setScalar(0.88);
      scene.add(world);

      scene.add(new THREE.AmbientLight(0x182033, 0.55));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.18);
      keyLight.position.set(3.8, 4.4, 6.5);
      scene.add(keyLight);
      const cyanLight = new THREE.PointLight(0x7dd3fc, 2.1, 15);
      cyanLight.position.set(-3.6, 2.4, 4.6);
      scene.add(cyanLight);
      const violetLight = new THREE.PointLight(0xc4b5fd, 1.2, 14);
      violetLight.position.set(3.2, -1.8, 3.8);
      scene.add(violetLight);

      const defaultTexture = createDefaultTaijiTexture(THREE);
      const imageTexture = textureUrl === TAIJI_TEXTURE_URL
        ? defaultTexture
        : new THREE.TextureLoader().load(textureUrl, () => {
          imageTexture.colorSpace = THREE.SRGBColorSpace;
          imageTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy?.() ?? 8, 16);
          imageTexture.needsUpdate = true;
        });
      let activeTexture = imageTexture;
      let videoElement: HTMLVideoElement | null = null;
      let videoTexture: any = null;

      if (videoUrl) {
        videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.crossOrigin = 'anonymous';
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.preload = 'auto';

        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        activeTexture = videoTexture;

        videoElement.play().catch(() => {
          activeTexture = imageTexture;
          [taijiFront, taijiBack].forEach((mesh) => {
            const material = mesh.material as any;
            material.map = imageTexture;
            material.needsUpdate = true;
          });
        });

        cleanupFns.push(() => {
          videoElement?.pause();
          if (videoElement) {
            videoElement.removeAttribute('src');
            videoElement.load();
          }
          videoTexture?.dispose?.();
        });
      }

      const taijiSystem = new THREE.Group();
      world.add(taijiSystem);

      const core = new THREE.Group();
      taijiSystem.add(core);

      const coreRadius = 1.62;
      const coreDepth = 0.24;
      const taijiFront = new THREE.Mesh(
          new THREE.CircleGeometry(coreRadius, 160),
        new THREE.MeshStandardMaterial({
          map: activeTexture,
          color: 0xffffff,
          metalness: 0.18,
          roughness: 0.3,
          emissive: 0x111827,
          emissiveIntensity: 0.16,
          side: THREE.DoubleSide,
        }),
      );
      taijiFront.position.z = coreDepth / 2 + 0.006;
      core.add(taijiFront);

      const taijiBack = taijiFront.clone();
      taijiBack.position.z = -coreDepth / 2 - 0.006;
      taijiBack.rotation.y = Math.PI;
      core.add(taijiBack);

      const edge = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRadius, coreRadius, coreDepth, 160, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0x101625,
          metalness: 0.62,
          roughness: 0.28,
          emissive: 0x08111e,
          emissiveIntensity: 0.12,
        }),
      );
      edge.rotation.x = Math.PI / 2;
      core.add(edge);

      const bevelRim = new THREE.Mesh(
        new THREE.TorusGeometry(coreRadius, 0.035, 14, 180),
        new THREE.MeshStandardMaterial({
          color: 0xeaf8ff,
          metalness: 0.55,
          roughness: 0.18,
          emissive: 0x6ee7ff,
          emissiveIntensity: 0.28,
        }),
      );
      core.add(bevelRim);

      const glassShell = new THREE.Mesh(
        new THREE.SphereGeometry(coreRadius * 1.13, 48, 48),
        makeGlowMaterial(THREE, 0x9eefff, 0.045),
      );
      glassShell.material.side = THREE.BackSide;
      core.add(glassShell);

      const stageLayers = new THREE.Group();
      taijiSystem.add(stageLayers);

      const liangyi = new THREE.Group();
      stageLayers.add(liangyi);
      [
        { color: 0x38bdf8, radius: 2.05, z: 0, rx: Math.PI / 2, ry: 0.32 },
        { color: 0xfb7185, radius: 2.25, z: 0, rx: Math.PI / 2, ry: -0.32 },
      ].forEach((ring) => {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(ring.radius, 0.012, 10, 144),
          makeGlowMaterial(THREE, ring.color, 0.28),
        );
        mesh.rotation.set(ring.rx, ring.ry, ring.z);
        liangyi.add(mesh);
      });

      const sixiang = new THREE.Group();
      stageLayers.add(sixiang);
      const sixiangColors = [0x38bdf8, 0xfb7185, 0xa78bfa, 0xfacc15];
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const node = new THREE.Group();
        node.position.set(Math.cos(angle) * 2.62, Math.sin(angle) * 0.22, Math.sin(angle) * 2.62);
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.115, 18, 18),
          makeGlowMaterial(THREE, sixiangColors[i], 0.82),
        );
        node.add(orb);
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.25, 0.006, 8, 44),
          makeGlowMaterial(THREE, sixiangColors[i], 0.22),
        );
        halo.rotation.x = Math.PI / 2;
        node.add(halo);
        sixiang.add(node);
      }

      const bagua = new THREE.Group();
      stageLayers.add(bagua);
      const trigramPatterns = [
        [1, 1, 1],
        [0, 1, 1],
        [1, 0, 1],
        [0, 0, 1],
        [1, 1, 0],
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 0],
      ];
      const baguaColors = [0xfde68a, 0xfb923c, 0xfb7185, 0x86efac, 0x67e8f9, 0x60a5fa, 0xc4b5fd, 0xe5e7eb];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const gate = createTrigramGate(THREE, baguaColors[i], trigramPatterns[i]);
        gate.position.set(Math.cos(angle) * 3.18, 0, Math.sin(angle) * 3.18);
        gate.rotation.y = -angle + Math.PI / 2;
        bagua.add(gate);
      }
      const baguaRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.18, 0.012, 8, 160),
        makeGlowMaterial(THREE, 0xe0f2fe, 0.16),
      );
      baguaRing.rotation.x = Math.PI / 2;
      bagua.add(baguaRing);

      const starCount = 220;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const radius = 3.9 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 1.35;
        starPositions[i * 3] = Math.cos(theta) * radius;
        starPositions[i * 3 + 1] = y;
        starPositions[i * 3 + 2] = Math.sin(theta) * radius;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xbfefff,
          size: 0.026,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      world.add(stars);

      const tooltip = document.createElement('div');
      tooltip.style.cssText = 'position:absolute;padding:3px 10px;border-radius:999px;background:rgba(2,8,20,0.82);border:1px solid rgba(0,229,255,0.45);color:#bfefff;font-size:12px;font-weight:700;letter-spacing:2px;pointer-events:none;opacity:0;transition:opacity 160ms ease;white-space:nowrap;z-index:5;';
      host.style.position = host.style.position || 'relative';
      host.appendChild(tooltip);
      cleanupFns.push(() => tooltip.remove());

      const stages = [
        { label: '太極', liangyi: 0.28, sixiang: 0, bagua: 0 },
        { label: '兩儀', liangyi: 0.6, sixiang: 0.12, bagua: 0 },
        { label: '四象', liangyi: 0.44, sixiang: 0.58, bagua: 0.08 },
        { label: '八卦', liangyi: 0.32, sixiang: 0.38, bagua: 0.72 },
      ];
      let stageIndex = 0;
      let dragging = false;
      let downX = 0;
      let downY = 0;
      let lastX = 0;
      let lastY = 0;
      let velX = 0;
      let velY = 0;
      const taiji24 = new Taiji24SoundEngine();
      let soundBurstUntil = -1;

      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      const pickables = [taijiFront, taijiBack, edge, bevelRim];
      const pickAt = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(pickables, false);
        return hits.length ? hits[0].object : null;
      };

      const onDown = (event: PointerEvent) => {
        dragging = true;
        downX = event.clientX;
        downY = event.clientY;
        lastX = event.clientX;
        lastY = event.clientY;
      };
      const onMove = (event: PointerEvent) => {
        if (dragging) {
          velY = (event.clientX - lastX) * 0.005;
          velX = (event.clientY - lastY) * 0.003;
          lastX = event.clientX;
          lastY = event.clientY;
          world.rotation.y += velY;
          world.rotation.x = Math.max(-0.62, Math.min(0.62, world.rotation.x + velX));
          return;
        }
        const hit = pickAt(event.clientX, event.clientY);
        if (hit) {
          const rect = host.getBoundingClientRect();
          tooltip.textContent = `${stages[stageIndex].label}｜點擊切換層次`;
          tooltip.style.left = `${event.clientX - rect.left + 14}px`;
          tooltip.style.top = `${event.clientY - rect.top - 10}px`;
          tooltip.style.opacity = '1';
          renderer.domElement.style.cursor = 'pointer';
        } else {
          tooltip.style.opacity = '0';
          renderer.domElement.style.cursor = 'grab';
        }
      };
      const onUp = (event: PointerEvent) => {
        const wasDrag = Math.hypot(event.clientX - downX, event.clientY - downY) > 6;
        dragging = false;
        if (wasDrag) return;
        if (!pickAt(event.clientX, event.clientY)) return;

        stageIndex = (stageIndex + 1) % stages.length;
        void taiji24.click().then((state) => {
          tooltip.textContent = state.completed ? '24 韻圓滿｜太極歸一' : `${stages[stageIndex].label}｜第 ${state.step}/24 韻`;
          tooltip.style.opacity = '1';
          soundBurstUntil = elapsed + (state.completed ? 2.4 : 0.7);
        });
      };

      renderer.domElement.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      cleanupFns.push(() => {
        renderer.domElement.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      });

      const resize = () => {
        const w = host.clientWidth || width;
        const h = host.clientHeight || height;
        if (isBanner) {
          const aspect = w / h;
          camera.left = (-bannerFrustum * aspect) / 2;
          camera.right = (bannerFrustum * aspect) / 2;
          camera.top = bannerFrustum / 2;
          camera.bottom = -bannerFrustum / 2;
        } else {
          camera.aspect = w / h;
        }
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      cleanupFns.push(() => ro.disconnect());

      const timer = new THREE.Timer();
      let elapsed = 0;
      const tick = (timestamp: number) => {
        timer.update(timestamp);
        const dt = Math.min(timer.getDelta(), 0.05);
        elapsed += dt;
        const t = elapsed;
        const currentStage = stages[stageIndex];
        const burst = soundBurstUntil > t ? Math.min(1, soundBurstUntil - t) : 0;

        if (!dragging) {
          velX *= 0.93;
          velY *= 0.93;
          world.rotation.y += velY;
          world.rotation.x = Math.max(-0.62, Math.min(0.62, world.rotation.x + velX));
        }

        core.rotation.z = t * 0.16;
        core.rotation.y = Math.sin(t * 0.35) * 0.055;
        core.scale.setScalar(1 + Math.sin(t * 1.2) * 0.018 + burst * 0.04);
        glassShell.scale.setScalar(1.0 + Math.sin(t * 1.1) * 0.03 + burst * 0.12);
        (glassShell.material as any).opacity = 0.04 + Math.sin(t * 1.7) * 0.014 + burst * 0.1;

        liangyi.rotation.y = -t * 0.15;
        liangyi.rotation.x = Math.sin(t * 0.45) * 0.08;
        sixiang.rotation.y = t * 0.09;
        bagua.rotation.y = -t * 0.055;
        baguaRing.rotation.z = t * 0.04;
        stars.rotation.y = t * 0.018;

        setObjectOpacity(liangyi, currentStage.liangyi + burst * 0.16);
        setObjectOpacity(sixiang, currentStage.sixiang + burst * 0.16);
        setObjectOpacity(bagua, currentStage.bagua + burst * 0.16);

        coreLightProxy.intensity = 1.8 + Math.sin(t * 1.8) * 0.35 + burst * 1.4;
        cyanLight.intensity = 1.8 + Math.sin(t * 1.3) * 0.35 + burst * 0.6;
        violetLight.intensity = 1.0 + Math.cos(t * 1.1) * 0.22 + burst * 0.55;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };

      const coreLightProxy = new THREE.PointLight(0xffffff, 1.8, 8);
      coreLightProxy.position.set(0, 0, 2.8);
      world.add(coreLightProxy);

      raf = requestAnimationFrame(tick);
      renderer.domElement.dataset.taijiScene = 'ready';

      const onVisibility = () => {
        if (document.hidden) {
          if (raf != null) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        } else if (raf == null && !disposed) {
          timer.reset();
          raf = requestAnimationFrame(tick);
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

      cleanupFns.push(() => {
        if (raf != null) cancelAnimationFrame(raf);
        scene.traverse((object: any) => {
          object.geometry?.dispose?.();
          const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
          materials.forEach((material: any) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        });
        renderer.dispose();
        renderer.domElement.remove();
      });
    }).catch((error) => {
      hostRef.current?.setAttribute('data-taiji-webgl-error', error instanceof Error ? error.message : String(error));
    });

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {
          // noop
        }
      });
      cleanupFns = [];
    };
  }, [textureUrl, variant, videoUrl]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
