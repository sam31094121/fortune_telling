'use client';

/**
 * 神獸戰鬥動畫舞台（只負責畫；播不播、何時播都由上層依後端戰報決定）。
 *
 * 依 lib/beast-game/beast-rig.ts 的時間軸，把同一隻神獸的幾張關鍵姿勢（跑、撲、咬、落地）
 * 疊在整個畫面層級的 2D 畫布上，沿「畫面最下方的出戰卡 → 對手卡」的路徑移動、縱躍、傾斜，並畫落地陰影。
 * 圖片只在掛載時載入一次；播放中不建立任何新資源，也不改 React 狀態。
 * 載入失敗回報 onReady(false)，上層就維持原本的卡片衝鋒演出。
 */

import { useEffect, useRef, useState } from 'react';
import { RIG_MESH, RIG_IMPACT_MS, RIG_STRIKE_EVENT, RIG_STRIKE_MS, bitePull, cameraFrame, livingPose, meshDisplace, rendFrame, rigFrameUrl, storyTime, strikeFrame, type BeastRig, type RigFrameId, type RigFrameSpec } from '@/lib/beast-game/beast-rig';

type Rect = { cx: number; top: number; height: number; width: number };

export interface BeastRigGeometry {
  /** 可用寬度：精靈最寬的姿勢（奔跑伸展）不得超出它 */
  arenaWidth: number;
  /** 玩家出戰卡（畫面最下方）的位置：精靈從這裡跳出、回到這裡 */
  from: Rect;
  /** 對手卡插圖位置（精靈跑向這裡） */
  to: Rect;
  /** 鏡頭推進的中心（戰場自己的座標，開始播放前量一次，震動時不再量，避免越量越偏） */
  cameraOrigin?: string;
  /** 本次對手真實卡圖，只用於命中後的可逆視覺切片。 */
  targetArt?: HTMLImageElement | null;
  /** 在出擊前決定近垂直卡位朝向，整段保持，避免右列本體伸出視窗。 */
  mirror?: boolean;
}

export function orientRigGeometry(geometry: BeastRigGeometry, viewportWidth: number): BeastRigGeometry {
  const dx = geometry.to.cx - geometry.from.cx;
  const mirror = Math.abs(dx) <= 8 && Number.isFinite(viewportWidth) && viewportWidth > 0
    ? geometry.to.cx > viewportWidth / 2
    : dx > 8;
  return { ...geometry, mirror };
}

const toRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, top: r.top, height: r.height, width: r.width };
};

export interface RigPlacement { x: number; y: number; unit: number; rotation: number; mirror: boolean; }

/** 站位：起點＝玩家卡面下緣偏上，終點＝對手卡面下緣；越往對手越遠，略縮小製造景深。 */
export function placeRig(geometry: BeastRigGeometry, frame: ReturnType<typeof strikeFrame>, size = 1): RigPlacement {
  const progress = frame.travel.progress;
  const startX = geometry.from.cx;
  const startY = geometry.from.top + geometry.from.height * 0.8;
  const endX = geometry.to.cx;
  const endY = geometry.to.top + geometry.to.height * 0.82;
  const depth = 1 - 0.14 * progress;
  // 基準大小：最寬的姿勢（寬約 2.2 倍基準）不超過可用寬度的 70%
  const unit = geometry.arenaWidth * 0.24 * frame.scale * depth * size;
  const mirror0 = geometry.mirror ?? endX - startX > 8;
  // 咬合時把頭壓到對手卡中央（精靈本來面向左，頭在身體的前端）：抵達後才位移，路上不受影響
  const biteShift = (mirror0 ? -1 : 1) * unit * 0.55 * Math.pow(Math.max(0, progress), 6);
  const x = startX + (endX - startX) * progress + biteShift;
  const base = startY + (endY - startY) * progress;
  const y = base - frame.travel.hop * unit;
  // 朝向：精靈本來面向左；對手在右邊就鏡射。往對手的方向抬頭，最多約 37 度
  const dx = endX - startX;
  const dy = endY - startY;
  const mirror = mirror0;
  const lean = Math.atan2(-dy, Math.abs(dx) + 1); // 對手在上方時為正
  const tilt = Math.max(0, Math.min(0.32, lean));
  return { x, y, unit, rotation: tilt * frame.tilt, mirror };
}

