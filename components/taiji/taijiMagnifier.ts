'use client';

/**
 * 【太極顯微鏡｜倍率核心】（2026-08-17 依業主指示開工）
 *
 * 概念：太極不是一張圖，是一個「可以無限放大的真實物體」。
 * 把倍率從 ×1 一路轉到 ×10,000,000（顯微鏡物鏡轉盤的概念），
 * 太極的本體會逐層解離：
 * 全貌 → 釉面 → 微結構 → 場紋 → 粒子雲 → 光子糾纏 → 波包內景 → 糾纏本身。
 *
 * 鐵律（太極核心憲章）：
 * - 倍率只有「一個」狀態來源（magRef），不得再開第二套 state。
 * - ×1 時畫面必須與原本一模一樣，顯微鏡只是「擴充」，不改核心。
 * - 解析度只准往上，不准往下。
 */

import { useEffect, useRef, type RefObject } from 'react';

/** 二十三個數量級：10^23 倍
    （2026-08-21 依業主指示：13 層之後一路連接到 24 層，形成無限循環——
    深入到黑洞事件視界／奇異點／白洞噴湧，最終在第 24 層噴回最初的太極全貌）
    注意：所有動畫門檻一律用「數量級」(decade = u × MAG_DECADES) 表示，不要用 u。
    u 是相對行程，加深倍率上限時 u 的意義會整個位移；decade 是絕對刻度，永遠對得上倍率。
    第 1~13 段（decade 0~12）的既有門檻全部維持絕對數量級不變，延伸不影響它們。 */
export const MAG_DECADES = 23;

/** u → 數量級（0 = ×1、5 = ×100,000、7 = ×10,000,000） */
export const decadesFromU = (u: number) => u * MAG_DECADES;

/** u ∈ [0,1] → 倍率（對數尺，跟真實顯微鏡一樣） */
export const magFromU = (u: number) => Math.pow(10, MAG_DECADES * u);
/** 倍率 → u */
export const uFromMag = (mag: number) => Math.log10(Math.max(1, mag)) / MAG_DECADES;

export type MagState = {
  /** 使用者操作的目標倍率（0~1） */
  target: number;
  /** 每幀平滑後的實際倍率（0~1）——所有 3D 元件都讀這一個值 */
  current: number;
};

/** 唯一狀態來源：可變 ref，不進 React state，避免每幀重繪整棵樹 */
export type MagRef = { current: MagState };

/**
 * 著色器暖機旗標（2026-08-17 穩定性專案）
 * 載入後的空檔會把所有層級都「顯示幾幀」，讓著色器提前編譯完；
 * 之後使用者不管怎麼點、怎麼轉倍率，都不會再撞上編譯造成的凍結。
 */
export type WarmRef = { current: { warming: boolean; frames: number; done: boolean } };

