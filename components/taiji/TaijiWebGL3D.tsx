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

      void main() {
        float x = vLocalPosition.x;
        float y = vLocalPosition.y;
        float sCurve = x + sin(y * 3.1415926) * 0.48;
        float taiChi = smoothstep(-0.1, 0.1, sCurve);

        vec3 yinBody = mix(baseColor, yinColor, 0.2);
        vec3 yangBody = mix(vec3(0.92, 0.96, 1.0), yangColor, 0.18);
        vec3 color = mix(yinBody, yangBody, taiChi);

        float topEye = length(vec2(x, y - 0.48));
        float bottomEye = length(vec2(x, y + 0.48));
        color = mix(yangColor * 1.15, color, smoothstep(0.12, 0.18, topEye));
        color = mix(yinColor * 1.15, color, smoothstep(0.12, 0.18, bottomEye));

        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 2.55);
        vec3 edgeColor = mix(yinColor, yangColor, taiChi) * fresnel * 2.35;

        float pulse = 0.78 + 0.22 * sin(time * 2.2);
        float circuitX = smoothstep(0.965, 1.0, fract(vUv.x * 22.0 + time * 0.08));
        float circuitY = smoothstep(0.968, 1.0, fract(vUv.y * 18.0 - time * 0.06));
        float circuit = clamp(circuitX + circuitY, 0.0, 1.0) * 0.34;
        float corePulse = smoothstep(0.36, 0.0, length(vLocalPosition.xy)) * (0.25 + 0.2 * sin(time * 3.1));

        vec3 emissive = mix(yinColor, yangColor, taiChi) * (0.22 + circuit + corePulse);
        vec3 finalColor = color * pulse + edgeColor + emissive;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
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
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
      camera.position.set(0, 4.8, 14.2);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'pan-y';

      // 世界根群組：自動旋轉＋拖曳旋轉都作用在這裡（三層一起轉，空間一體感）
      const world = new THREE.Group();
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
        new THREE.SphereGeometry(1.55, 64, 64),
        createTaiChiGlowMaterial(THREE),
      );
      taiChiGroup.add(taiChiSphere);

      // 太極雙色外層光暈膜：青色陰光 + 洋紅陽光
      const taiChiYinAura = new THREE.Mesh(
        new THREE.SphereGeometry(1.76, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x00e5ff, transparent: true, opacity: 0.09,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      taiChiGroup.add(taiChiYinAura);
      const taiChiYangAura = new THREE.Mesh(
        new THREE.SphereGeometry(1.96, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff2a8a, transparent: true, opacity: 0.055,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      taiChiGroup.add(taiChiYangAura);
      const corePulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 24, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      taiChiGroup.add(corePulse);
      const coreBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 3.45, 18),
        new THREE.MeshBasicMaterial({
          color: 0x9eefff, transparent: true, opacity: 0.42,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      taiChiGroup.add(coreBeam);

      // ==================== 第二層：五顆立體行星（空風水火地） ====================
      const planetsConfig = [
        { name: '空', color: 0x9b59ff, radius: 3.35, speed: 0.19, tilt: 0.22, size: 0.32 },
        { name: '風', color: 0x00e5ff, radius: 4.15, speed: 0.27, tilt: -0.15, size: 0.28 },
        { name: '水', color: 0x2980ff, radius: 5.05, speed: 0.16, tilt: 0.28, size: 0.34 },
        { name: '火', color: 0xff4500, radius: 6.05, speed: 0.23, tilt: -0.18, size: 0.3 },
        { name: '地', color: 0x2ecc71, radius: 7.15, speed: 0.13, tilt: 0.1, size: 0.36 },
      ];
      const planets: any[] = [];
      planetsConfig.forEach((cfg, i) => {
        const group = new THREE.Group();
        // 行星本體（立體球）
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(cfg.size, 32, 32),
          new THREE.MeshStandardMaterial({
            color: cfg.color, emissive: cfg.color, emissiveIntensity: 1.1,
            metalness: 0.4, roughness: 0.35,
          }),
        );
        group.add(body);
        // 行星大氣光暈
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(cfg.size * 1.35, 24, 24),
          new THREE.MeshBasicMaterial({
            color: cfg.color, transparent: true, opacity: 0.18,
            blending: THREE.AdditiveBlending, side: THREE.BackSide,
          }),
        );
        group.add(atmosphere);

        // ===== 五行專屬粒子系統 =====
        // 空：稀疏緩慢漂浮忽明忽滅｜風：快速旋流｜水：波浪液態｜火：向上竄升閃爍｜地：厚重緩慢環繞
        const BEHAVIORS: Record<string, string> = { 空: 'void', 風: 'wind', 水: 'water', 火: 'fire', 地: 'earth' };
        const PARTICLE_COUNTS: Record<string, number> = { void: 180, wind: 280, water: 320, fire: 350, earth: 220 };
        const behavior = BEHAVIORS[cfg.name] ?? 'void';
        const count = PARTICLE_COUNTS[behavior];
        const pPositions = new Float32Array(count * 3);
        const pColors = new Float32Array(count * 3);
        const velocities: Array<{ vx: number; vy: number; vz: number; life: number; maxLife: number; offset: number }> = [];
        const baseColor = new THREE.Color(cfg.color);
        const spawn = (idx: number) => {
          const r = cfg.size * (1.6 + Math.random() * 2.8);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          pPositions[idx * 3] = r * Math.sin(phi) * Math.cos(theta);
          pPositions[idx * 3 + 1] = behavior === 'fire' ? -cfg.size * (0.6 + Math.random()) : r * Math.sin(phi) * Math.sin(theta);
          pPositions[idx * 3 + 2] = r * Math.cos(phi);
        };
        for (let p = 0; p < count; p++) {
          spawn(p);
          pColors[p * 3] = baseColor.r; pColors[p * 3 + 1] = baseColor.g; pColors[p * 3 + 2] = baseColor.b;
          let vx = 0; let vy = 0; let vz = 0; let life = 1;
          switch (behavior) {
            case 'void':
              vx = (Math.random() - 0.5) * 0.008; vy = (Math.random() - 0.5) * 0.008; vz = (Math.random() - 0.5) * 0.008;
              life = 0.4 + Math.random() * 0.6; break;
            case 'wind':
              vx = (Math.random() - 0.5) * 0.04; vy = (Math.random() - 0.5) * 0.02; vz = (Math.random() - 0.5) * 0.04;
              life = 0.6 + Math.random() * 0.4; break;
            case 'water':
              vx = (Math.random() - 0.5) * 0.015; vy = Math.sin(p) * 0.01; vz = (Math.random() - 0.5) * 0.015;
              life = 0.7 + Math.random() * 0.3; break;
            case 'fire':
              vx = (Math.random() - 0.5) * 0.02; vy = 0.015 + Math.random() * 0.025; vz = (Math.random() - 0.5) * 0.02;
              life = 0.5 + Math.random() * 0.5; break;
            case 'earth':
              vx = (Math.random() - 0.5) * 0.01; vy = (Math.random() - 0.5) * 0.006; vz = (Math.random() - 0.5) * 0.01;
              life = 0.8 + Math.random() * 0.2; break;
          }
          velocities.push({ vx, vy, vz, life, maxLife: life, offset: Math.random() * Math.PI * 2 });
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
        const elementParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
          size: behavior === 'fire' ? 0.065 : 0.045,
          vertexColors: true, transparent: true, opacity: 0.85,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        }));
        group.add(elementParticles);

        // 初始角度平均分布（禁止重疊）
        const startAngle = (i / 5) * Math.PI * 2;
        group.userData = {
          angle: startAngle, radius: cfg.radius, speed: cfg.speed,
          tilt: cfg.tilt, name: cfg.name,
          behavior, elementParticles, velocities, pPositions, spawn, size: cfg.size,
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
            color: cfg.color, transparent: true, opacity: 0.09,
            blending: THREE.AdditiveBlending,
          }),
        );
        orbit.rotation.x = Math.PI / 2 + cfg.tilt * 0.5;
        world.add(orbit);
      });

      // ==================== 第三層：空間概念能量場 ====================
      // 巨大空間球體（包覆整體，持續釋放光芒）
      const spaceShell = new THREE.Mesh(
        new THREE.SphereGeometry(9.8, 48, 48),
        new THREE.MeshBasicMaterial({
          color: 0x00cfff, transparent: true, opacity: 0.035,
          blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
        }),
      );
      world.add(spaceShell);
      const spaceShell2 = new THREE.Mesh(
        new THREE.SphereGeometry(8.6, 32, 32),
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
      const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        velY = (e.clientX - lastX) * 0.005;
        velX = (e.clientY - lastY) * 0.003;
        lastX = e.clientX; lastY = e.clientY;
        world.rotation.y += velY;
        world.rotation.x = Math.max(-0.7, Math.min(0.7, world.rotation.x + velX));
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
          world.rotation.y += 0.0028; // 自動旋轉（整個三層空間）
          velX *= 0.94; velY *= 0.94;
          world.rotation.y += velY;
          world.rotation.x = Math.max(-0.7, Math.min(0.7, world.rotation.x + velX));
        }

        // 第一層：太極球自轉＋陰陽雙光呼吸＋核心脈衝
        const taiChiMaterial = taiChiSphere.material as any;
        taiChiMaterial.uniforms.time.value = t;
        taiChiSphere.rotation.y = t * 0.25;
        const yinPulse = 1 + Math.sin(t * 1.8) * 0.06;
        const yangPulse = 1 + Math.sin(t * 1.5 + 1.1) * 0.08;
        taiChiYinAura.scale.setScalar(yinPulse);
        taiChiYangAura.scale.setScalar(yangPulse);
        (taiChiYinAura.material as any).opacity = 0.07 + Math.sin(t * 2.0) * 0.035;
        (taiChiYangAura.material as any).opacity = 0.04 + Math.sin(t * 1.7 + 0.6) * 0.025;
        const corePulseScale = 1 + Math.sin(t * 2.9) * 0.22;
        corePulse.scale.setScalar(corePulseScale);
        (corePulse.material as any).opacity = 0.18 + Math.sin(t * 2.6) * 0.1;
        (coreBeam.material as any).opacity = 0.34 + Math.sin(t * 3.1) * 0.14;

        // 第二層：五行星獨立軌道 365° 公轉（禁碰撞、禁重疊）
        planets.forEach((group) => {
          const u = group.userData;
          const a = u.angle + t * u.speed;
          group.position.x = Math.cos(a) * u.radius;
          group.position.z = Math.sin(a) * u.radius;
          group.position.y = Math.sin(a * 1.3) * u.tilt * 2.2;
          group.rotation.y = t * u.speed * 2.4;

          // ===== 五行專屬粒子行為（每元素獨立物理） =====
          if (u.elementParticles) {
            const pos: Float32Array = u.pPositions;
            const vels = u.velocities;
            const dt = 1 / 60;
            const maxR = u.size * 4.6;
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
                  const swirl = 0.045;
                  const nx = px * Math.cos(swirl) - pz * Math.sin(swirl);
                  const nz = px * Math.sin(swirl) + pz * Math.cos(swirl);
                  px = nx + v.vx * 0.4; pz = nz + v.vz * 0.4; py += v.vy * 0.5;
                  break;
                }
                case 'water': {
                  // 波浪起伏液態流動
                  px += v.vx; pz += v.vz;
                  py += Math.sin(t * 2.2 + v.offset) * 0.012;
                  break;
                }
                case 'fire': {
                  // 向上竄升高溫感
                  px += v.vx; py += v.vy; pz += v.vz;
                  break;
                }
                case 'earth': {
                  // 厚重緩慢環繞穩重落地
                  const slow = 0.008;
                  const ex = px * Math.cos(slow) - pz * Math.sin(slow);
                  const ez = px * Math.sin(slow) + pz * Math.cos(slow);
                  px = ex; pz = ez; py += v.vy * 0.4;
                  py *= 0.995; // 往赤道沉降
                  break;
                }
              }
              v.life -= dt * 0.25;
              const dist = Math.sqrt(px * px + py * py + pz * pz);
              if (v.life <= 0 || dist > maxR || (u.behavior === 'fire' && py > u.size * 3.4)) {
                u.spawn(p);
                v.life = v.maxLife;
              } else {
                pos[p * 3] = px; pos[p * 3 + 1] = py; pos[p * 3 + 2] = pz;
              }
            }
            u.elementParticles.geometry.attributes.position.needsUpdate = true;
            // 忽明忽滅／閃爍：空最強、火次之、其餘微幅
            const mat = u.elementParticles.material as any;
            if (u.behavior === 'void') mat.opacity = 0.35 + Math.abs(Math.sin(t * 1.1)) * 0.55;
            else if (u.behavior === 'fire') mat.opacity = 0.7 + Math.abs(Math.sin(t * 6.5)) * 0.3;
            else mat.opacity = 0.8 + Math.sin(t * 2 + u.angle) * 0.1;
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
      /* CDN 載入失敗：外層 SVG 版本仍在（漸進增強） */
    });

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      cleanupFns = [];
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