/** 同一嘴／喙接觸點驅動頭部位置與撕裂原點；先瞄準再咬住拉扯。 */
export function alignRigContact(p: RigPlacement, f: ReturnType<typeof strikeFrame>, spec: RigFrameSpec, aspect: number, t: number, geometry: BeastRigGeometry, rig: BeastRig): RigPlacement {
  const contact = spec.contact ?? (spec.anchors ? [spec.anchors.head[0] - 0.1, spec.anchors.jaw[1]] as const : null);
  if (!contact) return p;
  const impact = RIG_IMPACT_MS / RIG_STRIKE_MS;
  const raw = Math.min(1, Math.max(0, (t - 0.58) / (impact - 0.58)));
  const blend = raw * raw * (3 - 2 * raw);
  const dh = p.unit * spec.norm; const dw = dh * aspect;
  const displacement = spec.anchors ? meshDisplace(contact[0], contact[1], aspect, spec.anchors, livingPose(t, rig.style), t, rig.style) : [0, 0];
  const lx = ((contact[0] - 0.5) * dw + displacement[0] * dh) * (p.mirror ? -1 : 1);
  const ly = ((contact[1] - 0.92) * dh + displacement[1] * dh) * f.squash;
  const angle = p.rotation * (p.mirror ? -1 : 1);
  const rx = lx * Math.cos(angle) - ly * Math.sin(angle);
  const ry = lx * Math.sin(angle) + ly * Math.cos(angle);
  const pull = rigContactPull(p, t, geometry.to.width);
  const targetX = geometry.to.cx + pull[0];
  const targetY = geometry.to.top + geometry.to.height * 0.55 + pull[1];
    // 各姿勢嘴／喙在不同圖片高度；只共用底邊會於換幀倒跳。
    // 以各獸撲擊構圖的口位置作固定原點，保持獸種比例而不換路徑。
    const origin: readonly [number, number] = rig.style.morphology === 'serpentine' ? [-0.353, -0.53]
      : rig.style.morphology === 'avian' ? [-0.6975, -0.49]
      : rig.style.morphology === 'armored' ? [-0.6825, -0.65] : [-0.707, -0.531];
    const canonicalY = origin[1] * p.unit * f.squash;
    const canonicalX = origin[0] * p.unit * (p.mirror ? -1 : 1);
    const progress = f.travel.progress;
    const runProgress = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
    const approach = runProgress * runProgress * (3 - 2 * runProgress);
    // 左向獸從卡內右側向左前進；鏡射相反。不能被舊biteShift推向臉的背後。
    const side = p.mirror ? -1 : 1;
    const travelX = geometry.from.cx + (geometry.to.cx - geometry.from.cx) * progress + side * Math.min(24, geometry.arenaWidth * 0.06) * (1 - approach);
    const rawTravelY = p.y + canonicalX * Math.sin(angle) + canonicalY * Math.cos(angle);
    // 重甲與長身龍的高口點不得越過目標再拉回；近頂敵卡也不會把龍頭拋出視窗。
    // 白虎與朱雀保留已驗收的弧線。
    const travelY = rig.style.morphology === 'armored' || rig.style.morphology === 'serpentine' ? Math.max(targetY, rawTravelY) : rawTravelY;
    return { ...p, x: travelX + (targetX - travelX) * blend - rx, y: travelY + (targetY - travelY) * blend - ry };
}

/** 沿頭部朝前的軸拉扯，不以額外上下俯仰代替咬合。 */
export function rigContactPull(p: RigPlacement, t: number, width: number): readonly [number, number] {
  const distance = bitePull(t)[0] * width;
  return [(p.mirror ? 1 : -1) * Math.cos(p.rotation) * distance, -Math.sin(p.rotation) * distance];
}

