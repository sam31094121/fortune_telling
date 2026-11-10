/**
 * 一般阿修羅死亡動畫引擎 v3（WebGL2）
 * 規格：寶珠戰鬥卡片技能檔 第五章 —— 三層不規則撕裂 → 金轉紅瞬燒 → 儀式式快速消失，總長 ≤ 3 秒。
 *
 * v3 結構：特效層 div（fixed、pointer-events:none）裡只有「一張」WebGL2 canvas。
 *   - 圖（含外環與邊框）在預熱時以裝置 DPR 畫成一張貼圖、分段上傳一次；之後每格只送 uniform（矩陣、門檻），不再逐格上傳畫布。
 *   - 撕邊、紙芯、纖維、縫內金光、燒蝕前緣、火舌、火星全在著色器裡程序化計算。
 *   - prewarm()：可在開戰或 HP 低時呼叫，把解碼、量測、GL、著色器、貼圖、預排、暖機畫一格全部在閒置時分段（每段 ≤ 約 8ms）做完；擊倒時 play() 不做任何重活。
 *   - 沒有 WebGL2 或 GL 失效：自動改用 v2 的 Canvas 2D 版（asuraDeathEngine2d.ts），API 相同。
 *
 * - 只是疊加視覺層：pointer-events: none、aria-hidden，不改任何遊戲狀態，也不判定擊倒。
 * - 只能在「伺服端回合結果確認 HP 歸零」之後呼叫 play（由整合方負責觸發）。
 * - 任一時間點的畫面是 (seed, t) 的純函數：render(t)／seek 可逐格重現。
 */
import {
  createAsuraDeath2D, mulberry32, clamp01, easeOutQuart, easeInQuad, smooth, GOLD, AMBER, RED,
  NPTS, uAt, crackSide, crackPoint, makeCrackV,
  type Crack, type AsuraDeathPlayOptions, type AsuraDeathPlan, type AsuraDeathResult, type AsuraDeathSetup, type AsuraDeathEngine2D,
} from './asuraDeathEngine2d';
import { ART_VS, BAKE_FS, GLOW_FS, TIP_FS, PIECE_FS, PT_VS, PT_FS } from './asuraDeathShaders';

export type { AsuraDeathPlayOptions, AsuraDeathPlan, AsuraDeathResult, AsuraDeathSetup } from './asuraDeathEngine2d';

/** prewarm() 選項。 */
export interface AsuraDeathPrewarmOptions {
  /** 先預排哪一種（未給時跟隨 prefers-reduced-motion）。 */
  reducedMotion?: boolean;
  /** 只供測試：固定 seed 預排。 */
  seed?: number;
  /** 每段閒置工作的時間上限（ms，預設 6）。 */
  sliceMs?: number;
}

