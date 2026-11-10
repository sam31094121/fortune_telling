/**
 * 一般阿修羅死亡動畫引擎 —— v2 Canvas 2D 版（v3 的後備：瀏覽器沒有 WebGL2 或 GL 失效時自動改用）
 * 規格：寶珠戰鬥卡片技能檔 第五章 —— 三層不規則撕裂 → 金轉紅瞬燒 → 儀式式快速消失，總長 ≤ 3 秒。
 *
 * v2 結構（為了 DPR 清晰度＋6× 降速不掉幀）：
 *   layer(div, fixed, 夾在視窗內)
 *     ├ canvas.back   ：裂縫後方透出的金光、遠景餘燼
 *     ├ div.piece ×3  ：每層碎片＝厚度剪影＋本體 canvas＋金／紅熾邊 canvas；位移旋轉走 CSS transform（合成器，不重畫）
 *     └ canvas.front  ：中／近景餘燼、火舌、裂尖火星
 *   本體 canvas 只在「裂線生長中」和「燃燒中」才重畫。
 *
 * - 只是疊加視覺層：pointer-events: none、aria-hidden，不改任何遊戲狀態，也不判定擊倒。
 * - 只能在「伺服端回合結果確認 HP 歸零」之後呼叫 play（由整合方負責觸發）。
 * - 任一時間點的畫面是 (seed, t) 的純函數：render(t)／seek 可逐格重現。
 */

export interface AsuraDeathPlayOptions {
  /** 32-bit 整數。未給時用亂數；結果會回報實際 seed，方便重現。正式環境請不要給（才能用閒置預排）。 */
  seed?: number;
  /** true＝短版（一層撕裂＋金轉紅＋快速消失、無大幅位移）；未給時跟隨 prefers-reduced-motion。 */
  reducedMotion?: boolean;
  /** 預設 true：與上一次播放的撕裂順序相同時重抽，避免連續兩次同順序。 */
  avoidRepeat?: boolean;
}

export interface AsuraDeathPlan {
  seed: number;
  reducedMotion: boolean;
  /** 撕裂順序，層編號 1..3（短版 1..2，只撕一道）。 */
  order: number[];
  /** 各層開始撕離的秒數（依 order 排）。 */
  tearTimes: number[];
  burnStart: number;
  burnEnd: number;
  vanishStart: number;
  vanishEnd: number;
  /** 全部結束（含餘燼）的秒數，必 ≤ 3。 */
  total: number;
  /** 撕裂基準方向（度）。 */
  angleDeg: number;
  /** v2：兩道裂線彼此的夾角（度），證明不是平行紙條。 */
  crackSpreadDeg?: number;
}

export interface AsuraDeathResult extends AsuraDeathPlan {
  durationMs: number;
  frames: number;
  maxFrameGapMs: number;
  droppedFrames: number;
  cancelled: boolean;
}

export interface AsuraDeathSetup {
  /** 阿修羅身影圖（與畫面上同一張）。未給時從 anchor 內的 <img> 或 background-image 取。 */
  src?: string | CanvasImageSource;
  /** 要被撕掉的目標元素（例如 Match3Board 的 .foeArt）。 */
  anchor?: HTMLElement | null;
  /** 無 anchor 時直接指定 viewport 座標。 */
  rect?: { left: number; top: number; width: number; height: number };
  shape?: 'auto' | 'circle' | 'rect';
  radius?: number;
  /** 把目標原有的邊框（含無模糊的 box-shadow 外環）一起畫進去一起撕。'auto' 讀 anchor。 */
  frame?: 'auto' | { color: string; width: number } | null;
  /** 特效層每邊外擴（相對目標尺寸），預設 0.65；實際外擴另限制在 36–110 CSS px，且整層夾在視窗內。 */
  bleed?: number;
  /** 播放時把 anchor 設成 visibility:hidden（預設 true），結束後是否還原（預設 false：已陣亡，維持隱藏）。 */
  hideAnchor?: boolean;
  restoreAnchor?: boolean;
  zIndex?: number;
  className?: string;
  /** 只供測試：指定掛載容器（預設 document.body）。 */
  container?: HTMLElement;
  /** v1 相容欄位（v2 不再用單一大 canvas，保留以免整合方傳了報錯）。 */
  maxBacking?: number;
  maxPixels?: number;
  /** 碎片 canvas 的 DPR 上限（預設 3；實際再受 pieceBudget 限制）。 */
  maxDpr?: number;
  /** 三片碎片 canvas 的總像素預算（預設 380000；整合方在高階機可調高到 DPR 滿格）。 */
  pieceBudget?: number;
  /** 粒子層 canvas 的 DPR 上限（預設 1.5，火星本來就細小柔和）。 */
  particleDpr?: number;
  /** 掉格時自動把碎片燒蝕改為輪流更新（預設 true）。 */
  adaptive?: boolean;
  /** 選用：預排完成後把特效層以 opacity 0 預掛（pointer-events none、data-primed=1，data-state 不變）。預設 false，維持 v1「未擊倒時 display:none」的約定。 */
  keepWarm?: boolean;
  /** v3：'auto'（預設，有 WebGL2 就用 GL 版）／'webgl'／'2d'（強制用 v2 Canvas 2D 版）。 */
  renderer?: 'auto' | 'webgl' | '2d';
  /** v3：GL 畫布像素上限（預設 2400000 device px）；超過才降解析度。 */
  glPixelBudget?: number;
}

// ───────────────────────── 亂數與雜訊 ─────────────────────────
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** 5 個八度：低頻決定燒蝕走向，高頻讓燃燒邊緣鋸齒、銳利（不圓鈍、不像融化）。 */
function fbm(x: number, y: number, s: number) {
  return 0.42 * vnoise(x * 3.2, y * 3.2, s) + 0.26 * vnoise(x * 7.5, y * 7.5, s + 7) + 0.16 * vnoise(x * 17, y * 17, s + 13)
    + 0.1 * vnoise(x * 39, y * 39, s + 29) + 0.06 * vnoise(x * 83, y * 83, s + 41);
}
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutQuart = (x: number) => 1 - Math.pow(1 - clamp01(x), 4);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInQuad = (x: number) => { const c = clamp01(x); return c * c; };
export const smooth = (a: number, b: number, x: number) => { const c = clamp01((x - a) / (b - a)); return c * c * (3 - 2 * c); };