type ReadabilityZone = { x: number; y: number; radius: number };
/** 前景碎片避開嘴接點和小範圍頭部，讓閉口／眼睛仍可辨識。 */
export function rigReadabilityZones(p: RigPlacement, f: ReturnType<typeof strikeFrame>, spec: RigFrameSpec, aspect: number, t: number, geometry: BeastRigGeometry, rig: BeastRig): ReadabilityZone[] {
  const pull = rigContactPull(p, t, geometry.to.width);
  const zones: ReadabilityZone[] = [{ x: geometry.to.cx + pull[0], y: geometry.to.top + geometry.to.height * .55 + pull[1], radius: Math.max(6, Math.min(12, geometry.to.width * .11)) }];
  if (!spec.anchors) return zones;
  const placed = alignRigContact(p, f, spec, aspect, t, geometry, rig);
  const [u, v] = spec.anchors.head;
  const displacement = meshDisplace(u, v, aspect, spec.anchors, livingPose(t, rig.style), t, rig.style);
  const dh = p.unit * spec.norm, sign = p.mirror ? -1 : 1, angle = p.rotation * sign;
  const x = ((u - .5) * dh * aspect + displacement[0] * dh) * sign;
  const y = ((v - .92) * dh + displacement[1] * dh) * f.squash;
  zones.push({ x: placed.x + x * Math.cos(angle) - y * Math.sin(angle), y: placed.y + x * Math.sin(angle) + y * Math.cos(angle), radius: Math.max(5, Math.min(14, dh * .065)) });
  return zones;
}
export function shardOutsideReadabilityZones(x: number, y: number, size: number, zones: readonly ReadabilityZone[]): boolean {
  const radius = Math.hypot(size / 2, size / 4);
  return zones.every(zone => Math.hypot(x - zone.x, y - zone.y) > zone.radius + radius);
}