type Aff = [number, number, number, number, number, number]; // a b c d e f（同 DOMMatrix）
const I6 = (): Aff => [1, 0, 0, 1, 0, 0];
/** m = m · n（等同 DOMMatrix.multiplySelf） */
function mulR(m: Aff, n: Aff): Aff {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
const T6 = (x: number, y: number): Aff => [1, 0, 0, 1, x, y];
const R6 = (a: number): Aff => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const S6 = (s: number): Aff => [s, 0, 0, s, 0, 0];
function inv6(m: Aff): Aff {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}
const apply = (m: Aff, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

let lastPlayedKey = ''; // 最近一次「真的播出」的順序（模組層級：多個敵人共用，避免連續兩次同順序）
const orderKey = (reduced: boolean, order0: number[]) => (reduced ? 'r' : 'n') + order0.join('');
const now = () => performance.now();
/** 產生器 yield 這個值＝這一段到此為止（等下一個閒置時段）。 */
const SLICE_END: unique symbol = Symbol('slice-end');

function hasWebGL2(): boolean {
  try { return typeof WebGL2RenderingContext !== 'undefined'; } catch { return false; }
}

/** 建立可重複播放的引擎實例。setup 與 v1／v2 相同；新增選用欄位 renderer、glPixelBudget。 */
export function createAsuraDeath(setup: AsuraDeathSetup) {
  const want = setup.renderer ?? 'auto';
  let fb: AsuraDeathEngine2D | null = null;
  if (want === '2d' || !hasWebGL2()) fb = createAsuraDeath2D(setup);

  const doc = document;
  const anchor = setup.anchor ?? null;
  const bleedK = setup.bleed ?? 0.65;

  // ── DOM ──
  const layer = doc.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.testid = 'asura-death-fx';
  layer.dataset.state = 'idle';
  layer.dataset.version = '3';
  layer.dataset.renderer = 'webgl';
  if (setup.className) layer.className = setup.className;
  Object.assign(layer.style, {
    position: 'fixed', left: '0px', top: '0px', pointerEvents: 'none', zIndex: String(setup.zIndex ?? 60),
    contain: 'strict', overflow: 'hidden', display: 'none',
  } as Partial<CSSStyleDeclaration>);
  const cv = doc.createElement('canvas');
  Object.assign(cv.style, { position: 'absolute', left: '0px', top: '0px', pointerEvents: 'none' } as Partial<CSSStyleDeclaration>);
  layer.appendChild(cv);
  if (!fb) (setup.container ?? doc.body).appendChild(layer);

  // ── 尺寸（CSS px）──
  let tw = 0, th = 0, pad = 0, aw = 0, ah = 0;
  let lw = 0, lh = 0, artX = 0, artY = 0;
  let dpr = 1, kc = 1, kd = 1;   // kc：圖貼圖倍率；kd：GL 畫布倍率
  let artOff = [0, 0];           // 圖貼圖的次像素偏移（device px）
  let shapeCircle = true, radius = 0;
  let frameSpec: { color: string; width: number } | null = null;
  let rings: { color: string; width: number }[] = [];
  let srcImg: CanvasImageSource | null = null;
  let srcPeak = 255;             // 原圖（含外環）最亮的 Rec.709 luma
  let bright = 1;                // 特效顏色亮度係數（不亮過原圖最亮處）
  let sizeKey = '';
  let artKey = '';               // 已上傳的圖貼圖對應的 sizeKey

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
  function parseRings(bs: string): { color: string; width: number }[] {
    if (!bs || bs === 'none') return [];
    const out: { color: string; width: number }[] = [];
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
    return out;
  }

  /** 量尺寸（外形、邊框、外環、DPR）。回傳 true＝尺寸或 DPR 變了（圖貼圖要重建）。只看尺寸，不看位置。 */
  function measureSize(): boolean {
    const r = targetRect();
    dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const key = `${Math.round(r.width * 4)}x${Math.round(r.height * 4)}@${dpr}`;
    if (key === sizeKey) return false;
    sizeKey = key;
    tw = Math.max(8, r.width); th = Math.max(8, r.height);
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
    aw = tw + 2 * pad; ah = th + 2 * pad;
    const budget = setup.glPixelBudget ?? 2400000;
    kc = Math.max(1, Math.min(dpr, setup.maxDpr ?? 3, Math.sqrt(budget / Math.max(1, aw * ah))));
    return true;
  }
  /** 特效層的位置與大小（夾在視窗內，對齊裝置像素）。只在需要時改 canvas 大小。 */
  function layout() {
    const r = targetRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1e5, vh = typeof window !== 'undefined' ? window.innerHeight : 1e5;
    const S = Math.max(tw, th);
    const bl = Math.max(36, Math.min(110, S * bleedK));
    let L = r.left - pad - bl, T = r.top - pad - bl, Rr = r.left + tw + pad + bl, B = r.top + th + pad + bl;
    L = Math.max(0, L); T = Math.max(0, T); Rr = Math.min(vw, Rr); B = Math.min(vh, B);
    if (Rr - L < aw) { L = Math.min(L, r.left - pad); Rr = Math.max(Rr, r.left + tw + pad); }
    if (B - T < ah) { T = Math.min(T, r.top - pad); B = Math.max(B, r.top + th + pad); }
    L = Math.floor(L * dpr) / dpr; T = Math.floor(T * dpr) / dpr;
    const nlw = Math.ceil((Rr - L) * dpr) / dpr, nlh = Math.ceil((B - T) * dpr) / dpr;
    artX = r.left - pad - L; artY = r.top - pad - T;
    layer.style.transform = `translate3d(${L}px,${T}px,0)`;
    if (nlw !== lw || nlh !== lh || cv.width !== Math.round(nlw * kd)) {
      lw = nlw; lh = nlh;
      kd = Math.max(0.5, Math.min(dpr, Math.sqrt((setup.glPixelBudget ?? 2400000) / Math.max(1, lw * lh))));
      layer.style.width = lw + 'px'; layer.style.height = lh + 'px';
      cv.style.width = lw + 'px'; cv.style.height = lh + 'px';
      cv.width = Math.max(1, Math.round(lw * kd)); cv.height = Math.max(1, Math.round(lh * kd));
    }
  }

  // ───────────────────────── GL 資源 ─────────────────────────
  let gl: WebGL2RenderingContext | null = null;
  let lost = false;
  /** v3.1：destroy() 之後為 true。所有非同步／閒置步驟在建 GL、畫布、貼圖之前都先看它（卸載時 prewarm 還在跑也不會留下 GL context）。 */
  let dead = false;
  let progArt: WebGLProgram | null = null, progPt: WebGLProgram | null = null; // progArt＝碎片
  let progBake: WebGLProgram | null = null, progGlow: WebGLProgram | null = null, progTip: WebGLProgram | null = null;
  const locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  function L(p: WebGLProgram, n: string): WebGLUniformLocation | null {
    let m = locs.get(p); if (!m) { m = new Map(); locs.set(p, m); }
    if (!m.has(n)) m.set(n, gl!.getUniformLocation(p, n));
    return m.get(n)!;
  }
  let shaders: WebGLShader[] = [];
  let pExt: unknown = null;
  let vaoArt: WebGLVertexArrayObject | null = null, vaoPt: WebGLVertexArrayObject | null = null;
  let vboArt: WebGLBuffer | null = null, vboPt: WebGLBuffer | null = null;
  let texArt: WebGLTexture | null = null, texNoise: WebGLTexture | null = null, texCrack: WebGLTexture | null = null;
  let noise: Uint8Array | null = null;
  let ptData = new Float32Array(0);
  const ptOff = new Int32Array(6);
  const rawMats: Aff[] = [];
  let glReady = false;

  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; glReady = false; artKey = ''; warm = false; });
  cv.addEventListener('webglcontextrestored', () => { if (dead) return; lost = false; gl = null; });

  function makeContext(): boolean {
    if (dead) return false;
    if (gl && !lost) return true;
    // v3.1：先把畫布設成 1×1 再建 context（建 context 時預設 300×150 的繪圖緩衝不用配置）；真正尺寸在之後的 layout() 分段才設
    if (!lw) { cv.width = 1; cv.height = 1; }
    const g = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null;
    if (!g || g.isContextLost()) return false;
    gl = g; glReady = false; artKey = '';
    if (dead) { releaseGL(); return false; }
    pExt = g.getExtension('KHR_parallel_shader_compile');
    return true;
  }
  /** 釋放所有 GL 資源並丟掉 context（WEBGL_lose_context），畫布設為 0×0。可重複呼叫。 */
  function releaseGL() {
    const g = gl;
    if (g && !g.isContextLost()) {
      try {
        for (const t of [texArt, texNoise, texCrack]) if (t) g.deleteTexture(t);
        for (const t of [texInfo, texDeco]) if (t) g.deleteTexture(t);
        if (fbo) g.deleteFramebuffer(fbo);
        for (const b of [vboArt, vboPt]) if (b) g.deleteBuffer(b);
        for (const v of [vaoArt, vaoPt]) if (v) g.deleteVertexArray(v);
        for (const pr of [progArt, progPt, progBake, progGlow, progTip]) if (pr) g.deleteProgram(pr);
        for (const sh of shaders) g.deleteShader(sh);
      } catch { /* ignore */ }
      try { (g.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext(); } catch { /* ignore */ }
    }
    texArt = texNoise = texCrack = null; vboArt = vboPt = null; vaoArt = vaoPt = null;
    progArt = progPt = progBake = progGlow = progTip = null; shaders = []; texInfo = texDeco = null; fbo = null; infoKey = ''; locs.clear();
    gl = null; glReady = false; artKey = ''; warm = false;
    cv.width = 0; cv.height = 0;
  }
  /** v3.1：著色器編譯／連結分段送出（每段一個 program），送出後 flush，讓 GPU 行程在背景做。 */
  function* compileSteps(): Generator<void> {
    const g = gl!;
    const mk = (type: number, srcs: string) => { const s = g.createShader(type)!; g.shaderSource(s, srcs); g.compileShader(s); shaders.push(s); return s; };
    shaders = []; locs.clear();
    const link = (vs: WebGLShader, fs: string, attrs: string[]) => { const p = g.createProgram()!; g.attachShader(p, vs); g.attachShader(p, mk(g.FRAGMENT_SHADER, fs)); attrs.forEach((a, i) => g.bindAttribLocation(p, i, a)); g.linkProgram(p); g.flush(); return p; };
    const vsArt = mk(g.VERTEX_SHADER, ART_VS);
    progArt = link(vsArt, PIECE_FS, ['aPos']); yield;
    progBake = link(vsArt, BAKE_FS, ['aPos']); yield;
    progGlow = link(vsArt, GLOW_FS, ['aPos']); yield;
    progTip = link(vsArt, TIP_FS, ['aPos']); yield;
    progPt = link(mk(g.VERTEX_SHADER, PT_VS), PT_FS, ['aPos', 'aUV', 'aCol', 'aK']); yield;
    linkT0 = now(); linkPolls = 0;
  }
  let linkT0 = 0, linkPolls = 0;
  /** 只在預熱的閒置分段用：等 GPU 把前面的指令做完。 */
  function gpuSync() { if (gl && !lost && !dead) gl.finish(); }
  let syncWarm = false; // warmSync() 同步補完時為 true：不等 LINK_WAIT_MS
  let stepTag = '';      // 除錯：目前的預熱步驟名（__asuraStepLog）
  const allProgs = () => [progArt!, progBake!, progGlow!, progTip!, progPt!];
  /** 有 KHR_parallel_shader_compile：輪詢 COMPLETION_STATUS（不會卡）。沒有：等送出後至少 LINK_WAIT_MS 再查（GPU 行程多半已做完，查詢只剩一次來回）。 */
  const LINK_WAIT_MS = 40;
  function linkDone(): boolean {
    const g = gl!;
    if (pExt) { const K = 0x91b1; return allProgs().every((p) => !!g.getProgramParameter(p, K)); }
    return syncWarm || now() - linkT0 >= LINK_WAIT_MS || ++linkPolls > 60; // 時鐘被凍結（測試用假時鐘）時也不會一直等
  }
  function finishLink() {
    const g = gl!;
    for (const p of allProgs()) if (!g.getProgramParameter(p, g.LINK_STATUS)) {
      const logs = shaders.map((s) => g.getShaderInfoLog(s)).join('\n');
      throw new Error('AsuraDeathFx GL link failed: ' + g.getProgramInfoLog(p) + logs);
    }
    // 圖四邊形
    vaoArt = g.createVertexArray(); g.bindVertexArray(vaoArt);
    vboArt = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vboArt);
    g.bufferData(g.ARRAY_BUFFER, 6 * 2 * 4, g.DYNAMIC_DRAW);
    g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 2, g.FLOAT, false, 8, 0);
    // 粒子
    vaoPt = g.createVertexArray(); g.bindVertexArray(vaoPt);
    vboPt = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vboPt);
    const st = 10 * 4;
    const at = (l: number, size: number, off: number) => { g.enableVertexAttribArray(l); g.vertexAttribPointer(l, size, g.FLOAT, false, st, off * 4); };
    at(0, 2, 0); at(1, 2, 2); at(2, 4, 4); at(3, 2, 8);
    g.bindVertexArray(null);
    for (const p of allProgs()) { g.useProgram(p); g.uniform1i(L(p, 'uArt'), 0); g.uniform1i(L(p, 'uCrackTex'), 1); g.uniform1i(L(p, 'uNoise'), 2); g.uniform1i(L(p, 'uInfo'), 3); g.uniform1i(L(p, 'uDeco'), 4); }
    g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
    glReady = true;
  }

  // 可平鋪的平滑雜訊（256²），JS 與著色器共用同一份資料 → 燒蝕前緣可在 JS 端精確預估（火星、火舌的位置）
  function* buildNoise(): Generator<void> {
    const N = 256; const out = new Uint8Array(N * N); const acc = new Float32Array(N * N);
    const rnd = mulberry32(0x41535552);
    for (const [cells, w] of [[16, 0.45], [32, 0.3], [64, 0.17], [128, 0.08]] as const) {
      const lat = new Float32Array(cells * cells); for (let i = 0; i < lat.length; i++) lat[i] = rnd();
      const cs = N / cells;
      for (let y = 0; y < N; y++) {
        const fy = y / cs, yi = Math.floor(fy), ty = fy - yi, sy = ty * ty * (3 - 2 * ty);
        const y0 = yi % cells, y1 = (yi + 1) % cells;
        for (let x = 0; x < N; x++) {
          const fx = x / cs, xi = Math.floor(fx), tx = fx - xi, sx = tx * tx * (3 - 2 * tx);
          const x0 = xi % cells, x1 = (xi + 1) % cells;
          const a = lat[y0 * cells + x0], b = lat[y0 * cells + x1], c = lat[y1 * cells + x0], d = lat[y1 * cells + x1];
          acc[y * N + x] += w * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
      }
      yield;
    }
    // 拉開對比到 0..255
    let mn = 1e9, mx = -1e9; for (let i = 0; i < acc.length; i++) { mn = Math.min(mn, acc[i]); mx = Math.max(mx, acc[i]); }
    for (let i = 0; i < acc.length; i++) out[i] = Math.round(((acc[i] - mn) / (mx - mn)) * 255);
    noise = out;
  }
  function uploadNoise() {
    const g = gl!;
    texNoise = g.createTexture(); g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, texNoise);
    g.texImage2D(g.TEXTURE_2D, 0, g.R8, 256, 256, 0, g.RED, g.UNSIGNED_BYTE, noise);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.REPEAT); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.REPEAT);
    texCrack = g.createTexture(); g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, texCrack);
    g.texStorage2D(g.TEXTURE_2D, 1, g.R32F, NPTS, 2);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
  }
  /** 與著色器 texture(uNoise, p/256 + off) 相同的雙線性取樣。 */
  function nzJS(px: number, py: number, off: [number, number]) {
    const n = noise!; const x = px + off[0] * 256 - 0.5, y = py + off[1] * 256 - 0.5;
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const x0 = ((xi % 256) + 256) % 256, x1 = (x0 + 1) % 256, y0 = ((yi % 256) + 256) % 256, y1 = (y0 + 1) % 256;
    const a = n[y0 * 256 + x0], b = n[y0 * 256 + x1], c = n[y1 * 256 + x0], d = n[y1 * 256 + x1];
    return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) / 255;
  }

  // 圖（含外環＋邊框）：分段畫、分段讀回、分段上傳（每段 ~6 萬像素）
  function shapePath(g: CanvasRenderingContext2D, inset = 0, extra = 0) {
    const x = pad - extra + inset, y = pad - extra + inset, w = tw + 2 * extra - 2 * inset, h = th + 2 * extra - 2 * inset;
    g.beginPath();
    if (shapeCircle) g.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
    else g.roundRect(x, y, w, h, Math.max(0, Math.min(radius + extra - inset, w / 2, h / 2)));
  }
  let artW = 0, artH = 0;
  function* buildArt(): Generator<void> {
    const r = targetRect();
    artOff = [((r.left - pad) * kc) % 1, ((r.top - pad) * kc) % 1];
    if (artOff[0] < 0) artOff[0] += 1; if (artOff[1] < 0) artOff[1] += 1;
    artW = Math.ceil(aw * kc + artOff[0]) + 1; artH = Math.ceil(ah * kc + artOff[1]) + 1;
    const c = doc.createElement('canvas'); c.width = artW; c.height = artH;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    const G = gl!;
    if (texArt) G.deleteTexture(texArt);
    texArt = G.createTexture(); G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, texArt);
    G.texStorage2D(G.TEXTURE_2D, 1, G.RGBA8, artW, artH);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    yield;
    const iw = (srcImg as HTMLImageElement).naturalWidth || (srcImg as HTMLCanvasElement).width;
    const ih = (srcImg as HTMLImageElement).naturalHeight || (srcImg as HTMLCanvasElement).height;
    const band = Math.max(8, Math.floor(60000 / artW));
    let peak = 0;
    // v3.1：圖的擺放與瀏覽器 background 一致（cover 以 padding box 計算，邊框蓋在上面），用雙線性（與瀏覽器 CSS 背景相同的濾波）
    const bw = frameSpec ? frameSpec.width : 0;
    const iaw = Math.max(1, tw - 2 * bw), iah = Math.max(1, th - 2 * bw);
    const sc = Math.max(iaw / iw, iah / ih);
    const down = sc * kc < 1;
    const drawArtInto = (cx: CanvasRenderingContext2D, sx: number, sy: number, q: ImageSmoothingQuality = 'low') => {
      cx.setTransform(kc, 0, 0, kc, artOff[0], artOff[1]);
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = q;
      for (const rg of [...rings].sort((a, b) => b.width - a.width)) { cx.fillStyle = rg.color; shapePath(cx, 0, rg.width); cx.fill(); }
      cx.save(); shapePath(cx); cx.clip();
      cx.fillStyle = '#0c0b10'; cx.fillRect(0, 0, aw, ah);
      cx.drawImage(srcImg!, pad + bw + (iaw - iw * sc) / 2 + sx / kc, pad + bw + (iah - ih * sc) / 2 + sy / kc, iw * sc, ih * sc);
      cx.restore();
      if (frameSpec) { cx.lineWidth = frameSpec.width; cx.strokeStyle = frameSpec.color; shapePath(cx, frameSpec.width / 2); cx.stroke(); }
    };
    // 亮度上限：瀏覽器顯示背景圖＝雙線性取樣，但取樣相位（次像素位置）我們無法精確得知。
    // 把同一張圖在 4×4 種次像素相位（縮小時再加 mipmap 濾波）各畫一次，取「各相位最亮處」的最小值當全域上限：
    // 不論瀏覽器用哪個相位，它顯示的最亮處都 ≥ 這個值 → 特效（含碎片貼圖）最亮處不會超過瀏覽器顯示的原圖。
    // 只有比上限亮的極少數高光像素會被壓（dataset.capped＝像素數）。
    // v3.1：先單獨一段讓瀏覽器把原圖解碼（以實際縮放比例 decodeAndScale；1×1 畫布＋讀 1 px 逼它解碼），
    // 之後的亮度上限／上傳分段就不會被第一次解碼拖長。解碼本身是一次的 CPU 工作，不能再切。
    stepTag = 'artDecode';
    { const c1 = doc.createElement('canvas'); c1.width = 1; c1.height = 1; const x1 = c1.getContext('2d', { willReadFrequently: true })!;
      x1.setTransform(kc, 0, 0, kc, artOff[0], artOff[1]); x1.imageSmoothingEnabled = true; x1.imageSmoothingQuality = 'low';
      x1.drawImage(srcImg!, pad + bw + (iaw - iw * sc) / 2, pad + bw + (iah - ih * sc) / 2, iw * sc, ih * sc); x1.getImageData(0, 0, 1, 1); }
    yield;
    let capG = 255; stepTag = 'artCap';
    const capBand = band; // 試過 ×3：6× 節流時每段變 70–150ms，改回一帶一段
    {
      const rc = doc.createElement('canvas'); rc.width = artW; rc.height = artH;
      const rg = rc.getContext('2d', { willReadFrequently: true })!;
      const cand: [number, number, ImageSmoothingQuality][] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) cand.push([i / 4, j / 4, 'low']);
      if (down) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cand.push([i / 2, j / 2, 'medium']);
      // v3.1：每個相位也分帶畫＋讀（clip 到帶狀區域，像素與整張畫相同），每段只做一帶 → 不會出現一整張 getImageData 的長段
      for (const [sx, sy, q] of cand) {
        let mx = 0;
        for (let y0 = 0; y0 < artH; y0 += capBand) {
          const hB = Math.min(capBand, artH - y0);
          rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, y0, artW, hB);
          rg.save(); rg.beginPath(); rg.rect(0, y0, artW, hB); rg.clip();
          drawArtInto(rg, sx, sy, q);
          rg.restore();
          const rd = rg.getImageData(0, y0, artW, hB).data;
          for (let i = 0; i < rd.length; i += 4) if (rd[i + 3] > 200) { const Y = 0.2126 * rd[i] + 0.7152 * rd[i + 1] + 0.0722 * rd[i + 2]; if (Y > mx) mx = Y; }
          yield;
        }
        if (mx > 0 && mx < capG) capG = mx;
      }
    }
    let capped = 0; stepTag = 'artUpload';
    for (let y0 = 0; y0 < artH; y0 += band) {
      const hB = Math.min(band, artH - y0);
      g.save();
      g.beginPath(); g.rect(0, y0, artW, hB); g.clip();
      drawArtInto(g, 0, 0, 'low');
      g.restore();
      const im = g.getImageData(0, y0, artW, hB);
      const d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        let Y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const cap = capG;
        if (Y > cap && d[i + 3] > 0) { const k = cap / Y; d[i] = Math.floor(d[i] * k); d[i + 1] = Math.floor(d[i + 1] * k); d[i + 2] = Math.floor(d[i + 2] * k); Y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; capped++; }
        if (d[i + 3] > 200 && Y > peak) peak = Y;
      }
      G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, texArt);
      G.texSubImage2D(G.TEXTURE_2D, 0, 0, y0, artW, hB, G.RGBA, G.UNSIGNED_BYTE, d);
      yield;
    }
    srcPeak = peak || 255;
    layer.dataset.capped = String(capped); layer.dataset.capY = capG.toFixed(1);
    // 特效最亮的顏色（金）Rec.709 luma ≈ 194；整體縮放到原圖最亮處的 96% 以下
    bright = Math.min(1, (srcPeak * 0.96) / 194.2);
    artKey = sizeKey;
    layer.dataset.pieceDpr = kc.toFixed(2);
  }

  // ───────────── 單次播放的計畫 ─────────────
  interface Piece {
    cx: number; cy: number; dx: number; dy: number; rot: number; scale: number; drift: number;
    tearAt: number; burnOff: number; depth: number; edges: number[];
    wedge: { px: number; py: number; ang: number; line: number } | null;
    quad: number[];
  }
  /** kind 0＝火星（拖尾細線）1＝火舌（程序化、貼著燃燒前緣）2＝餘燼點 */
  interface Particle {
    kind: 0 | 1 | 2; z: 0 | 1; t0: number; life: number; x: number; y: number; vx: number; vy: number; g: number;
    size: number; len: number; heat: number; piece: number; gx: number; gy: number; thr0: number; seed: number; tilt: number;
  }
  interface Built {
    plan: AsuraDeathPlan; pieces: Piece[]; cracks: Crack[]; R: number; board: boolean;
    particles: Particle[]; amp: number; range: number; fmax: number; nOff: [number, number]; crackData: Float32Array; c0: number;
  }
  let built: Built | null = null;
  const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function* planSteps(opts: AsuraDeathPlayOptions = {}): Generator<void, AsuraDeathPlan> {
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
      if (!(opts.avoidRepeat ?? true) || opts.seed !== undefined || key !== lastPlayedKey || reduced) break;
      seed = (seed + 0x9e3779b9) | 0; rand = mulberry32(seed);
    }

    const R = Math.max(tw, th) + 2 * pad;
    const hx = (tw / 2 + pad) / R, hy = (th / 2 + pad) / R;
    const Sp = Math.max(tw, th);
    const board = Sp < 120;
    const baseDeg = (rand() - 0.5) * 80 + (rand() < 0.3 ? 90 : 0);
    const base = (baseDeg * Math.PI) / 180;
    const nb = [-Math.sin(base), Math.cos(base)];
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
    // ── 時間表（秒）── 與 v2 相同
    const CRACK = reduced ? 0.08 : 0.13;
    const tearAtLayer = new Array(nLayers).fill(99);
    const tearTimes: number[] = [];
    let tt = reduced ? 0.09 : 0.14;
    if (reduced) { tearAtLayer[order[0]] = tt; tearTimes.push(tt); }
    else for (let j = 0; j < nLayers; j++) { tearAtLayer[order[j]] = tt; tearTimes.push(tt); tt += 0.16 + rand() * 0.15; }
    cracks.forEach((c, e) => { c.open = Math.min(tearAtLayer[e], tearAtLayer[e + 1]); c.dur = CRACK; c.start = c.open - CRACK; });
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
    const c0 = Math.min(...cracks.map((c) => c.start));
    yield;

    // ── 各層碎片（只算運動參數；外形由著色器依裂線決定）──
    const pieces: Piece[] = [];
    for (let p = 0; p < nLayers; p++) {
      const top = p === 0 ? null : cracks[p - 1], bot = p === nLayers - 1 ? null : cracks[p];
      const pts: [number, number][] = [];
      if (top) for (let i = 0; i < NPTS; i++) pts.push(crackPoint(top, i));
      else for (let i = 0; i < NPTS; i++) pts.push(crackPoint(bot!, i, -3));
      if (bot) for (let i = NPTS - 1; i >= 0; i--) pts.push(crackPoint(bot, i));
      else for (let i = NPTS - 1; i >= 0; i--) pts.push(crackPoint(top!, i, 3));
      const edges: number[] = []; if (top) edges.push(p - 1); if (bot) edges.push(p);
      const cAll = pts.filter(([x, y]) => Math.abs(x) <= hx && Math.abs(y) <= hy);
      let mx = 0, my = 0; for (const [x, y] of cAll) { mx += x; my += y; } if (cAll.length) { mx /= cAll.length; my /= cAll.length; }
      const cx = (hx + mx) * R, cy = (hy + my) * R;
      // 64px 頭像：位移小（不蓋到鄰格），靠深色裂縫＋金光對比讓三層讀得出來
      const minMove = reduced ? (board ? 2 : 3) : board ? Math.max(4, Sp * 0.07) : Math.max(12, Sp * 0.08);
      const mv = minMove + (reduced ? 0 : rand() * Sp * (board ? 0.02 : 0.05));
      let ddx = 0, ddy = 0;
      if (reduced) { const s = p === 0 ? -1 : 1; ddx = nb[0] * s * mv; ddy = nb[1] * s * mv; }
      else if (p === 0 || p === nLayers - 1) {
        const s = p === 0 ? -1 : 1; const ta = (rand() - 0.5) * 0.7;
        ddx = (nb[0] * s + Math.cos(base) * ta) * mv; ddy = (nb[1] * s + Math.sin(base) * ta) * mv;
      } else { const s = rand() < 0.5 ? -1 : 1; ddx = Math.cos(base) * s * mv * 0.9 + nb[0] * (rand() - 0.5) * mv * 0.3; ddy = Math.sin(base) * s * mv * 0.9 + nb[1] * (rand() - 0.5) * mv * 0.3; }
      pieces.push({
        cx, cy, dx: ddx, dy: ddy,
        rot: reduced ? 0 : (rand() < 0.5 ? -1 : 1) * (board ? 0.05 + rand() * 0.06 : 0.1 + rand() * 0.16),
        scale: reduced || board ? 1 : p === 1 ? 1.07 : 0.95,
        drift: reduced ? 0 : board ? 0.05 + rand() * 0.05 : 0.2 + rand() * 0.2,
        tearAt: tearAtLayer[p], burnOff: 0, depth: p === 1 ? 3 : p === 0 ? 1 : 2, edges, wedge: null,
        quad: pieceQuad(cracks, p, nLayers, R, hx, hy, Math.max(6, Sp * 0.02)),
      });
    }
    if (!reduced) cracks.forEach((l, e) => {
      const pi = pieces[e].tearAt <= pieces[e + 1].tearAt ? e : e + 1;
      if (pieces[pi].wedge || pi === 1 && nLayers === 3 && pieces[pi].edges.length === 2 && pieces[pi].tearAt !== l.open) return;
      let endI = l.dir > 0 ? NPTS - 1 : 0;
      for (let q = 0; q < NPTS; q++) { const i = l.dir > 0 ? NPTS - 1 - q : q; const [x, y] = crackPoint(l, i); if (Math.abs(x) <= hx && Math.abs(y) <= hy) { endI = i; break; } }
      const [px, py] = crackPoint(l, endI);
      const side = pi === e ? -1 : 1;
      let stI = l.dir > 0 ? 0 : NPTS - 1;
      for (let q = 0; q < NPTS; q++) { const i = l.dir > 0 ? q : NPTS - 1 - q; const [x, y] = crackPoint(l, i); if (Math.abs(x) <= hx && Math.abs(y) <= hy) { stI = i; break; } }
      const [sx, sy] = crackPoint(l, stI);
      const rx = sx - px, ry = sy - py;
      const nx = -l.sin * side, ny = l.cos * side;
      const sgn = Math.sign(-ry * nx + rx * ny) || 1;
      const open = board ? Math.max(2, Sp * 0.04) : Math.max(4, Sp * 0.05);
      pieces[pi].wedge = { px: (hx + px) * R, py: (hy + py) * R, ang: sgn * (open / Math.max(1, Math.hypot(rx, ry) * R)), line: e };
    });
    yield;

    // ── 燒蝕場（只用來預估前緣位置；真正的燒蝕在著色器）──
    const rnd2 = mulberry32(seed ^ 0x2545f491);
    const nOff: [number, number] = [rnd2(), rnd2()];
    const amp = Math.max(2.5, Sp * 0.11);
    const cxA = aw / 2, cyA = ah / 2;
    const pieceOf = (x: number, y: number) => { const xr = (x - cxA) / R, yr = (y - cyA) / R; let pi = 0; for (let e = 0; e < cracks.length; e++) if (crackSide(cracks[e], xr, yr) > 0) pi = e + 1; return pi; };
    const shapeSD = (x: number, y: number) => {
      const px = x - cxA, py = y - cyA;
      if (shapeCircle) { const hw = tw / 2 + pad, hh = th / 2 + pad; return hw - Math.hypot(px, py * (hw / hh)); }
      const hw = tw / 2 + pad, hh = th / 2 + pad, rr = Math.min(radius + pad, hw, hh);
      const qx = Math.abs(px) - hw + rr, qy = Math.abs(py) - hh + rr;
      return rr - (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0));
    };
    const fBase = (x: number, y: number, pi: number) => {
      const xr = (x - cxA) / R, yr = (y - cyA) / R;
      let ed = 1e4; for (const e of pieces[pi].edges) ed = Math.min(ed, Math.abs(crackSide(cracks[e], xr, yr)) * R);
      return Math.min(ed, Math.max(shapeSD(x, y), 0) * 1.15 + 1);
    };
    const fFull = (x: number, y: number, pi: number) => {
      const f = fBase(x, y, pi);
      const fb = 0.5 * nzJS(x * 0.085, y * 0.085, nOff) + 0.3 * nzJS(x * 0.085 * 2.13 + 17, y * 0.085 * 2.13 + 17, nOff) + 0.2 * nzJS(x * 0.085 * 4.71 + 41, y * 0.085 * 4.71 + 41, nOff);
      return f + amp * (fb - 0.5) * 2 + amp * 0.32 * (nzJS(x * 0.62, y * 0.62, nOff) - 0.5) * 2;
    };
    let fmax = 1;
    const G = 36;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const x = ((i + 0.5) / G) * aw, y = ((j + 0.5) / G) * ah;
      if (shapeSD(x, y) < 0) continue;
      fmax = Math.max(fmax, fBase(x, y, pieceOf(x, y)));
    }
    const range = fmax + 2.1 * amp;
    if (!reduced) order.forEach((layerI, j) => { pieces[layerI].burnOff = (1 - j) * 0.06 * range; });
    const th0 = -0.04, th1 = 0.8;
    /** 正規化門檻 → px（-amp 起燒、range 覆蓋全部）。 */
    const thrPx = (n: number) => -amp * 1.05 + n * range;
    yield;

    // ── 粒子（座標＝圖 CSS px；畫時再加特效層偏移）──
    const particles: Particle[] = [];
    const room = Math.max(36, Math.min(110, Sp * bleedK)) + Sp * 0.3;
    const nEmbers = reduced ? 26 : board ? 70 : 150, nFlames = reduced ? 8 : board ? 14 : 34;
    const burnT = (f: number) => burnStart + ((f - th0) / (th1 - th0)) * (burnEnd - burnStart);
    const frontSpeed = (range * (th1 - th0)) / (burnEnd - burnStart); // px/s
    for (let n = 0, guard = 0; n < nEmbers + nFlames && guard < 4000; guard++) {
      const x = rand() * aw, y = rand() * ah;
      if (shapeSD(x, y) < 0.5) continue;
      const pi = pieceOf(x, y);
      const f = fFull(x, y, pi) + pieces[pi].burnOff;
      const nrm = (f + amp * 1.05) / range;
      const t0 = burnT(nrm);
      if (t0 < burnStart || t0 > burnEnd - 0.03) continue;
      const flame = n >= nEmbers;
      const z = (flame ? (rand() < 0.4 ? 0 : 1) : rand() < 0.3 ? 0 : 1) as 0 | 1;
      let gx = 0, gy = 0;
      if (flame) { // 前緣往內推進的方向（燒蝕場梯度）
        const h = Math.max(1, Sp * 0.02);
        gx = (fBase(x + h, y, pi) - fBase(x - h, y, pi)) / (2 * h); gy = (fBase(x, y + h, pi) - fBase(x, y - h, pi)) / (2 * h);
        const gl2 = Math.hypot(gx, gy) || 1; gx /= gl2; gy /= gl2;
      }
      const sp = room * (reduced ? 0.25 : board ? 0.35 + rand() * 0.5 : 0.25 + rand() * 1.25);
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
      const kindR = rand();
      particles.push({
        kind: flame ? 1 : kindR < 0.62 ? 0 : 2, z, t0,
        life: flame ? 0.16 + rand() * 0.2 : reduced ? 0.2 + rand() * 0.3 : 0.12 + rand() * rand() * 0.55,
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -room * (reduced ? 0.3 : 0.4 + rand() * 0.9),
        size: flame ? (board ? Sp * 0.12 : Sp * (0.04 + rand() * 0.06) + 4) : 0.45 + rand() * rand() * (board ? 0.9 : 1.6),
        len: 0.012 + rand() * 0.038, heat: (t0 - burnStart) / (burnEnd - burnStart), piece: pi, gx, gy, thr0: f, seed: rand(), tilt: (rand() - 0.5) * 0.5,
      });
      n++;
    }
    yield;
    // 裂尖火星
    cracks.forEach((l) => {
      const nS = reduced ? 8 : board ? 10 : 22;
      for (let s = 0; s < nS; s++) {
        const q = rand(); const i = Math.round((l.dir > 0 ? q : 1 - q) * (NPTS - 1));
        const [x, y] = crackPoint(l, i);
        if (Math.abs(x) > hx || Math.abs(y) > hy) continue;
        const tq = l.start + l.dur * clamp01((q - (l.p0 ?? 0)) / Math.max(1e-3, (l.p1 ?? 1) - (l.p0 ?? 0)));
        const side = rand() < 0.5 ? -1 : 1, sp = room * (reduced ? 0.4 : board ? 0.4 + rand() * 0.5 : 0.5 + rand() * 1.6);
        const nx = -l.sin * side, ny = l.cos * side;
        particles.push({ kind: 0, z: 1, t0: tq, life: 0.08 + rand() * 0.24, x: (hx + x) * R, y: (hy + y) * R, vx: nx * sp + (rand() - 0.5) * sp * 0.6, vy: ny * sp + (rand() - 0.5) * sp * 0.6, g: room * 0.3, size: 0.5 + rand() * 0.8, len: 0.01 + rand() * 0.04, heat: 0, piece: -1, gx: 0, gy: 0, thr0: 0, seed: rand(), tilt: 0 });
      }
    });
    // 收束：最後燒穿時深紅火星往上一衝就熄
    if (!reduced) for (let s = 0; s < (board ? 16 : 40); s++) {
      const pi = Math.floor(rand() * pieces.length), pc = pieces[pi];
      const ax2 = pc.cx + (rand() - 0.5) * Sp * 0.5, ay2 = pc.cy + (rand() - 0.5) * Sp * 0.3;
      const sp = room * (board ? 0.4 + rand() * 0.4 : 0.4 + rand() * 1.1), a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
      particles.push({ kind: rand() < 0.7 ? 0 : 2, z: 1, t0: vanishStart + rand() * 0.12, life: 0.1 + rand() * 0.22, x: ax2, y: ay2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -room * 0.5, size: 0.6 + rand() * 0.9, len: 0.012 + rand() * 0.04, heat: 0.9, piece: pi, gx: 0, gy: 0, thr0: -1, seed: rand(), tilt: 0 });
    }
    // 粒子出生時跟著碎片走：以出生時刻的碎片矩陣換算位置
    for (const q of particles) {
      if (q.piece < 0 || q.kind === 1) continue;
      const m = pieceMatrix(pieces[q.piece], q.t0, cracks, reduced, board);
      [q.x, q.y] = apply(m, q.x, q.y);
    }
    const crackData = new Float32Array(NPTS * 2);
    cracks.forEach((c, e) => crackData.set(c.v, e * NPTS));
    built = {
      plan: { seed, reducedMotion: reduced, order: order.map((x) => x + 1), tearTimes, burnStart, burnEnd, vanishStart, vanishEnd, total, angleDeg: Math.round(baseDeg), crackSpreadDeg: Math.round(spread) },
      pieces, cracks, R, board, particles, amp, range, fmax, nOff, crackData, c0,
    };
    void thrPx; void frontSpeed;
    crackUploaded = false;
    return built.plan;
  }
  let crackUploaded = false;
  let texInfo: WebGLTexture | null = null, texDeco: WebGLTexture | null = null, fbo: WebGLFramebuffer | null = null, infoKey = '';
  function uploadCrack() {
    if (!built || !gl || lost || !glReady) return;
    const g = gl;
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, texCrack);
    g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, NPTS, 2, g.RED, g.FLOAT, built.crackData);
    // 預烤距離場＋燒蝕雜訊（GPU 一次，之後每格只讀一張貼圖）
    const ki = Math.min(kc, 1.5);
    const IW = Math.max(8, Math.ceil(aw * ki)), IH = Math.max(8, Math.ceil(ah * ki));
    const key = `${IW}x${IH}`;
    if (!texInfo || infoKey !== key) {
      if (texInfo) g.deleteTexture(texInfo);
      if (texDeco) g.deleteTexture(texDeco);
      const mk = (unit: number, fmt: number) => {
        const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, t);
        g.texStorage2D(g.TEXTURE_2D, 1, fmt, IW, IH);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        return t;
      };
      texInfo = mk(3, g.RGBA8); texDeco = mk(4, g.RGBA8);
      if (!fbo) fbo = g.createFramebuffer();
      g.bindFramebuffer(g.FRAMEBUFFER, fbo);
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texInfo, 0);
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT1, g.TEXTURE_2D, texDeco, 0);
      g.drawBuffers([g.COLOR_ATTACHMENT0, g.COLOR_ATTACHMENT1]);
      infoKey = key;
    } else g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    const b = built;
    const P = progBake!;
    g.useProgram(P); g.bindVertexArray(vaoArt);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, texNoise);
    g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, null);
    g.activeTexture(g.TEXTURE4); g.bindTexture(g.TEXTURE_2D, null);
    g.bindBuffer(g.ARRAY_BUFFER, vboArt);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([0, 0, aw, 0, aw, ah, 0, 0, aw, ah, 0, ah]), g.STREAM_DRAW);
    g.disable(g.BLEND);
    g.viewport(0, 0, IW, IH);
    g.uniformMatrix3fv(L(P, 'uMat'), false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
    g.uniform2f(L(P, 'uCanvas'), aw, ah);
    const fr = FR8; fr.fill(0);
    for (let e = 0; e < b.cracks.length; e++) { const c = b.cracks[e]; fr[e * 4] = c.ox; fr[e * 4 + 1] = c.oy; fr[e * 4 + 2] = c.cos; fr[e * 4 + 3] = c.sin; }
    g.uniform4fv(L(P, 'uFrame'), fr);
    g.uniform1f(L(P, 'uR'), b.R); g.uniform2f(L(P, 'uC'), aw / 2, ah / 2); g.uniform1i(L(P, 'uNL'), b.pieces.length);
    g.uniform1f(L(P, 'uBurnAmp'), b.amp); g.uniform2f(L(P, 'uNOff'), b.nOff[0], b.nOff[1]);
    g.uniform2f(L(P, 'uFEnc'), fEnc(b)[0], fEnc(b)[1]); g.uniform4f(L(P, 'uShape'), shapeCircle ? 1 : 0, tw / 2 + pad, th / 2 + pad, Math.min(radius + pad, aw / 2, ah / 2));
    { const S_ = Math.max(tw, th); g.uniform1f(L(P, 'uS'), b.board ? S_ * 1.6 : S_); } g.uniform1f(L(P, 'uKc'), Math.min(kc, 1.5)); g.uniform2f(L(P, 'uDir'), b.cracks[0].dir, b.cracks[1]?.dir ?? 1);
    g.drawArrays(g.TRIANGLES, 0, 6);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.bindVertexArray(null);
    crackUploaded = true;
  }

  /** 碎片的緊外接四邊形：圖外形上屬於這一層的點＋撕邊上的點。 */
  function pieceQuad(cracks: Crack[], p: number, nL: number, R: number, hx: number, hy: number, marginPx: number): number[] {
    const pts: [number, number][] = [];
    const inP = (x: number, y: number) => { let pi = 0; for (let e = 0; e < cracks.length; e++) if (crackSide(cracks[e], x, y) > 0) pi = e + 1; return pi === p; };
    const N = 96;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      let x: number, y: number;
      if (shapeCircle) { x = Math.cos(a) * hx; y = Math.sin(a) * hy; }
      else { const c = Math.cos(a), s2 = Math.sin(a), k2 = 1 / Math.max(Math.abs(c) / hx, Math.abs(s2) / hy); x = c * k2; y = s2 * k2; }
      if (inP(x, y)) pts.push([x, y]);
    }
    for (let k = 0; k <= 12; k++) for (let j = 0; j <= 12; j++) { const x = (k / 6 - 1) * hx, y = (j / 6 - 1) * hy; if (inP(x, y)) pts.push([x, y]); }
    for (const e of [p - 1, p]) { if (e < 0 || e >= cracks.length) continue; for (let i = 0; i < NPTS; i += 2) { const [x, y] = crackPoint(cracks[e], i); if (Math.abs(x) <= hx * 1.02 && Math.abs(y) <= hy * 1.02) pts.push([x, y]); } }
    void nL;
    if (!pts.length) return [0, 0, aw, 0, aw, ah, 0, 0, aw, ah, 0, ah];
    // 凸包＋外擴（八方向）→ 扇形三角形：比外接矩形少畫 30–40% 像素
    const ex: [number, number][] = [];
    for (const [x, y] of pts) { const X = x * R + aw / 2, Y = y * R + ah / 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ex.push([X + Math.cos(a) * marginPx * 1.09, Y + Math.sin(a) * marginPx * 1.09]); } }
    const H = hull(ex);
    const tri: number[] = [];
    for (let i = 1; i + 1 < H.length; i++) tri.push(H[0][0], H[0][1], H[i][0], H[i][1], H[i + 1][0], H[i + 1][1]);
    return tri;
  }
  function hull(P: [number, number][]): [number, number][] {
    const a = P.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    const cr = (o: number[], u: number[], v: number[]) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
    const lo: [number, number][] = [], up: [number, number][] = [];
    for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = a.length - 1; i >= 0; i--) { const q = a[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  /** 裂線附近的帶狀四邊形（縫內金光用）。 */
  /** 沿裂線的帶狀三角形（裂線座標 ±mV）：比外接矩形少畫很多像素。 */
  function bandStrip(b: Built, l: Crack, mV: number): number {
    const hx = (tw / 2 + pad) / b.R + mV, hy = (th / 2 + pad) / b.R + mV;
    let n = 0;
    const inside = (i: number) => { const u = uAt(i), v = l.v[i]; const x = l.ox + u * l.cos - v * l.sin, y = l.oy + u * l.sin + v * l.cos; return Math.abs(x) <= hx && Math.abs(y) <= hy; };
    for (let i = 0; i < NPTS; i += 4) if (inside(i)) BS_IDX[n++] = i;
    if (n && BS_IDX[n - 1] !== NPTS - 1 && inside(NPTS - 1)) BS_IDX[n++] = NPTS - 1;
    if (n < 2) return 0;
    const q0 = qN;
    const px = (i: number, dv: number) => { const u = uAt(i), v = l.v[i] + dv; qPush((l.ox + u * l.cos - v * l.sin) * b.R + aw / 2); qPush((l.oy + u * l.sin + v * l.cos) * b.R + ah / 2); };
    for (let k = 0; k + 1 < n; k++) {
      const i0 = BS_IDX[k], i1 = BS_IDX[k + 1];
      px(i0, -mV); px(i0, mV); px(i1, mV); px(i0, -mV); px(i1, mV); px(i1, -mV);
    }
    return qN - q0;
  }
  /** 這一層的帶號距離選擇：min(x*d0 + z, y*d1 + w)，往內為正。 */
  /** 燒蝕場的 8 位元編碼區間 [lo, lo+span]。 */
  function fEnc(b: Built): [number, number] { const lo = -1.4 * b.amp - 1; return [lo, b.fmax + 1.5 * b.amp + 4 - lo]; }
  const KEEP_WARM_DEFAULT = false; // v1 約定：未擊倒時特效層 display:none（暖機幾格後收回）
  function pieceSel(p: number, nL: number): [number, number, number, number] {
    if (p === 0) return [-1, 0, 0, 1e4];
    if (nL === 3 && p === 1) return [1, -1, 0, 0];
    if (nL === 3) return [0, 1, 1e4, 0];
    return [1, 0, 0, 1e4];
  }
  /** 碎片在 t 秒的仿射矩陣（圖 CSS → 圖 CSS）。 */
  function pieceMatrix(pc: Piece, t: number, cracks: Crack[], reduced: boolean, board: boolean): Aff {
    let m = I6();
    if (!reduced) { const sh = Math.exp(-t * 26) * Math.sin(t * 85) * Math.max(board ? 0.5 : 1, Math.max(tw, th) * 0.012); m = mulR(m, T6(sh, 0)); }
    if (pc.wedge) {
      const l = cracks[pc.wedge.line];
      const w = t >= l.start ? Math.pow(clamp01((t - l.start) / l.dur), 2.6) : 0;
      if (w > 0) { m = mulR(m, T6(pc.wedge.px, pc.wedge.py)); m = mulR(m, R6(pc.wedge.ang * w)); m = mulR(m, T6(-pc.wedge.px, -pc.wedge.py)); }
    }
    if (t >= pc.tearAt) {
      const tau = t - pc.tearAt;
      const e = easeOutQuart(tau / 0.42);
      const drift = Math.max(0, tau - 0.42) * pc.drift;
      const jolt = Math.exp(-tau * 30) * Math.sin(tau * 70) * 0.015;
      const k = e + drift + jolt;
      m = mulR(m, T6(pc.cx + pc.dx * k, pc.cy + pc.dy * k));
      m = mulR(m, R6(pc.rot * (e + drift * 0.6)));
      const s = 1 + (pc.scale - 1) * e;
      m = mulR(m, S6(s));
      m = mulR(m, T6(-pc.cx, -pc.cy));
    }
    return m;
  }
  const crackProg = (l: Crack, t: number) => clamp01((t - l.start) / l.dur);
  const crackReach = (l: Crack, prog: number) => (prog >= 1 ? 1.2 : prog <= 0 ? -0.2 : (l.p0 ?? 0) + prog * ((l.p1 ?? 1) - (l.p0 ?? 0)));

  // ───────────── 畫一格 ─────────────
  function thrNorm(P: AsuraDeathPlan, tt: number) {
    const th0 = -0.04, th1 = 0.8;
    const br = (tt - P.burnStart) / (P.burnEnd - P.burnStart);
    const vv = clamp01((tt - P.vanishStart) / (P.vanishEnd - P.vanishStart));
    let x = th0 + (th1 - th0) * Math.min(br, 1);
    if (!P.reducedMotion && vv > 0) x = Math.max(x, th1 + (1.12 - th1) * easeInQuad(vv) + 0.06 * vv);
    return x;
  }
  // v3.1：每格不配置新物件（降低 GC 造成的播放中長任務）——共用暫存陣列
  const M3 = new Float32Array(9);
  const mat3 = (m: Aff, ox: number, oy: number) => { M3[0] = m[0]; M3[1] = m[1]; M3[2] = 0; M3[3] = m[2]; M3[4] = m[3]; M3[5] = 0; M3[6] = m[4] + ox; M3[7] = m[5] + oy; M3[8] = 1; return M3; };
  const FR8 = new Float32Array(8);
  const HC = new Float32Array(3); // heat 結果暫存
  function heatInto(p: number) {
    p = clamp01(p);
    let a = AMBER, c = RED, k = (p - 0.45) / 0.55;
    if (p < 0.45) { a = GOLD; c = AMBER; k = p / 0.45; }
    HC[0] = a[0] + (c[0] - a[0]) * k; HC[1] = a[1] + (c[1] - a[1]) * k; HC[2] = a[2] + (c[2] - a[2]) * k;
  }
  const UV_T = [-1, 0, 1, 0, 1, 1, -1, 1], UV_D = [-1, -1, 1, -1, 1, 1, -1, 1], UV_S = [-1, 1, 1, 1, 1, -1, -1, -1];
  const QI = [0, 1, 2, 0, 2, 3];
  // 粒子緩衝：依 [z][kind] 分 6 段，每段容量＝該類粒子數×6 頂點×10 float（建好後固定，不再配置）
  let ptFor: unknown = null; const ptStart = new Int32Array(7); const ptLen = new Int32Array(6);
  function ptPrepare(b: Built) {
    if (ptFor === b) return;
    const cnt = new Int32Array(6);
    for (const q of b.particles) cnt[q.z * 3 + q.kind]++;
    let o = 0; for (let i = 0; i < 6; i++) { ptStart[i] = o; o += cnt[i] * 60; } ptStart[6] = o;
    if (ptData.length < o) ptData = new Float32Array(Math.max(o, 60));
    ptFor = b;
  }
  function wq(bk: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, uv: number[], r: number, gg: number, bb: number, a: number, k: number, sd: number) {
    let o = ptStart[bk] + ptLen[bk];
    for (let n = 0; n < 6; n++) {
      const i = QI[n];
      const x = i === 0 ? x0 : i === 1 ? x1 : i === 2 ? x2 : x3, y = i === 0 ? y0 : i === 1 ? y1 : i === 2 ? y2 : y3;
      ptData[o++] = x; ptData[o++] = y; ptData[o++] = uv[i * 2]; ptData[o++] = uv[i * 2 + 1];
      ptData[o++] = r; ptData[o++] = gg; ptData[o++] = bb; ptData[o++] = a; ptData[o++] = k; ptData[o++] = sd;
    }
    ptLen[bk] += 60;
  }
  let qBuf = new Float32Array(4096); let qN = 0;
  const qPush = (v: number) => { if (qN >= qBuf.length) { const nb = new Float32Array(qBuf.length * 2); nb.set(qBuf); qBuf = nb; } qBuf[qN++] = v; };
  const BS_IDX = new Int32Array(NPTS + 1);
  let lastDrawn = false;

  function clearGL() { if (!gl || lost) return; gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }

  /** 畫出 t 秒時的畫面（純函數）。回傳是否有畫東西（t < 第一道裂線開始 → 不畫，原圖仍顯示）。 */
  function render(t: number): boolean {
    const b = built; const g = gl;
    if (!b || !g || lost || !glReady || !texArt) return false;
    if (!crackUploaded) uploadCrack();
    const P = b.plan;
    clearGL();
    lastDrawn = false;
    if (t < b.c0 || t >= P.total) return false;
    lastDrawn = true;
    const reduced = P.reducedMotion, board = b.board;
    const S = Math.max(tw, th);
    const burnRaw = (t - P.burnStart) / (P.burnEnd - P.burnStart);
    const burnP = clamp01(burnRaw);
    const burning = t >= P.burnStart;
    const vp = clamp01((t - P.vanishStart) / (P.vanishEnd - P.vanishStart));
    const bodyAlpha = reduced ? 1 - smooth(0, 1, vp) : 1;
    const thrN = thrNorm(P, t);
    const thrBase = -b.amp * 1.05 + thrN * b.range;
    heatInto(burnP); const hc0 = HC[0] / 255, hc1 = HC[1] / 255, hc2 = HC[2] / 255;
    heatInto(Math.max(0, burnP - 0.25)); const hk0 = HC[0] / 255, hk1 = HC[1] / 255, hk2 = HC[2] / 255;

    g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    const clipR = board ? (aw / 2) * 1.22 : 0;
    const clip0 = artX + aw / 2, clip1 = artY + ah / 2, clip3 = (aw / 2) * 0.18;

    // ── 粒子頂點（z0 在碎片後、z1 在前）──
    const kill = 1 - smooth(P.vanishEnd - 0.04, P.total, t);
    ptPrepare(b); ptLen.fill(0);
    const edgeM = 12;
    const thrNowT = -b.amp * 1.05 + thrN * b.range;
    const rawM: Aff[] = rawMats; rawMats.length = 0;
    for (const pc of b.pieces) rawM.push(pieceMatrix(pc, t, b.cracks, reduced, board));
    for (const q of b.particles) {
      const tau = t - q.t0;
      if (tau < 0 || tau > q.life) continue;
      const lp = tau / q.life;
      const bk = q.z * 3 + q.kind;
      if (q.kind === 1) {
        // 火舌：貼在燃燒前緣（隨前緣往內推、隨碎片移動），破碎鋸齒、往上散
        const adv = Math.min(S * 0.25, Math.max(0, thrNowT - q.thr0));
        const ax = q.x + q.gx * adv, ay = q.y + q.gy * adv;
        if (shapeSD0(ax, ay) < -1) continue;
        const m = rawM[q.piece];
        const wx = m[0] * ax + m[2] * ay + m[4] + artX, wy = m[1] * ax + m[3] * ay + m[5] + artY;
        const hgt = q.size * (0.6 + 0.6 * Math.sin(Math.PI * Math.min(1, lp * 1.25))) * (0.85 + 0.25 * Math.sin(tau * 47 + q.seed * 20));
        const wd = q.size * 0.38;
        const ef = clamp01(Math.min(wx, wy - hgt, lw - wx, lh - wy) / edgeM);
        const a = Math.sin(Math.PI * Math.min(1, lp * 1.1)) * 0.92 * kill * ef * (q.z === 0 ? 0.75 : 1);
        if (a <= 0.01 || hgt < 1) continue;
        const ux = Math.sin(q.tilt + 0.15 * Math.sin(tau * 23 + q.seed * 9)), uy = -Math.cos(q.tilt);
        const px = -uy, py = ux;
        heatInto(q.heat * 0.5 + lp * 0.3); const kb = bright / 255;
        wq(bk, wx - px * wd, wy - py * wd, wx + px * wd, wy + py * wd, wx + px * wd + ux * hgt, wy + py * wd + uy * hgt, wx - px * wd + ux * hgt, wy - py * wd + uy * hgt,
          UV_T, HC[0] * kb, HC[1] * kb, HC[2] * kb, a, 1, q.seed);
        continue;
      }
      const x = q.x + q.vx * tau + artX, y = q.y + q.vy * tau + 0.5 * q.g * tau * tau + artY;
      const ef = clamp01(Math.min(x, y, lw - x, lh - y) / edgeM);
      if (ef <= 0) continue;
      heatInto(q.piece < 0 ? lp * 0.25 : q.thr0 < 0 ? 0.85 + lp * 0.15 : q.heat * 0.7 + lp * 0.5);
      const kb = bright / 255, cr = HC[0] * kb, cg = HC[1] * kb, cb = HC[2] * kb;
      const a = (1 - lp * lp) * kill * ef * (q.z === 0 ? 0.6 : 1);
      if (q.kind === 2) {
        const r = q.size * 1.3 + 0.6;
        wq(bk, x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r, UV_D, cr, cg, cb, a, 2, q.seed);
        continue;
      }
      const vx = q.vx, vy = q.vy + q.g * tau;
      const spd = Math.hypot(vx, vy) || 1;
      const L = Math.max(1.2, spd * q.len);
      const dx = vx / spd, dy = vy / spd, w = q.size * 0.5 + 0.35;
      const nx = -dy * w, ny = dx * w;
      const tx = x - dx * L, ty = y - dy * L;
      wq(bk, tx + nx, ty + ny, x + nx + dx * w, y + ny + dy * w, x - nx + dx * w, y - ny + dy * w, tx - nx, ty - ny, UV_S, cr, cg, cb, a, 0, q.seed);
    }
    // 壓緊成連續區段後一次上傳
    let need = 0;
    for (let i = 0; i < 6; i++) { const len = ptLen[i]; if (len && ptStart[i] !== need) ptData.copyWithin(need, ptStart[i], ptStart[i] + len); ptOff[i] = need; need += len; }
    const drawPt = (z: number) => {
      let any = false; for (let k = 0; k < 3; k++) if (ptLen[z * 3 + k]) any = true;
      if (!any) return;
      g.useProgram(progPt); g.bindVertexArray(vaoPt);
      const pp = progPt!; g.uniform2f(L(pp, 'uCanvas'), lw, lh); g.uniform1f(L(pp, 'uTime'), t); g.uniform1f(L(pp, 'uBrightP'), bright); g.uniform4f(L(pp, 'uClip'), clip0, clip1, board ? (aw / 2) * 1.75 : 0, (aw / 2) * 0.35);
      for (let k = 0; k < 3; k++) { const i = z * 3 + k; if (!ptLen[i]) continue; g.uniform1f(L(pp, 'uKind'), k); g.drawArrays(g.TRIANGLES, ptOff[i] / 10, ptLen[i] / 10); }
    };
    if (need) { g.bindBuffer(g.ARRAY_BUFFER, vboPt); g.bufferData(g.ARRAY_BUFFER, ptData, g.STREAM_DRAW, 0, need); }

    drawPt(0);

    // ── 圖：共用 uniform ──
    g.bindVertexArray(vaoArt);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, texArt);
    g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, texCrack);
    g.activeTexture(g.TEXTURE2); g.bindTexture(g.TEXTURE_2D, texNoise);
    g.activeTexture(g.TEXTURE3); g.bindTexture(g.TEXTURE_2D, texInfo);
    g.activeTexture(g.TEXTURE4); g.bindTexture(g.TEXTURE_2D, texDeco);
    void AMBER;
    const fr = new Float32Array(8);
    b.cracks.forEach((c, e) => fr.set([c.ox, c.oy, c.cos, c.sin], e * 4));
    const reach = b.cracks.map((c) => crackReach(c, crackProg(c, t)));
    const opens = b.cracks.map((c) => clamp01((t - c.start) / c.dur));
    const fe = fEnc(b);
    const setCommon = (P_: WebGLProgram) => {
      g.useProgram(P_);
    g.uniform2f(L(P_, 'uArtCss'), aw, ah);
    g.uniform2f(L(P_, 'uCanvas'), lw, lh);
    g.uniform3f(L(P_, 'uArtMap'), kc, artOff[0], artOff[1]);
    g.uniform2f(L(P_, 'uArtSize'), artW, artH);
    g.uniform4fv(L(P_, 'uFrame'), fr);
    g.uniform2f(L(P_, 'uDir'), b.cracks[0].dir, b.cracks[1]?.dir ?? 1);
    g.uniform1f(L(P_, 'uR'), b.R);
    g.uniform2f(L(P_, 'uC'), aw / 2, ah / 2);
    g.uniform1i(L(P_, 'uNL'), b.pieces.length);
    g.uniform2f(L(P_, 'uReach'), reach[0], reach[1] ?? -1);
    g.uniform2f(L(P_, 'uOpen'), opens[0], opens[1] ?? 0);
    g.uniform3f(L(P_, 'uHeat'), hk0, hk1, hk2); g.uniform3f(L(P_, 'uHeat2'), hc0, hc1, hc2);
    g.uniform4f(L(P_, 'uShape'), shapeCircle ? 1 : 0, tw / 2 + pad, th / 2 + pad, Math.min(radius + pad, aw / 2, ah / 2));
    g.uniform2f(L(P_, 'uNOff'), b.nOff[0], b.nOff[1]); g.uniform2f(L(P_, 'uFEnc'), fe[0], fe[1]);
    g.uniform4f(L(P_, 'uClip'), clip0, clip1, clipR, clip3);
    g.uniform1f(L(P_, 'uBright'), bright);
    g.uniform1f(L(P_, 'uS'), board ? S * 1.6 : S);
    g.uniform1f(L(P_, 'uKc'), kd);
    g.uniform1f(L(P_, 'uBurnAmp'), b.amp);
    g.uniform3f(L(P_, 'uGold'), GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255); g.uniform3f(L(P_, 'uRed'), RED[0] / 255, RED[1] / 255, RED[2] / 255);
    };

    const mats = b.pieces.map((pc, i) => {
      let m = rawM[i];
      if (!reduced && vp > 0) { const s = 1 - 0.14 * easeInQuad(vp); m = mulR(mulR(mulR(T6(pc.cx, pc.cy), S6(s)), T6(-pc.cx, -pc.cy)), m); }
      return m;
    });
    const avgM = (a: Aff, c: Aff): Aff => [0, 1, 2, 3, 4, 5].map((i) => (a[i] + c[i]) / 2) as Aff;
    const glowInt = b.cracks.map((l) => {
      if (crackProg(l, t) <= 0) return 0;
      return clamp01((t - l.start) / 0.06) * (1 - smooth(0.0, 0.3, burnP)) * (0.75 + 0.25 * Math.exp(-Math.max(0, t - l.open) * 4));
    });
    // 縫的寬度（裂線中點在兩側碎片上的距離）：縫越寬，光越淡
    const gaps = b.cracks.map((l, e) => {
      const mid = Math.round((((l.p0 ?? 0) + (l.p1 ?? 1)) / 2) * (NPTS - 1));
      const i = l.dir > 0 ? mid : NPTS - 1 - mid;
      const [x, y] = crackPoint(l, i); const X = (x * b.R) + aw / 2, Y = (y * b.R) + ah / 2;
      const [x1, y1] = apply(mats[e], X, Y), [x2, y2] = apply(mats[e + 1], X, Y);
      return Math.hypot(x1 - x2, y1 - y2);
    });
    // 這一格要畫的四邊形（圖座標）：只蓋住需要的範圍，GPU 少算很多像素
    qN = 0;
    const pushQuad = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => { qPush(x0); qPush(y0); qPush(x1); qPush(y1); qPush(x2); qPush(y2); qPush(x0); qPush(y0); qPush(x2); qPush(y2); qPush(x3); qPush(y3); return qN / 2 - 6; };
    const glowS = b.cracks.map((_, e) => board ? Math.max(1.4, S * 0.04) : Math.max(2, S * 0.016) + gaps[e] * 0.03);
    const glowN: number[] = [];
    const glowQ = b.cracks.map((l, e) => { glowN[e] = 0; if (glowInt[e] <= 0.01) return -1; const st = qN / 2; glowN[e] = bandStrip(b, l, (gaps[e] * 0.5 + 2.7 * glowS[e] + 3) / b.R) / 2; return glowN[e] ? st : -1; });
    const pieceQ = b.pieces.map((pc) => { const st = qN / 2; for (let i = 0; i < pc.quad.length; i++) qPush(pc.quad[i]); return st; });
    const tipS = Math.max(board ? 2 : 3, S * 0.03);
    const tipQ = b.cracks.map((l) => {
      const pr = crackProg(l, t);
      if (pr <= 0 || pr >= 1) return -1;
      const q = crackReach(l, pr); const i = Math.round((l.dir > 0 ? q : 1 - q) * (NPTS - 1));
      const [x, y] = crackPoint(l, Math.max(0, Math.min(NPTS - 1, i))); const X = x * b.R + aw / 2, Y = y * b.R + ah / 2, r = tipS * 3 + 2;
      return pushQuad(X - r, Y - r, X + r, Y - r, X + r, Y + r, X - r, Y + r);
    });
    g.bindBuffer(g.ARRAY_BUFFER, vboArt);
    g.bufferData(g.ARRAY_BUFFER, qBuf, g.STREAM_DRAW, 0, qN);

    // 縫內金光（在碎片後方，平均兩側碎片的矩陣）
    setCommon(progGlow!);
    b.cracks.forEach((l, e) => {
      if (glowQ[e] < 0) return;
      g.uniformMatrix3fv(L(progGlow!, 'uMat'), false, mat3(avgM(mats[e], mats[e + 1]), artX, artY));
      const s0 = board ? Math.max(1.4, S * 0.04) : Math.max(2, S * 0.022);
      const gapK = 1 / (1 + gaps[e] / (3 * s0));
      g.uniformMatrix3fv(L(progGlow!, 'uInvA'), false, mat3(inv6(mulR(T6(artX, artY), mats[e])), 0, 0));
      g.uniformMatrix3fv(L(progGlow!, 'uInvB'), false, mat3(inv6(mulR(T6(artX, artY), mats[e + 1])), 0, 0));
      g.uniform1i(L(progGlow!, 'uGlowE'), e); g.uniform1f(L(progGlow!, 'uGlowA'), glowInt[e] * (board ? 1.0 : 0.9) * (0.4 + 0.6 * gapK)); g.uniform1f(L(progGlow!, 'uGlowS'), glowS[e]);
      g.drawArrays(g.TRIANGLES, glowQ[e], glowN[e]);
    });

    // 碎片本體（依深度；厚度影在同一次繪製裡算）
    const orderIdx = b.pieces.map((_, i) => i).sort((i, j) => b.pieces[i].depth - b.pieces[j].depth);
    const thickPx = Math.max(1.2, Math.min(4, S * 0.014));
    setCommon(progArt!);
    for (const i of orderIdx) {
      const pc = b.pieces[i];
      const ps = pieceSel(i, b.pieces.length);
      g.uniform4f(L(progArt!, 'uPS'), ps[0], ps[1], ps[2], ps[3]); g.uniform2f(L(progArt!, 'uUse'), pc.edges.includes(0) ? 1 : 0, pc.edges.includes(1) ? 1 : 0);
      const thr = burning || (!reduced && vp > 0) ? thrBase - pc.burnOff : -1e4;
      g.uniform1f(L(progArt!, 'uThr'), thr);
      let firstOpen = Infinity; for (const e of pc.edges) firstOpen = Math.min(firstOpen, b.cracks[e].start);
      const glow = t > firstOpen ? 0.6 + 0.4 * Math.exp(-(t - firstOpen) * 5) : 0;
      g.uniform1f(L(progArt!, 'uRimG'), glow * (1 - clamp01(burnP / 0.1)) * 0.8);
      g.uniform1f(L(progArt!, 'uRimR'), glow * 0.75 * Math.sin(Math.PI * clamp01(burnP / 0.16)));
      const anyUnrev = pc.edges.some((e) => crackProg(b.cracks[e], t) < 1);
      g.uniform1f(L(progArt!, 'uOverlap'), anyUnrev ? 0.6 : 0.0);
      const thickA = (t - pc.tearAt > 0 ? clamp01((t - pc.tearAt) / 0.12) : 0) * (1 - clamp01(burnP / 0.12)) * bodyAlpha;
      const inv = inv6(mats[i]);
      g.uniform1f(L(progArt!, 'uThick'), thickA > 0.01 ? thickA * 0.9 : 0);
      g.uniform2f(L(progArt!, 'uThickOff'), inv[0] * thickPx * 0.5 + inv[2] * thickPx, inv[1] * thickPx * 0.5 + inv[3] * thickPx);
      g.uniform1f(L(progArt!, 'uAlpha'), bodyAlpha);
      g.uniform1f(L(progArt!, 'uDecoOn'), pc.edges.some((e) => crackProg(b.cracks[e], t) > 0) ? 1 : 0);
      g.uniformMatrix3fv(L(progArt!, 'uMat'), false, mat3(mats[i], artX, artY));
      if (!(thr > b.fmax + b.amp * 1.45 + 2)) g.drawArrays(g.TRIANGLES, pieceQ[i], pc.quad.length / 2);
    }
    // 裂尖亮點（碎片之上，小、隨裂尖移動，只在圖內）
    if (tipQ.some((x) => x >= 0)) setCommon(progTip!);
    b.cracks.forEach((l, e) => {
      if (tipQ[e] < 0) return;
      g.uniformMatrix3fv(L(progTip!, 'uMat'), false, mat3(avgM(mats[e], mats[e + 1]), artX, artY));
      g.uniform1i(L(progTip!, 'uGlowE'), e); g.uniform1f(L(progTip!, 'uGlowA'), 0.85); g.uniform1f(L(progTip!, 'uGlowS'), tipS);
      g.drawArrays(g.TRIANGLES, tipQ[e], 6);
    });
    drawPt(1);
    g.bindVertexArray(null);
    g.flush(); // 讓 GPU 立刻開工，與主執行緒的樣式／版面並行
    return true;
  }
  function shapeSD0(x: number, y: number) {
    const px = x - aw / 2, py = y - ah / 2;
    const hw = tw / 2 + pad, hh = th / 2 + pad;
    if (shapeCircle) return hw - Math.hypot(px, py * (hw / hh));
    const rr = Math.min(radius + pad, hw, hh), qx = Math.abs(px) - hw + rr, qy = Math.abs(py) - hh + rr;
    return rr - (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0));
  }

  // ───────────── 預熱（prewarm）：閒置分段 ─────────────
  let warm = false;            // GL＋貼圖＋著色器都好了
  let decodeP: Promise<void> | null = null;
  async function decode(): Promise<void> {
    if (srcImg) return;
    if (!decodeP) decodeP = (async () => {
      const s = resolveSrc();
      if (!s) throw new Error('AsuraDeathFx: 找不到阿修羅圖（src / anchor）');
      if (typeof s === 'string') {
        const img = new Image(); img.decoding = 'async'; img.src = s; await img.decode();
        if (dead) return;
        // 註：試過 createImageBitmap 預先解碼（省掉第一次 drawImage 的約 16ms 同步解碼），但在 board（縮小 0.6）
        // 會和瀏覽器顯示的原圖差 ±2，影響「峰值 ≤ 原圖」→ 不採用，維持 HTMLImageElement（這 16ms 本來就在閒置分段裡）。
        srcImg = img;
      }
      else srcImg = s;
    })();
    await decodeP;
  }
  /** 預熱的同步步驟（每步都很小）。 */
  function* warmSteps(): Generator<void> {
    stepTag = 'measure'; measureSize(); yield;
    if (!gl || lost) {
      stepTag = 'context';
      if (!makeContext()) throw new Error('no-webgl2');
      yield;
    }
    if (!progArt || !glReady) {
      stepTag = 'compile'; yield* compileSteps();
      stepTag = 'noise'; if (!noise) yield* buildNoise();
      stepTag = 'uploadNoise'; uploadNoise(); yield;
      stepTag = 'linkWait'; while (!linkDone()) yield SLICE_END as unknown as void; // 結束這一段，下一個閒置時段再查
      stepTag = 'finishLink'; finishLink(); yield;
    }
    stepTag = 'art'; if (artKey !== sizeKey || !texArt) { yield* buildArt(); }
    stepTag = 'layout'; layout(); yield;
    warm = true;
  }
  let pre: { reduced: boolean; seed?: number; gen: Generator<void, AsuraDeathPlan> | null; plan: AsuraDeathPlan | null } | null = null;
  let cancelPre: (() => void) | null = null, cancelWarm: (() => void) | null = null;
  const stopPre = () => { if (cancelPre) { cancelPre(); cancelPre = null; } };
  const ric = (cb: (dl?: IdleDeadline) => void): number => typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback((d) => cb(d), { timeout: 300 })
    : (setTimeout(() => cb(), 16) as unknown as number);
  const cic = (id: number) => { if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) window.cancelIdleCallback(id); clearTimeout(id); };
  /** 在閒置時間分段執行產生器；每段上限 sliceMs（預設 6ms）。回傳 [promise, cancel]。 */
  function runIdle(gen: Generator<unknown, unknown>, sliceMs: number): [Promise<unknown>, () => void] {
    let idleId = 0, cancelled = false, res: (v: unknown) => void = () => undefined;
    const p = new Promise((resolve, reject) => {
      res = resolve;
      const step = (dl?: IdleDeadline) => {
        idleId = 0;
        if (cancelled) return;
        if (dead) { cancelled = true; resolve(undefined); return; }
        const t0 = now();
        const lim = Math.min(sliceMs, dl && !dl.didTimeout ? Math.max(1, dl.timeRemaining() - 1) : sliceMs);
        try {
          for (;;) {
            if (dead) { cancelled = true; resolve(undefined); return; }
            const r = gen.next();
            if (r.done) { resolve(r.value); return; }
            if (r.value === SLICE_END) break;
            if (now() - t0 >= lim * 0.5) break;
          }
        } catch (e) { reject(e); return; }
        const dbg = (globalThis as unknown as { __asuraSteps?: number[]; __asuraStepLog?: [number, string][] }); const dms = Math.round((now() - t0) * 10) / 10;
        if (dbg.__asuraSteps) dbg.__asuraSteps.push(dms); if (dbg.__asuraStepLog) dbg.__asuraStepLog.push([dms, stepTag]);
        idleId = ric(step);
      };
      idleId = ric(step);
    });
    return [p, () => { cancelled = true; if (idleId) cic(idleId); idleId = 0; res(undefined); }];
  }
  const drain = <T,>(gen: Generator<unknown, T>): T => { let r = gen.next(); while (!r.done) r = gen.next(); return r.value; };

  let warmP: Promise<void> | null = null;
  let warmGen: Generator<void> | null = null;
  let warmSlice = 6;
  function toFallback(err: unknown) {
    if (fb || dead) return;
    releaseGL(); // GL 版失敗：已建的 context 立刻釋放，不留到 GC
    const dbg = (globalThis as unknown as { __asuraErr?: unknown[] }); (dbg.__asuraErr ||= []).push(String(err));
    layer.remove();
    fb = createAsuraDeath2D(setup);
  }
  /** 選用：開戰或 HP 低時呼叫。把所有準備（解碼、量測、GL、著色器、貼圖、預排、暖機畫一格）在閒置時分段做完。 */
  function prewarm(opts: AsuraDeathPrewarmOptions = {}): Promise<void> {
    if (dead) return Promise.resolve();
    if (fb) return fb.prepare().then(() => { fb!.prime({ reducedMotion: opts.reducedMotion, seed: opts.seed }); });
    if (opts.sliceMs) warmSlice = opts.sliceMs;
    if (warm && built && pre?.plan) return Promise.resolve();
    if (!warmP) warmP = (async () => {
      await decode();
      if (dead) return;
      if (!warm || measureSizePeek()) {
        warmGen = warmSteps();
        const [wp, wc] = runIdle(warmGen, warmSlice); cancelWarm = wc;
        try { await wp; } catch (e) { warmGen = null; toFallback(e); if (fb && !dead) await (fb as AsuraDeathEngine2D).prepare(); return; }
        warmGen = null;
      }
      if (fb || dead) return;
      await schedulePreplan(opts.reducedMotion ?? prefersReduced(), opts.seed);
    })().finally(() => { warmP = null; });
    return warmP;
  }
  function measureSizePeek() { const r = targetRect(); const d = (typeof window !== 'undefined' && window.devicePixelRatio) || 1; return `${Math.round(r.width * 4)}x${Math.round(r.height * 4)}@${d}` !== artKey; }
  /** 同步補完預熱（play／seek 沒先 prewarm 時）。 */
  function warmSync() {
    if (fb || dead) return;
    layer.dataset.warmSrc = warm && !warmGen ? 'idle' : 'sync';
    if (warm && !measureSizePeek()) { layout(); return; }
    syncWarm = true;
    try { if (warmGen) { drain(warmGen); warmGen = null; } if (!warm || measureSizePeek()) { warm = false; drain(warmSteps()); } }
    catch (e) { toFallback(e); }
    finally { syncWarm = false; }
  }
  function schedulePreplan(reduced = prefersReduced(), seed?: number): Promise<void> {
    if (fb || raf || dead) return Promise.resolve();
    stopPre();
    const gen = planSteps({ reducedMotion: reduced, seed });
    const me = { reduced, seed, gen: gen as Generator<void, AsuraDeathPlan> | null, plan: null as AsuraDeathPlan | null };
    pre = me;
    function* withWarm(): Generator<void, AsuraDeathPlan> {
      stepTag = 'plan'; const p = yield* gen;
      stepTag = 'uploadCrack'; uploadCrack(); yield;
      // v3.1：每個 GPU 暖機步驟後在閒置分段裡 gpuSync()，讓 GPU 行程（box 上是 SwiftShader 首次 JIT）在這一段做完，
      // 不要全部堆到第一次呈現的 Commit 才一次等（v3 量到 120–200ms 的那個長任務）。
      stepTag = 'bakeSync'; gpuSync(); yield;
      stepTag = 'warm1'; if (!raf && built) { layout(); yield; render(built.c0 + 0.06); gpuSync(); yield; }
      stepTag = 'warm2'; if (!raf && built) { render(p.burnStart + 0.12); gpuSync(); yield; }
      stepTag = 'warm3'; if (!raf && built) { render(p.vanishStart + 0.05); gpuSync(); yield; clearGL(); gpuSync(); yield; }
      // v3.1：在閒置分段裡先把 WebGL 畫布讀回一次（1×1 的 2D 畫布 drawImage＋讀 1 px）。
      // box（軟體合成）上每個 context 第一次讀回有一筆固定成本（量到 77–185ms，和畫布大小無關），
      // v3 是在合成器暖機那格的 Commit 裡付；這裡改在我們自己的閒置分段付（整合方暫停 prewarm 時也會一起暫停）。這一筆本身切不開。
      stepTag = 'readbackWarm'; if (!raf && gl) { const c1 = doc.createElement('canvas'); c1.width = 1; c1.height = 1; const x1 = c1.getContext('2d', { willReadFrequently: true })!; x1.drawImage(cv, 0, 0, 1, 1); x1.getImageData(0, 0, 1, 1); yield; }
      return p;
    }
    const [rp, rc] = runIdle(withWarm(), warmSlice); cancelPre = rc;
    return rp.then((p) => {
      if (!p || dead) return;
      if (pre === me) { me.plan = p as AsuraDeathPlan; me.gen = null; }
      // 合成器暖機：特效層短暫以全透明畫布顯示幾格，讓瀏覽器先配好呈現用緩衝。
      // keepWarm=true（預設 GL 版）之後維持顯示（透明、pointer-events none）；false 則收回 display:none（v1 約定）。
      const keep = setup.keepWarm ?? KEEP_WARM_DEFAULT;
      if (!raf && !fb && typeof requestAnimationFrame === 'function') {
        layer.style.opacity = ''; placeLayer(); layer.style.display = 'block';
        if (keep) layer.dataset.primed = '1';
        let n = 0; const step = () => { primeRaf = 0; if (raf || !gl || dead) return; clearGL(); if (++n < 4) primeRaf = requestAnimationFrame(step); else if (!keep && !raf) layer.style.display = 'none'; };
        primeRaf = requestAnimationFrame(step);
      }
      layer.dataset.warm = '1';
    }, () => undefined);
  }
  function takePlan(opts: AsuraDeathPlayOptions): AsuraDeathPlan {
    const reduced = opts.reducedMotion ?? prefersReduced();
    if (pre && pre.reduced === reduced && (opts.seed === undefined ? pre.seed === undefined : opts.seed === pre.seed)) {
      stopPre();
      let planOut = pre.plan;
      layer.dataset.planSrc = planOut ? 'idle' : 'drain';
      if (!planOut && pre.gen) planOut = drain(pre.gen);
      pre = null;
      // 預排是在上一次播放之前算的話可能和上一次同順序 → 丟掉改同步重排（很少發生）
      const stale = (opts.avoidRepeat ?? true) && opts.seed === undefined && !reduced && planOut && orderKey(false, planOut.order.map((x) => x - 1)) === lastPlayedKey;
      if (planOut && !stale && built && built.plan === planOut) { if (!crackUploaded) uploadCrack(); lastPlayedKey = orderKey(reduced, planOut.order.map((x) => x - 1)); return planOut; }
    }
    stopPre();
    pre = null;
    layer.dataset.planSrc = 'sync';
    const p = drain(planSteps({ ...opts, reducedMotion: reduced }));
    uploadCrack();
    lastPlayedKey = orderKey(reduced, p.order.map((x) => x - 1));
    return p;
  }

  // ───────────── 播放 ─────────────
  let primeRaf = 0; // 合成器暖機用的 rAF（destroy 時取消）
  let raf = 0, timer: ReturnType<typeof setTimeout> | 0 = 0, finish: ((cancelled: boolean) => void) | null = null;
  let prevVis = '';
  let anchorHidden = false;
  function placeLayer() {
    const r = targetRect();
    const L = Math.floor((r.left - pad - artX) * dpr) / dpr, T = Math.floor((r.top - pad - artY) * dpr) / dpr;
    layer.style.transform = `translate3d(${L}px,${T}px,0)`;
  }
  function hideAnchor() { if (anchor && !anchorHidden && (setup.hideAnchor ?? true)) { prevVis = anchor.style.visibility; anchor.style.visibility = 'hidden'; anchorHidden = true; } }

  async function prepare(): Promise<void> {
    if (dead) return;
    if (fb) return fb.prepare();
    await decode();
    if (dead) return;
    void prewarm();
  }
  async function play(opts: AsuraDeathPlayOptions = {}): Promise<AsuraDeathResult> {
    if (dead) return deadResult();
    if (fb) return fb.play(opts);
    cancel();
    if (!srcImg) await decode();
    if (dead) return deadResult();
    warmSync();
    if (fb) return (fb as AsuraDeathEngine2D).play(opts);
    if (warmP && !warm) { /* 預熱已同步補完 */ }
    const P = takePlan(opts);
    anchorHidden = false;
    layer.style.opacity = ''; delete layer.dataset.primed;
    clearGL();
    layer.style.display = 'block';
    layer.dataset.state = 'playing'; layer.dataset.seed = String(P.seed); layer.dataset.order = P.order.join('-');
    layer.dataset.reduced = String(P.reducedMotion);
    placeLayer();
    // 第一格：不畫、不隱藏原圖（第一道裂線 c0≈10ms 才開始）→ 與原圖完全一致
    return new Promise<AsuraDeathResult>((resolve) => {
      const t0 = now();
      let frames = 0, last = t0, maxGap = 0, dropped = 0;
      const done = (cancelled: boolean) => {
        cancelAnimationFrame(raf); if (timer) clearTimeout(timer); raf = 0; timer = 0; finish = null;
        clearGL();
        layer.style.display = 'none'; layer.dataset.state = cancelled ? 'cancelled' : 'done';
        if (anchor && (setup.restoreAnchor ?? false) && anchorHidden) anchor.style.visibility = prevVis;
        else if (!cancelled) hideAnchor();
        setTimeout(() => { void schedulePreplan(); }, 0);
        resolve({ ...P, durationMs: Math.round(now() - t0), frames, maxFrameGapMs: Math.round(maxGap * 10) / 10, droppedFrames: dropped, cancelled });
      };
      finish = done;
      const tick = (tnow: number) => {
        const gap = tnow - last; last = tnow;
        if (frames > 0) { maxGap = Math.max(maxGap, gap); if (gap > 16.7 * 1.5) dropped += Math.round(gap / 16.7) - 1; }
        frames++;
        const t = (tnow - t0) / 1000;
        if (anchor) placeLayer();
        if (t >= P.total) { done(false); return; }
        if (render(t)) hideAnchor();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timer = setTimeout(() => finish && done(false), P.total * 1000 + 400);
    });
  }
  function prime(opts: AsuraDeathPlayOptions = {}) {
    if (dead) return;
    if (fb) return fb.prime(opts);
    if (!warm) { void prewarm({ reducedMotion: opts.reducedMotion, seed: opts.seed }); return; }
    void schedulePreplan(opts.reducedMotion ?? prefersReduced(), opts.seed);
  }
  function plan(opts: AsuraDeathPlayOptions = {}): AsuraDeathPlan {
    if (fb) return fb.plan(opts);
    if (!srcImg) throw new Error('AsuraDeathFx: 請先 prepare()');
    warmSync();
    if (fb) return (fb as AsuraDeathEngine2D).plan(opts);
    const p = drain(planSteps(opts)); uploadCrack(); return p;
  }
  function renderPublic(t: number) { if (fb) return fb.render(t); render(t); }
  function cancel() { if (fb) return fb.cancel(); if (finish) finish(true); }
  /** destroy() 之後呼叫 play() 的結果：立刻回傳 cancelled，不建任何東西。 */
  function deadResult(): AsuraDeathResult {
    return { seed: 0, reducedMotion: false, order: [], tearTimes: [], burnStart: 0, burnEnd: 0, vanishStart: 0, vanishEnd: 0, total: 0, angleDeg: 0,
      durationMs: 0, frames: 0, maxFrameGapMs: 0, droppedFrames: 0, cancelled: true };
  }
  /** 可重複呼叫。取消播放、閒置預熱、暖機 rAF，釋放 GL（含貼圖／buffer），畫布 0×0。之後所有非同步步驟都不會再建 GL。 */
  function destroy() {
    if (dead) return;
    if (fb) { cancel(); dead = true; fb.destroy(); releaseGL(); return; }
    cancel();
    dead = true;
    stopPre(); if (cancelWarm) { cancelWarm(); cancelWarm = null; } warmGen = null;
    if (primeRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(primeRaf); primeRaf = 0;
    pre = null; layer.remove(); built = null;
    releaseGL();
    srcImg = null; noise = null;
  }
  /** 只供測試／截圖：計畫好後停在 t 秒。 */
  async function seek(opts: AsuraDeathPlayOptions, t: number) {
    if (fb) return fb.seek(opts, t);
    if (dead) throw new Error('AsuraDeathFx: destroyed');
    await decode();
    if (dead) throw new Error('AsuraDeathFx: destroyed');
    warmSync();
    if (fb) return (fb as AsuraDeathEngine2D).seek(opts, t);
    stopPre(); pre = null;
    if (!built || built.plan.seed !== opts.seed || built.plan.reducedMotion !== !!opts.reducedMotion) { drain(planSteps({ ...opts, reducedMotion: !!opts.reducedMotion, avoidRepeat: false })); uploadCrack(); }
    layer.style.opacity = ''; layer.style.display = 'block'; layer.dataset.state = 'seek'; placeLayer();
    const drew = render(t);
    if (anchor && (setup.hideAnchor ?? true)) anchor.style.visibility = drew ? 'hidden' : '';
    return built!.plan;
  }

  return {
    prepare, prewarm, prime, plan, render: renderPublic, play, cancel, destroy, seek,
    get element(): HTMLDivElement { return fb ? fb.element : layer; },
    /** 目前用的繪製方式：'webgl' 或 '2d'（後備）。 */
    get renderer(): 'webgl' | '2d' { return fb ? '2d' : 'webgl'; },
  };
}

export type AsuraDeathEngine = ReturnType<typeof createAsuraDeath>;

/** 一次性播放：建立 → 播放 → 結束後移除。 */
export async function playAsuraDeath(setup: AsuraDeathSetup & AsuraDeathPlayOptions): Promise<AsuraDeathResult> {
  const eng = createAsuraDeath(setup);
  try { return await eng.play({ seed: setup.seed, reducedMotion: setup.reducedMotion, avoidRepeat: setup.avoidRepeat }); }
  finally { eng.destroy(); }
}