// 金（約 37–40°）→ 琥珀 → 紅（約 6–12°）。刻意壓低亮度：最高相對亮度 ≈ 0.6，不會閃白。
export const GOLD = [246, 190, 82], AMBER = [234, 120, 40], RED = [196, 34, 22];
const GOLD_DEEP = [214, 150, 52];
export function heat(p: number): [number, number, number] {
  p = clamp01(p);
  const [a, b, k] = p < 0.45 ? [GOLD, AMBER, p / 0.45] : [AMBER, RED, (p - 0.45) / 0.55];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
const rgb = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

// ───────────────────────── 裂線幾何 ─────────────────────────
// 座標：以圖中心為原點、以 R＝max(圖寬,圖高) 為單位的等向座標。每道裂線有自己的方向（不平行）。
export const NPTS = 129, U0 = -1.05, U1 = 1.05;
export interface Crack { ox: number; oy: number; cos: number; sin: number; v: Float32Array; dir: 1 | -1; start: number; open: number; dur: number; p0?: number; p1?: number }
export const uAt = (i: number) => U0 + ((U1 - U0) * i) / (NPTS - 1);
function crackV(l: Crack, u: number) {
  const f = ((u - U0) / (U1 - U0)) * (NPTS - 1);
  const i = Math.max(0, Math.min(NPTS - 2, Math.floor(f)));
  const k = f - i;
  return l.v[i] + (l.v[i + 1] - l.v[i]) * k;
}
/** 點（R 單位，中心為原點）在裂線哪一側：>0 為 +v 側。 */
export function crackSide(l: Crack, x: number, y: number) {
  const dx = x - l.ox, dy = y - l.oy;
  const u = dx * l.cos + dy * l.sin, v = -dx * l.sin + dy * l.cos;
  return v - crackV(l, u);
}
export function crackPoint(l: Crack, i: number, dv = 0): [number, number] {
  const u = uAt(i), v = l.v[i] + dv;
  return [l.ox + u * l.cos - v * l.sin, l.oy + u * l.sin + v * l.cos];
}
/** 不規則撕裂路徑：低頻蜿蜒＋中頻折線＋1–3 個急轉的撕角＋末端細鋸齒。 */
export function makeCrackV(rand: () => number, amp: number): Float32Array {
  const v = new Float32Array(NPTS);
  v[0] = (rand() - 0.5) * amp; v[NPTS - 1] = (rand() - 0.5) * amp;
  let step = NPTS - 1, a = amp;
  while (step > 1) {
    const h = step >> 1;
    for (let i = h; i < NPTS; i += step) v[i] = (v[i - h] + v[i + h]) / 2 + (rand() - 0.5) * a;
    step = h; a *= 0.6;
  }
  const kinks = 1 + Math.floor(rand() * 3);
  for (let k = 0; k < kinks; k++) {
    const c = 0.2 + rand() * 0.6, w = 0.015 + rand() * 0.03, hgt = (rand() - 0.5) * 0.09;
    for (let i = 0; i < NPTS; i++) { const p = i / (NPTS - 1), d = Math.abs(p - c); if (d < w) v[i] += hgt * (1 - d / w); }
  }
  for (let i = 0; i < NPTS; i++) v[i] += (rand() - 0.5) * 0.006;
  return v;
}

let lastOrderKey = '';

/** 建立可重複播放的引擎實例。 */
export function createAsuraDeath2D(setup: AsuraDeathSetup) {
  const doc = document;
  const anchor = setup.anchor ?? null;
  const bleedK = setup.bleed ?? 0.65;

  // ── DOM ──
  const layer = doc.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.testid = 'asura-death-fx';
  layer.dataset.state = 'idle';
  layer.dataset.version = '2';
  if (setup.className) layer.className = setup.className;
  Object.assign(layer.style, {
    position: 'fixed', left: '0px', top: '0px', pointerEvents: 'none', zIndex: String(setup.zIndex ?? 60),
    contain: 'strict', overflow: 'hidden', display: 'none',
  } as Partial<CSSStyleDeclaration>);
  const mkCanvas = (z: number) => {
    const c = doc.createElement('canvas');
    Object.assign(c.style, { position: 'absolute', left: '0px', top: '0px', pointerEvents: 'none', zIndex: String(z) } as Partial<CSSStyleDeclaration>);
    return c;
  };
  const back = mkCanvas(1), front = mkCanvas(5);
  layer.appendChild(back); layer.appendChild(front);
  (setup.container ?? doc.body).appendChild(layer);
  const bctx = back.getContext('2d')!, fctx = front.getContext('2d')!;

  // ── 尺寸（CSS px）──
  let tw = 0, th = 0;            // 目標 border-box
  let pad = 0;                   // 外環（box-shadow spread）寬度
  let lw = 0, lh = 0;            // 特效層
  let artX = 0, artY = 0;        // 圖（含外環）左上角在特效層內的位置
  let startRect = { left: 0, top: 0 };
  let kp = 1, kf = 1;            // 碎片／粒子 backing 倍率
  let shapeCircle = true, radius = 0;
  let frameSpec: { color: string; width: number } | null = null;
  let rings: { color: string; width: number }[] = [];
  let artCanvas: HTMLCanvasElement | null = null;
  let srcImg: CanvasImageSource | null = null;

  function targetRect() {
    if (anchor) return anchor.getBoundingClientRect();
    const r = setup.rect!;
    return { left: r.left, top: r.top, width: r.width, height: r.height } as DOMRect;
  }
  function resolveSrc(): string | CanvasImageSource | null {
    if (setup.src) return setup.src;
    if (!anchor) return null;
    const img = anchor.querySelector('img');
    if (img && (img.currentSrc || img.src)) return img.currentSrc || img.src;
    const bg = getComputedStyle(anchor).backgroundImage;
    const m = /url\(["']?([^"')]+)["']?\)/.exec(bg || '');
    return m ? m[1] : null;
  }
  async function prepare(): Promise<void> {
    const s = resolveSrc();
    if (!s) throw new Error('AsuraDeathFx: 找不到阿修羅圖（src / anchor）');
    if (typeof s === 'string') {
      const img = new Image(); img.decoding = 'async'; img.src = s; await img.decode(); srcImg = img;
    } else srcImg = s;
    measure();
    schedulePreplan();
  }

  /** 解析無模糊的 box-shadow 外環（例：rgba(201,164,92,.5) 0px 0px 0px 2px），一起畫進去避免開播瞬間外環消失。 */
  function parseRings(bs: string): { color: string; width: number }[] {
    if (!bs || bs === 'none') return [];
    const out: { color: string; width: number }[] = [];
    // 以頂層逗號切開（顏色函數裡的逗號不切）
    const parts: string[] = []; let depth = 0, cur = '';
    for (const ch of bs) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    for (const p of parts) {
      if (/inset/.test(p)) continue;
      const color = (/(rgba?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)/i.exec(p.replace(/-?[\d.]+px/g, '')) || [])[1];
      const nums = (p.match(/-?[\d.]+px/g) || []).map(parseFloat);
      if (!color || nums.length < 4) continue;
      const [x, y, blur, spread] = nums;
      if (x === 0 && y === 0 && blur === 0 && spread > 0) out.push({ color, width: spread });
    }
    // box-shadow 由先到後疊：第一個在最上層；外環寬度要累加處理：這裡只取最大的那一圈當作外環（常見情況是單一圈）
    return out;
  }

  let sizeKey = '';
  /** 量目標尺寸並決定特效層的位置大小（夾在視窗內）；尺寸沒變就不重建（回傳是否變動）。 */
  function measure(): boolean {
    const r = targetRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1e5, vh = typeof window !== 'undefined' ? window.innerHeight : 1e5;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const key = `${Math.round(r.width * 4)}x${Math.round(r.height * 4)}@${Math.round(r.left)},${Math.round(r.top)}/${vw}x${vh}@${dpr}`;
    if (key === sizeKey && artCanvas) return false;
    sizeKey = key;
    tw = Math.max(8, r.width); th = Math.max(8, r.height);
    // 外形、邊框、外環
    let shp = setup.shape ?? 'auto';
    let rad = setup.radius ?? 0;
    let fr = setup.frame === undefined ? 'auto' : setup.frame;
    rings = [];
    if (anchor) {
      const cs = getComputedStyle(anchor);
      const br = cs.borderTopLeftRadius;
      const brPx = br.endsWith('%') ? (parseFloat(br) / 100) * tw : parseFloat(br) || 0;
      if (shp === 'auto') shp = brPx >= Math.min(tw, th) / 2 - 0.5 ? 'circle' : 'rect';
      if (setup.radius === undefined) rad = brPx;
      if (fr === 'auto') {
        const bw = parseFloat(cs.borderTopWidth) || 0;
        fr = bw > 0 && cs.borderTopStyle !== 'none' ? { color: cs.borderTopColor, width: bw } : null;
        rings = parseRings(cs.boxShadow);
      }
    }
    if (shp === 'auto') shp = 'circle';
    if (fr === 'auto') fr = null;
    shapeCircle = shp === 'circle'; radius = rad; frameSpec = fr as typeof frameSpec;
    pad = rings.reduce((m, x) => Math.max(m, x.width), 0);
    // 外擴：相對尺寸，但限制在 36–110 px；再整層夾進視窗（不超出畫面、火星不被視窗裁掉）
    const S = Math.max(tw, th);
    const bl = Math.max(36, Math.min(110, S * bleedK));
    let L = r.left - pad - bl, T = r.top - pad - bl, Rr = r.left + tw + pad + bl, B = r.top + th + pad + bl;
    L = Math.max(0, L); T = Math.max(0, T); Rr = Math.min(vw, Rr); B = Math.min(vh, B);
    if (Rr - L < tw + 2 * pad) { L = Math.min(L, r.left - pad); Rr = Math.max(Rr, r.left + tw + pad); }
    if (B - T < th + 2 * pad) { T = Math.min(T, r.top - pad); B = Math.max(B, r.top + th + pad); }
    lw = Math.round(Rr - L); lh = Math.round(B - T);
    startRect = { left: L, top: T };
    artX = r.left - pad - L; artY = r.top - pad - T;
    layer.style.width = lw + 'px'; layer.style.height = lh + 'px';
    // 碎片依 DPR（上限 3），再以「三片碎片總像素預算」封頂：小頭像一律滿 DPR，大卡在中階手機上維持不掉格
    const artArea = (tw + 2 * pad) * (th + 2 * pad) * 3; // 三片外接框總和約為圖面 3 倍（斜裂縫的外接框互相重疊）
    kp = Math.max(1, Math.min(dpr, setup.maxDpr ?? 3, Math.sqrt((setup.pieceBudget ?? 380000) / Math.max(1, artArea))));
    layer.dataset.pieceDpr = kp.toFixed(2);
    kf = Math.min(dpr, setup.particleDpr ?? 1.5, Math.sqrt(700000 / Math.max(1, lw * lh)));
    for (const c of [back, front]) {
      c.width = Math.round(lw * kf); c.height = Math.round(lh * kf);
      c.style.width = lw + 'px'; c.style.height = lh + 'px';
    }
    buildArt();
    built = null; // 尺寸變了，預排的計畫作廢
    return true;
  }

  // 圖（含外環）的 backing 尺寸
  let Wa = 0, Ha = 0, padB = 0, awB = 0, ahB = 0;
  function shapePathB(c: CanvasRenderingContext2D | Path2D, inset = 0, extra = 0) {
    // backing 座標；extra>0 往外擴（外環用）
    const x = padB - extra + inset, y = padB - extra + inset, w = awB + 2 * extra - 2 * inset, h = ahB + 2 * extra - 2 * inset;
    if ('beginPath' in c) c.beginPath();
    if (shapeCircle) (c as CanvasRenderingContext2D).ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
    else (c as CanvasRenderingContext2D).roundRect(x, y, w, h, Math.max(0, Math.min(radius * kp + extra - inset, w / 2, h / 2)));
  }
  function buildArt() {
    if (!srcImg) return;
    padB = Math.round(pad * kp); awB = Math.round(tw * kp); ahB = Math.round(th * kp);
    Wa = awB + 2 * padB; Ha = ahB + 2 * padB;
    const c = doc.createElement('canvas'); c.width = Wa; c.height = Ha;
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    // 外環（原本的 box-shadow），由外往內畫
    for (const rg of [...rings].sort((a, b) => b.width - a.width)) {
      g.fillStyle = rg.color; shapePathB(g, 0, rg.width * kp); g.fill();
    }
    g.save(); shapePathB(g); g.clip();
    g.clearRect(0, 0, Wa, Ha);
    g.fillStyle = '#0c0b10'; g.fillRect(0, 0, Wa, Ha);
    const iw = (srcImg as HTMLImageElement).naturalWidth || (srcImg as HTMLCanvasElement).width;
    const ih = (srcImg as HTMLImageElement).naturalHeight || (srcImg as HTMLCanvasElement).height;
    const sc = Math.max(awB / iw, ahB / ih); // object-fit: cover
    g.drawImage(srcImg, padB + (awB - iw * sc) / 2, padB + (ahB - ih * sc) / 2, iw * sc, ih * sc);
    g.restore();
    if (frameSpec) {
      const w = frameSpec.width * kp;
      g.lineWidth = w; g.strokeStyle = frameSpec.color; shapePathB(g, w / 2); g.stroke();
    }
    artCanvas = c;
  }

  // ───────────── 單次播放的計畫 ─────────────
  interface Piece {
    div: HTMLDivElement; base: HTMLCanvasElement; thick: HTMLCanvasElement; rimG: HTMLCanvasElement; rimR: HTMLCanvasElement;
    plain: HTMLCanvasElement; deco: HTMLCanvasElement; rimGFull: HTMLCanvasElement; rimRFull: HTMLCanvasElement;
    bx: number; by: number; bw: number; bh: number; // backing bbox（在圖 canvas 內）
    cx: number; cy: number; // 旋轉中心（CSS px，圖座標）
    dx: number; dy: number; rot: number; scale: number; drift: number;
    tearAt: number; burnOffset: number; depth: number; edges: number[];
    wedge: { px: number; py: number; ang: number; line: number } | null;
    lastKey: string; burnInit: boolean; thr: number; rimsOn?: boolean;
  }
  interface Particle { t0: number; life: number; x: number; y: number; vx: number; vy: number; g: number; z: 0 | 1 | 2; size: number; heat: number; kind: 0 | 1 | 2 | 3 }
  interface Built {
    plan: AsuraDeathPlan; pieces: Piece[]; cracks: Crack[]; R: number;
    field: Float32Array; MW: number; MH: number; ms: number;
    maskC: HTMLCanvasElement; overC: HTMLCanvasElement; maskImg: ImageData; overImg: ImageData; mask32: Uint32Array; over32: Uint32Array;
    particles: Particle[]; tongueGold: HTMLCanvasElement; tongueRed: HTMLCanvasElement;
    th0: number; th1: number; lastThr: number;
  }
  let built: Built | null = null;

  /** R 單位（中心原點）→ 圖 backing px */
  const toB = (R: number, x: number, y: number): [number, number] => [padB + awB / 2 + x * R * kp, padB + ahB / 2 + y * R * kp];

  function tongueSprite(c0: number[], c1: number[]) {
    // 細長火舌（不是圓形光團）：底部亮、往上收尖、尖端透明
    const w = 24, h = 64, c = doc.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, rgba(c0, 0.0)); gr.addColorStop(0.12, rgba(c0, 0.85)); gr.addColorStop(0.45, rgba(c1, 0.55)); gr.addColorStop(1, rgba(c1, 0));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(w / 2, 0);
    g.bezierCurveTo(w * 0.62, h * 0.35, w * 0.98, h * 0.6, w * 0.78, h * 0.86);
    g.quadraticCurveTo(w / 2, h * 1.02, w * 0.22, h * 0.86);
    g.bezierCurveTo(w * 0.02, h * 0.6, w * 0.38, h * 0.35, w / 2, 0);
    g.fill();
    return c;
  }

  /** 讓 canvas 的延遲繪製在這一小段內完成，避免堆到下一段變成長任務。 */
  const flushC = (c: HTMLCanvasElement) => { try { c.getContext('2d')!.getImageData(0, 0, 1, 1); } catch { /* ignore */ } };

  function* planSteps(opts: AsuraDeathPlayOptions = {}): Generator<void, AsuraDeathPlan> {
    if (!artCanvas) throw new Error('AsuraDeathFx: 請先 prepare()');
    const reduced = opts.reducedMotion ?? prefersReduced();
    let seed = opts.seed ?? ((Math.random() * 2 ** 31) | 0);
    let rand = mulberry32(seed);
    const nLayers = reduced ? 2 : 3;
    let order: number[] = [];
    for (let tries = 0; tries < 8; tries++) {
      const arr = [...Array(nLayers).keys()];
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      order = arr;
      const key = (reduced ? 'r' : 'n') + order.join('');
      if (!(opts.avoidRepeat ?? true) || opts.seed !== undefined || key !== lastOrderKey || reduced) break;
      seed = (seed + 0x9e3779b9) | 0; rand = mulberry32(seed);
    }
    lastOrderKey = (reduced ? 'r' : 'n') + order.join('');

    const R = Math.max(tw, th) + 2 * pad; // CSS px
    const hx = (tw / 2 + pad) / R, hy = (th / 2 + pad) / R; // 圖半寬半高（R 單位）
    const baseDeg = (rand() - 0.5) * 80 + (rand() < 0.3 ? 90 : 0);
    const base = (baseDeg * Math.PI) / 180;
    const nb = [-Math.sin(base), Math.cos(base)];
    // ── 裂線：兩道不平行、寬窄不同、彼此不在圖內相交 ──
    const cracks: Crack[] = [];
    const mk = (off: number, dDeg: number, amp: number): Crack => {
      const a = base + (dDeg * Math.PI) / 180;
      return { ox: nb[0] * off, oy: nb[1] * off, cos: Math.cos(a), sin: Math.sin(a), v: makeCrackV(rand, amp), dir: rand() < 0.5 ? 1 : -1, start: 0, open: 0, dur: 0 };
    };
    let spread = 0;
    if (reduced) cracks.push(mk((rand() - 0.5) * 0.14, (rand() - 0.5) * 16, 0.09));
    else {
      for (let tries = 0; tries < 24; tries++) {
        const offA = -(0.07 + rand() * 0.15), offB = 0.07 + rand() * 0.15;
        let dA = (rand() < 0.5 ? -1 : 1) * (5 + rand() * 18), dB = (rand() < 0.5 ? -1 : 1) * (5 + rand() * 18);
        if (Math.abs(dA - dB) < 12) dB = dA + (dB >= dA ? 1 : -1) * (12 + rand() * 10);
        if (tries > 16) { dA *= 0.5; dB *= 0.5; }
        const A = mk(offA, dA, 0.11 + rand() * 0.05), B = mk(offB, dB, 0.08 + rand() * 0.06);
        // 檢查：圖範圍（含 5% 邊）內 A 一律在 B 的 −側、B 一律在 A 的 +側，且留最小間距
        let ok = true;
        for (let i = 0; i < NPTS && ok; i += 2) {
          const [x, y] = crackPoint(A, i);
          if (Math.abs(x) <= hx * 1.08 && Math.abs(y) <= hy * 1.08 && crackSide(B, x, y) > -0.07) ok = false;
          const [x2, y2] = crackPoint(B, i);
          if (Math.abs(x2) <= hx * 1.08 && Math.abs(y2) <= hy * 1.08 && crackSide(A, x2, y2) < 0.07) ok = false;
        }
        if (ok || tries === 23) { cracks.push(A, B); spread = Math.abs(dA - dB); break; }
      }
    }

    // ── 時間表（秒）── 裂線先「長出來」（裂尖沿線推進），整條長完那一刻該層撕離
    const CRACK = reduced ? 0.08 : 0.13;
    const tearAtLayer = new Array(nLayers).fill(99);
    const tearTimes: number[] = [];
    let tt = reduced ? 0.09 : 0.14;
    if (reduced) { tearAtLayer[order[0]] = tt; tearTimes.push(tt); }
    else for (let j = 0; j < nLayers; j++) { tearAtLayer[order[j]] = tt; tearTimes.push(tt); tt += 0.16 + rand() * 0.15; }
    cracks.forEach((c, e) => { c.open = Math.min(tearAtLayer[e], tearAtLayer[e + 1]); c.dur = CRACK; c.start = c.open - CRACK; });
    // 裂線在圖內的區段（沿推進方向的比例）：裂尖從圖邊開始長、在對邊結束，整段生長都看得到
    for (const c of cracks) {
      const ins: number[] = [];
      for (let q = 0; q < NPTS; q++) {
        const i = c.dir > 0 ? q : NPTS - 1 - q; const [x, y] = crackPoint(c, i);
        const ex = x / hx, ey = y / hy;
        if (shapeCircle ? ex * ex + ey * ey <= 1 : Math.abs(ex) <= 1 && Math.abs(ey) <= 1) ins.push(q);
      }
      c.p0 = ins.length ? Math.max(0, ins[0] - 1) / (NPTS - 1) : 0;
      c.p1 = ins.length ? Math.min(NPTS - 1, ins[ins.length - 1] + 1) / (NPTS - 1) : 1;
    }
    const lastTear = tearTimes[tearTimes.length - 1];
    const burnStart = lastTear + (reduced ? 0.1 : 0.2);
    const burnEnd = burnStart + (reduced ? 0.42 : 0.58);
    const vanishStart = burnEnd - (reduced ? 0.02 : 0.06);
    const vanishEnd = vanishStart + (reduced ? 0.12 : 0.22);
    const total = vanishEnd + (reduced ? 0.12 : 0.22);
    yield;

    // ── 各層碎片 ──
    const pieces: Piece[] = [];
    const Sp = Math.max(tw, th); // CSS
    const eps = 0.9 / (R * kp);  // 互相重疊 ~1 backing px，靜止時看不到接縫
    const thickPx = Math.max(1.2, Math.min(4, Sp * 0.014)); // 厚度（CSS px）
    for (let p = 0; p < nLayers; p++) {
      const top = p === 0 ? null : cracks[p - 1], bot = p === nLayers - 1 ? null : cracks[p];
      const path = new Path2D();
      const pts: [number, number][] = [];
      if (top) for (let i = 0; i < NPTS; i++) pts.push(crackPoint(top, i, -eps));
      else { const l = bot!; for (let i = 0; i < NPTS; i++) pts.push(crackPoint(l, i, -3)); }
      if (bot) for (let i = NPTS - 1; i >= 0; i--) pts.push(crackPoint(bot, i, eps));
      else { const l = top!; for (let i = NPTS - 1; i >= 0; i--) pts.push(crackPoint(l, i, 3)); }
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      pts.forEach(([x, y], i) => { const [X, Y] = toB(R, x, y); i ? path.lineTo(X, Y) : path.moveTo(X, Y); minX = Math.min(minX, X); minY = Math.min(minY, Y); maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y); });
      path.closePath();
      const fib = Math.ceil(Sp * 0.05 * kp) + 2;
      const bx = Math.max(0, Math.floor(minX) - fib), by = Math.max(0, Math.floor(minY) - fib);
      const bw = Math.max(1, Math.min(Wa, Math.ceil(maxX) + fib) - bx), bh = Math.max(1, Math.min(Ha, Math.ceil(maxY) + fib) - by);
      const mkC = () => { const c = doc.createElement('canvas'); c.width = bw; c.height = bh; return c; };
      // plain：只有圖（裂線還沒長到的地方）
      const plain = mkC(); const pg = plain.getContext('2d')!;
      pg.translate(-bx, -by); pg.save(); pg.clip(path); pg.drawImage(artCanvas, 0, 0); pg.restore();
      // deco：圖＋撕邊（焦痕、紙芯毛邊、纖維）
      flushC(plain); yield;
      const deco = mkC(); const g = deco.getContext('2d')!;
      g.translate(-bx, -by); g.save(); g.clip(path); g.drawImage(artCanvas, 0, 0);
      const edges: number[] = []; if (top) edges.push(p - 1); if (bot) edges.push(p);
      g.globalCompositeOperation = 'source-atop';
      const S = Sp * kp; // backing 尺寸
      for (const e of edges) {
        const l = cracks[e];
        const line = new Path2D();
        for (let i = 0; i < NPTS; i++) { const [x, y] = toB(R, ...crackPoint(l, i)); i ? line.lineTo(x, y) : line.moveTo(x, y); }
        g.lineJoin = 'round';
        // 焦痕：寬度沿線不規則（分段畫，不是等寬紙條）
        for (let i = 0; i < NPTS - 1; i++) {
          const wv = 0.55 + vnoise(i * 0.18, e * 7.3, seed & 1023) * 0.9;
          const [x0, y0] = toB(R, ...crackPoint(l, i)), [x1, y1] = toB(R, ...crackPoint(l, i + 1));
          for (const [w, a] of [[S * 0.075, 0.2], [S * 0.04, 0.32], [S * 0.018, 0.55]] as const) {
            g.lineWidth = w * wv; g.strokeStyle = `rgba(20,8,4,${a})`; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          }
        }
      }
      g.restore();
      flushC(deco); yield;
      // 紙芯／皮層毛邊帶＋纖維（伸出裂縫外，增加厚度感）
      const fiberCount = Math.round(140 + S * 0.5);
      for (const e of edges) {
        const l = cracks[e];
        const side = e === p ? -1 : 1; // 此層在裂線的哪一側（-：上側），纖維往裂縫（反側）伸
        const out = -side;
        g.save(); g.clip(path);
        for (let i = 0; i < NPTS - 1; i++) {
          const w = (0.003 + rand() * rand() * 0.016) * (0.5 + vnoise(i * 0.3, e, 5));
          const [xa, ya] = toB(R, ...crackPoint(l, i)), [xb, yb] = toB(R, ...crackPoint(l, i + 1));
          const [xc, yc] = toB(R, ...crackPoint(l, i + 1, side * w)), [xd, yd] = toB(R, ...crackPoint(l, i, side * w * (0.5 + rand())));
          g.fillStyle = `rgba(${196 + rand() * 20 | 0},${170 + rand() * 18 | 0},${124 + rand() * 16 | 0},${0.3 + rand() * 0.35})`;
          g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(xc, yc); g.lineTo(xd, yd); g.closePath(); g.fill();
        }
        g.restore();
        g.lineCap = 'round';
        for (let f = 0; f < fiberCount; f++) {
          const i = Math.floor(rand() * (NPTS - 1));
          const r1 = rand(), len = (0.004 + r1 * r1 * r1 * 0.045) * R / R;
          const v0 = l.v[i] + (l.v[i + 1] - l.v[i]) * rand();
          const u0 = uAt(i) + (U1 - U0) / (NPTS - 1) * rand();
          const jit = (rand() - 0.5) * 1.4;
          const pt = (du: number, dv: number) => { const u = u0 + du, v = v0 + dv; return toB(R, l.ox + u * l.cos - v * l.sin, l.oy + u * l.sin + v * l.cos); };
          const [x0, y0] = pt(0, -out * 0.003), [xm, ym] = pt((rand() - 0.5) * 0.01, out * len * 0.5), [x1, y1] = pt(jit * len, out * len);
          const tone = rand();
          g.strokeStyle = tone < 0.6 ? `rgba(222,200,156,${0.35 + rand() * 0.45})` : tone < 0.88 ? `rgba(150,102,60,${0.45 + rand() * 0.4})` : 'rgba(36,14,6,0.75)';
          g.lineWidth = Math.max(0.5, kp * (0.35 + rand() * 0.6));
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(xm, ym, x1, y1); g.stroke();
          if (f % 120 === 119) { flushC(deco); yield; }
        }
        flushC(deco); yield;
      }
      yield;
      // 熾邊（金／紅兩張，只在撕邊上；寬度沿線不規則）
      const mkRim = (col: number[]) => {
        const rc = mkC(); const r = rc.getContext('2d')!; r.translate(-bx, -by); r.lineCap = 'round'; r.lineJoin = 'round';
        r.save(); r.clip(path);
        for (const e of edges) {
          const l = cracks[e];
          for (let i = 0; i < NPTS - 1; i++) {
            const wv = 0.4 + vnoise(i * 0.22, e * 3.1 + 1, (seed >> 3) & 1023) * 1.2;
            const [x0, y0] = toB(R, ...crackPoint(l, i)), [x1, y1] = toB(R, ...crackPoint(l, i + 1));
            for (const [w, a] of [[S * 0.03, 0.35], [Math.max(1.2 * kp, S * 0.008), 0.95]] as const) {
              r.lineWidth = w * wv; r.strokeStyle = rgba(col, a); r.beginPath(); r.moveTo(x0, y0); r.lineTo(x1, y1); r.stroke();
            }
          }
        }
        r.restore();
        return rc;
      };
      const rimGFull = mkRim(GOLD); flushC(rimGFull); yield;
      const rimRFull = mkRim(RED); flushC(rimRFull); yield;
      // 厚度剪影（撕離後才淡入，位於碎片下方往右下偏）
      const thick = mkC(); const tg = thick.getContext('2d')!; tg.drawImage(plain, 0, 0);
      tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgb(34,16,9)'; tg.fillRect(0, 0, bw, bh);
      flushC(thick); yield;
      // DOM
      const div = doc.createElement('div');
      Object.assign(div.style, { position: 'absolute', left: '0px', top: '0px', width: bw / kp + 'px', height: bh / kp + 'px', transformOrigin: '0 0', willChange: 'transform', pointerEvents: 'none', zIndex: String(2) } as Partial<CSSStyleDeclaration>);
      const place = (c: HTMLCanvasElement, ox = 0, oy = 0) => { Object.assign(c.style, { position: 'absolute', left: ox + 'px', top: oy + 'px', width: bw / kp + 'px', height: bh / kp + 'px', pointerEvents: 'none' } as Partial<CSSStyleDeclaration>); div.appendChild(c); return c; };
      place(thick, thickPx * 0.5, thickPx); thick.style.opacity = '0';
      const baseC = place(mkC());
      baseC.getContext('2d')!.drawImage(plain, 0, 0); flushC(baseC); // 先畫好「原圖」狀態
      const rimG = place(mkC()), rimR = place(mkC());
      rimG.style.opacity = '0'; rimR.style.opacity = '0';
      // 運動（CSS px，圖座標）
      const cAll = pts.filter(([x, y]) => Math.abs(x) <= hx && Math.abs(y) <= hy);
      let mx = 0, my = 0; for (const [x, y] of cAll) { mx += x; my += y; } if (cAll.length) { mx /= cAll.length; my /= cAll.length; }
      const cx = (hx + mx) * R, cy = (hy + my) * R;
      const minMove = reduced ? 3 : Sp < 120 ? Math.max(15, Sp * 0.24) : Math.max(12, Sp * 0.08); // 64px 頭像：位移拉大到約 1/4 圖寬，三層分得開
      const mv = minMove + (reduced ? 0 : rand() * Sp * 0.05);
      let ddx = 0, ddy = 0;
      if (reduced) { const s = p === 0 ? -1 : 1; ddx = nb[0] * s * mv; ddy = nb[1] * s * mv; }
      else if (p === 0 || p === nLayers - 1) {
        const s = p === 0 ? -1 : 1; const ta = (rand() - 0.5) * 0.7;
        ddx = (nb[0] * s + Math.cos(base) * ta) * mv; ddy = (nb[1] * s + Math.sin(base) * ta) * mv;
      } else { const s = rand() < 0.5 ? -1 : 1; ddx = Math.cos(base) * s * mv * 0.9 + nb[0] * (rand() - 0.5) * mv * 0.3; ddy = Math.sin(base) * s * mv * 0.9 + nb[1] * (rand() - 0.5) * mv * 0.3; }
      pieces.push({
        div, base: baseC, thick, rimG, rimR, plain, deco, rimGFull, rimRFull, bx, by, bw, bh, cx, cy, dx: ddx, dy: ddy,
        rot: reduced ? 0 : (rand() < 0.5 ? -1 : 1) * (Sp < 120 ? 0.16 + rand() * 0.18 : 0.1 + rand() * 0.16),
        scale: reduced ? 1 : p === 1 ? 1.07 : 0.95,
        drift: reduced ? 0 : 0.2 + rand() * 0.2,
        tearAt: tearAtLayer[p], burnOffset: 0, depth: p === 1 ? 3 : p === 0 ? 1 : 2, edges, wedge: null, lastKey: 'plain', burnInit: false, thr: NaN,
      });
      yield;
    }
    // 楔形張開：裂尖推進時，即將撕離的那層以「裂線終點」為支點微微轉開，讓裂縫跟著長
    if (!reduced) cracks.forEach((l, e) => {
      const pi = pieces[e].tearAt <= pieces[e + 1].tearAt ? e : e + 1;
      if (pieces[pi].wedge || pi === 1 && nLayers === 3 && pieces[pi].edges.length === 2 && pieces[pi].tearAt !== l.open) return;
      // 終點：在圖內、沿推進方向的最後一點
      let endI = l.dir > 0 ? NPTS - 1 : 0;
      for (let q = 0; q < NPTS; q++) { const i = l.dir > 0 ? NPTS - 1 - q : q; const [x, y] = crackPoint(l, i); if (Math.abs(x) <= hx && Math.abs(y) <= hy) { endI = i; break; } }
      const [px, py] = crackPoint(l, endI);
      const side = pi === e ? -1 : 1;
      // 起點往該層外側（法線 side 方向）張開：用叉積決定轉向
      let stI = l.dir > 0 ? 0 : NPTS - 1;
      for (let q = 0; q < NPTS; q++) { const i = l.dir > 0 ? q : NPTS - 1 - q; const [x, y] = crackPoint(l, i); if (Math.abs(x) <= hx && Math.abs(y) <= hy) { stI = i; break; } }
      const [sx, sy] = crackPoint(l, stI);
      const rx = sx - px, ry = sy - py; // 支點→起點
      const nx = -l.sin * side, ny = l.cos * side;
      const sgn = Math.sign(-ry * nx + rx * ny) || 1; // d(起點)/dθ = (-ry, rx)
      pieces[pi].wedge = { px: (hx + px) * R, py: (hy + py) * R, ang: sgn * (Math.max(4, Sp * 0.05) / Math.max(1, Math.hypot(rx, ry) * R)), line: e };
    });
    if (!reduced) order.forEach((layerI, j) => { pieces[layerI].burnOffset = (1 - j) * 0.06; });

    // ── 燒蝕場（圖 backing 的一半解析度，最長邊 ≤ 300）：靠近撕邊先燒＋5 八度雜訊 ──
    const ms = Math.min(0.5, 300 / Math.max(Wa, Ha));
    const MW = Math.max(16, Math.round(Wa * ms)), MH = Math.max(16, Math.round(Ha * ms));
    const field = new Float32Array(MW * MH);
    const ns = (seed ^ 0x5bd1e995) | 0;
    const inShape = new Uint8Array(MW * MH);
    let fmin = 1e9, fmax = -1e9;
    const rows = Math.max(2, Math.floor(4000 / MW));
    for (let j = 0; j < MH; j++) {
      for (let i = 0; i < MW; i++) {
        const X = (i + 0.5) / ms, Y = (j + 0.5) / ms; // backing
        const x = (X - padB - awB / 2) / (R * kp), y = (Y - padB - ahB / 2) / (R * kp);
        const idx = j * MW + i;
        const ex = x / hx, ey = y / hy;
        const inside = shapeCircle ? ex * ex + ey * ey <= 1.02 : Math.abs(ex) <= 1.01 && Math.abs(ey) <= 1.01;
        inShape[idx] = inside ? 1 : 0;
        let pi = 0, d = 1;
        for (let e = 0; e < cracks.length; e++) { const s = crackSide(cracks[e], x, y); if (s > 0) pi = e + 1; d = Math.min(d, Math.abs(s)); }
        const rim = shapeCircle ? 1 - Math.sqrt(ex * ex + ey * ey) : Math.min(1 - Math.abs(ex), 1 - Math.abs(ey));
        d = Math.min(d / 0.3, 1) * 0.75 + Math.min(Math.max(rim, 0) / 0.5, 1) * 0.25;
        const f = 0.5 * d + 0.5 * fbm(x + 0.5, y + 0.5, ns) + (pieces[pi]?.burnOffset ?? 0);
        field[idx] = inside ? f : 9;
        if (inside) { if (f < fmin) fmin = f; if (f > fmax) fmax = f; }
      }
      if (j % rows === rows - 1) yield;
    }
    for (let i = 0; i < field.length; i++) if (inShape[i]) field[i] = (field[i] - fmin) / Math.max(1e-6, fmax - fmin);
    const th0 = -0.04, th1 = 0.8;
    yield;

    // ── 粒子（全部預先算好 → render(t) 為純函數；座標＝特效層 CSS px）──
    const particles: Particle[] = [];
    const burnT = (f: number) => burnStart + ((f - th0) / (th1 - th0)) * (burnEnd - burnStart);
    const room = Math.min(lw, lh) * 0.5;
    const nEmbers = reduced ? 26 : 150, nTongues = reduced ? 6 : 30;
    for (let n = 0, guard = 0; n < nEmbers + nTongues && guard < 6000; guard++) {
      const idx = Math.floor(rand() * MW * MH);
      if (!inShape[idx]) continue;
      const f = field[idx];
      const t0 = burnT(f);
      if (t0 < burnStart || t0 > burnEnd - 0.03) continue;
      const X = ((idx % MW) + rand()) / ms, Y = (Math.floor(idx / MW) + rand()) / ms; // 圖 backing
      const xr = (X - padB - awB / 2) / (R * kp), yr = (Y - padB - ahB / 2) / (R * kp);
      let pi = 0; for (let e = 0; e < cracks.length; e++) if (crackSide(cracks[e], xr, yr) > 0) pi = e + 1;
      const m = pieceMatrix(pieces[pi], t0, cracks, reduced);
      const ax = X / kp, ay = Y / kp; // 圖 CSS
      const wx = artX + m.a * ax + m.c * ay + m.e, wy = artY + m.b * ax + m.d * ay + m.f;
      const tongue = n >= nEmbers;
      const z = (tongue ? (rand() < 0.5 ? 1 : 2) : rand() < 0.35 ? 0 : rand() < 0.6 ? 1 : 2) as 0 | 1 | 2;
      const sp = room * (reduced ? 0.25 : 0.55 + 0.45 * z) * (0.45 + rand() * 0.8);
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.2;
      particles.push({
        t0, life: tongue ? 0.14 + rand() * 0.14 : reduced ? 0.25 + rand() * 0.2 : 0.35 + rand() * 0.4,
        x: wx, y: wy, vx: tongue ? 0 : Math.cos(a) * sp, vy: tongue ? -room * 0.08 : Math.sin(a) * sp,
        g: tongue ? 0 : -room * (reduced ? 0.3 : 0.8), z,
        size: tongue ? Sp * (0.035 + rand() * 0.045) + 5 : 0.5 + z * 0.35 + rand() * rand() * 1.1,
        heat: (t0 - burnStart) / (burnEnd - burnStart), kind: tongue ? 1 : 0,
      });
      n++;
    }
    // 裂尖火星：在裂尖經過的時間點沿線噴出（裂縫是長出來的）
    cracks.forEach((l) => {
      const nS = reduced ? 8 : 22;
      for (let s = 0; s < nS; s++) {
        const q = rand(); const i = Math.round((l.dir > 0 ? q : 1 - q) * (NPTS - 1));
        const [x, y] = crackPoint(l, i);
        if (Math.abs(x) > hx || Math.abs(y) > hy) continue;
        const tq = l.start + l.dur * q;
        const side = rand() < 0.5 ? -1 : 1, sp = room * (reduced ? 0.4 : 0.9 + rand() * 1.1);
        const nx = -l.sin * side, ny = l.cos * side;
        particles.push({ t0: tq, life: 0.14 + rand() * 0.16, x: artX + (hx + x) * R, y: artY + (hy + y) * R, vx: nx * sp + (rand() - 0.5) * sp * 0.5, vy: ny * sp + (rand() - 0.5) * sp * 0.5, g: room * 0.3, z: 2, size: 0.6 + rand() * 0.7, heat: 0, kind: 2 });
      }
    });
    // 收束：殘骸最後一口氣燒穿時，深紅火星往上一衝就熄（不是光團、不是線）
    if (!reduced) for (let s = 0; s < 40; s++) {
      const pi = Math.floor(rand() * pieces.length), pc = pieces[pi];
      const ax2 = pc.cx + (rand() - 0.5) * Sp * 0.5, ay2 = pc.cy + (rand() - 0.5) * Sp * 0.3;
      const m = pieceMatrix(pc, vanishStart, cracks, reduced);
      const sp = room * (0.6 + rand() * 0.9), a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
      particles.push({ t0: vanishStart + rand() * 0.12, life: 0.16 + rand() * 0.14, x: artX + m.a * ax2 + m.c * ay2 + m.e, y: artY + m.b * ax2 + m.d * ay2 + m.f, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -room * 0.5, z: 2, size: 0.7 + rand() * 0.8, heat: 0.9, kind: 3 });
    }

    const maskC = doc.createElement('canvas'); maskC.width = MW; maskC.height = MH;
    const overC = doc.createElement('canvas'); overC.width = MW; overC.height = MH;
    const maskImg = maskC.getContext('2d')!.createImageData(MW, MH), overImg = overC.getContext('2d')!.createImageData(MW, MH);
    // 把舊的碎片 DOM 換成新的
    yield;
    if (built) for (const pc of built.pieces) pc.div.remove();
    for (const pc of pieces) layer.appendChild(pc.div);
    built = {
      plan: { seed, reducedMotion: reduced, order: order.map((x) => x + 1), tearTimes, burnStart, burnEnd, vanishStart, vanishEnd, total, angleDeg: Math.round(baseDeg), crackSpreadDeg: Math.round(spread) },
      pieces, cracks, R, field, MW, MH, ms, maskC, overC, maskImg, overImg,
      mask32: new Uint32Array(maskImg.data.buffer), over32: new Uint32Array(overImg.data.buffer),
      particles, tongueGold: tongueSprite(GOLD, AMBER), tongueRed: tongueSprite(AMBER, RED), th0, th1, lastThr: NaN,
    };
    return built.plan;
  }

  /** 碎片在 t 秒的仿射矩陣（圖 CSS 座標 → 圖 CSS 座標）。 */
  function pieceMatrix(pc: Piece, t: number, cracks: Crack[], reduced: boolean): DOMMatrix {
    const m = new DOMMatrix();
    // 擊中微震
    if (!reduced) { const sh = Math.exp(-t * 26) * Math.sin(t * 85) * Math.max(1, Math.max(tw, th) * 0.012); m.translateSelf(sh, 0); }
    if (pc.wedge) {
      const l = cracks[pc.wedge.line];
      // 縫口跟著裂尖長大：先幾乎不張開（只看到裂線往前長），裂尖接近終點才明顯張開
      const w = t >= l.start ? Math.pow(clamp01((t - l.start) / l.dur), 2.6) : 0;
      if (w > 0) { m.translateSelf(pc.wedge.px, pc.wedge.py); m.rotateSelf((pc.wedge.ang * w * 180) / Math.PI); m.translateSelf(-pc.wedge.px, -pc.wedge.py); }
    }
    if (t >= pc.tearAt) {
      const tau = t - pc.tearAt;
      const e = easeOutQuart(tau / 0.42);
      const drift = Math.max(0, tau - 0.42) * pc.drift;
      const jolt = Math.exp(-tau * 30) * Math.sin(tau * 70) * 0.015;
      const k = e + drift + jolt;
      m.translateSelf(pc.cx + pc.dx * k, pc.cy + pc.dy * k);
      m.rotateSelf((pc.rot * (e + drift * 0.6) * 180) / Math.PI);
      const s = 1 + (pc.scale - 1) * e;
      m.scaleSelf(s, s);
      m.translateSelf(-pc.cx, -pc.cy);
    }
    return m;
  }

  /** 已撕開的長度比例（0..1），依裂尖推進方向。 */
  const crackProg = (l: Crack, t: number) => clamp01((t - l.start) / l.dur);
  /** 生長比例 → 沿整條裂線的比例（只在圖內那段生長；1 = 整條）。 */
  const crackReach = (l: Crack, prog: number) => (prog >= 1 ? 1 : prog <= 0 ? 0 : (l.p0 ?? 0) + prog * ((l.p1 ?? 1) - (l.p0 ?? 0)));

  /** 裂線已長出的區段（給剪裁用）：沿線 u 從起點到裂尖、v 方向 ±0.35R 的帶狀區。 */
  function revealPath(l: Crack, prog: number, R: number, bx: number, by: number): Path2D {
    const path = new Path2D();
    const n = Math.max(2, Math.round(crackReach(l, prog) * (NPTS - 1)) + 1);
    const idx = (q: number) => (l.dir > 0 ? q : NPTS - 1 - q);
    for (let q = 0; q < n; q++) { const [x, y] = toB(R, ...crackPoint(l, idx(q), -0.4)); q ? path.lineTo(x - bx, y - by) : path.moveTo(x - bx, y - by); }
    for (let q = n - 1; q >= 0; q--) { const [x, y] = toB(R, ...crackPoint(l, idx(q), 0.4)); path.lineTo(x - bx, y - by); }
    path.closePath();
    return path;
  }

  /** 依燒蝕門檻產生遮罩與焦痕疊加層（疊加層顏色是為「每格累加」設計的）。 */
  function computeMask(b: Built, thr: number, burnP: number) {
    const m32 = b.mask32, o32 = b.over32, F = b.field;
    const col = heat(burnP);
    const core = heat(Math.max(0, burnP - 0.25));
    const pack = (r: number, g: number, bl: number, a: number) => (((a & 255) << 24) | ((bl & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
    const coreC = pack(core[0], core[1], core[2], 255), lineC = pack(col[0], col[1], col[2], 255);
    const charC = pack(26, 10, 5, 0.38 * 255), scorchC = pack(48, 21, 9, 0.1 * 255);
    // 由外而內：燒穿處透明 → 熾熱細線（金→紅）→ 焦黑帶 → 焦褐（累加後漸深）→ 原圖
    for (let i = 0, n = F.length; i < n; i++) {
      const d = F[i] - thr;
      if (d <= 0) { m32[i] = 0; o32[i] = 0; continue; }
      m32[i] = 0xff000000;
      o32[i] = d < 0.007 ? coreC : d < 0.017 ? lineC : d < 0.05 ? charC : d < 0.12 ? scorchC : 0;
    }
    b.maskC.getContext('2d')!.putImageData(b.maskImg, 0, 0);
    b.overC.getContext('2d')!.putImageData(b.overImg, 0, 0);
  }

  /** 畫出 t 秒時的畫面（純函數）。 */
  /** 低效能自適應：燃燒中若掉格，碎片燒蝕改為輪流更新（每片每 2／3 格更新一次；粒子仍 60fps）。 */
  let lite = 0, liteFrame = 0, backUsed = true;
  function render(t: number, force = false) {
    liteFrame++;
    const b = built; if (!b) return;
    const P = b.plan;
    // 後層只在縫裡金光還在時更新；之後遠處火星改畫在前層（少一張每格更新的畫布）
    const useBack = force || !(t >= P.burnStart + 0.56 * (P.burnEnd - P.burnStart));
    if (useBack || backUsed) { bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, back.width, back.height); backUsed = useBack; }
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, front.width, front.height);
    if (t >= P.total) { for (const pc of b.pieces) pc.div.style.visibility = 'hidden'; return; }
    const reduced = P.reducedMotion;
    const burnRaw = (t - P.burnStart) / (P.burnEnd - P.burnStart);
    const burnP = clamp01(burnRaw);
    const burning = t >= P.burnStart;
    // 收束段燒蝕加速：殘骸在 vanish 內一口氣燒穿（非透明度淡出）
    const vp = clamp01((t - P.vanishStart) / (P.vanishEnd - P.vanishStart));
    let thr = b.th0 + (b.th1 - b.th0) * Math.min(burnRaw, 1);
    if (!reduced && vp > 0) thr = Math.max(thr, b.th1 + (1.12 - b.th1) * easeInQuad(vp) + 0.06 * vp);
    const bodyAlpha = reduced ? 1 - smooth(0, 1, vp) : 1;

    const thrAt = (tt: number) => {
      const br = (tt - P.burnStart) / (P.burnEnd - P.burnStart);
      const vv = clamp01((tt - P.vanishStart) / (P.vanishEnd - P.vanishStart));
      let x = b.th0 + (b.th1 - b.th0) * Math.min(br, 1);
      if (!reduced && vv > 0) x = Math.max(x, b.th1 + (1.12 - b.th1) * easeInQuad(vv) + 0.06 * vv);
      return x;
    };
    void thr;
    // ── 碎片：CSS transform（合成器），本體 canvas 只在裂線生長／燃燒時重畫 ──
    for (const pc of b.pieces) {
      const m = pieceMatrix(pc, t, b.cracks, reduced);
      // 收束時碎片朝自身中心略縮（儀式感的「收」），同時燒穿
      let mm = m;
      if (!reduced && vp > 0) { const s = 1 - 0.14 * easeInQuad(vp); mm = new DOMMatrix().translateSelf(pc.cx, pc.cy).scaleSelf(s, s).translateSelf(-pc.cx, -pc.cy).multiplySelf(m); }
      const full = new DOMMatrix().translateSelf(artX, artY).multiplySelf(mm).translateSelf(pc.bx / kp, pc.by / kp);
      pc.div.style.transform = `matrix(${full.a},${full.b},${full.c},${full.d},${full.e},${full.f})`;
      pc.div.style.visibility = 'visible';
      pc.div.style.opacity = bodyAlpha < 1 ? String(bodyAlpha) : '';
      pc.div.style.zIndex = String(2 + pc.depth);
      const progs = pc.edges.map((e) => crackProg(b.cracks[e], t));
      const fullyOpen = progs.every((x) => x >= 1);
      const anyOpen = progs.some((x) => x > 0);
      // 厚度：撕離後淡入，開燒即淡出
      const sinceTear = t - pc.tearAt;
      const thickA = (sinceTear > 0 ? clamp01(sinceTear / 0.12) : 0) * (1 - clamp01(burnP / 0.12));
      pc.thick.style.opacity = thickA.toFixed(3);
      // 熾邊：裂開瞬間最亮，之後保留金光；開燒後 0.3 內金→紅並交給燃燒前緣
      const firstOpen = Math.min(...pc.edges.map((e) => b.cracks[e].start));
      const glow = t > firstOpen ? 0.6 + 0.4 * Math.exp(-(t - firstOpen) * 5) : 0;
      pc.rimG.style.opacity = (glow * (1 - clamp01(burnP / 0.1))).toFixed(3);
      pc.rimR.style.opacity = (glow * 0.85 * Math.sin(Math.PI * clamp01(burnP / 0.16))).toFixed(3);
      // 本體（燃燒前）：只在裂線生長時重畫
      if (!burning) {
        pc.burnInit = false;
        const qProg = progs.map((x) => Math.round(x * 48)).join(',');
        const key = fullyOpen ? 'open' : anyOpen ? `r${qProg}` : 'plain';
        if (key !== pc.lastKey || force) {
          pc.lastKey = key;
          const g = pc.base.getContext('2d')!;
          g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          g.clearRect(0, 0, pc.bw, pc.bh);
          const drawRims = (target: HTMLCanvasElement, src: HTMLCanvasElement, clip: Path2D | null) => {
            const rg = target.getContext('2d')!; rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, pc.bw, pc.bh);
            if (clip) { rg.save(); rg.clip(clip); rg.drawImage(src, 0, 0); rg.restore(); } else rg.drawImage(src, 0, 0);
          };
          if (fullyOpen) { g.drawImage(pc.deco, 0, 0); drawRims(pc.rimG, pc.rimGFull, null); drawRims(pc.rimR, pc.rimRFull, null); pc.rimsOn = true; }
          else {
            g.drawImage(pc.plain, 0, 0);
            if (anyOpen) {
              const clip = new Path2D();
              pc.edges.forEach((e, k) => { if (progs[k] > 0) clip.addPath(revealPath(b.cracks[e], progs[k], b.R, pc.bx, pc.by)); });
              g.save(); g.clip(clip); g.drawImage(pc.deco, 0, 0); g.restore();
              // 裂線生長中：金邊由 deco 的裂線與後層金光負責，邊緣光暈層等完全撕開才畫（每格少重畫兩張畫布）
            }
            if (pc.rimsOn) { for (const rc of [pc.rimG, pc.rimR]) rc.getContext('2d')!.clearRect(0, 0, pc.bw, pc.bh); pc.rimsOn = false; }
          }
        }
      }
    }

    // ── 燃燒：燒蝕只會往前（單調），所以每格只對碎片做「遮罩＋焦痕疊加」兩道合成，不整張重畫 ──
    if (burning) {
      const applyStep = (tt: number) => {
        const th = thrAt(tt);
        const todo = b.pieces.filter((pc, i) => pc.thr !== th && (force || lite === 0 || (liteFrame + i) % (lite + 1) === 0 || tt >= P.vanishEnd - 0.05));
        if (!todo.length) return;
        if (th !== b.lastThr) { b.lastThr = th; computeMask(b, th, clamp01((tt - P.burnStart) / (P.burnEnd - P.burnStart))); }
        for (const pc of todo) {
          pc.thr = th;
          const g = pc.base.getContext('2d')!;
          const sx = pc.bx * b.ms, sy = pc.by * b.ms, sw = pc.bw * b.ms, sh = pc.bh * b.ms;
          g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
          g.globalCompositeOperation = 'destination-in'; g.drawImage(b.maskC, sx, sy, sw, sh, 0, 0, pc.bw, pc.bh);
          g.globalCompositeOperation = 'source-atop'; g.drawImage(b.overC, sx, sy, sw, sh, 0, 0, pc.bw, pc.bh);
          g.globalCompositeOperation = 'source-over';
        }
      };
      if (force || b.pieces.some((pc) => !pc.burnInit)) {
        b.lastThr = NaN;
        for (const pc of b.pieces) {
          const reuse = !force && pc.lastKey === 'open'; // 撕開完成時本體已是完整毛邊版，直接沿用
          pc.burnInit = true; pc.lastKey = ''; pc.thr = NaN;
          if (!reuse) {
            const g = pc.base.getContext('2d')!; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
            g.clearRect(0, 0, pc.bw, pc.bh); g.drawImage(pc.deco, 0, 0);
            for (const rc of [pc.rimG, pc.rimR]) { const rg = rc.getContext('2d')!; rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, pc.bw, pc.bh); rg.drawImage(rc === pc.rimG ? pc.rimGFull : pc.rimRFull, 0, 0); }
            pc.rimsOn = true;
          }
        }
        // 以 60fps 補回到 t（逐格截圖與實播一致）
        for (let tt = P.burnStart; tt < t - 1e-6; tt += 1 / 60) applyStep(tt);
      }
      applyStep(t);
    }

    // ── 後層：裂縫後方透出的金光（有量感的金，不是白；不畫外框環）──
    bctx.setTransform(kf, 0, 0, kf, 0, 0);
    bctx.lineCap = 'round'; bctx.lineJoin = 'round';
    if (useBack) b.cracks.forEach((l, e) => {
      const prog = crackProg(l, t);
      if (prog <= 0) return;
      const since = t - l.start;
      const inten = clamp01(since / 0.08) * (1 - smooth(0.05, 0.55, burnP)) * (0.75 + 0.25 * Math.exp(-Math.max(0, t - l.open) * 4));
      if (inten <= 0.01) return;
      const pa = b.pieces[e], pb = b.pieces[e + 1];
      const ma = pieceMatrix(pa, t, b.cracks, reduced), mb = pieceMatrix(pb, t, b.cracks, reduced);
      const avg = (k: 'a' | 'b' | 'c' | 'd' | 'e' | 'f') => (ma[k] + mb[k]) / 2;
      const M = [avg('a'), avg('b'), avg('c'), avg('d'), avg('e') + artX, avg('f') + artY];
      const col = heat(burnP * 0.6);
      const n = Math.max(2, Math.round(crackReach(l, prog) * (NPTS - 1)) + 1);
      const S = Math.max(tw, th);
      const path = new Path2D();
      const hx = (tw / 2 + pad) / b.R, hy = (th / 2 + pad) / b.R;
      let started = false;
      for (let q = 0; q < n; q++) {
        const i = l.dir > 0 ? q : NPTS - 1 - q;
        const [x, y] = crackPoint(l, i);
        // 只在圖的輪廓內發光（光是從撕開的縫透出來，不往圖外拉成光束）
        const ex = x / (hx * 0.97), ey = y / (hy * 0.97);
        if (shapeCircle ? ex * ex + ey * ey > 1 : Math.abs(ex) > 1 || Math.abs(ey) > 1) { if (started) break; continue; }
        const X = (x * b.R) + tw / 2 + pad, Y = (y * b.R) + th / 2 + pad;
        const px = M[0] * X + M[2] * Y + M[4], py = M[1] * X + M[3] * Y + M[5];
        started ? path.lineTo(px, py) : path.moveTo(px, py); started = true;
      }
      if (!started) return;
      for (const [w, a] of [[Math.max(7, S * 0.15), 0.16], [Math.max(4, S * 0.08), 0.3], [Math.max(2, S * 0.032), 0.6]] as const) {
        bctx.lineWidth = w; bctx.strokeStyle = rgba(e % 2 ? GOLD_DEEP : col, a * inten); bctx.stroke(path);
      }
      // 裂尖亮點（小、隨裂尖移動）
      if (prog < 1) {
        const i = l.dir > 0 ? n - 1 : NPTS - n;
        const [x, y] = crackPoint(l, i); const X = (x * b.R) + tw / 2 + pad, Y = (y * b.R) + th / 2 + pad;
        const px = M[0] * X + M[2] * Y + M[4], py = M[1] * X + M[3] * Y + M[5];
        const r = Math.max(3, S * 0.035);
        fctx.setTransform(kf, 0, 0, kf, 0, 0);
        const gr = fctx.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, rgba(GOLD, 0.9)); gr.addColorStop(1, rgba(GOLD, 0));
        fctx.fillStyle = gr; fctx.fillRect(px - r, py - r, 2 * r, 2 * r);
      }
    });

    drawParticles(t, useBack ? bctx : fctx, 0, P);
    drawParticles(t, fctx, 1, P);
    drawParticles(t, fctx, 2, P);
  }

  function drawParticles(t: number, ctx: CanvasRenderingContext2D, z: 0 | 1 | 2, P: AsuraDeathPlan) {
    const b = built!;
    ctx.setTransform(kf, 0, 0, kf, 0, 0);
    const kill = 1 - smooth(P.vanishEnd - 0.04, P.total, t);
    const edgeM = 14;
    ctx.lineCap = 'round';
    for (const q of b.particles) {
      if (q.z !== z) continue;
      const tau = t - q.t0;
      if (tau < 0 || tau > q.life) continue;
      const lp = tau / q.life;
      const x = q.x + q.vx * tau, y = q.y + q.vy * tau + 0.5 * q.g * tau * tau;
      // 靠近特效層邊緣淡出：特效層已夾在視窗內，火星不會被硬切
      const ef = clamp01(Math.min(x, y, lw - x, lh - y) / edgeM);
      if (ef <= 0) continue;
      const depthA = z === 0 ? 0.5 : z === 1 ? 0.8 : 1;
      if (q.kind === 1) {
        // 貼在燃燒邊上的火舌：長高→縮回，左右閃動，不脫離邊緣（不會像水滴）
        const a = Math.sin(Math.PI * lp) * 0.85 * depthA * kill * ef;
        const h = q.size * Math.sin(Math.PI * Math.min(1, lp * 1.3)) * (0.9 + 0.2 * Math.sin(tau * 60 + q.x)), w = q.size * 0.36;
        if (h < 1) continue;
        const hp = clamp01(q.heat + lp * 0.4);
        ctx.globalAlpha = a; ctx.drawImage(hp < 0.5 ? b.tongueGold : b.tongueRed, x - w / 2, y - h, w, h);
        ctx.globalAlpha = 1;
        continue;
      }
      const c = q.kind === 2 ? heat(lp * 0.25) : q.kind === 3 ? heat(0.85 + lp * 0.15) : heat(q.heat * 0.7 + lp * 0.5);
      const a = (1 - lp * lp) * depthA * kill * ef;
      if (z === 0) { ctx.globalAlpha = a * 0.85; ctx.fillStyle = rgb(c); ctx.fillRect(x, y, q.size, q.size); ctx.globalAlpha = 1; continue; }
      const vx = q.vx, vy = q.vy + q.g * tau;
      const st = z === 2 ? 0.026 : 0.014;
      ctx.globalAlpha = a; ctx.strokeStyle = rgb(c); ctx.lineWidth = q.size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * st, y - vy * st); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ───────────── 計畫：同步／閒置預排 ─────────────
  function plan(opts: AsuraDeathPlayOptions = {}): AsuraDeathPlan {
    const g = planSteps(opts);
    let r = g.next();
    while (!r.done) r = g.next();
    return r.value;
  }
  let pre: { reduced: boolean; seed?: number; gen: Generator<void, AsuraDeathPlan> | null; plan: AsuraDeathPlan | null } | null = null;
  let idleId = 0;
  const ric: (cb: () => void) => number = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => (window as Window).requestIdleCallback(() => cb(), { timeout: 400 })
    : (cb) => setTimeout(cb, 30) as unknown as number;
  const cic = (id: number) => { if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) window.cancelIdleCallback(id); else clearTimeout(id); };
  function prefersReduced() { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function schedulePreplan(reduced = prefersReduced(), seed?: number) {
    if (!artCanvas || raf) return;
    if (idleId) { cic(idleId); idleId = 0; }
    const gen = planSteps({ reducedMotion: reduced, seed });
    pre = { reduced, seed, gen, plan: null };
    const step = () => {
      idleId = 0;
      if (!pre || pre.gen !== gen) return;
      const t0s = performance.now();
      const r = gen.next();
      const dbg = (globalThis as unknown as { __asuraSteps?: number[] }).__asuraSteps; if (dbg) dbg.push(Math.round((performance.now() - t0s) * 10) / 10);
      if (r.done) {
        pre.plan = r.value; pre.gen = null;
        // 暖機：隱藏狀態下畫一格燃燒畫面，讓熱路徑先編譯
        idleId = ric(() => {
          idleId = 0;
          if (!raf && built) computeMask(built, built.th0 + 0.02, 0.1); // 只暖機燒蝕的 JS 熱路徑，不畫碎片
          idleId = ric(() => {
          idleId = 0;
          if (!raf && built) {
            render(0); // 碎片在預排時已是「原圖」狀態，這裡不重畫
            bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, back.width, back.height); fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, front.width, front.height);
            built.lastThr = NaN;
            // 預熱：透明、不吃點擊地掛著，讓瀏覽器先把畫布資源建好（第一格不卡）
            if (setup.keepWarm ?? false) { placeLayer(); layer.style.opacity = '0'; layer.style.display = 'block'; layer.dataset.primed = '1'; } // data-state 不變（與 v1 健康檢查相容）
          }
          });
        });
        return;
      }
      idleId = ric(step);
    };
    idleId = ric(step);
  }
  function takePlan(opts: AsuraDeathPlayOptions): AsuraDeathPlan {
    const reduced = opts.reducedMotion ?? prefersReduced();
    if (pre && pre.reduced === reduced && (opts.seed === undefined ? pre.seed === undefined : opts.seed === pre.seed)) {
      if (idleId) { cic(idleId); idleId = 0; }
      let planOut = pre.plan;
      if (!planOut && pre.gen) { let r = pre.gen.next(); while (!r.done) r = pre.gen.next(); planOut = r.value; }
      pre = null;
      if (planOut && built && built.plan === planOut) return planOut;
    }
    if (idleId) { cic(idleId); idleId = 0; }
    pre = null;
    return plan({ ...opts, reducedMotion: reduced });
  }

  // ───────────── 播放 ─────────────
  let raf = 0, timer: ReturnType<typeof setTimeout> | 0 = 0, finish: ((cancelled: boolean) => void) | null = null;
  let prevVis = '';
  function placeLayer() {
    // 播放中跟著目標捲動（只平移，不重建）
    const r = targetRect();
    const L0 = startRect.left + (r.left - (startRect.left + artX + pad)), T0 = startRect.top + (r.top - (startRect.top + artY + pad));
    layer.style.transform = `translate3d(${L0.toFixed(2)}px,${T0.toFixed(2)}px,0)`;
  }
  function resetPieces() { if (built) for (const pc of built.pieces) { pc.lastKey = ''; pc.burnInit = false; pc.thr = NaN; } if (built) built.lastThr = NaN; }

  async function play(opts: AsuraDeathPlayOptions = {}): Promise<AsuraDeathResult> {
    cancel();
    if (!artCanvas) await prepare();
    else if (measure()) pre = null;
    const P = takePlan(opts);
    const primed = !!built && built.pieces.every((pc) => pc.lastKey === 'plain' && !pc.burnInit);
    if (!primed) resetPieces();
    layer.style.opacity = ''; delete layer.dataset.primed;
    layer.style.display = 'block';
    layer.dataset.state = 'playing'; layer.dataset.seed = String(P.seed); layer.dataset.order = P.order.join('-');
    layer.dataset.reduced = String(P.reducedMotion);
    placeLayer();
    render(0, !primed); // 第一格與原圖一致（含外環），之後才隱藏原圖 → 不會閃
    if (anchor && (setup.hideAnchor ?? true)) { prevVis = anchor.style.visibility; anchor.style.visibility = 'hidden'; }
    return new Promise<AsuraDeathResult>((resolve) => {
      const t0 = performance.now();
      let frames = 0, last = t0, maxGap = 0, dropped = 0;
      lite = 0; const autoLite = setup.adaptive ?? true;
      const done = (cancelled: boolean) => {
        cancelAnimationFrame(raf); if (timer) clearTimeout(timer); raf = 0; timer = 0; finish = null;
        bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, back.width, back.height);
        fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, front.width, front.height);
        layer.style.display = 'none'; layer.dataset.state = cancelled ? 'cancelled' : 'done';
        if (anchor && (setup.restoreAnchor ?? false)) anchor.style.visibility = prevVis;
        setTimeout(() => schedulePreplan(), 0);
        resolve({ ...P, durationMs: Math.round(performance.now() - t0), frames, maxFrameGapMs: Math.round(maxGap * 10) / 10, droppedFrames: dropped, cancelled });
      };
      finish = done;
      const tick = (now: number) => {
        const gap = now - last; last = now;
        if (frames > 0) { maxGap = Math.max(maxGap, gap); if (gap > 16.7 * 1.5) dropped += Math.round(gap / 16.7) - 1; }
        if (frames > 2 && gap > 25 && lite < 2 && autoLite) lite++;
        frames++;
        const t = (now - t0) / 1000;
        if (anchor) placeLayer();
        if (t >= P.total) { done(false); return; }
        render(t);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timer = setTimeout(() => finish && done(false), P.total * 1000 + 400);
    });
  }
  /** 預先在閒置時排好下一次（例如測試要固定 seed）。正式環境不給 seed 即可，引擎會自動預排。 */
  function prime(opts: AsuraDeathPlayOptions = {}) { schedulePreplan(opts.reducedMotion ?? prefersReduced(), opts.seed); }
  function cancel() { if (finish) finish(true); }
  function destroy() { cancel(); if (idleId) cic(idleId); pre = null; layer.remove(); built = null; artCanvas = null; }

  /** 只供測試／截圖：計畫好後停在 t 秒。 */
  async function seek(opts: AsuraDeathPlayOptions, t: number) {
    if (!artCanvas) await prepare(); else measure();
    if (idleId) { cic(idleId); idleId = 0; pre = null; }
    if (!built || built.plan.seed !== opts.seed || built.plan.reducedMotion !== !!opts.reducedMotion) plan({ ...opts, reducedMotion: !!opts.reducedMotion, avoidRepeat: false });
    layer.style.opacity = ''; layer.style.display = 'block'; layer.dataset.state = 'seek'; placeLayer();
    if (anchor && (setup.hideAnchor ?? true)) anchor.style.visibility = 'hidden';
    render(t, true);
    return built!.plan;
  }

  return { prepare, prime, plan, render, play, cancel, destroy, seek, element: layer };
}

export type AsuraDeathEngine2D = ReturnType<typeof createAsuraDeath2D>;