export default function BeastRigStage({ rig, playKey, delayMs = 0, onReady, onFrame, seek = null, measureGeometry, cameraElement, layerZIndex = 10 }: {
  rig: BeastRig;
  /** 每次出擊換一個數字（用戰局 revision）；null＝待命，不畫 */
  playKey: number | null;
  /** 這次出擊在戰報裡的起跑延遲（毫秒），與卡片衝鋒的 --action-delay 同一份 */
  delayMs?: number;
  onReady?: (ok: boolean) => void;
  /** 可選：每幀回報進度 0..1（測試與預覽頁用；不得拿來決定結果） */
  onFrame?: (t: number) => void;
  /** 預覽頁用：給 0..1 就靜態畫出那一刻（不播放、不計時）。戰場上一律不傳。 */
  seek?: number | null;
  /** 對戰儀式在獨立對話框內，使用自己的卡片座標，不抓到背景戰場。 */
  measureGeometry?: () => BeastRigGeometry | null;
  cameraElement?: () => HTMLElement | null;
  layerZIndex?: number;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const images = useRef<Map<RigFrameId, HTMLImageElement>>(new Map());
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hiddenArt = useRef<{ image: HTMLImageElement; visibility: string } | null>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const [loaded, setLoaded] = useState(false);

  // 掛載：載入全部關鍵幀（一次）
  useEffect(() => {
    setLoaded(false);
    images.current = new Map();
    let cancelled = false;
    let pending = rig.frames.length;
    let failed = false;
    const map = new Map<RigFrameId, HTMLImageElement>();
    for (const spec of rig.frames) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (cancelled) return;
        map.set(spec.id, image);
        if (--pending === 0 && !failed) { images.current = map; setLoaded(true); onReady?.(true); }
      };
      image.onerror = () => { if (!cancelled && !failed) { failed = true; onReady?.(false); } };
      image.src = rigFrameUrl(rig, spec.id);
    }
    return () => { cancelled = true; };
    // rig 與 onReady 在整個掛載期間不變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig.dir]);

  // 舞台尺寸跟著視窗
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      size.current = { w, h, dpr };
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // 畫一幀（播放與預覽共用）
  const draw = (t: number, geometry: BeastRigGeometry) => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const style = rig.style;
    const frame = strikeFrame(t, style);
    // 鏡頭：整個戰場（不含出戰卡列）隨咬合震動並推進，以對手卡為中心；只動 transform，不影響版面
    const arena = cameraElement ? cameraElement() : document.querySelector<HTMLElement>('[data-battle-visual]');
    if (arena) {
      const cam = cameraFrame(t, style);
      if (geometry.cameraOrigin) arena.style.transformOrigin = geometry.cameraOrigin;
      arena.style.transform = cam.zoom === 1 && cam.shakeX === 0 && cam.shakeY === 0 ? '' : `translate(${cam.shakeX.toFixed(2)}px, ${cam.shakeY.toFixed(2)}px) scale(${cam.zoom.toFixed(4)})`;
    }
    const place = placeRig(geometry, frame, style.size);
    const norms = new Map(rig.frames.map((f) => [f.id, f.norm] as const));
    // 身體：同一套畫法，本體與殘影共用（殘影只是較早時刻的本體，淡、不鏡頭外）
    const paint = (f: ReturnType<typeof strikeFrame>, p: RigPlacement, fade: number, jitter: number, tt: number) => {
      ctx.save();
      // 震動：固定頻率的正弦（不用亂數），蓄勢是顫抖、命中是震盪
      const sx = Math.sin(t * 900) * f.shake * 5 * jitter;
      const sy = Math.cos(t * 1100) * f.shake * 3 * jitter;
      for (const layer of f.layers) {
        const image = images.current.get(layer.frame);
        if (!image) continue;
        const dh = p.unit * (norms.get(layer.frame) ?? 1);
        const dw = (image.naturalWidth / image.naturalHeight) * dh;
        const spec = rig.frames.find((x) => x.id === layer.frame)!;
        const aligned = alignRigContact(p, f, spec, image.naturalWidth / image.naturalHeight, tt, geometry, rig);
        ctx.save();
        ctx.translate(aligned.x + sx * 0.35, aligned.y + sy * 0.35);
        ctx.rotate(aligned.rotation * (aligned.mirror ? -1 : 1));
        ctx.scale(aligned.mirror ? -1 : 1, f.squash);
        ctx.globalAlpha = layer.alpha * f.alpha * fade;
        const anchors = rig.frames.find((x) => x.id === layer.frame)?.anchors;
        if ((style.articulation ?? style.wave) > 0 && anchors) {
          // 活體：把圖切成網格，每個頂點依各部位的動作位移（頭、下顎、前爪、後爪、身體、尾巴各自動），
          // 每格拆成兩個三角形，各用仿射變換貼上並從中心外擴 0.6px，格與格不出縫
          const { cols, rows } = RIG_MESH;
          const aspect = image.naturalWidth / image.naturalHeight;
          const pose = livingPose(tt, style);
          const vx = new Float32Array((cols + 1) * (rows + 1));
          const vy = new Float32Array((cols + 1) * (rows + 1));
          for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
            const u = i / cols; const v = j / rows;
            const [mx, my] = meshDisplace(u, v, aspect, anchors, pose, tt, style);
            vx[j * (cols + 1) + i] = -dw * 0.5 + u * dw + mx * dh;
            vy[j * (cols + 1) + i] = -dh * 0.92 + v * dh + my * dh;
          }
          const base = ctx.getTransform();
          const iw = image.naturalWidth;
          const ih = image.naturalHeight;
          const sw = iw / cols;
          const sh = ih / rows;
          /** 把圖上三角形 (s0,s1,s2) 貼到畫面上三角形 (d0,d1,d2)：仿射變換＋三角形裁切；三角形從中心外擴約 0.6px，格與格不留縫 */
          const tri = (s0x: number, s0y: number, s1x: number, s1y: number, s2x: number, s2y: number, d0x: number, d0y: number, d1x: number, d1y: number, d2x: number, d2y: number) => {
            const det = (s1x - s0x) * (s2y - s0y) - (s2x - s0x) * (s1y - s0y);
            if (Math.abs(det) < 1e-6) return;
            const a11 = ((d1x - d0x) * (s2y - s0y) - (d2x - d0x) * (s1y - s0y)) / det;
            const a21 = ((d1y - d0y) * (s2y - s0y) - (d2y - d0y) * (s1y - s0y)) / det;
            const a12 = ((d2x - d0x) * (s1x - s0x) - (d1x - d0x) * (s2x - s0x)) / det;
            const a22 = ((d2y - d0y) * (s1x - s0x) - (d1y - d0y) * (s2x - s0x)) / det;
            const cx = (d0x + d1x + d2x) / 3; const cy = (d0y + d1y + d2y) / 3;
            const grow = (x: number, y: number): [number, number] => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / l) * 0.6, y + ((y - cy) / l) * 0.6]; };
            const [g0x, g0y] = grow(d0x, d0y); const [g1x, g1y] = grow(d1x, d1y); const [g2x, g2y] = grow(d2x, d2y);
            ctx.setTransform(base);
            ctx.beginPath(); ctx.moveTo(g0x, g0y); ctx.lineTo(g1x, g1y); ctx.lineTo(g2x, g2y); ctx.closePath(); ctx.clip();
            ctx.transform(a11, a21, a12, a22, d0x - a11 * s0x - a12 * s0y, d0y - a21 * s0x - a22 * s0y);
            // 只畫這個三角形涵蓋的那一小塊來源圖（外擴 1px），不重畫整張
            const bx = Math.max(0, Math.min(s0x, s1x, s2x) - 1); const by = Math.max(0, Math.min(s0y, s1y, s2y) - 1);
            const bw = Math.min(iw - bx, Math.max(s0x, s1x, s2x) - bx + 1); const bh = Math.min(ih - by, Math.max(s0y, s1y, s2y) - by + 1);
            ctx.drawImage(image, bx, by, bw, bh, bx, by, bw, bh);
          };
          for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
            const i00 = j * (cols + 1) + i; const i10 = i00 + 1; const i01 = i00 + cols + 1; const i11 = i01 + 1;
            const x0 = i * sw; const y0 = j * sh; const x1 = x0 + sw; const y1 = y0 + sh;
            ctx.save();
            tri(x0, y0, x1, y0, x0, y1, vx[i00], vy[i00], vx[i10], vy[i10], vx[i01], vy[i01]);
            ctx.restore();
            ctx.save();
            tri(x1, y1, x0, y1, x1, y0, vx[i11], vy[i11], vx[i01], vy[i01], vx[i10], vy[i10]);
            ctx.restore();
          }
          ctx.setTransform(base);
        } else ctx.drawImage(image, -dw * 0.5, -dh * 0.92, dw, dh);
        ctx.restore();
      }
      ctx.restore();
    };
    // 咬合白閃畫在身體後面：只給對手卡一圈光，不蓋住神獸（蓋上去會把身體洗白、看起來糊掉）
    if (frame.flash > 0) {
      // 咬合瞬間的白閃（只給畫面用）
      const fx = geometry.to.cx;
      const fy = geometry.to.top + geometry.to.height * 0.62;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, geometry.to.width * 0.9);
      g.addColorStop(0, `rgba(255,244,214,${0.7 * frame.flash})`);
      g.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // 殘影：往回看三個時刻，越舊越淡，畫在本體下面
    if (frame.trail > 0.05) {
      for (let i = 3; i >= 1; i--) {
        const past = strikeFrame(Math.max(0, t - i * 0.016), style);
        paint(past, placeRig(geometry, past, style.size), 0.2 * frame.trail * (1 - (i - 1) / 3), 0, Math.max(0, t - i * 0.016));
      }
    }
    // 腳下揚塵：腳底位置往後噴出的幾團煙（位置由時間決定，不用亂數）
    if (frame.dust > 0.05) {
      const back = place.mirror ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        const age = (i + 1) / 4;
        const px = place.x + back * place.unit * (0.35 + age * 0.7);
        const py = place.y - place.unit * 0.05 * (1 + age);
        const r = place.unit * (0.07 + age * 0.12);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(226,214,190,${0.34 * frame.dust * (1 - age * 0.7)})`);
        g.addColorStop(1, 'rgba(226,214,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    const rend = rendFrame(t, style);
    // 咬住後將「當前對手的真實卡圖」切成兩片拉開，動畫結束恢復。
    // 只處理圖像，不修改血量、收藏或卡片資料。
    const targetArt = geometry.targetArt;
    if (targetArt?.complete && targetArt.naturalWidth > 0 && rend.power > 0 && rend.slash > 0) {
      if (!hiddenArt.current) hiddenArt.current = { image: targetArt, visibility: targetArt.style.visibility };
      targetArt.style.visibility = 'hidden';
      const { cx, top, width, height } = geometry.to;
      const left = cx - width / 2; const pull = rigContactPull(place, t, width);
      const fade = Math.max(0, 1 - Math.max(0, (t - 0.88) / 0.07));
      const fit = Math.max(width / targetArt.naturalWidth, height / targetArt.naturalHeight);
      const iw = targetArt.naturalWidth * fit; const ih = targetArt.naturalHeight * fit;
      for (const side of [-1, 1]) {
        ctx.save(); ctx.globalAlpha = fade;
        ctx.translate(side * Math.abs(pull[0]), side === (place.mirror ? 1 : -1) ? pull[1] : -pull[1]);
        ctx.beginPath();
        ctx.moveTo(side < 0 ? left : left + width, top);
        ctx.lineTo(cx + width * 0.06, top);
        ctx.lineTo(cx - width * 0.07, top + height * 0.23);
        ctx.lineTo(cx + width * 0.08, top + height * 0.4);
        ctx.lineTo(cx, top + height * 0.55);
        ctx.lineTo(cx + width * 0.09, top + height * 0.7);
        ctx.lineTo(cx - width * 0.06, top + height);
        ctx.lineTo(side < 0 ? left : left + width, top + height);
        ctx.closePath(); ctx.clip();
        ctx.drawImage(targetArt, left + (width - iw) / 2, top + (height - ih) / 2, iw, ih);
        ctx.restore();
      }
    } else if (hiddenArt.current) {
      hiddenArt.current.image.style.visibility = hiddenArt.current.visibility; hiddenArt.current = null;
    }
    // 撕咬的爪痕畫在神獸後面（咬下去時身體蓋住卡面，爪痕從身體周圍露出來，不蓋住龍頭）
    if (rend.power > 0 && rend.slash > 0) {
      const { cx, top, width, height } = geometry.to;
      const left = cx - width / 2;
      const fade = 1 - rend.shards * rend.shards;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * width * 0.26;
        const x0 = cx + off * 0.35;
        const y0 = top + height * 0.55;
        const x1 = x0 + width * 0.34 * rend.slash;
        const y1 = y0 + height * 0.4 * rend.slash;
        ctx.globalAlpha = fade * rend.power;
        ctx.strokeStyle = 'rgba(255,120,60,0.9)'; ctx.lineWidth = Math.max(5, width * 0.055); ctx.shadowColor = 'rgba(255,90,30,0.9)'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,248,230,0.95)'; ctx.lineWidth = Math.max(2, width * 0.02);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.restore();
    }
    paint(frame, place, 1, 1, t);
    // 撕咬的碎片畫在神獸前面（位置與進度都由時間決定，不用亂數）
    if (rend.power > 0 && rend.slash > 0) {
      const { cx, top, width, height } = geometry.to;
      const fade = 1 - rend.shards * rend.shards;
      ctx.save();
      // 碎片：從咬點向外飛散，越遠越淡
      const fx = cx; const fy = top + height * 0.55;
      const active = frame.layers[0];
      const activeImage = active ? images.current.get(active.frame) : null;
      const activeSpec = active ? rig.frames.find(spec => spec.id === active.frame) : null;
      const zones = activeImage && activeSpec ? rigReadabilityZones(place, frame, activeSpec, activeImage.naturalWidth / activeImage.naturalHeight, t, geometry, rig) : [];
      for (let i = 0; i < 14; i++) {
        const ang = i * 2.399 + 0.4;
        const dist = width * (0.15 + (i % 5) * 0.12) * rend.shards;
        const size = Math.max(3, width * (0.03 + (i % 3) * 0.015)) * (1 - rend.shards * 0.5);
        const shardX = fx + Math.cos(ang) * dist, shardY = fy + Math.sin(ang) * dist - rend.shards * width * 0.1;
        if (!shardOutsideReadabilityZones(shardX, shardY, size, zones)) continue;
        ctx.globalAlpha = fade * rend.power * 0.9;
        ctx.fillStyle = i % 2 ? 'rgba(255,230,190,1)' : 'rgba(255,140,70,1)';
        ctx.save(); ctx.translate(shardX, shardY); ctx.rotate(ang + rend.shards * 3);
        ctx.fillRect(-size / 2, -size / 4, size, size / 2); ctx.restore();
      }
      ctx.restore();
    }
    if (shadow.current) {
      const lift = Math.min(1, frame.travel.hop * 2.2);
      const startY = geometry.from.top + geometry.from.height * 0.7;
      const endY = geometry.to.top + geometry.to.height * 0.82;
      const base = startY + (endY - startY) * frame.travel.progress;
      const sw = place.unit * 1.25 * (1 - 0.35 * lift);
      shadow.current.style.opacity = String(0.5 * frame.alpha * (1 - 0.6 * lift));
      shadow.current.style.transform = `translate(${place.x - sw / 2}px, ${base - sw * 0.06}px)`;
      shadow.current.style.width = `${sw}px`;
      shadow.current.style.height = `${sw * 0.16}px`;
    }
  };

  // 播放：每次 playKey 換成新的數字就從頭跑一次；預覽模式只畫指定那一刻
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
    const root = stage.current;
    if (!root || !loaded) return;

    const measure = (): BeastRigGeometry | null => {
      if (measureGeometry) { const geometry = measureGeometry(); return geometry ? orientRigGeometry(geometry, window.innerWidth) : null; }
      const mine = document.querySelector('[data-dock-card][data-active="true"] [data-card-thumbnail]') ?? document.querySelector('[data-dock-card][data-active="true"]');
      const foe = document.querySelector('[data-fighter="opponent"] [data-art-slot]');
      const arena = document.querySelector<HTMLElement>('[data-battle-visual]');
      const to = foe ? toRect(foe) : null;
      const ar = arena?.getBoundingClientRect();
      const cameraOrigin = to && ar ? `${to.cx - ar.left}px ${to.top + to.height / 2 - ar.top}px` : undefined;
      return mine && foe && to ? orientRigGeometry({ arenaWidth: Math.min(window.innerWidth, 640), from: toRect(mine), to, cameraOrigin, targetArt: foe.querySelector('img') }, window.innerWidth) : null;
    };
    const clear = () => {
      const el = canvas.current;
      el?.getContext('2d')?.clearRect(0, 0, el.width, el.height);
      root.dataset.rigActive = 'false';
      (cameraElement ? cameraElement() : document.querySelector<HTMLElement>('[data-battle-visual]'))?.style.removeProperty('transform');
      if (shadow.current) shadow.current.style.opacity = '0';
      if (hiddenArt.current) { hiddenArt.current.image.style.visibility = hiddenArt.current.visibility; hiddenArt.current = null; }
    };

    if (seek !== null) {
      const geometry = measure();
      if (geometry) {
        draw(seek, geometry);
        // 剛載入的圖可能還沒解碼完：下一幀與稍後再畫一次（只有預覽頁的靜態檢視會走到這裡）
        raf.current = requestAnimationFrame(() => draw(seek, geometry));
        timer.current = setTimeout(() => draw(seek, geometry), 400);
      }
      return () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current); clear(); };
    }
    if (playKey === null) return;

    const run = () => {
      const geometry = measure();
      if (!geometry) return;
      const startedAt = performance.now();
      root.dataset.rigActive = 'true';
      // 動畫「真正開始」的瞬間通知聲音：聲音與動畫各自計時會差約 0.3 秒，改由動畫發令（只是訊號，不含任何戰鬥資料）
      window.dispatchEvent(new CustomEvent(RIG_STRIKE_EVENT, { detail: { cardId: rig.cardId } }));
      const step = (now: number) => {
        const real = Math.min(1, (now - startedAt) / RIG_STRIKE_MS);
        const t = storyTime(real); // 咬合後慢動作約 120 毫秒，之後追回，總長不變
        draw(t, geometry);
        onFrame?.(t);
        if (real < 1) raf.current = requestAnimationFrame(step);
        else clear();
      };
      raf.current = requestAnimationFrame(step);
    };
    timer.current = setTimeout(run, Math.max(0, delayMs));
    return () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current); clear(); };
    // draw 只讀 ref 與 rig，不放進依賴
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, delayMs, rig, onFrame, seek, loaded, measureGeometry, cameraElement]);

  return (
    <div ref={stage} data-rig-stage data-rig-active="false" aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: layerZIndex }}>
      <span ref={shadow} data-rig-shadow
        style={{ position: 'absolute', left: 0, top: 0, opacity: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)', willChange: 'transform, opacity' }} />
      <canvas ref={canvas} data-rig-canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