/** 物鏡轉盤：八段，跟真實顯微鏡的鏡頭一樣一段一個數量級 */
export const MAG_TIERS = [
  { key: 'macro', mag: 1, label: '全貌', detail: '太極本體', scale: '10 mm' },
  { key: 'glaze', mag: 10, label: '釉面', detail: '墨玉與月瓷的皮膚', scale: '1 mm' },
  { key: 'grain', mag: 100, label: '微結構', detail: '釉裂與晶粒', scale: '10 µm' },
  { key: 'lattice', mag: 1000, label: '場紋', detail: '能量晶格浮現', scale: '1 µm' },
  { key: 'particle', mag: 10000, label: '粒子雲', detail: '物質解離成粒子', scale: '10 nm' },
  { key: 'photon', mag: 100000, label: '光子糾纏', detail: '陰陽成對：一顆自旋向上，對面那顆必定向下', scale: '10 pm' },
  /* 2026-08-17 再深入兩級：不再看「整片粒子」，而是鑽進其中一對的內部 */
  { key: 'packet', mag: 1000000, label: '波包內景', detail: '粒子不是點，是一團駐波；自旋方向看得見', scale: '1 pm' },
  { key: 'weave', mag: 10000000, label: '糾纏本身', detail: '兩顆共用同一個相位；至微之處，太極再現', scale: '100 fm' },
  /* 2026-08-19 再深入四級：把波包裡浮現的那顆太極，當成一層細胞膜，繼續往裡鑽 */
  { key: 'membrane', mag: 100000000, label: '細胞膜', detail: '重新浮現的太極化為一層膜，膜面浮出量子泡沫般的顆粒紋理', scale: '10 fm' },
  { key: 'nucleus', mag: 1000000000, label: '核質場', detail: '穿過膜面，內部再浮現一組更小的糾纏粒子對——太極生太極', scale: '1 fm' },
  { key: 'filament', mag: 10000000000, label: '共振絲', detail: '連接那對更小粒子的相位絲線本身也在振動糾纏', scale: '100 am' },
  { key: 'source', mag: 100000000000, label: '太極源點', detail: '一切收斂成同時是陰陽的奇點光源；其大無外，其小無內', scale: '10 am' },
  /* 2026-08-19 再深入一級：那個「不再可分」的奇點，其實是一扇門 */
  { key: 'gate', mag: 1000000000000, label: '無極之門', detail: '源點裂開，門後浮現的是完整而縮小的太極本體——同一個結構，向下無窮遞迴，深不可測', scale: '1 am' },
  /* 2026-08-21 再深入十一級：從無極之門一路連到宇宙尺度，形成無限循環。
     超過原子尺度之後已無公認物理單位，scale 欄位刻意留下「不可測」——
     這正是敘事本身：越深越沒有答案，直到第 24 層回到最初的 10 mm。 */
  { key: 'tide', mag: 1e13, label: '相位潮汐', detail: '失去固定參照，只剩陰陽之間的相位差，如潮汐起落', scale: '不可測' },
  { key: 'echo', mag: 1e14, label: '微光回聲', detail: '粒子不再是物件，只是曾被看見一瞬的殘影', scale: '不可測' },
  { key: 'veil', mag: 1e15, label: '互感之幕', detail: '陰陽不再相觸，只靠感應改變彼此的存在', scale: '不可測' },
  { key: 'fold', mag: 1e16, label: '靜默摺疊', detail: '空間向內收摺，時間感被拉得很慢', scale: '不可測' },
  { key: 'unnamed', mag: 1e17, label: '無名之境', detail: '放大不再帶來答案，只帶來更深的未知', scale: '不可測' },
  { key: 'horizon', mag: 1e18, label: '事件視界', detail: '黑洞的邊界——一切只進不出，連光都被吞下', scale: '視界' },
  { key: 'singularity', mag: 1e19, label: '奇異點', detail: '密度趨近無限，已知的規則在此失效', scale: '∞' },
  { key: 'white-hole', mag: 1e20, label: '白洞噴湧', detail: '被吞下的一切從另一端噴出，時間感倒轉', scale: '倒流' },
  { key: 'undefined-zone', mag: 1e21, label: '不可定域', detail: '中心不再是一個位置，觀者無法固定它', scale: '不可測' },
  { key: 'cosmos-edge', mag: 1e22, label: '宇宙止境', detail: '所有運動收斂成極低的呼吸，遙不可及', scale: '遙不可及' },
  { key: 'cosmic-taiji', mag: 1e23, label: '宇宙太極', detail: '止境其實是輪迴的起點——白洞噴出的，是最初那顆太極的全貌；同一顆核心，同一個開始，無限循環在此閉合', scale: '10 mm' },
] as const;

export type MagTier = (typeof MAG_TIERS)[number];

/** 由 u 取得目前所在層級 */
export function tierForU(u: number): MagTier {
  const index = Math.min(MAG_TIERS.length - 1, Math.max(0, Math.round(u * MAG_DECADES)));
  return MAG_TIERS[index];
}

export const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 倍率文字：×1 / ×12 / ×1,240 / ×10,000,000 */
export function formatMag(mag: number) {
  if (mag < 10) return `×${mag.toFixed(mag < 2 ? 1 : 0)}`;
  return `×${Math.round(mag).toLocaleString('en-US')}`;
}

/**
 * 顯微鏡輸入：
 * - 桌機：Ctrl / ⌘ / Shift + 滾輪（不搶頁面捲動）
 * - 手機：兩指捏合（單指仍然是旋轉太極，功能不衝突）
 * - 兩者共用：HUD 上的滑桿與物鏡轉盤按鈕
 */
export function useTaijiMagnifier(elementRef: RefObject<HTMLElement | null>) {
  const magRef = useRef<MagState>({ target: 0, current: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDistance = 0;
    let pinchStartU = 0;

    const setTarget = (next: number) => {
      magRef.current.target = clamp01(next);
    };

    const onWheel = (event: WheelEvent) => {
      // 沒按修飾鍵時完全不介入，頁面捲動維持原樣
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) return;
      event.preventDefault();
      setTarget(magRef.current.target - event.deltaY * 0.0011);
    };

    const distanceOf = () => {
      const [a, b] = Array.from(pointers.values());
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        pinchStartDistance = distanceOf();
        pinchStartU = magRef.current.target;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size !== 2 || pinchStartDistance <= 0) return;
      const distance = distanceOf();
      if (distance <= 0) return;
      // 手指每撐開一倍 ≈ 前進 1/3 個行程（約三次撐開走完 ×1 → ×100,000）
      setTarget(pinchStartU + (Math.log2(distance / pinchStartDistance) * 0.34));
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStartDistance = 0;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('pointerleave', onPointerUp);

    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('pointerleave', onPointerUp);
    };
  }, [elementRef]);

  return magRef;
}
