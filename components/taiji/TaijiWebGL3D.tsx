'use client';

/**
 * Tech Tai Chi · 三層立體空間系統（徹底重構版）
 *
 * 第一層（核心）：太極＝真正的 3D 光效球體（陰陽雙色發光＋Fresnel 邊緣光＋核心脈衝）
 * 第二層：五顆行星（空風水火地）＝立體圓球＋大氣光暈，各自獨立軌道 365° 公轉，
 *         不同半徑/傾角/速度＋初始角均勻分布 ⇒ 禁止碰撞、禁止重疊
 * 第三層：空間概念＝巨大半透明空間能量球體（雙層膜）包覆整體，持續脈動釋放光芒＋800 空間粒子
 *
 * 只在 HIGH 效能掛載；MEDIUM/LOW/reduced-motion/無 WebGL 由外層退回 SVG。
 * three 由 CDN 動態載入（zero-build）；hidden 暫停；卸載完整 dispose。
 */

import { useEffect, useRef } from 'react';
import { Taiji24SoundEngine } from '@/lib/taiji24-sound-engine';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

let threePromise: Promise<any> | null = null;

function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = import(/* webpackIgnore: true */ THREE_CDN);
  }
  return threePromise;
}

/** 第一層：Shader 太極光效材質（陰陽發光＋Fresnel＋電路脈衝） */
function createTaiChiGlowMaterial(THREE: any) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      yinColor: { value: new THREE.Color(0x00e5ff) },
      yangColor: { value: new THREE.Color(0xff2a8a) },
      baseColor: { value: new THREE.Color(0x050712) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vLocalPosition = position;
        vUv = uv;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 yinColor;
      uniform vec3 yangColor;
      uniform vec3 baseColor;

      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;

      // ===== 阿基米德螺線太極（李仕澂模型）=====
      // 分界線 rho = R * theta / PI（theta 0~PI）+ 180 度對稱螺線
      // 黑白分明主體 + 魚眼呼吸 + 螺線流轉 + 邊界能量釋放
      const float PI = 3.14159265;
      const float SPHERE_R = 2.3;

      void main() {
        // 螺線流轉：整個圖騰隨時間旋轉
        float rotA = time * 0.32;
        float cs = cos(rotA);
        float sn = sin(rotA);
        vec2 q = vec2(
          vLocalPosition.x * cs - vLocalPosition.y * sn,
          vLocalPosition.x * sn + vLocalPosition.y * cs
        ) / SPHERE_R;

        float rho = length(q);
        float theta = atan(q.y, q.x);
        if (theta < 0.0) theta += 2.0 * PI;
        float t = theta / PI; // 0 ~ 2

        // 螺線展開係數微調：陰陽比例緩慢消長（陽極生陰、陰極生陽）
        float bCoef = 0.94 + 0.06 * sin(time * 0.55);
        float boundary = (t < 1.0 ? t : t - 1.0) * bCoef;
        float side = t < 1.0 ? 1.0 : -1.0;
        float d = (rho - boundary) * side;
        float white = smoothstep(-0.03, 0.03, d);

        // 黑白分明主體
        vec3 whiteBody = vec3(0.97, 0.975, 1.0);
        vec3 blackBody = vec3(0.015, 0.02, 0.05);
        vec3 color = mix(blackBody, whiteBody, white);

        // 魚眼（呼吸）：黑魚含白眼、白魚含黑眼，隨圖騰同步旋轉
        float eyeR = 0.085 + 0.03 * sin(time * 1.6);
        vec2 eyeBlackFish = 0.42 * vec2(cos(0.62 * PI), sin(0.62 * PI));
        vec2 eyeWhiteFish = -eyeBlackFish;
        float dEyeInBlack = length(q - eyeBlackFish);
        float dEyeInWhite = length(q - eyeWhiteFish);
        color = mix(whiteBody, color, smoothstep(eyeR * 0.82, eyeR, dEyeInBlack));
        color = mix(blackBody, color, smoothstep(eyeR * 0.82, eyeR, dEyeInWhite));

        // 螺線分界能量光：沿 S 形分界釋放青紅能量
        float boundaryGlow = smoothstep(0.055, 0.0, abs(rho - boundary)) * step(rho, 1.0);
        vec3 glowColor = mix(yinColor, yangColor, 0.5 + 0.5 * sin(time * 1.2));
        color += glowColor * boundaryGlow * 0.85;

        // 能量脈衝環：由核心向外釋放
        float ripple = sin(rho * 12.0 - time * 3.2) * 0.5 + 0.5;
        float rippleMask = smoothstep(1.0, 0.25, rho) * 0.12;
        color += mix(yinColor, yangColor, white) * ripple * rippleMask;

        // Fresnel 邊緣能量场：滿滿能量從球缘噴發
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 2.3);
        vec3 edgeColor = mix(yinColor, yangColor, white) * fresnel * 2.9;

        // 核心脈動
        float corePulse = smoothstep(0.2, 0.0, rho) * (0.3 + 0.25 * sin(time * 3.1));
        vec3 emissive = glowColor * corePulse;

        float pulse = 0.9 + 0.1 * sin(time * 2.2);
        vec3 finalColor = color * pulse + edgeColor + emissive;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

export default function TaijiWebGL3D({
  className,
  variant = 'full',
}: {
  className?: string;
  variant?: 'full' | 'banner';
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
      const bannerFrustum = 9.6;
      const camera = isBanner
        ? new THREE.OrthographicCamera(
          (-bannerFrustum * (width / height)) / 2,
          (bannerFrustum * (width / height)) / 2,
          bannerFrustum / 2,
          -bannerFrustum / 2,
          0.1,
          120,
        )
        : new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
      camera.position.set(0, isBanner ? 6.6 : 5.5, isBanner ? 24.5 : 17.2);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.dataset.taijiScene = 'mounting';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'pan-y';

      // 世界根群組：自動旋轉＋拖曳旋轉都作用在這裡（三層一起轉，空間一體感）
      const world = new THREE.Group();
      if (isBanner) {
        world.scale.setScalar(0.72);
        world.position.y = 0;
      }
      scene.add(world);

      // ===== 燈光 =====
      scene.add(new THREE.AmbientLight(0x080818, 0.22));
      const yinLight = new THREE.PointLight(0x00e5ff, 3.5, 26);
      yinLight.position.set(-4.6, 3.2, 5.4);
      scene.add(yinLight);
      const yangLight = new THREE.PointLight(0xff2a8a, 3.25, 26);
      yangLight.position.set(4.6, 2.8, 5.2);
      scene.add(yangLight);
      const coreLight = new THREE.PointLight(0xffffff, 2.45, 14);
      world.add(coreLight);

      // ==================== 第一層：立體太極球體 ====================
      const taiChiGroup = new THREE.Group();
      world.add(taiChiGroup);

      const taiChiSphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.3, 64, 64),
        createTaiChiGlowMaterial(THREE),
      );
      taiChiGroup.add(taiChiSphere);

      // 太極雙色外層光暈膜：青色陰光 + 洋紅陽光
      const taiChiYinAura = new THREE.Mesh(
        new THREE.SphereGeometry(2.62, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x00e5ff, transparent: true, opacity: 0.14,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      taiChiGroup.add(taiChiYinAura);
      const taiChiYangAura = new THREE.Mesh(
        new THREE.SphereGeometry(2.92, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff2a8a, transparent: true, opacity: 0.09,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      taiChiGroup.add(taiChiYangAura);
      const corePulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      taiChiGroup.add(corePulse);
      const coreBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 5.0, 18),
        new THREE.MeshBasicMaterial({
          color: 0x9eefff, transparent: true, opacity: 0.42,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      taiChiGroup.add(coreBeam);

      // --- 兩儀（陰陽雙極光環，互相垂直） ---
      const liangYi = new THREE.Group();
      taiChiGroup.add(liangYi);
      const yiGeo = new THREE.TorusGeometry(2.95, 0.032, 12, 80);
      const yinRing = new THREE.Mesh(yiGeo, new THREE.MeshBasicMaterial({
        color: 0x00e5ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
      }));
      yinRing.rotation.x = Math.PI / 2;
      liangYi.add(yinRing);
      const yangRing = new THREE.Mesh(yiGeo, new THREE.MeshBasicMaterial({
        color: 0xff2a8a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
      }));
      yangRing.rotation.x = Math.PI / 2;
      yangRing.rotation.z = Math.PI / 2;
      liangYi.add(yangRing);

      // --- 四象（四方能量點＋中心連線：少陽/太陽/少陰/太陰） ---
      const siXiang = new THREE.Group();
      taiChiGroup.add(siXiang);
      const siXiangColors = [0x00e5ff, 0xff2a8a, 0x9b59ff, 0x2ecc71];
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2;
        const point = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 16),
          new THREE.MeshBasicMaterial({ color: siXiangColors[s], transparent: true, opacity: 0.9 }),
        );
        point.position.set(Math.cos(angle) * 3.35, 0, Math.sin(angle) * 3.35);
        siXiang.add(point);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * 3.35, 0, Math.sin(angle) * 3.35),
        ]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
          color: siXiangColors[s], transparent: true, opacity: 0.25,
        }));
        siXiang.add(line);
      }

      // --- 八卦（八方位能量柱＋頂部光點＋外環） ---
      const baGua = new THREE.Group();
      taiChiGroup.add(baGua);
      const baGuaColors = [0xffdd44, 0xff8844, 0xff4455, 0x44ff88, 0x44ffcc, 0x4488ff, 0x8844ff, 0xaaaaaa];
      for (let b = 0; b < 8; b++) {
        const angle = (b / 8) * Math.PI * 2 - Math.PI / 2;
        const r = 3.95;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.65, 8),
          new THREE.MeshBasicMaterial({
            color: baGuaColors[b], transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending,
          }),
        );
        pillar.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        baGua.add(pillar);
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 12),
          new THREE.MeshBasicMaterial({ color: baGuaColors[b], transparent: true, opacity: 0.95 }),
        );
        tip.position.set(Math.cos(angle) * r, 0.38, Math.sin(angle) * r);
        baGua.add(tip);
      }
      const baGuaRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.95, 0.022, 8, 100),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending,
        }),
      );
      baGuaRing.rotation.x = Math.PI / 2;
      baGua.add(baGuaRing);

      // ==================== 第二層：五顆立體行星（空風水火地） ====================
      // 五元數行星（半徑外推，讓出放大後八卦環 3.55 的空間）
      const planetsConfig = [
        {
          name: '空', behavior: 'void', color: 0x9b59ff, emissive: 0x7b2cff,
          radius: 4.3, speed: 0.13, tilt: 0.12, size: 0.32, spinSpeed: 0.16,
          atmosphereScale: 2.1, atmosphereOpacity: 0.1, particleCount: 110,
          particleSize: 0.036, roughness: 0.08, metalness: 0.05, opacity: 0.35,
          orbitOpacity: 0.055, bloom: 0.65,
        },
        {
          name: '風', behavior: 'wind', color: 0x00e5ff, emissive: 0x00f5d4,
          radius: 5.3, speed: 0.28, tilt: -0.18, size: 0.25, spinSpeed: 2.4,
          atmosphereScale: 1.95, atmosphereOpacity: 0.16, particleCount: 300,
          particleSize: 0.044, roughness: 0.18, metalness: 0.15, opacity: 0.85,
          orbitOpacity: 0.095, bloom: 0.9,
        },
        {
          name: '水', behavior: 'water', color: 0x2980ff, emissive: 0x00bbf9,
          radius: 6.4, speed: 0.15, tilt: 0.2, size: 0.29, spinSpeed: 0.72,
          atmosphereScale: 1.55, atmosphereOpacity: 0.13, particleCount: 280,
          particleSize: 0.04, roughness: 0.04, metalness: 0.05, opacity: 0.82,
          orbitOpacity: 0.075, bloom: 0.55,
        },
        {
          name: '火', behavior: 'fire', color: 0xff4d19, emissive: 0xff006e,
          radius: 7.6, speed: 0.22, tilt: -0.14, size: 0.27, spinSpeed: 2.85,
          atmosphereScale: 2.25, atmosphereOpacity: 0.28, particleCount: 380,
          particleSize: 0.068, roughness: 0.4, metalness: 0.1, opacity: 1,
          orbitOpacity: 0.12, bloom: 2.8,
        },
        {
          name: '地', behavior: 'earth', color: 0x5ad16f, emissive: 0x2ecc71,
          radius: 8.9, speed: 0.09, tilt: 0.06, size: 0.34, spinSpeed: 0.12,
          atmosphereScale: 1.34, atmosphereOpacity: 0.09, particleCount: 42,
          particleSize: 0.038, roughness: 0.88, metalness: 0.22, opacity: 1,
          orbitOpacity: 0.045, bloom: 0.32,
        },
      ];
      const planets: any[] = [];
      planetsConfig.forEach((cfg, i) => {
        const group = new THREE.Group();
        const behavior = cfg.behavior;

        // 行星本體：每顆星以不同材質密度呈現「物理狀態」
        const planetMaterial = behavior === 'water'
          ? new THREE.MeshPhysicalMaterial({
            color: cfg.color,
            emissive: cfg.emissive,
            emissiveIntensity: cfg.bloom * 0.55,
            metalness: cfg.metalness,
            roughness: cfg.roughness,
            transparent: true,
            opacity: cfg.opacity,
            transmission: 0.18,
            thickness: 0.45,
            clearcoat: 0.9,
            clearcoatRoughness: 0.08,
          })
          : new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.emissive,
            emissiveIntensity: cfg.bloom,
            metalness: cfg.metalness,
            roughness: cfg.roughness,
            transparent: cfg.opacity < 1,
            opacity: cfg.opacity,
          });
        const body = new THREE.Mesh(
          behavior === 'earth'
            ? new THREE.DodecahedronGeometry(cfg.size, 2)
            : new THREE.SphereGeometry(cfg.size, 36, 36),
          planetMaterial,
        );
        group.add(body);

        // 行星大氣厚度：空最薄、風厚、火最亮、地厚重但低亮度
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(cfg.size * cfg.atmosphereScale, 28, 28),
          new THREE.MeshBasicMaterial({
            color: cfg.emissive,
            transparent: true,
            opacity: cfg.atmosphereOpacity,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            depthWrite: false,
          }),
        );
        group.add(atmosphere);

        const physicalRings: any[] = [];
        if (behavior === 'void') {
          const voidShell = new THREE.Mesh(
            new THREE.SphereGeometry(cfg.size * 2.7, 24, 24),
            new THREE.MeshBasicMaterial({
              color: cfg.emissive, transparent: true, opacity: 0.035,
              blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
            }),
          );
          group.add(voidShell);
          physicalRings.push(voidShell);
        }
        if (behavior === 'wind') {
          for (let r = 0; r < 2; r++) {
            const windRing = new THREE.Mesh(
              new THREE.TorusGeometry(cfg.size * (1.55 + r * 0.38), 0.009, 8, 72),
              new THREE.MeshBasicMaterial({
                color: cfg.emissive, transparent: true, opacity: 0.28,
                blending: THREE.AdditiveBlending, depthWrite: false,
              }),
            );
            windRing.rotation.x = Math.PI / 2 + r * 0.65;
            windRing.rotation.y = r * 0.4;
            group.add(windRing);
            physicalRings.push(windRing);
          }
        }
        if (behavior === 'water') {
          const waterRing = new THREE.Mesh(
            new THREE.TorusGeometry(cfg.size * 1.45, 0.012, 10, 90),
            new THREE.MeshBasicMaterial({
              color: 0x8eefff, transparent: true, opacity: 0.18,
              blending: THREE.AdditiveBlending, depthWrite: false,
            }),
          );
          waterRing.rotation.x = Math.PI / 2;
          group.add(waterRing);
          physicalRings.push(waterRing);
        }
        if (behavior === 'fire') {
          const fireLight = new THREE.PointLight(cfg.emissive, 0.8, 3.2);
          group.add(fireLight);
        }
        if (behavior === 'earth') {
          const rockColor = new THREE.Color(0xb5d09a);
          for (let rock = 0; rock < 7; rock++) {
            const angle = (rock / 7) * Math.PI * 2;
            const pebble = new THREE.Mesh(
              new THREE.SphereGeometry(cfg.size * (0.045 + Math.random() * 0.035), 8, 8),
              new THREE.MeshStandardMaterial({
                color: rockColor, roughness: 0.95, metalness: 0.05,
              }),
            );
            pebble.position.set(
              Math.cos(angle) * cfg.size * 0.82,
              (Math.random() - 0.5) * cfg.size * 0.9,
              Math.sin(angle) * cfg.size * 0.82,
            );
            group.add(pebble);
          }
        }

        // 五大專屬粒子：空漂、風旋、水落、火升、地凝
        const count = cfg.particleCount;
        const pPositions = new Float32Array(count * 3);
        const pColors = new Float32Array(count * 3);
        const velocities: Array<{ vx: number; vy: number; vz: number; life: number; maxLife: number; offset: number }> = [];
        const baseColor = new THREE.Color(cfg.color);
        const spawn = (idx: number) => {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          if (behavior === 'wind') {
            const r = cfg.size * (1.8 + Math.random() * 2.2);
            pPositions[idx * 3] = Math.cos(theta) * r;
            pPositions[idx * 3 + 1] = (Math.random() - 0.5) * cfg.size * 1.1;
            pPositions[idx * 3 + 2] = Math.sin(theta) * r;
          } else if (behavior === 'water') {
            const r = cfg.size * (1.1 + Math.random() * 2.0);
            pPositions[idx * 3] = Math.cos(theta) * r;
            pPositions[idx * 3 + 1] = cfg.size * (1.4 - Math.random() * 2.8);
            pPositions[idx * 3 + 2] = Math.sin(theta) * r;
          } else if (behavior === 'fire') {
            const r = cfg.size * Math.random() * 1.35;
            pPositions[idx * 3] = Math.cos(theta) * r;
            pPositions[idx * 3 + 1] = -cfg.size * (0.65 + Math.random() * 1.1);
            pPositions[idx * 3 + 2] = Math.sin(theta) * r;
          } else if (behavior === 'earth') {
            const r = cfg.size * (1.0 + Math.random() * 0.9);
            pPositions[idx * 3] = Math.cos(theta) * r;
            pPositions[idx * 3 + 1] = (Math.random() - 0.5) * cfg.size * 0.42;
            pPositions[idx * 3 + 2] = Math.sin(theta) * r;
          } else {
            const r = cfg.size * (2.4 + Math.random() * 4.2);
            pPositions[idx * 3] = r * Math.sin(phi) * Math.cos(theta);
            pPositions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pPositions[idx * 3 + 2] = r * Math.cos(phi);
          }
        };
        for (let p = 0; p < count; p++) {
          spawn(p);
          pColors[p * 3] = baseColor.r; pColors[p * 3 + 1] = baseColor.g; pColors[p * 3 + 2] = baseColor.b;
          let vx = 0; let vy = 0; let vz = 0; let life = 1;
          switch (behavior) {
            case 'void':
              vx = (Math.random() - 0.5) * 0.003; vy = (Math.random() - 0.5) * 0.003; vz = (Math.random() - 0.5) * 0.003;
              life = 1.2 + Math.random() * 1.2; break;
            case 'wind':
              vx = (Math.random() - 0.5) * 0.055; vy = (Math.random() - 0.5) * 0.028; vz = (Math.random() - 0.5) * 0.055;
              life = 0.55 + Math.random() * 0.55; break;
            case 'water':
              vx = (Math.random() - 0.5) * 0.01; vy = -0.008 - Math.random() * 0.012; vz = (Math.random() - 0.5) * 0.01;
              life = 0.85 + Math.random() * 0.45; break;
            case 'fire':
              vx = (Math.random() - 0.5) * 0.026; vy = 0.028 + Math.random() * 0.04; vz = (Math.random() - 0.5) * 0.026;
              life = 0.35 + Math.random() * 0.42; break;
            case 'earth':
              vx = (Math.random() - 0.5) * 0.003; vy = (Math.random() - 0.5) * 0.002; vz = (Math.random() - 0.5) * 0.003;
              life = 1.8 + Math.random() * 0.8; break;
          }
          velocities.push({ vx, vy, vz, life, maxLife: life, offset: Math.random() * Math.PI * 2 });
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
        const elementParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
          size: cfg.particleSize,
          vertexColors: true, transparent: true, opacity: 0.85,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        }));
        group.add(elementParticles);

        // 初始角度平均分布（禁止重疊）
        const startAngle = (i / 5) * Math.PI * 2;
        group.userData = {
          angle: startAngle, currAngle: startAngle, radius: cfg.radius, speed: cfg.speed,
          speedFactor: 1, // 互動：1=正常 0=暫停 2.5=加速
          tilt: cfg.tilt, name: cfg.name, bodyMesh: body,
          behavior, elementParticles, velocities, pPositions, spawn, size: cfg.size,
          atmosphereMesh: atmosphere, physicalRings, spinSpeed: cfg.spinSpeed,
          bloom: cfg.bloom, baseAtmosphereOpacity: cfg.atmosphereOpacity,
        };
        group.position.set(
          Math.cos(startAngle) * cfg.radius,
          Math.sin(startAngle * 1.3) * cfg.tilt * 2.2,
          Math.sin(startAngle) * cfg.radius,
        );
        world.add(group);
        planets.push(group);
        // 軌道提示環（淡色）
        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(cfg.radius, 0.012, 8, 120),
          new THREE.MeshBasicMaterial({
            color: cfg.color, transparent: true, opacity: cfg.orbitOpacity,
            blending: THREE.AdditiveBlending,
          }),
        );
        orbit.rotation.x = Math.PI / 2 + cfg.tilt * 0.5;
        world.add(orbit);
      });

      // ==================== 第三層：空間概念能量場 ====================
      // 巨大空間球體（包覆整體，持續釋放光芒）
      const spaceShell = new THREE.Mesh(
        new THREE.SphereGeometry(10.8, 48, 48),
        new THREE.MeshBasicMaterial({
          color: 0x00cfff, transparent: true, opacity: 0.035,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      world.add(spaceShell);
      const spaceShell2 = new THREE.Mesh(
        new THREE.SphereGeometry(9.6, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff2a8a, transparent: true, opacity: 0.025,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      world.add(spaceShell2);

      // 空間能量粒子（空間釋放的光芒）
      const spaceParticleCount = 800;
      const spPos = new Float32Array(spaceParticleCount * 3);
      const spCol = new Float32Array(spaceParticleCount * 3);
      const colA = new THREE.Color(0x00e5ff);
      const colB = new THREE.Color(0xff2a8a);
      const colC = new THREE.Color(0x9b59ff);
      for (let i = 0; i < spaceParticleCount; i++) {
        const r = 4.5 + Math.random() * 7;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        spPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        spPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        spPos[i * 3 + 2] = r * Math.cos(phi);
        const c = Math.random() > 0.66 ? colA : Math.random() > 0.5 ? colB : colC;
        spCol[i * 3] = c.r; spCol[i * 3 + 1] = c.g; spCol[i * 3 + 2] = c.b;
      }
      const spGeo = new THREE.BufferGeometry();
      spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
      spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
      const spaceParticles = new THREE.Points(spGeo, new THREE.PointsMaterial({
        size: 0.055, vertexColors: true, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      world.add(spaceParticles);

      // ===== 拖曳旋轉（整個世界，含慣性；免 OrbitControls） =====
      let dragging = false;
      let lastX = 0; let lastY = 0;
      let velX = 0; let velY = 0;
      let downX = 0; let downY = 0; // 區分點擊 vs 拖曳
      let autoRotate = true;
      const taiji24 = new Taiji24SoundEngine();
      let soundBurstUntil = -1; // 24 \u97fb\u9ede\u64ca\u8996\u89ba\u80fd\u91cf\u7206\u767c\u622a\u6b62\u6642\u9593 // 鍵盤 R 切換

      // ===== 互動加強：Raycaster 懸停/點擊 =====
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      const pickables: any[] = [taiChiSphere, ...planets.map((g) => g.userData.bodyMesh)];
      const nameOf = (mesh: any) => (mesh === taiChiSphere ? '太極' : planets.find((g) => g.userData.bodyMesh === mesh)?.userData.name ?? '');

      // 名稱提示（DOM tooltip）
      const tooltip = document.createElement('div');
      tooltip.style.cssText = 'position:absolute;padding:3px 10px;border-radius:999px;background:rgba(2,8,20,0.82);border:1px solid rgba(0,229,255,0.45);color:#bfefff;font-size:12px;font-weight:700;letter-spacing:2px;pointer-events:none;opacity:0;transition:opacity 160ms ease;white-space:nowrap;z-index:5;';
      host.style.position = host.style.position || 'relative';
      host.appendChild(tooltip);
      cleanupFns.push(() => tooltip.remove());

      const speedLabel = (factor: number) => (factor === 0 ? '（暫停）' : factor > 1 ? '（加速）' : '');
      const pickAt = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(pickables, false);
        return hits.length ? hits[0].object : null;
      };

      const onDown = (e: PointerEvent) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        downX = e.clientX; downY = e.clientY;
      };
      const onMove = (e: PointerEvent) => {
        if (dragging) {
          velY = (e.clientX - lastX) * 0.005;
          velX = (e.clientY - lastY) * 0.003;
          lastX = e.clientX; lastY = e.clientY;
          world.rotation.y += velY;
          world.rotation.x = Math.max(-0.7, Math.min(0.7, world.rotation.x + velX));
          return;
        }
        // 懸停顯示名稱
        const hit = pickAt(e.clientX, e.clientY);
        if (hit) {
          const group = planets.find((g) => g.userData.bodyMesh === hit);
          tooltip.textContent = nameOf(hit) + (group ? speedLabel(group.userData.speedFactor) : autoRotate ? '' : '（已停轉）');
          const rect = host.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 14}px`;
          tooltip.style.top = `${e.clientY - rect.top - 10}px`;
          tooltip.style.opacity = '1';
          renderer.domElement.style.cursor = 'pointer';
        } else {
          tooltip.style.opacity = '0';
          renderer.domElement.style.cursor = 'grab';
        }
      };
      const onUp = (e: PointerEvent) => {
        const wasDrag = Math.hypot(e.clientX - downX, e.clientY - downY) > 6;
        dragging = false;
        if (wasDrag) return;
        // 點擊：行星＝暫停→加速→正常循環；太極＝切換自動旋轉
        const hit = pickAt(e.clientX, e.clientY);
        if (!hit) return;
        if (hit === taiChiSphere) {
          // 太極中央 24 韻：每點一次推進 1/24，第 24 韻觸發彩蛋
          void taiji24.click().then((st) => {
            if (st.completed) {
              tooltip.textContent = '\u2728 24 \u97fb\u5713\u6eff\uff5c\u5f69\u86cb\u89e3\u9396';
              soundBurstUntil = elapsed + 2.6; // 視覺能量爆發
            } else if (st.step > 0) {
              tooltip.textContent = `\u592a\u6975 \u7b2c ${st.step}/24 \u97fb`;
              soundBurstUntil = elapsed + 0.5;
            } else {
              tooltip.textContent = '\u592a\u6975';
            }
            tooltip.style.opacity = '1';
          });
          return;
        }
        const group = planets.find((g) => g.userData.bodyMesh === hit);
        if (group) {
          const u = group.userData;
          u.speedFactor = u.speedFactor === 1 ? 0 : u.speedFactor === 0 ? 2.5 : 1;
          tooltip.textContent = u.name + speedLabel(u.speedFactor);
          tooltip.style.opacity = '1';
        }
      };
      renderer.domElement.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      // 鍵盤：R 切換自動旋轉（聚焦卡片時）
      host.tabIndex = 0;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'r' || e.key === 'R') autoRotate = !autoRotate;
      };
      host.addEventListener('keydown', onKey);
      cleanupFns.push(() => {
        renderer.domElement.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        host.removeEventListener('keydown', onKey);
      });

      // ===== Resize =====
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

      // ===== 主迴圈（唯一 RAF；hidden 暫停） =====
      const clock = new THREE.Clock();
      let elapsed = 0;
      const tick = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        const t = elapsed;

        if (!dragging) {
          if (autoRotate) world.rotation.y += 0.0028; // 自動旋轉（R 鍵/點太極可切換）
          velX *= 0.94; velY *= 0.94;
          world.rotation.y += velY;
          world.rotation.x = Math.max(-0.7, Math.min(0.7, world.rotation.x + velX));
        }

        // 第一層：太極球自轉＋陰陽雙光呼吸＋核心脈衝
        const taiChiMaterial = taiChiSphere.material as any;
        taiChiMaterial.uniforms.time.value = t;
        taiChiSphere.rotation.y = t * 0.25;
        // 第一層演化結構動態：兩儀反向緩轉、四象順轉、八卦緩慢逆轉
        liangYi.rotation.y = -t * 0.12;
        liangYi.rotation.x = Math.sin(t * 0.4) * 0.1;
        siXiang.rotation.y = t * 0.08;
        baGua.rotation.y = -t * 0.05;
        const yinPulse = 1 + Math.sin(t * 1.8) * 0.06;
        const yangPulse = 1 + Math.sin(t * 1.5 + 1.1) * 0.08;
        taiChiYinAura.scale.setScalar(yinPulse);
        taiChiYangAura.scale.setScalar(yangPulse);
        (taiChiYinAura.material as any).opacity = 0.07 + Math.sin(t * 2.0) * 0.035;
        (taiChiYangAura.material as any).opacity = 0.04 + Math.sin(t * 1.7 + 0.6) * 0.025;
        // 24 韻點擊能量爆發：光暈短暫增亮、核心脈衝放大
        const burstBoost = soundBurstUntil > t ? Math.min(1, (soundBurstUntil - t) / 0.5) : 0;
        if (burstBoost > 0) {
          (taiChiYinAura.material as any).opacity = Math.min(0.32, 0.14 + burstBoost * 0.2);
          (taiChiYangAura.material as any).opacity = Math.min(0.26, 0.09 + burstBoost * 0.17);
        }
        const corePulseScale = (1 + Math.sin(t * 2.9) * 0.22) * (1 + burstBoost * 0.9);
        corePulse.scale.setScalar(corePulseScale);
        (corePulse.material as any).opacity = 0.18 + Math.sin(t * 2.6) * 0.1;
        (coreBeam.material as any).opacity = 0.34 + Math.sin(t * 3.1) * 0.14;

        // 第二層：五行星獨立軌道 365° 公轉（禁碰撞、禁重疊）
        planets.forEach((group) => {
          const u = group.userData;
          u.currAngle += u.speed * u.speedFactor * dt; // 增量推進：支援暫停/加速不跳位
          const a = u.currAngle;
          group.position.x = Math.cos(a) * u.radius;
          group.position.z = Math.sin(a) * u.radius;
          group.position.y = Math.sin(a * 1.3) * u.tilt * 2.2;
          group.rotation.y = t * u.spinSpeed;
          group.rotation.x = Math.sin(t * (0.22 + u.speed)) * Math.abs(u.tilt) * 0.55;

          const breath = 1 + Math.sin(t * (u.behavior === 'fire' ? 5.6 : u.behavior === 'void' ? 0.7 : 1.4) + u.angle) * (
            u.behavior === 'void' ? 0.08 : u.behavior === 'water' ? 0.055 : u.behavior === 'fire' ? 0.075 : 0.025
          );
          if (u.behavior === 'water') {
            u.bodyMesh.scale.set(1 + Math.sin(t * 1.7 + u.angle) * 0.045, 1 - Math.sin(t * 1.7 + u.angle) * 0.035, 1);
          } else {
            u.bodyMesh.scale.setScalar(breath);
          }
          // 元素材質動態：火＝高溫脈動自發光；空＝極透明緩慢呼吸
          if (u.behavior === 'fire') {
            (u.bodyMesh.material as any).emissiveIntensity = 2.4 + Math.sin(t * 5.2 + u.angle) * 0.7;
          } else if (u.behavior === 'void') {
            (u.bodyMesh.material as any).opacity = 0.24 + Math.abs(Math.sin(t * 0.7 + u.angle)) * 0.2;
          }
          if (u.atmosphereMesh) {
            const atmospherePulse = u.baseAtmosphereOpacity * (1 + Math.sin(t * (u.behavior === 'fire' ? 6.2 : 1.6) + u.angle) * 0.34);
            (u.atmosphereMesh.material as any).opacity = Math.max(0.02, atmospherePulse);
            u.atmosphereMesh.scale.setScalar(1 + Math.sin(t * 0.9 + u.angle) * (u.behavior === 'void' ? 0.1 : 0.045));
          }
          u.physicalRings?.forEach((ring: any, ringIndex: number) => {
            ring.rotation.z += (u.behavior === 'wind' ? 0.035 : u.behavior === 'water' ? 0.012 : 0.004) * (ringIndex + 1);
            if (ring.material) {
              (ring.material as any).opacity = u.behavior === 'void'
                ? 0.025 + Math.abs(Math.sin(t * 0.8 + u.angle)) * 0.04
                : 0.12 + Math.abs(Math.sin(t * 1.4 + ringIndex)) * 0.14;
            }
          });

          // ===== 五行專屬粒子行為（每元素獨立物理） =====
          if (u.elementParticles) {
            const pos: Float32Array = u.pPositions;
            const vels = u.velocities;
            const dt = 1 / 60;
            const maxR = u.behavior === 'void' ? u.size * 7.0 : u.behavior === 'wind' ? u.size * 5.4 : u.size * 4.4;
            for (let p = 0; p < vels.length; p++) {
              const v = vels[p];
              let px = pos[p * 3]; let py = pos[p * 3 + 1]; let pz = pos[p * 3 + 2];
              switch (u.behavior) {
                case 'void': {
                  // 稀疏緩慢漂浮
                  px += v.vx; py += v.vy; pz += v.vz;
                  break;
                }
                case 'wind': {
                  // 快速旋轉流動（繞行星切線旋流＋拖尾感）
                  const swirl = 0.078;
                  const nx = px * Math.cos(swirl) - pz * Math.sin(swirl);
                  const nz = px * Math.sin(swirl) + pz * Math.cos(swirl);
                  px = nx + v.vx * 0.45; pz = nz + v.vz * 0.45; py += v.vy * 0.55 + Math.sin(t * 4 + v.offset) * 0.004;
                  break;
                }
                case 'water': {
                  // 向下流動＋表面張力式環流
                  px += v.vx; pz += v.vz;
                  py += v.vy + Math.sin(t * 2.2 + v.offset) * 0.01;
                  break;
                }
                case 'fire': {
                  // 向上竄升高溫感
                  px += v.vx; py += v.vy; pz += v.vz;
                  break;
                }
                case 'earth': {
                  // 厚重緩慢環繞穩重落地
                  const slow = 0.0035;
                  const ex = px * Math.cos(slow) - pz * Math.sin(slow);
                  const ez = px * Math.sin(slow) + pz * Math.cos(slow);
                  px = ex + v.vx * 0.2; pz = ez + v.vz * 0.2; py += v.vy * 0.2;
                  py *= 0.995; // 往赤道沉降
                  break;
                }
              }
              v.life -= dt * (u.behavior === 'fire' ? 0.55 : u.behavior === 'earth' ? 0.12 : 0.25);
              const dist = Math.sqrt(px * px + py * py + pz * pz);
              if (
                v.life <= 0
                || dist > maxR
                || (u.behavior === 'fire' && py > u.size * 3.4)
                || (u.behavior === 'water' && py < -u.size * 2.6)
              ) {
                u.spawn(p);
                v.life = v.maxLife;
              } else {
                pos[p * 3] = px; pos[p * 3 + 1] = py; pos[p * 3 + 2] = pz;
              }
            }
            u.elementParticles.geometry.attributes.position.needsUpdate = true;
            // 忽明忽滅／閃爍：空最強、火次之、其餘微幅
            const mat = u.elementParticles.material as any;
            if (u.behavior === 'void') mat.opacity = 0.22 + Math.abs(Math.sin(t * 0.9)) * 0.42;
            else if (u.behavior === 'wind') mat.opacity = 0.62 + Math.abs(Math.sin(t * 3.4 + u.angle)) * 0.2;
            else if (u.behavior === 'water') mat.opacity = 0.48 + Math.abs(Math.sin(t * 1.7 + u.angle)) * 0.18;
            else if (u.behavior === 'fire') mat.opacity = 0.72 + Math.abs(Math.sin(t * 7.2)) * 0.28;
            else mat.opacity = 0.28 + Math.abs(Math.sin(t * 0.75 + u.angle)) * 0.18;
          }
        });

        // 第三層：空間能量場持續釋放光芒（雙膜反向緩轉＋脈動）
        spaceShell.rotation.y = t * 0.02;
        spaceShell2.rotation.y = -t * 0.015;
        (spaceShell.material as any).opacity = 0.028 + Math.sin(t * 0.9) * 0.014;
        (spaceShell2.material as any).opacity = 0.02 + Math.cos(t * 0.7) * 0.01;
        spaceParticles.rotation.y = t * 0.025;

        coreLight.intensity = 2.2 + Math.sin(t * 2.2) * 0.8;
        yinLight.intensity = 3.0 + Math.sin(t * 1.9) * 0.7;
        yangLight.intensity = 2.8 + Math.sin(t * 2.1 + 1) * 0.7;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      renderer.domElement.dataset.taijiScene = 'ready';

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
    }).catch((error) => {
      hostRef.current?.setAttribute('data-taiji-webgl-error', error instanceof Error ? error.message : String(error));
      /* CDN 載入失敗或 WebGL 初始化失敗：外層 SVG 版本仍在（漸進增強） */
    });

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      cleanupFns = [];
    };
  }, [variant]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
