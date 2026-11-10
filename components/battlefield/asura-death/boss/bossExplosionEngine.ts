/**
 * BossExplosionEngine v4 — 最終魔王（殿後四大神獸）整張卡（金框＋圖）爆炸死亡。獨立版，非一般阿修羅放大。
 * 純 Canvas 2D：只用 drawImage / fill / stroke / clip；不用 filter、blur、shadowBlur、加法混色。
 * 調色盤封頂：特效最亮 rgb(255,200,120)（L≈206），不出白。
 * 本引擎不判定擊倒：只有呼叫端（伺服端已確認擊倒）呼叫 play() 才播放。
 *
 * v4 預備模型：所有載圖後的工作（卡面點陣化、碎裂、裂紋、精靈、碎片預渲染、短版燒蝕、GPU 預熱、裝置探測）
 * 都是「工作佇列」裡的小步驟，由排程器以 ≤6ms 時間片在背景執行；
 * play() 永遠在同一 task 畫出第 0 幀——佇列沒做完時優雅降級：剩下的步驟改在播放中每幀 ≤3ms 繼續做，
 * 爆開前仍未完成的碎片改用「即時裁切」繪製（不需預渲染），播放中不做一次性長工作。
 */
export type BossBox = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
export type BeastKey = 'baihu' | 'qinglong' | 'xuanwu' | 'zhuque' | 'generic';
export interface FrameStyle { thickness: number; radius: number; innerRadius: number; angleDeg: number; stops: [number, string][]; inner: string }
export const DEFAULT_FRAME: FrameStyle = { thickness: 6, radius: 10, innerRadius: 6, angleDeg: 145, stops: [[0, '#6d5222'], [0.3, '#c9a24a'], [0.6, '#6a4c1c'], [1, '#b89039']], inner: '#0d0a0a' };
export interface BossExplosionTiming { chargeEnd: number; implodeEnd: number; smokeEnd: number }
export const DEFAULT_TIMING: BossExplosionTiming = { chargeEnd: 0.11, implodeEnd: 0.17, smokeEnd: 0.985 };
export interface PlayOptions { durationMs?: number; intensity?: number; reducedMotion?: boolean; seed?: number; timing?: Partial<BossExplosionTiming> }
export interface PrepareOptions { seed?: number; reducedMotion?: boolean; intensity?: number; beast?: BeastKey | string; frame?: Partial<FrameStyle> | false; dpr?: number; maxDpr?: number }
export interface FrameStats {
  frames: number; avgDt: number; maxDt: number; over20: number; over33: number; degraded: boolean; level: number; maxAt: number;
  peakParticles: number; shards: number; durationMs: number; reduced: boolean; dts: number[];
  /** 播放開始時預備佇列是否已全部完成（false＝優雅降級路徑） */
  preparedAtPlay: boolean; coldStart: boolean;
  /** 爆開時仍未預渲染、改用即時裁切繪製的碎片數 */
  liveShards: number; probeMs: number; lowPower: boolean; beast: BeastKey;
}
type Pt = [number, number];
type Cnv = HTMLCanvasElement;
interface Shard {
  poly: Pt[]; fib: Pt[]; cx: number; cy: number; bx: number; by: number; bw: number; bh: number; clean: Cnv | null; charred: Cnv | null;
  x: number; y: number; vx: number; vy: number; rot: number; vr: number; z: number; burnAt: number; burnDur: number; layer: number; debris: boolean; ash: boolean; hasFrame: boolean;
}
interface P { kind: number; x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; grow: number; depth: number; seed: number; core: number }
// kind: 0 fire 1 smoke 2 ember 3 spark 4 inward 5 ash 6 soot pocket
const MAX_PARTICLES = 230;
/** 裝置探測門檻（ms，15 次大面積貼圖＋合成）：超過＝軟體畫布／低階，走低階路徑 */
const PROBE_LIMIT = 1.2;
const CAP = [255, 200, 120];
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mkCanvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const ctx2d = (c: Cnv, read = false) => c.getContext('2d', read ? { willReadFrequently: true } : { alpha: true }) as CanvasRenderingContext2D;
function clipHalf(poly: Pt[], px: number, py: number, nx: number, ny: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = (a[0] - px) * nx + (a[1] - py) * ny, db = (b[0] - px) * nx + (b[1] - py) * ny;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function area(p: Pt[]) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
function centroid(p: Pt[]): Pt { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** 1D 值噪聲（沿周長／裂紋長度變化寬度用） */
function noise1(rnd: () => number, n = 64) { const v = Array.from({ length: n + 1 }, () => rnd()); return (t: number) => { const x = (((t % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(v[i], v[i + 1], u); }; }
const onBorderSeg = (a: Pt, b: Pt, w: number, h: number) => (Math.abs(a[0] - b[0]) < 0.01 && (a[0] < 0.5 || a[0] > w - 0.5)) || (Math.abs(a[1] - b[1]) < 0.01 && (a[1] < 0.5 || a[1] > h - 0.5));
/** 每隻神獸的元素色（全部在封頂內：沒有任何一色三通道都 >235） */
const BEAST: Record<BeastKey, { ember: [number[], number[]]; smoke: [number, number, number]; hot: string; name: string }> = {
  baihu: { ember: [[236, 204, 146], [150, 120, 84]], smoke: [70, 62, 58], hot: 'rgb(246,196,120)', name: '白虎・金' },
  qinglong: { ember: [[196, 222, 120], [70, 120, 60]], smoke: [48, 62, 50], hot: 'rgb(226,206,110)', name: '青龍・木' },
  xuanwu: { ember: [[120, 200, 232], [40, 80, 120]], smoke: [46, 56, 70], hot: 'rgb(214,178,120)', name: '玄武・水' },
  zhuque: { ember: [[255, 150, 60], [150, 30, 12]], smoke: [70, 34, 24], hot: 'rgb(255,170,80)', name: '朱雀・火' },
  generic: { ember: [[255, 176, 80], [150, 40, 14]], smoke: [70, 40, 30], hot: 'rgb(255,190,100)', name: '通用' },
};
export function beastFromSrc(src?: string | null): BeastKey { const m = /(baihu|qinglong|xuanwu|zhuque)/.exec(src || ''); return (m ? m[1] : 'generic') as BeastKey; }
/** 共用精靈（與尺寸無關），逐列分段建構 */
interface SpriteSet { lick: Record<'hot' | 'mid' | 'cool', Cnv[]>; pockets: Cnv[]; smoke: Cnv; spark: Cnv; glowSoft: Cnv; done: boolean }
let SPRITES: SpriteSet | null = null;
function makeValueNoise(rnd: () => number) {
  const G = 8; const grid: number[] = []; for (let i = 0; i < (G + 1) * (G + 1) * 4; i++) grid.push(rnd());
  const vn = (x: number, y: number, o: number) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const at = (i: number, j: number) => grid[((((j % G) + G) % G) * (G + 1) + (((i % G) + G) % G) + o * (G + 1) * (G + 1)) % grid.length];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v); };
  const fbm = (x: number, y: number) => { let n = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { n += vn(x * f, y * f, o) * a; a *= 0.5; f *= 2; } return n; };
  return { vn, fbm };
}
function* lickSteps(seed: number, heat: number, out: Cnv[]): Generator<void> {
  const W = 64, H = 128; const c = mkCanvas(W, H); const g = ctx2d(c, true); const id = g.createImageData(W, H);
  const rnd = mulberry32(seed); const { vn, fbm } = makeValueNoise(rnd);
  const ph = rnd() * 6.28, ph2 = rnd() * 6.28, sw = 0.08 + rnd() * 0.12, fork = rnd() < 0.5 ? 0.35 + rnd() * 0.3 : 2; // 部分火舌尖端分叉
  for (let y = 0; y < H; y++) {
    const v = y / H; const hw = 0.46 * Math.pow(1 - v, 0.75) * Math.min(1, (v + 0.06) * 5);
    const cx = 0.5 + Math.sin(v * 5.5 + ph) * sw * v + Math.sin(v * 11 + ph2) * 0.03 * v;
    for (let x = 0; x < W; x++) {
      const u = x / W; if (hw <= 0.001) continue;
      let du = Math.abs(u - cx); if (v > fork) du = Math.abs(du - hw * 0.45 * (v - fork) / (1 - fork));
      const d = du / hw + (fbm(u * 7 + 3, v * 9 + 1) - 0.5) * 1.25 * (0.35 + v) + (vn(u * 22 + 5, v * 26 + 9, 3) - 0.5) * 0.4 * v;
      if (d >= 1) continue;
      const core = (1 - d) * (1 - v * 0.75); let t = clamp(Math.pow(core, 0.9) * heat, 0, 1);
      const soot = fbm(u * 6 + 11, v * 5 + 7); if (soot > 0.58) t *= 1 - clamp((soot - 0.58) * 3.2, 0, 0.75);
      let r, gg, bb;
      if (t < 0.22) { const k = t / 0.22; r = lerp(42, 128, k); gg = lerp(10, 20, k); bb = lerp(6, 8, k); }
      else if (t < 0.5) { const k = (t - 0.22) / 0.28; r = lerp(128, 228, k); gg = lerp(20, 78, k); bb = lerp(8, 18, k); }
      else if (t < 0.8) { const k = (t - 0.5) / 0.3; r = lerp(228, 255, k); gg = lerp(78, 150, k); bb = lerp(18, 50, k); }
      else { const k = (t - 0.8) / 0.2; r = 255; gg = lerp(150, CAP[1], k); bb = lerp(50, CAP[2], k); }
      const edge = clamp((1 - d) * 4, 0, 1), tip = clamp((1 - v) * 3, 0, 1); const i = (y * W + x) * 4;
      id.data[i] = r; id.data[i + 1] = gg; id.data[i + 2] = bb; id.data[i + 3] = Math.round(255 * edge * tip * (0.78 + 0.22 * t));
    }
    if ((y & 7) === 7) yield;
  }
  g.putImageData(id, 0, 0); const o = mkCanvas(W, H); ctx2d(o).drawImage(c, 0, 0); out.push(o); yield;
}
function* pocketSteps(seed: number, out: Cnv[]): Generator<void> {
  const S = 64; const c = mkCanvas(S, S); const g = ctx2d(c, true); const id = g.createImageData(S, S); const rnd = mulberry32(seed); const { vn } = makeValueNoise(rnd);
  for (let y = 0; y < S; y++) { for (let x = 0; x < S; x++) {
    const nx = x / S - 0.5, ny = y / S - 0.5; let n = 0, a = 0.5, f = 3; for (let o = 0; o < 4; o++) { n += vn(nx * f + 4, ny * f + 4, o) * a; a *= 0.5; f *= 2; }
    const d = Math.hypot(nx, ny) * 2 + (n - 0.5) * 0.9; if (d >= 1) continue; const v = clamp((1 - d) * 1.8, 0, 1), warm = clamp(1 - (1 - d) * 3, 0, 1), k = (y * S + x) * 4;
    id.data[k] = lerp(20, 70, warm); id.data[k + 1] = lerp(10, 16, warm); id.data[k + 2] = 8; id.data[k + 3] = Math.round(235 * v * (0.75 + 0.25 * n)); }
    if ((y & 7) === 7) yield; }
  g.putImageData(id, 0, 0); const o = mkCanvas(S, S); ctx2d(o).drawImage(c, 0, 0); out.push(o); yield;
}
function radial(r: number, stops: [number, string][]) { const c = mkCanvas(r * 2, r * 2); const g = ctx2d(c); const gr = g.createRadialGradient(r, r, 0, r, r, r); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c; }
function basicSprites(): SpriteSet {
  const spark = mkCanvas(32, 6); { const g = ctx2d(spark); const gr = g.createLinearGradient(0, 0, 32, 0); gr.addColorStop(0, 'rgba(160,30,10,0)'); gr.addColorStop(0.7, 'rgba(250,140,50,0.85)'); gr.addColorStop(1, 'rgba(255,196,110,1)'); g.fillStyle = gr; g.beginPath(); g.ellipse(16, 3, 16, 2.6, 0, 0, Math.PI * 2); g.fill(); }
  return { lick: { hot: [], mid: [], cool: [] }, pockets: [], smoke: radial(64, [[0, 'rgba(78,40,28,0.7)'], [0.45, 'rgba(52,28,22,0.42)'], [1, 'rgba(20,10,8,0)']]), spark,
    glowSoft: radial(48, [[0, 'rgba(255,170,80,0.85)'], [0.35, 'rgba(220,90,26,0.55)'], [1, 'rgba(90,10,4,0)']]), done: false };
}
let spriteBuilding = false;
function* spriteSteps(): Generator<void> {
  if (!SPRITES) SPRITES = basicSprites(); const S = SPRITES;
  while (spriteBuilding && !S.done) yield; // 另一個實例正在建：等它
  if (S.done) return; spriteBuilding = true;
  try {
    const L: Record<'hot' | 'mid' | 'cool', Cnv[]> = { hot: [], mid: [], cool: [] }; const pk: Cnv[] = [];
    for (const [key, base, heat] of [['hot', 101, 1.15], ['mid', 201, 0.8], ['cool', 301, 0.48]] as const) for (let i = 0; i < 4; i++) yield* lickSteps(base + i, heat, L[key]);
    for (let i = 0; i < 3; i++) yield* pocketSteps(401 + i, pk);
    S.lick = L; S.pockets = pk; S.done = true;
  } finally { spriteBuilding = false; }
}
/** 排程器：scheduler.postTask（背景優先）→ MessageChannel 備援 */
const postTask = (fn: () => void) => { const s = (globalThis as any).scheduler; if (s && typeof s.postTask === 'function') s.postTask(fn, { priority: 'background' }); else if (typeof MessageChannel !== 'undefined') { const ch = new MessageChannel(); ch.port1.onmessage = () => fn(); ch.port2.postMessage(0); } else setTimeout(fn, 0); };
export class BossExplosionEngine {
  readonly canvas: Cnv; private ctx: CanvasRenderingContext2D;
  private img: CanvasImageSource | null = null; private imgW = 1; private imgH = 1;
  private cw = 1; private ch = 1; private frameStyle: FrameStyle | false = DEFAULT_FRAME; private beast: BeastKey = 'generic';
  private sdpr = 1.5; private maxDpr = 1.5; private card: Cnv | null = null;
  private shards: Shard[] = []; private cracksHot: Cnv | null = null; private cracksCool: Cnv | null = null; private reach = 1;
  private impact: Pt = [0, 0]; private dissolve: Cnv[] = []; private secondary: { t: number; shard: number; k: number; done: boolean }[] = [];
  private region: BossBox = { x: 0, y: 0, width: 1, height: 1 }; private box: BossBox = { x: 0, y: 0, width: 1, height: 1 }; private dpr = 1;
  private vol: { c: Cnv; g: CanvasRenderingContext2D; k: number; dirty: [number, number, number, number] | null }[] = [];
  private parts: P[] = []; private raf = 0; private t0 = 0; private last = 0; private dur = 4600; private intensity = 1; private reduced = false; private timing = DEFAULT_TIMING;
  private rnd: () => number = Math.random; private quality = 1; private level = 0; private levelCooldown = 0; private onDone: (() => void) | null = null; private burstDone = false; private burstAt = 0;
  private areaK = 1; private smokeCap = 100; private volBaseK = [0.8, 0.4]; private ember: string[] = []; private smokeSpr: Cnv | null = null;
  private job: Generator<void> | null = null; private jobDone = false; private jobWaiters: ((ok: boolean) => void)[] = []; private jobToken = 0; private placed = false;
  private seed = 1; private preparedReduced = false; private frameIdx = 0; private acc = 0; private probeCanvas: Cnv | null = null;
  private afterPlay: (() => void) | null = null; private probed = false;
  /** CPU 端圖源（createImageBitmap，於背景執行緒解碼）：需要讀回像素的步驟只用它，避免同步解碼／GPU 讀回的長工作 */
  private dataSrc: string | null = null;
  private cpuImg: ImageBitmap | null = null; private cpuImgState = 0; private waiting = false;
  probeMs = 0; lowPower = false; private liveProbe: number[] = [];
  stats: FrameStats = this.emptyStats(); prof: Record<string, number> = {};

  constructor(canvas?: Cnv, opts: { maxDpr?: number } = {}) {
    this.canvas = canvas ?? document.createElement('canvas'); this.ctx = ctx2d(this.canvas); this.maxDpr = opts.maxDpr ?? 1.5;
    if (!SPRITES) SPRITES = basicSprites();
    for (const k of [0.8, 0.4]) { const c = mkCanvas(1, 1); this.vol.push({ c, g: ctx2d(c), k, dirty: null }); }
  }
  private emptyStats(): FrameStats { return { frames: 0, avgDt: 0, maxDt: 0, over20: 0, over33: 0, degraded: false, level: 0, maxAt: 0, peakParticles: 0, shards: 0, durationMs: 0, reduced: false, dts: [], preparedAtPlay: false, coldStart: false, liveShards: 0, probeMs: 0, lowPower: false, beast: 'generic' }; }
  get isPrepared() { return this.jobDone; }
  get beastKey() { return this.beast; }
  get regionBox(): BossBox { return { ...this.region }; }
  /** 卡（含金框）在畫布區域內的位置 */
  get bossBox(): BossBox { return { ...this.box }; }
  get preparedSize(): Size { return { width: this.cw, height: this.ch }; }

  /**
   * 設定卡面並排入預備工作（不需知道卡在畫面上的位置）。image：已解碼的 <img> 或任何 CanvasImageSource。
   * size＝整張卡（含金框）CSS 尺寸。回傳 Promise：全部完成 resolve(true)；被新的 prepare/destroy 取代 resolve(false)。
   */
  prepare(image: CanvasImageSource, size: Size, opts: PrepareOptions = {}): Promise<boolean> {
    if (this.raf) return new Promise<boolean>((r) => { this.afterPlay = () => this.prepare(image, size, opts).then(r); }); // 播放中不換碎法：播完才做
    this.jobToken++; this.flushWaiters(false); this.abandonJob();
    this.img = image; const im = image as any; this.imgW = im.naturalWidth || im.videoWidth || im.width || 1; this.imgH = im.naturalHeight || im.videoHeight || im.height || 1;
    this.cw = Math.max(8, size.width); this.ch = Math.max(8, size.height);
    this.frameStyle = opts.frame === false ? false : { ...DEFAULT_FRAME, ...(opts.frame || {}) };
    this.beast = (opts.beast && opts.beast in BEAST ? opts.beast : 'generic') as BeastKey;
    if (opts.maxDpr) this.maxDpr = opts.maxDpr;
    this.sdpr = clamp(Math.min(this.maxDpr, opts.dpr ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)), 1, 2);
    this.reduced = !!opts.reducedMotion; this.preparedReduced = this.reduced; this.intensity = clamp(opts.intensity ?? 1, 0.6, 1.4);
    this.seed = ((opts.seed ?? ((Math.random() * 2 ** 31) | 0)) ^ hashStr(this.beast)) >>> 0;
    this.reach = Math.hypot(this.cw, this.ch) / 2; this.areaK = clamp(Math.sqrt((300 * 225) / (this.cw * this.ch)), 0.55, 1); this.smokeCap = this.reach * 0.5;
    const B = BEAST[this.beast]; this.ember = Array.from({ length: 8 }, (_, i) => { const k = i / 7, a = B.ember[0], b = B.ember[1]; return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`; });
    const s = B.smoke; this.smokeSpr = radial(64, [[0, `rgba(${s[0]},${s[1]},${s[2]},0.7)`], [0.45, `rgba(${Math.round(s[0] * 0.7)},${Math.round(s[1] * 0.7)},${Math.round(s[2] * 0.7)},0.42)`], [1, 'rgba(14,10,8,0)']]);
    this.card = null; this.shards = []; this.cracksHot = this.cracksCool = null; this.dissolve = []; this.jobDone = false;
    if (!this.placed) this.place({ width: this.cw * 3.4, height: this.ch * 4.4 }, { x: this.cw * 1.2, y: this.ch * 1.2, width: this.cw, height: this.ch }), (this.placed = false);
    this.cpuImg = null; this.cpuImgState = 0; const tok = this.jobToken;
    const isrc = (image as any).currentSrc || (image as any).src; this.dataSrc = typeof isrc === 'string' && isrc.startsWith('data:') && typeof createImageBitmap === 'function' ? isrc : null;
    if (this.dataSrc) this.cpuImgState = 1; // data: URL：在預備佇列中分段解 base64（fetch(data:) 會在主執行緒一次解完 → 長工作）
    else if (typeof createImageBitmap === 'function' && typeof fetch === 'function' && typeof isrc === 'string' && isrc) { this.cpuImgState = 1; fetch(isrc).then((r) => r.blob()).then((bl) => createImageBitmap(bl)).then((bm) => { if (tok !== this.jobToken) { bm.close?.(); return; } this.cpuImg = bm; this.cpuImgState = 2; }, () => { if (tok === this.jobToken) this.cpuImgState = 3; }); } else this.cpuImgState = 3;
    this.job = this.prepSteps(); const p = new Promise<boolean>((r) => this.jobWaiters.push(r)); this.schedule(this.jobToken); return p;
  }
  whenPrepared(): Promise<boolean> { if (this.jobDone) return Promise.resolve(true); if (!this.job) return Promise.resolve(false); return new Promise((r) => this.jobWaiters.push(r)); }
  /** v3 相容名稱 */
  arm(): Promise<boolean> { return this.whenPrepared(); }

  /** 決定畫布區域（container 座標；cardBox＝整張卡）。只配置畫布，不重做預備；卡大小與預備時不同會整體縮放。 */
  place(container: Size, cardBox: BossBox, devicePixelRatio?: number): BossBox {
    const M = Math.max(cardBox.width, cardBox.height);
    const x0 = clamp(cardBox.x - 0.8 * M, 0, container.width), x1 = clamp(cardBox.x + cardBox.width + 0.8 * M, 0, container.width);
    const y0 = clamp(cardBox.y - 0.65 * M, 0, container.height), y1 = clamp(cardBox.y + cardBox.height + 1.25 * M, 0, container.height); // 下方留多：燃燒殘骸落下
    this.region = { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
    this.box = { x: cardBox.x - x0, y: cardBox.y - y0, width: cardBox.width, height: cardBox.height };
    const budget = this.lowPower ? 250000 : 950000; const dd = devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.dpr = clamp(Math.min(this.maxDpr, dd, Math.sqrt(budget / (this.region.width * this.region.height))), this.lowPower ? 0.7 : 1, 2);
    const W = Math.round(this.region.width * this.dpr), H = Math.round(this.region.height * this.dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    const R = Math.hypot(cardBox.width, cardBox.height) / 2;
    this.volBaseK = [this.lowPower ? 0.36 : clamp(210 / R, 0.55, 1), this.lowPower ? 0.2 : clamp(80 / R, 0.25, 0.42)];
    this.vol.forEach((v, i) => { v.k = this.volBaseK[i]; const w = Math.max(1, Math.round(this.region.width * v.k)), h = Math.max(1, Math.round(this.region.height * v.k)); if (v.c.width !== w || v.c.height !== h) { v.c.width = w; v.c.height = h; } v.dirty = null; });
    this.placed = true; return this.regionBox;
  }

  /** 放棄舊佇列時一定要 return()，讓共用精靈建構的 finally 釋放鎖（否則下一個佇列會永遠等） */
  private abandonJob() { const j = this.job; this.job = null; if (j) { try { j.return(undefined); } catch { /* ignore */ } } }
  private schedule(token: number) { postTask(() => { if (token !== this.jobToken || this.jobDone) return; if (!this.raf) this.pump(6); if (this.jobDone) return; if (this.waiting) setTimeout(() => this.schedule(token), 16); else this.schedule(token); }); }
  /** 執行預備步驟直到 budgetMs 用完；回傳是否全部完成 */
  pump(budgetMs: number): boolean {
    if (this.jobDone || !this.job) return this.jobDone; const t0 = performance.now();
    while (performance.now() - t0 < budgetMs) { this.waiting = false; const r = this.job.next(); if (this.waiting) break; if (r.done) { this.jobDone = true; this.job = null; this.flushWaiters(true); break; } }
    return this.jobDone;
  }
  private flushWaiters(ok: boolean) { const w = this.jobWaiters; this.jobWaiters = []; for (const f of w) f(ok); }
  /** 依「播放時最先需要」排序：卡面 → 碎裂 → 裂紋 → 精靈 → 碎片預渲染 →（短版燒蝕）→ GPU 預熱 → 探測 */
  private *prepSteps(): Generator<void> {
    this.rnd = mulberry32(this.seed);
    this.buildCard(); yield;
    if (!this.raf && !this.probed) { this.probeMs = this.probe(); yield; this.probeMs = Math.min(this.probeMs, this.probe()); yield; this.probed = true; this.setLowPower(this.probeMs > PROBE_LIMIT); }
    this.flush(this.card);
    if (this.dataSrc) yield* this.bitmapSteps(this.dataSrc, this.jobToken);
    yield* this.fractureSteps();
    yield* this.crackSteps();
    yield* spriteSteps();
    for (const s of this.shards) { if (!s.clean && !this.lowPower) { s.clean = this.renderShard(s, false); yield; } if (!s.charred) { s.charred = this.renderShard(s, true); this.flush(s.charred); yield; } }
    if (this.reduced) yield* this.dissolveSteps();
    const S = SPRITES!; const list: Cnv[] = [this.card!, this.cracksHot!, this.cracksCool!, ...this.shards.flatMap((s) => [s.clean, s.charred].filter(Boolean) as Cnv[]), ...S.lick.hot, ...S.lick.mid, ...S.lick.cool, ...S.pockets, S.smoke, S.spark, S.glowSoft, this.smokeSpr!, ...this.dissolve];
    if (!this.lowPower) for (const c of list) { if (!this.raf) { const g = this.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.003; g.drawImage(c, 0, 0, Math.min(40, c.width), Math.min(40, c.height)); g.globalAlpha = 1; g.clearRect(0, 0, 41, 41); } yield; }
    if (!this.lowPower) for (const v of this.vol) { v.g.setTransform(1, 0, 0, 1, 0, 0); v.g.globalAlpha = 0.003; v.g.drawImage(S.lick.hot[0], 0, 0, 8, 8); v.g.globalAlpha = 1; v.g.clearRect(0, 0, 9, 9); yield; }
  }
  private *bitmapSteps(src: string, tok: number): Generator<void> {
    try {
      const comma = src.indexOf(','); const mime = /data:([^;,]+)/.exec(src)?.[1] || 'image/webp'; const b64 = src.slice(comma + 1); const parts: Uint8Array[] = []; const CH = 16384;
      for (let i = 0; i < b64.length; i += CH) { const bin = atob(b64.slice(i, i + CH)); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); parts.push(u); yield; }
      createImageBitmap(new Blob(parts as BlobPart[], { type: mime })).then((bm) => { if (tok !== this.jobToken) { bm.close?.(); return; } this.cpuImg = bm; this.cpuImgState = 2; }, () => { if (tok === this.jobToken) this.cpuImgState = 3; });
    } catch { this.cpuImgState = 3; }
  }
  /** 裝置探測：15 條火舌（v4：由 60 減為 15，軟體畫布上單步 ≤ 約 20ms＠6×）畫進火焰緩衝，再把緩衝貼到 16×16 暫存畫布（軟體路徑會同步光柵化；GPU 只記錄指令）。兩次取最小值。 */
  private probe(): number {
    const S = SPRITES!; const spr = S.glowSoft; const v = this.vol[0], b = v.g; const scratch = this.probeCanvas ?? (this.probeCanvas = mkCanvas(16, 16)); const sg = ctx2d(scratch);
    const t0 = performance.now(); b.globalAlpha = 0.004; const W = v.c.width, H = v.c.height, s = Math.min(W, H) * 0.22;
    for (let i = 0; i < 15; i++) { const a = (i / 15) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); b.setTransform(c, sn, -sn, c, W / 2 + c * W * 0.2, H / 2 + sn * H * 0.2); b.drawImage(spr, -s * 0.65, -s * 0.35, s * 1.3, s * 2.1); }
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; sg.drawImage(v.c, 0, 0, 16, 16); const ms = performance.now() - t0; b.clearRect(0, 0, W, H); return ms;
  }
  /** 低階（軟體畫布）時：讓該畫布的繪製指令在本步驟內就光柵化（1×1 讀回），不累積到下一幀一次做完 */
  private flush(c: Cnv | null) { if (!this.lowPower || !c) return; try { ctx2d(c).getImageData(0, 0, 1, 1); } catch { /* ignore */ } }
  private setLowPower(on: boolean) {
    if (on === this.lowPower) return; this.lowPower = on; if (!this.placed) return;
    const r = this.region, b = this.box; const k = this.lowPower ? 0.7 : 1;
    const budget = on ? 250000 : 950000; this.dpr = clamp(Math.min(this.maxDpr, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, Math.sqrt(budget / (r.width * r.height))), k, 2);
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    const R = Math.hypot(b.width, b.height) / 2; this.volBaseK = [on ? 0.36 : clamp(210 / R, 0.55, 1), on ? 0.2 : clamp(80 / R, 0.25, 0.42)];
    this.vol.forEach((v, i) => { v.k = this.volBaseK[i]; v.c.width = Math.max(1, Math.round(r.width * v.k)); v.c.height = Math.max(1, Math.round(r.height * v.k)); v.dirty = null; });
  }

  /** 卡面點陣化：金框（漸層、圓角）＋內框底色＋圖（object-fit: cover、圓角裁切）——與 DOM 卡面一致，onStart 隱藏原卡時無縫 */
  private buildCard() { const d = this.sdpr; const c = mkCanvas(this.cw * d, this.ch * d); this.paintCard(ctx2d(c), d); this.card = c; }
  /** 卡面（金框＋圖）畫到任一 2D context；也用來畫 CPU 端可讀回的小圖（避免從 GPU 畫布讀回造成長工作） */
  private paintCard(g: CanvasRenderingContext2D, d: number, src: CanvasImageSource | null = this.img) {
    const w = this.cw, h = this.ch; g.setTransform(d, 0, 0, d, 0, 0);
    let ix = 0, iy = 0, iw = w, ih = h, ir = 0;
    if (this.frameStyle) {
      const f = this.frameStyle; const a = (f.angleDeg * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a); const L = Math.abs(w * dx) + Math.abs(h * dy);
      const gr = g.createLinearGradient(w / 2 - (dx * L) / 2, h / 2 - (dy * L) / 2, w / 2 + (dx * L) / 2, h / 2 + (dy * L) / 2); for (const [o, col] of f.stops) gr.addColorStop(o, col);
      roundRect(g, 0, 0, w, h, f.radius); g.fillStyle = gr; g.fill();
      ix = iy = f.thickness; iw = w - 2 * f.thickness; ih = h - 2 * f.thickness; ir = f.innerRadius; roundRect(g, ix, iy, iw, ih, ir); g.fillStyle = f.inner; g.fill();
    }
    g.save(); roundRect(g, ix, iy, iw, ih, ir); g.clip();
    const s = Math.max(iw / this.imgW, ih / this.imgH), sw = iw / s, sh = ih / s; try { if (src) g.drawImage(src, (this.imgW - sw) / 2, (this.imgH - sh) / 2, sw, sh, ix, iy, iw, ih); } catch { /* 圖尚不可畫：只留金框 */ } g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  private clipCard(g: CanvasRenderingContext2D, ox: number, oy: number) { roundRect(g, ox, oy, this.cw, this.ch, this.frameStyle ? this.frameStyle.radius : 0); g.clip(); }
  /** 每隻神獸不同的碎裂圖樣（Voronoi 種子點，0..1 正規化座標） */
  private sites(): Pt[] {
    const r = this.rnd, I = this.intensity; const out: Pt[] = []; const [ix, iy] = [this.impact[0] / this.cw, this.impact[1] / this.ch];
    const jit = (p: Pt, a: number): Pt => [clamp(p[0] + (r() - 0.5) * a, 0.02, 0.98), clamp(p[1] + (r() - 0.5) * a, 0.02, 0.98)];
    switch (this.beast) {
      case 'baihu': { // 爪痕：3～4 道平行斜線，沿線密集 → 長條碎片
        const n = 3 + (r() < 0.5 ? 1 : 0), ang = -0.95 + (r() - 0.5) * 0.3, dx = Math.cos(ang), dy = Math.sin(ang);
        for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 0.17; for (let t = -0.6; t <= 0.6; t += 0.16 + r() * 0.06) out.push(jit([ix + dx * t - dy * off, iy + dy * t + dx * off], 0.05)); }
        break; }
      case 'qinglong': { // 螺旋（龍盤）
        const turns = 2.2, ph = r() * 6.28; for (let k = 0; k < 22; k++) { const f = k / 21, th = ph + f * turns * 6.28, rr = 0.06 + f * 0.62; out.push(jit([ix + Math.cos(th) * rr * 0.8, iy + Math.sin(th) * rr * 0.62], 0.04)); }
        break; }
      case 'xuanwu': { // 龜甲：六角格
        const s = 0.2; for (let row = -1; row < 7; row++) for (let col = -1; col < 6; col++) { const x = col * s * 0.87 + (row & 1 ? s * 0.43 : 0), y = row * s * 0.75 * 0.8; if (x > -0.05 && x < 1.05 && y > -0.05 && y < 1.05) out.push(jit([x, y], 0.035)); }
        break; }
      case 'zhuque': { // 羽扇：自底部往上展開的放射羽片
        const ox = 0.5 + (r() - 0.5) * 0.1, oy = 1.04; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.24 + (r() - 0.5) * 0.06; for (const rr of [0.28, 0.52, 0.78, 1.0]) out.push(jit([ox + Math.cos(a) * rr * 0.75, oy + Math.sin(a) * rr], 0.04)); }
        break; }
      default: { for (const [rr, n] of [[0.14, 5], [0.32, 8], [0.55, 10]] as const) { const a0 = r() * 6.28; for (let k = 0; k < n; k++) { const a = a0 + (k + r() * 0.5) * (6.28 / n); out.push(jit([ix + Math.cos(a) * rr, iy + Math.sin(a) * rr * 1.2], 0.05)); } } }
    }
    // 爆心附近再加幾個小碎片（爆心碎得最細）；整體再加少量隨機點，避免過度規則
    for (let k = 0; k < 4 + Math.round(I * 2); k++) { const a = r() * 6.28, rr = 0.03 + r() * 0.09; out.push([ix + Math.cos(a) * rr, iy + Math.sin(a) * rr]); }
    for (let k = 0; k < 4; k++) out.push([0.05 + r() * 0.9, 0.05 + r() * 0.9]);
    // 太近的點合併
    const res: Pt[] = []; for (const p of out) if (p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1 && !res.some((q) => Math.hypot((q[0] - p[0]) * this.cw, (q[1] - p[1]) * this.ch) < Math.min(this.cw, this.ch) * 0.075)) res.push(p);
    return res.slice(0, 30).map((p) => [p[0] * this.cw, p[1] * this.ch] as Pt);
  }
  /** 低解析度影像梯度圖：裂紋貼著圖中的輪廓走（只讀一張 ≤96px 的離屏小畫布，不動主畫布） */
  private gradMap(): { gw: number; gh: number; g: Float32Array } {
    const gw = 96, gh = Math.max(8, Math.round((96 * this.ch) / this.cw)); const c = mkCanvas(gw, gh); const x = ctx2d(c, true);
    if (!this.cpuImg) return { gw, gh, g: new Float32Array(gw * gh) }; this.paintCard(x, gw / this.cw, this.cpuImg); let d: Uint8ClampedArray; try { d = x.getImageData(0, 0, gw, gh).data; } catch { return { gw, gh, g: new Float32Array(gw * gh) }; }
    const L = new Float32Array(gw * gh); for (let i = 0; i < gw * gh; i++) L[i] = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    const g = new Float32Array(gw * gh); for (let yy = 1; yy < gh - 1; yy++) for (let xx = 1; xx < gw - 1; xx++) { const i = yy * gw + xx; g[i] = Math.hypot(L[i + 1] - L[i - 1], L[i + gw] - L[i - gw]); }
    return { gw, gh, g };
  }
  private edgeCache = new Map<string, Pt[]>();
  /** 兩格之間共用的裂紋折線（碎片外形與裂紋完全一致）：細分＋噪聲擺動＋往影像輪廓吸附 */
  private edgeLine(a: Pt, b: Pt, key: string, gm: { gw: number; gh: number; g: Float32Array }): Pt[] {
    const flip = a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]); const p = flip ? b : a, q = flip ? a : b; const k = `${key}|${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    let line = this.edgeCache.get(k);
    if (!line) {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(2, Math.round(len / 5)); const nx = -(q[1] - p[1]) / (len || 1), ny = (q[0] - p[0]) / (len || 1);
      const amp = Math.min(this.cw, this.ch) * 0.026; const nz = noise1(mulberry32(hashStr(k) ^ this.seed), 16); line = [p]; const off: number[] = [0];
      for (let i = 1; i < n; i++) {
        const t = i / n; const x = lerp(p[0], q[0], t), y = lerp(p[1], q[1], t);
        let best = 0, bo = 0; for (let o = -3; o <= 3; o++) { const sx = x + nx * o * amp * 0.33, sy = y + ny * o * amp * 0.33; const gi = Math.round(clamp(sy / this.ch, 0, 1) * (gm.gh - 1)) * gm.gw + Math.round(clamp(sx / this.cw, 0, 1) * (gm.gw - 1)); const v = gm.g[gi] * (1 - Math.abs(o) * 0.08); if (v > best) { best = v; bo = o; } }
        off.push((best > 18 ? bo * amp * 0.33 * 0.6 : 0) + (nz(t * 0.9) - 0.5) * amp * 1.2 + (this.rnd() - 0.5) * amp * 0.12);
      }
      off.push(0);
      for (let pass = 0; pass < 3; pass++) for (let i = 1; i < off.length - 1; i++) off[i] = (off[i - 1] + 2 * off[i] + off[i + 1]) / 4; // 平滑：曲折而不鋸齒
      for (let i = 1; i < n; i++) { const t = i / n, env = Math.sin(Math.PI * t); line.push([lerp(p[0], q[0], t) + nx * off[i] * env, lerp(p[1], q[1], t) + ny * off[i] * env]); }
      line.push(q); this.edgeCache.set(k, line);
    }
    return flip ? line.slice().reverse() : line;
  }
  private crackEdges: { pts: Pt[]; w: number; seed: number }[] = [];
  private *fractureSteps(): Generator<void> {
    const w = this.cw, h = this.ch, rnd = this.rnd, I = this.intensity; this.impact = [w * (0.42 + rnd() * 0.16), h * (0.38 + rnd() * 0.14)];
    const sites = this.sites(); yield; const tw = performance.now(); while (this.cpuImgState === 1 && performance.now() - tw < 1500) { this.waiting = true; yield; } const gm = this.gradMap(); yield; this.edgeCache.clear(); this.crackEdges = [];
    const rect: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]]; const shards: Shard[] = []; const diag = Math.hypot(w, h); const [cx, cy] = this.impact;
    const ft = this.frameStyle ? this.frameStyle.thickness + 1 : 0;
    for (let i = 0; i < sites.length; i++) {
      let cell = rect; const [px, py] = sites[i];
      for (let j = 0; j < sites.length && cell.length >= 3; j++) { if (j === i) continue; const [qx, qy] = sites[j]; cell = clipHalf(cell, (px + qx) / 2, (py + qy) / 2, px - qx, py - qy); }
      if (cell.length < 3 || area(cell) < 25) continue;
      const fib: Pt[] = [];
      for (let e = 0; e < cell.length; e++) {
        const a = cell[e], b = cell[(e + 1) % cell.length];
        if (onBorderSeg(a, b, w, h)) { fib.push(a); continue; }
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; let nb = -1, bd = Infinity; const di = Math.hypot(mx - px, my - py);
        for (let j = 0; j < sites.length; j++) { if (j === i) continue; const dd = Math.abs(Math.hypot(mx - sites[j][0], my - sites[j][1]) - di); if (dd < bd) { bd = dd; nb = j; } }
        const key = `${Math.min(i, nb)}-${Math.max(i, nb)}`; const line = this.edgeLine(a, b, key, gm);
        if (i < nb) this.crackEdges.push({ pts: line, w: 0.7 + rnd() * 0.9, seed: rnd() * 1000 });
        for (let k = 0; k < line.length - 1; k++) fib.push(line[k]);
      }
      let bx = Infinity, by = Infinity, ex = -Infinity, ey = -Infinity; for (const [x, y] of fib) { bx = Math.min(bx, x); by = Math.min(by, y); ex = Math.max(ex, x); ey = Math.max(ey, y); }
      bx = Math.max(0, bx - 3); by = Math.max(0, by - 3); ex = Math.min(w, ex + 3); ey = Math.min(h, ey + 3);
      const [gx, gy] = centroid(cell); const dx = gx - cx, dy = gy - cy, dist = Math.hypot(dx, dy) || 1;
      const debris = rnd() < 0.4; const sp = diag * (debris ? 0.22 + rnd() * 0.3 : 0.38 + rnd() * 0.55) * (0.7 + 0.6 * (1 - dist / diag)) * (0.8 + 0.2 * I);
      const ang = Math.atan2(dy, dx) + (rnd() - 0.5) * 0.6; const hasFrame = !!this.frameStyle && (bx < ft || by < ft || ex > w - ft || ey > h - ft);
      shards.push({ poly: cell, fib, cx: gx, cy: gy, bx, by, bw: ex - bx, bh: ey - by, clean: null, charred: null, x: 0, y: 0,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - diag * (debris ? 0.25 : 0.12), rot: 0, vr: (rnd() - 0.5) * (hasFrame ? 7 : 5), z: -0.45 + rnd() * 1.25,
        burnAt: debris ? 1.4 + rnd() * 1.9 : 0.3 + rnd() * 0.9, burnDur: debris ? 0.6 + rnd() * 0.6 : 0.5 + rnd() * 0.5, layer: rnd() < 0.32 ? 1 : 0, debris, ash: false, hasFrame });
      if ((i & 1) === 1) yield;
    }
    this.shards = shards;
  }
  /** 裂紋點陣：cool＝焦黑＋暗紅（蓄力初期）；hot＝再加斷續的熾熱芯（神獸元素色），寬度沿線變化，全部裁在圓角卡內 */
  private *crackSteps(): Generator<void> {
    const d = this.sdpr, w = this.cw, h = this.ch; const B = BEAST[this.beast];
    const mk = () => { const c = mkCanvas(w * d, h * d); const g = ctx2d(c); g.scale(d, d); this.clipCard(g, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round'; return { c, g }; };
    const cool = mk(), hot = mk(); const base = Math.max(1.0, Math.min(w, h) * 0.0068);
    const bands: [CanvasRenderingContext2D, string, number, number][] = [[cool.g, 'rgba(12,5,3,0.88)', 2.6, 0], [cool.g, 'rgba(104,20,8,0.8)', 1.2, 0], [hot.g, 'rgba(12,5,3,0.9)', 3.0, 0], [hot.g, 'rgba(132,26,8,0.88)', 1.5, 0], [hot.g, B.hot, 0.5, 0.45]];
    let n = 0;
    for (const e of this.crackEdges) {
      const nz = noise1(mulberry32(e.seed * 1000), 24); const L = e.pts.length;
      for (const [g, col, k, gate] of bands) { g.strokeStyle = col;
        for (let i = 0; i < L - 1; i++) { const t = i / (L - 1), v = nz(t); if (gate && v < gate) continue; const ww = base * e.w * k * (0.35 + 1.3 * v);
          g.lineWidth = ww; g.beginPath(); g.moveTo(e.pts[i][0], e.pts[i][1]); g.lineTo(e.pts[i + 1][0], e.pts[i + 1][1]); g.stroke(); } }
      if ((++n & 3) === 0) { this.flush(cool.c); this.flush(hot.c); yield; }
    }
    this.flush(cool.c); this.flush(hot.c); this.cracksCool = cool.c; this.cracksHot = hot.c;
  }
  private shardPath(g: CanvasRenderingContext2D, s: Shard) { g.beginPath(); s.fib.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  /** 碎片預渲染：圖＋燒邊（寬度沿周長變化的焦黑帶／暗紅帶、斷續餘燼點、焦斑）——不是整圈均勻橘線 */
  private renderShard(s: Shard, charred: boolean): Cnv {
    const d = this.sdpr; const c = mkCanvas(s.bw * d, s.bh * d); const g = ctx2d(c); g.scale(d, d); g.translate(-s.bx, -s.by);
    g.save(); this.clipCard(g, 0, 0); this.shardPath(g, s); g.clip();
    g.drawImage(this.card!, s.bx * d, s.by * d, s.bw * d, s.bh * d, s.bx, s.by, s.bw, s.bh);
    const r = mulberry32(((s.cx * 131 + s.cy * 7) | 0) ^ this.seed); const nz = noise1(r, 32), nz2 = noise1(r, 48); const amp = Math.max(1.4, Math.min(this.cw, this.ch) * 0.011); const B = BEAST[this.beast];
    const F = s.fib, L = F.length; g.lineCap = 'round';
    const band = (col: string, k: number, gate: number, nzf: (t: number) => number) => { g.strokeStyle = col; for (let i = 0; i < L; i++) { const t = i / L, v = nzf(t); if (v < gate) continue; const a = F[i], b = F[(i + 1) % L]; if (onBorderSeg(a, b, this.cw, this.ch)) continue; g.lineWidth = amp * k * (0.25 + 1.6 * v); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } };
    band(charred ? 'rgba(10,4,3,0.9)' : 'rgba(18,8,5,0.72)', charred ? 3.6 : 2.0, 0, nz);
    band(charred ? 'rgba(112,26,8,0.8)' : 'rgba(96,24,10,0.6)', charred ? 1.8 : 1.1, 0.3, nz);
    band(charred ? B.hot : 'rgba(236,128,44,0.85)', 0.55, charred ? 0.5 : 0.62, nz2);
    const S = SPRITES; if (S && S.pockets.length) { const n = charred ? 3 : 1; for (let k = 0; k < n; k++) { const p = F[(r() * L) | 0], sz = amp * (charred ? 6 + r() * 6 : 3 + r() * 3); g.globalAlpha = charred ? 0.85 : 0.55; g.drawImage(S.pockets[k % S.pockets.length], p[0] - sz / 2, p[1] - sz / 2, sz, sz); } g.globalAlpha = 1; }
    if (charred) { g.globalAlpha = 0.5; g.fillStyle = 'rgb(24,10,6)'; g.fillRect(s.bx, s.by, s.bw, s.bh); g.globalAlpha = 1; }
    g.restore(); return c;
  }
  /** 減少動態：6 張預先算好的「燒蝕」階段圖（噪聲＋距爆心＋沿裂紋先燒），有焦黑帶與燃燒前緣；播放時只交叉淡化，無位移、無色罩 */
  private *dissolveSteps(): Generator<void> {
    const w = Math.round(this.cw), h = Math.round(this.ch); const N = 6; const base = mkCanvas(w, h); const bg = ctx2d(base, true); if (!this.cpuImg) return; this.paintCard(bg, w / this.cw, this.cpuImg); yield;
    const cc = mkCanvas(w, h), cg = ctx2d(cc, true); const lw = Math.max(1.0, Math.min(this.cw, this.ch) * 0.0068) * 2.6; cg.lineCap = 'round'; cg.lineJoin = 'round'; cg.strokeStyle = 'rgba(12,5,3,0.88)';
    for (const e of this.crackEdges) { cg.lineWidth = lw * e.w; cg.beginPath(); e.pts.forEach(([x, y], i) => (i ? cg.lineTo(x, y) : cg.moveTo(x, y))); cg.stroke(); }
    yield; let src: Uint8ClampedArray, crk: Uint8ClampedArray; try { crk = cg.getImageData(0, 0, w, h).data; yield;
      // 裂紋疊回底圖（CPU 端畫布，讀回不碰 GPU）
      bg.drawImage(cc, 0, 0); src = bg.getImageData(0, 0, w, h).data; } catch { return; }
    yield; const { fbm } = makeValueNoise(mulberry32(this.seed ^ 77)); const F = new Float32Array(w * h); const [cx, cy] = this.impact; const R = this.reach;
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const i = y * w + x; F[i] = (Math.hypot(x - cx, y - cy) / R) * 0.55 + fbm(x / w * 4, y / h * 4) * 0.6 - (crk[i * 4 + 3] / 255) * 0.18; } if ((y & 15) === 15) yield; }
    const B = BEAST[this.beast]; const hm = /rgb\((\d+),(\d+),(\d+)\)/.exec(B.hot)!; const hr = +hm[1], hg = +hm[2], hb = +hm[3];
    this.dissolve = [];
    for (let k = 1; k <= N; k++) {
      const th = -0.05 + (k / N) * 1.25, band = 0.09; const id = bg.createImageData(w, h); const o = id.data;
      for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const i = y * w + x, j = i * 4; const f = F[i] - th; const a = src[j + 3];
        if (f < 0) { o[j + 3] = 0; continue; }
        if (f < band) { const u = f / band; if (u < 0.35) { o[j] = hr; o[j + 1] = hg; o[j + 2] = hb; o[j + 3] = Math.round(a * u / 0.35); } else { const m = (u - 0.35) / 0.65; o[j] = lerp(26, src[j] * 0.35, m); o[j + 1] = lerp(10, src[j + 1] * 0.3, m); o[j + 2] = lerp(6, src[j + 2] * 0.28, m); o[j + 3] = a; } continue; }
        const m = clamp((f - band) / 0.12, 0, 1); o[j] = lerp(src[j] * 0.35, src[j], m); o[j + 1] = lerp(src[j + 1] * 0.3, src[j + 1], m); o[j + 2] = lerp(src[j + 2] * 0.28, src[j + 2], m); o[j + 3] = a; }
        if ((y & 15) === 15) yield; }
      const c = mkCanvas(w, h); ctx2d(c).putImageData(id, 0, 0); this.dissolve.push(c); yield;
    }
  }
  private liveDt: number[] = [];
  private tShift = 0; private fadeK = 1; private directBudget = 0;
  private spawn(p: Omit<P, 'age' | 'seed' | 'core'> & { core?: number }) {
    const cap = this.lowPower ? 95 : this.level >= 2 ? 110 : MAX_PARTICLES; const prio = p.core === 1 || p.kind === 6;
    if (this.parts.length >= (prio ? cap : cap - 40)) return; if (this.quality < 1 && !prio && this.rnd() > this.quality) return;
    this.parts.push({ core: 0, ...p, age: 0, seed: this.rnd() * 100 });
  }
  /**
   * 播放（只在伺服端確認擊倒後呼叫）。永遠在同一 task 內畫出第 0 幀；預備未完成時優雅降級（剩餘步驟於播放中每幀 ≤3ms 繼續）。
   */
  play(opts: PlayOptions = {}, onDone?: () => void) {
    this.stop(); if (!this.img) { onDone?.(); return; }
    this.reduced = opts.reducedMotion ?? this.preparedReduced; this.dur = this.reduced ? 1200 : clamp(opts.durationMs ?? 4600, 3000, 5200);
    if (opts.intensity) this.intensity = clamp(opts.intensity, 0.6, 1.4); this.timing = { ...DEFAULT_TIMING, ...(opts.timing || {}) };
    const preparedAtPlay = this.jobDone; if (!this.card) this.buildCard();
    if (this.reduced && !this.dissolve.length && this.jobDone && this.cracksHot) { this.job = this.dissolveSteps(); this.jobDone = false; }
    for (const v of this.vol) { v.k = this.volBaseK[this.vol.indexOf(v)]; v.g.setTransform(1, 0, 0, 1, 0, 0); v.g.clearRect(0, 0, v.c.width, v.c.height); v.dirty = null; }
    this.quality = this.lowPower ? 0.6 : 1; this.level = this.lowPower ? 1 : 0; this.levelCooldown = 0; this.parts = []; this.burstDone = false; this.onDone = onDone || null; this.tShift = 0; this.fadeK = 1; this.liveProbe = []; this.liveDt = []; this.frameIdx = 0; this.acc = 0;
    for (const s of this.shards) { s.x = s.y = s.rot = 0; s.ash = false; }
    this.secondary = [0.75, 1.4, 2.1, 2.85].map((t) => ({ t: t + (this.rnd() - 0.5) * 0.2, shard: -1, k: 0.85 + this.rnd() * 0.5, done: false }));
    this.prof = {}; const st = (this.stats = this.emptyStats()); st.shards = this.shards.length; st.durationMs = this.dur; st.reduced = this.reduced; st.preparedAtPlay = preparedAtPlay; st.coldStart = !preparedAtPlay; st.probeMs = +this.probeMs.toFixed(2); st.lowPower = this.lowPower; st.level = this.level; st.beast = this.beast;
    this.canvas.style.opacity = '';
    this.t0 = performance.now(); this.last = this.t0; this.frame(0, 0);
    this.raf = requestAnimationFrame(this.loop);
  }
  private loop = (now: number) => {
    if (!this.raf) return; const rawDt = now - this.last; this.last = now; const st = this.stats;
    if (st.frames > 0) { if (rawDt > st.maxDt) st.maxAt = Math.round(now - this.t0); this.recordDt(rawDt); } st.frames++;
    const w0 = performance.now(); if (!this.jobDone) this.pump(3);
    const el = now - this.t0 - this.tShift; const t = el / this.dur; if (t >= 1) { this.clear(); this.finish(); return; }
    this.acc += Math.min(0.05, rawDt / 1000); this.frameIdx++;
    if (this.lowPower && !this.reduced && (this.frameIdx & 1) === 1 && t > 0.02) { this.raf = requestAnimationFrame(this.loop); return; } // 低階：30fps 節奏
    const dt = Math.min(0.07, this.acc); this.acc = 0; this.frame(t, dt);
    const fade = t > 0.95 ? clamp((1 - t) / 0.05, 0, 1) : 1; if (fade !== this.fadeK) { this.fadeK = fade; this.canvas.style.opacity = fade < 1 ? fade.toFixed(3) : ''; }
    if (this.liveProbe.length < 16 && !this.reduced && st.frames > 1) { this.liveProbe.push(performance.now() - w0); this.liveDt.push(rawDt); if (!this.lowPower && (this.liveProbe.filter((x) => x > 7).length >= 3 || this.liveDt.filter((x) => x > 24).length >= 3)) { /* 即時探測：JS 工作 >7ms 或 rAF 間隔 >24ms（軟體畫布的光柵化不在 JS 時間內） */ this.setLowPower(true); this.level = Math.max(this.level, 1); this.quality = Math.min(this.quality, 0.6); st.lowPower = true; st.degraded = true; } }
    this.raf = requestAnimationFrame(this.loop);
  };
  /** 測試用：先同步完成預備，再以固定 60fps 離線步進到 ms 並停在該幀（截圖／亮度量測用；正式整合不需呼叫） */
  debugRenderAt(ms: number, opts: PlayOptions = {}) {
    while (!this.jobDone && this.job) this.pump(1000); const lp = this.lowPower; this.lowPower = false;
    this.play(opts); cancelAnimationFrame(this.raf); this.raf = 0; this.onDone = null; const step = 1000 / 60;
    for (let t = step; t <= ms; t += step) { const tt = (t - this.tShift) / this.dur; if (tt >= 1) { this.clear(); break; } this.frame(tt, step / 1000); this.fadeK = tt > 0.95 ? clamp((1 - tt) / 0.05, 0, 1) : 1; }
    this.canvas.style.opacity = this.fadeK < 1 ? this.fadeK.toFixed(3) : ''; this.lowPower = lp;
  }
  get playing() { return !!this.raf; }
  private recordDt(ms: number) {
    const s = this.stats; s.dts.push(ms); s.maxDt = Math.max(s.maxDt, ms); if (ms > 20) s.over20++; if (ms > 33.4) s.over33++; s.avgDt = s.dts.reduce((a, b) => a + b, 0) / s.dts.length;
    const n = s.dts.length; if (this.levelCooldown > 0) this.levelCooldown--; const lim = this.lowPower ? 40 : 20;
    if (n >= 5 && this.level < 3 && (this.levelCooldown === 0 || (ms > 45 && this.levelCooldown <= 4))) {
      const avg3 = (s.dts[n - 1] + s.dts[n - 2] + s.dts[n - 3]) / 3;
      if (avg3 > lim || ms > (this.lowPower ? 70 : 45)) {
        this.level++; this.levelCooldown = 6; this.quality = this.level === 1 ? 0.55 : this.level === 2 ? 0.3 : 0.15; s.degraded = true; s.level = this.level;
        let keep = 0; this.parts = this.parts.filter((p) => (p.kind !== 0 && p.kind !== 1 && p.kind !== 6) || p.core === 1 || (keep++ & 1) === 0);
        if (this.level === 3 && this.dpr > 0.8) { this.dpr = this.lowPower ? 0.7 : 1; this.canvas.width = Math.round(this.region.width * this.dpr); this.canvas.height = Math.round(this.region.height * this.dpr); }
        if (this.level >= 2) for (const v of this.vol) { v.k = Math.max(0.2, v.k * 0.72); v.g.setTransform(1, 0, 0, 1, 0, 0); v.g.clearRect(0, 0, v.c.width, v.c.height); v.dirty = null; }
      }
    }
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.clear(); this.canvas.style.opacity = ''; }
  /** 卸載時呼叫：取消預備／播放並釋放畫布記憶體 */
  destroy() { this.jobToken++; this.abandonJob(); this.flushWaiters(false); this.stop(); this.onDone = null; this.shards = []; this.parts = []; this.dissolve = []; this.card = null; for (const v of this.vol) { v.c.width = v.c.height = 0; } this.canvas.width = this.canvas.height = 0; }
  private finish() { this.raf = 0; this.canvas.style.opacity = ''; const cb = this.onDone; this.onDone = null; cb?.(); const ap = this.afterPlay; this.afterPlay = null; ap?.(); }
  private clear() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  private liveSet = new Set<Shard>();
  private shockFrags: { delay: number; life: number; a: number; span: number; drift: number; rk: number; w: number; k: number; hot: boolean }[] = [];
  private get shardsReady() { return this.shards.length > 0 && !!this.cracksHot; }
  private frame(t: number, dt: number) {
    const g = this.ctx; this.clear(); const d = this.dpr; g.setTransform(d, 0, 0, d, 0, 0);
    if (this.reduced) return this.frameReduced(t);
    const T = this.timing; const { x: bx, y: by, width: bw } = this.box; const sc = bw / this.cw; const [icx, icy] = this.impact;
    const ix = bx + icx * sc, iy = by + icy * sc; const R = this.reach * sc; const I = this.intensity; const sec = this.dur / 1000;
    if (t >= T.implodeEnd && !this.burstDone && !this.shardsReady && this.tShift < 450) { this.tShift += dt * 1000; t = T.implodeEnd - 1e-4; } // 碎裂未完成：內爆最多延長 0.45s
    if (t < T.implodeEnd) {
      const pc = clamp(t / T.chargeEnd, 0, 1), pi = clamp((t - T.chargeEnd) / (T.implodeEnd - T.chargeEnd), 0, 1);
      const shakeA = (1.2 + 3 * pc + 2 * pi) * Math.min(1, bw / 240), ph = t * sec * 60; const sx = Math.sin(ph * 1.7) * shakeA, sy = Math.cos(ph * 2.3) * shakeA * 0.6;
      const scale = 1 - 0.05 * easeInCubic(pi);
      g.save(); g.translate(ix + sx, iy + sy); g.scale(sc * scale, sc * scale); g.translate(-icx, -icy);
      if (pi > 0 && this.shardsReady) {
        g.save(); this.clipCard(g, 0, 0); const rr = this.reach * (0.35 + 0.9 * pi); const gr = g.createRadialGradient(icx, icy, 0, icx, icy, rr);
        gr.addColorStop(0, `rgba(255,${Math.round(lerp(150, 196, pi))},${Math.round(lerp(60, 110, pi))},${0.95 * pi})`); gr.addColorStop(0.45, `rgba(214,70,18,${0.7 * pi})`); gr.addColorStop(1, 'rgba(80,8,4,0)');
        g.fillStyle = 'rgb(18,6,4)'; g.fillRect(0, 0, this.cw, this.ch); g.fillStyle = gr; g.fillRect(0, 0, this.cw, this.ch); g.restore();
        const op = pi * pi * Math.min(this.cw, this.ch) * 0.022;
        for (const s of this.shards) { const ddx = s.cx - icx, ddy = s.cy - icy, dl = Math.hypot(ddx, ddy) || 1; const ox = (ddx / dl) * op * (0.6 + dl / this.reach), oy = (ddy / dl) * op * (0.6 + dl / this.reach);
          if (s.clean) g.drawImage(s.clean, s.bx + ox, s.by + oy, s.bw, s.bh); else { g.save(); g.translate(ox, oy); this.shardPath(g, s); g.clip(); g.drawImage(this.card!, 0, 0, this.cw, this.ch); g.restore(); } }
      } else g.drawImage(this.card!, 0, 0, this.cw, this.ch);
      g.save(); this.clipCard(g, 0, 0); g.globalAlpha = 0.16 * pc + 0.16 * pi; g.fillStyle = 'rgb(28,4,2)'; g.fillRect(0, 0, this.cw, this.ch); g.globalAlpha = 1;
      if (this.cracksHot) { g.beginPath(); g.arc(icx, icy, Math.max(1, easeOutCubic(pc) * this.reach * 1.2), 0, Math.PI * 2); g.clip(); g.globalAlpha = 1 - pi * 0.5; g.drawImage(this.cracksCool!, 0, 0, this.cw, this.ch); g.globalAlpha = clamp(pc * 1.5 - 0.35, 0, 1) * (1 - pi * 0.4); if (g.globalAlpha > 0.01) g.drawImage(this.cracksHot, 0, 0, this.cw, this.ch); g.globalAlpha = 1; }
      g.restore(); g.restore();
      if (pi > 0 || pc > 0.5) for (let k = 0; k < Math.ceil(3 * I); k++) { const a = this.rnd() * Math.PI * 2, r = R * (1.15 + this.rnd() * 0.6); this.spawn({ kind: 4, x: ix + Math.cos(a) * r, y: iy + Math.sin(a) * r, vx: -Math.cos(a) * r * 3.2, vy: -Math.sin(a) * r * 3.2, life: 0.28, size: 1.4 + this.rnd() * 1.6, grow: 0, depth: 1 }); }
      { const ps = this.parts; let w = 0; for (const p of ps) { p.age += dt; if (p.age >= p.life) continue; p.x += p.vx * dt; p.y += p.vy * dt; ps[w++] = p; } ps.length = w; }
      this.drawParticles(g, 2);
    } else {
      const tb = (t - T.implodeEnd) * sec;
      if (!this.burstDone) { this.burstDone = true; this.burst(ix, iy, R); }
      if (tb < 0.4) { const a = 0.5 * (1 - tb / 0.4), rr = Math.min(this.region.width, this.region.height) * 0.55; const gr = g.createRadialGradient(ix, iy, 0, ix, iy, rr); gr.addColorStop(0, 'rgba(36,4,2,0)'); gr.addColorStop(0.3, `rgba(36,4,2,${a * 0.55})`); gr.addColorStop(0.65, `rgba(20,2,1,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(ix - rr, iy - rr, rr * 2, rr * 2); }
      this.updateParticles(dt, ix, iy, R, tb, sc);
      { const left = sec * (1 - T.implodeEnd); const f = clamp(tb / 0.3, 0, 1) * clamp(1 - tb / left, 0, 1);
        if (f > 0.01 && this.level < 2) { const rr = R * 1.15; const gr = g.createRadialGradient(ix, iy + R * 0.1, 0, ix, iy + R * 0.1, rr); gr.addColorStop(0, `rgba(130,30,10,${0.22 * f})`); gr.addColorStop(1, 'rgba(60,8,4,0)'); g.fillStyle = gr; g.fillRect(ix - rr, iy + R * 0.1 - rr, rr * 2, rr * 2); } }
      if (!this.shardsReady && tb < 0.35) { g.save(); g.globalAlpha = 1 - tb / 0.35; g.translate(bx, by); g.scale(sc, sc); g.drawImage(this.card!, 0, 0, this.cw, this.ch); g.restore(); }
      if (this.level < 3 && !this.lowPower) this.drawParticles(g, 1);
      // 震波：不畫封閉圓環——不規則、斷裂的弧段（每段半徑／粗細／亮度不同，弧段總長 <55% 周長），像被碎片撕開的衝擊
      for (const f of this.shockFrags) {
        const p = (tb - f.delay) / f.life; if (p <= 0 || p >= 1) continue; const e = easeOutCubic(p), r = R * (0.25 + 2.4 * e * (0.8 + 0.2 * I)) * f.rk; const fa = (1 - p) * f.k;
        const a0 = f.a + f.drift * e, a1 = a0 + f.span * (1 - 0.35 * p);
        g.lineWidth = (16 * (1 - p) + 2) * f.w * Math.min(1.4, R / 160); g.strokeStyle = `rgba(122,16,10,${0.6 * fa})`; g.beginPath(); g.ellipse(ix, iy, r, r * 0.86, 0, a0, a1); g.stroke();
        if (f.hot) { g.lineWidth = 1.5 * f.w; g.strokeStyle = `rgba(250,176,84,${0.6 * fa})`; g.beginPath(); g.ellipse(ix, iy, r * 0.97, r * 0.835, 0, a0 + f.span * 0.15, a1 - f.span * 0.2); g.stroke(); }
      }
      for (const s2 of this.secondary) { if (!s2.done || s2.shard < 0) continue; const p = (tb - s2.t) / 0.5; if (p <= 0 || p >= 1) continue; const sh = this.shards[s2.shard]; const x = bx + (sh.cx + sh.x) * sc, y = by + (sh.cy + sh.y) * sc; const r = R * s2.k * (0.12 + 0.6 * easeOutCubic(p));
        g.lineWidth = 5 * (1 - p) + 1; g.strokeStyle = `rgba(150,30,10,${0.55 * (1 - p)})`; for (let q = 0; q < 3; q++) { const a = s2.k * 9 + q * 2.1; g.beginPath(); g.arc(x, y, r * (0.9 + 0.1 * q), a, a + 0.7 + 0.25 * q); g.stroke(); } }
      this.drawShards(g, tb, dt, 0, sc); this.drawParticles(g, 0); this.drawParticles(g, 3); this.drawShards(g, tb, 0, 1, sc); this.drawParticles(g, 2);
    }
    this.stats.peakParticles = Math.max(this.stats.peakParticles, this.parts.length); this.stats.liveShards = this.liveSet.size;
  }
  /** 不規則爆心：9～17 條核心火舌、間隔不均、長度冪律分布、2～3 條特長，並有方向偏置 */
  private burst(ix: number, iy: number, R: number) {
    const I = this.intensity, r = this.rnd, A = this.areaK, nk = 0.55 + 0.45 * A; const bias = r() * Math.PI * 2, bk = 0.3 + r() * 0.35;
    this.shockFrags = []; for (const [delay, k, n] of [[0, 1, 7 + ((r() * 4) | 0)], [0.14, 0.55, 5 + ((r() * 3) | 0)]] as const) { let a = r() * Math.PI * 2; for (let q = 0; q < n; q++) { const span = (0.12 + r() * 0.32) * (1 + 0.5 * Math.cos(a - bias)); this.shockFrags.push({ delay: delay + r() * 0.06, life: 0.65 + r() * 0.25, a, span: Math.min(span, (Math.PI * 2 * 0.55) / n), drift: (r() - 0.5) * 0.3, rk: 0.85 + r() * 0.3, w: 0.5 + r() * 0.9, k: k * (0.6 + r() * 0.4), hot: r() < 0.6 }); a += (Math.PI * 2) / n * (0.7 + r() * 0.6); } }
    for (let k = 0; k < 44 * I * nk; k++) { const a = r() * Math.PI * 2, s = R * (0.7 + Math.pow(r(), 0.7) * 2.8) * (1 + bk * 0.4 * Math.cos(a - bias)); this.spawn({ kind: 0, x: ix + Math.cos(a) * R * 0.1, y: iy + Math.sin(a) * R * 0.08, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, life: 0.7 + r() * 0.7, size: R * A * (0.1 + r() * 0.14), grow: 1.1, depth: r() }); }
    { const nf = 12, f0 = r() * Math.PI * 2; for (let k = 0; k < nf * nk; k++) { const a = f0 + (k + (r() - 0.5) * 0.7) * (Math.PI * 2 / nf), s = R * (2.0 + r() * 0.9); // 四周保底：不規則間隔的外竄火舌，任何方向偏置下卡外四周都有火
      this.spawn({ kind: 0, x: ix + Math.cos(a) * R * 0.2, y: iy + Math.sin(a) * R * 0.16, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.85, life: 0.8 + r() * 0.6, size: R * A * (0.12 + r() * 0.1), grow: 1.15, depth: r() }); } }
    const nc = Math.round(clamp(9 + r() * 9, 9, 17) * Math.min(1, I)); const gaps: number[] = []; for (let k = 0; k < nc; k++) gaps.push(0.25 + Math.pow(r(), 1.6) * 1.6); const gs = gaps.reduce((a, b) => a + b, 0);
    const big = new Set<number>(); const nb = 2 + (r() < 0.5 ? 1 : 0); while (big.size < nb) big.add((r() * nc) | 0);
    let a = r() * Math.PI * 2;
    for (let k = 0; k < nc; k++) { a += (gaps[k] / gs) * Math.PI * 2; const isBig = big.has(k); const L = (0.3 + 1.5 * Math.pow(r(), 2.2)) * (isBig ? 1.9 : 1) * (1 + bk * Math.cos(a - bias)); const rr = R * (0.03 + r() * 0.12), s = R * L;
      this.spawn({ kind: 0, core: 1, x: ix + Math.cos(a) * rr, y: iy + Math.sin(a) * rr * 0.85, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.85 - R * 0.1, life: (0.7 + r() * 0.5) * (isBig ? 1.35 : 1), size: R * A * (0.11 + r() * 0.1) * (isBig ? 1.55 : 1), grow: 0.75, depth: r() }); }
    for (let k = 0; k < 7 * nk; k++) { const aa = r() * Math.PI * 2, rr = R * (0.12 + r() * 0.26); this.spawn({ kind: 6, x: ix + Math.cos(aa) * rr, y: iy + Math.sin(aa) * rr * 0.8, vx: Math.cos(aa) * R * 0.25, vy: Math.sin(aa) * R * 0.2 - R * 0.12, life: 1.1 + r() * 0.8, size: R * A * (0.07 + r() * 0.1), grow: 0.9, depth: r() }); }
    for (let k = 0; k < 10 * I * nk; k++) { const aa = r() * Math.PI * 2, rr = R * 0.3 * Math.sqrt(r()); this.spawn({ kind: 0, x: ix + Math.cos(aa) * rr, y: iy + Math.sin(aa) * rr * 0.7, vx: Math.cos(aa) * R * 0.25, vy: -R * (0.15 + r() * 0.3), life: 0.6 + r() * 0.5, size: R * A * (0.11 + r() * 0.1), grow: 1.0, depth: 0.3 + r() * 0.7 }); }
    for (let k = 0; k < 40 * I; k++) { const aa = r() * Math.PI * 2, s = R * (3 + r() * 4.5) * (1 + bk * Math.cos(aa - bias)); this.spawn({ kind: 3, x: ix, y: iy, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: 0.35 + r() * 0.5, size: 1 + r() * 1.2, grow: 0, depth: r() }); }
    for (let k = 0; k < 24 * I * nk; k++) { const aa = r() * Math.PI * 2, s = R * (0.5 + r() * 1.3); this.spawn({ kind: 1, x: ix + Math.cos(aa) * R * 0.35, y: iy + Math.sin(aa) * R * 0.3, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s * 0.7 - R * 0.2, life: 2.2 + r() * 1.4, size: R * A * (0.2 + r() * 0.2), grow: 1.3, depth: r() }); }
  }
  private miniBurst(x: number, y: number, R: number, k: number) {
    const r = this.rnd, A = this.areaK;
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, s = R * k * (0.3 + r() * 0.9); this.spawn({ kind: 0, core: i < 3 ? 1 : 0, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8 - R * 0.1, life: 0.45 + r() * 0.4, size: R * A * k * (0.08 + r() * 0.08), grow: 0.9, depth: r() }); }
    for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, s = R * k * (1.5 + r() * 2.5); this.spawn({ kind: 3, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + r() * 0.4, size: 0.9 + r(), grow: 0, depth: r() }); }
    for (let i = 0; i < 3; i++) this.spawn({ kind: 1, x: x + (r() - 0.5) * R * 0.2, y, vx: (r() - 0.5) * R * 0.3, vy: -R * (0.2 + r() * 0.3), life: 1.6 + r(), size: R * A * k * (0.14 + r() * 0.1), grow: 1.3, depth: r() });
    for (let i = 0; i < 10; i++) { const dd = r(); this.spawn({ kind: 2, x, y, vx: (r() - 0.5) * R * 1.2, vy: -R * (0.4 + r() * 0.8), life: 0.8 + r() * 1.2, size: 0.8 + dd * 2.2, grow: 0, depth: dd }); }
  }
  private updateParticles(dt: number, ix: number, iy: number, R: number, tb: number, sc: number) {
    const ps = this.parts; let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]; p.age += dt; if (p.age >= p.life) continue;
      const drag = p.core ? 4.2 : p.kind === 5 ? 1.8 : p.kind === 3 ? 3.2 : p.kind === 0 ? 2.6 : p.kind === 1 ? 1.3 : p.kind === 2 ? 1.1 : p.kind === 6 ? 2.2 : 0;
      const e = Math.exp(-drag * dt); p.vx *= e; p.vy *= e;
      if (p.kind === 0) p.vy -= R * (p.core ? 0.14 : 0.32) * dt; else if (p.kind === 1) p.vy -= R * 0.45 * dt; else if (p.kind === 6) p.vy -= R * 0.2 * dt;
      if (p.kind === 2) { p.vy -= R * 0.3 * dt; p.vx += Math.sin(p.seed + p.age * 5) * R * 0.6 * dt; }
      if (p.kind === 3) p.vy += R * 1.2 * dt;
      if (p.kind === 5) { p.vy += R * 0.18 * dt; p.vx += Math.sin(p.seed + p.age * 3) * R * 0.5 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; ps[w++] = p;
    }
    ps.length = w;
    const remain = (this.dur / 1000) * (this.timing.smokeEnd - this.timing.implodeEnd) - tb; const nk = 0.55 + 0.45 * this.areaK; const rnd = this.rnd;
    // 爆心持續燃燒（0.12～2.4s 漸弱）
    if (tb > 0.12 && tb < 2.4) {
      const f = Math.pow(1 - (tb - 0.12) / 2.28, 0.8); let n = 30 * this.intensity * nk * f * dt * (this.lowPower ? 0.6 : 1); n = Math.floor(n) + (rnd() < n % 1 ? 1 : 0);
      while (n-- > 0) { const up = rnd() < 0.5; const a = up ? -Math.PI / 2 + (rnd() - 0.5) * 0.9 : rnd() * Math.PI * 2, rr = R * rnd() * (up ? 0.16 : 0.24), s = R * (up ? 0.35 + rnd() * 0.35 : 0.25 + rnd() * 0.5);
        this.spawn({ kind: 0, core: 1, x: ix + Math.cos(a) * rr * (up ? 0.4 : 1) + (up ? (rnd() - 0.5) * R * 0.34 : 0), y: iy + Math.sin(a) * rr * 0.8 + (up ? R * 0.08 : 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8 - R * 0.15, life: 0.5 + rnd() * 0.5, size: R * this.areaK * (0.1 + rnd() * 0.1) * (0.6 + 0.4 * f), grow: 0.8, depth: rnd() }); }
      if (rnd() < 4 * nk * f * dt) { const a = rnd() * Math.PI * 2, rr = R * (0.15 + rnd() * 0.2); this.spawn({ kind: 6, x: ix + Math.cos(a) * rr, y: iy + Math.sin(a) * rr * 0.8, vx: Math.cos(a) * R * 0.15, vy: -R * 0.12, life: 0.9 + rnd() * 0.5, size: R * this.areaK * (0.07 + rnd() * 0.07), grow: 0.8, depth: rnd() }); }
    }
    // 二次爆炸：落在殘骸碎片上
    for (const s2 of this.secondary) { if (s2.done || tb < s2.t || remain < 0.6) continue; s2.done = true;
      let best = -1, bs = -1; this.shards.forEach((s, i) => { const b = (tb - s.burnAt) / s.burnDur; if (b < 0.85 && s.debris) { const sc2 = rnd() + (b > 0 ? 0.5 : 0); if (sc2 > bs) { bs = sc2; best = i; } } });
      if (best < 0 && this.shards.length) best = (rnd() * this.shards.length) | 0; s2.shard = best;
      if (best >= 0) { const s = this.shards[best]; const { x: bx, y: by } = this.box; this.miniBurst(bx + (s.cx + s.x) * sc, by + (s.cy + s.y) * sc, R, s2.k); } }
    // 煙柱：持續到結尾
    if (remain > 0.8 && tb > 0.35 && rnd() < (this.lowPower ? 3 : 5) * dt * this.intensity * this.areaK) { const a = rnd() * Math.PI * 2; this.spawn({ kind: 1, x: ix + Math.cos(a) * R * 0.45, y: iy + R * 0.15, vx: (rnd() - 0.5) * R * 0.3, vy: -R * (0.3 + rnd() * 0.35), life: 1.8 + rnd() * 1.2, size: R * this.areaK * (0.15 + rnd() * 0.14), grow: 1.4, depth: rnd() }); }
    if (remain > 0.4) { const rate = (tb < 1 ? 40 : 14) * this.intensity * dt * (this.lowPower ? 0.6 : 1); let n = Math.floor(rate) + (rnd() < rate % 1 ? 1 : 0);
      while (n-- > 0) { const a = rnd() * Math.PI * 2, rr = R * rnd() * (tb < 1 ? 0.9 : 1.3), dd = rnd(); this.spawn({ kind: 2, x: ix + Math.cos(a) * rr, y: iy + Math.sin(a) * rr, vx: (rnd() - 0.5) * R * 0.8, vy: -R * (0.3 + rnd() * 0.7) * (0.5 + dd), life: 1.0 + rnd() * 1.4, size: 0.8 + dd * 2.4, grow: 0, depth: dd }); } }
  }
  private drawParticles(g: CanvasRenderingContext2D, kind: number) {
    const ps = this.parts; const S = SPRITES!;
    if (kind === 1 || kind === 0) {
      if (!S.lick.hot.length && kind === 0) return this.drawFallbackFire(g);
      const v = this.vol[kind === 0 ? 0 : 1]; const b = v.g; b.setTransform(1, 0, 0, 1, 0, 0);
      if (v.dirty) { const [x0, y0, x1, y1] = v.dirty; b.clearRect(x0 * v.k - 2, y0 * v.k - 2, (x1 - x0) * v.k + 4, (y1 - y0) * v.k + 4); v.dirty = null; }
      const merge = kind === 0 && (this.level >= 3 || this.lowPower); const direct = kind === 0 && this.level < 2 && !this.lowPower; let nd = 0; const dlist: P[] = [];
      let any = false, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const smoke = this.smokeSpr || S.smoke;
      const ext = (p: P, e: number) => { any = true; if (p.x - e < x0) x0 = p.x - e; if (p.y - e < y0) y0 = p.y - e; if (p.x + e > x1) x1 = p.x + e; if (p.y + e > y1) y1 = p.y + e; };
      for (let pass = merge ? -1 : 0; pass < (kind === 0 ? 3 : 1); pass++) for (const p of ps) {
        if (kind === 0) { if (pass === -1 ? p.kind !== 1 : pass === 1 ? p.kind !== 6 : p.kind !== 0 || (p.depth >= 0.5) !== (pass === 2)) continue; }
        else if (p.kind !== 1 || p.depth >= 0.62) continue;
        const lt = p.age / p.life; const s = p.kind === 1 ? Math.min(p.size * (1 + p.grow * lt), this.smokeCap) : p.size * (1 + p.grow * lt);
        if (p.kind === 1) { b.globalAlpha = clamp(Math.sin(Math.PI * Math.min(1, lt * 1.15)) * (0.55 + 0.45 * p.depth), 0, 1); b.setTransform(v.k, 0, 0, v.k, 0, 0); b.drawImage(smoke, p.x - s, p.y - s, s * 2, s * 2); ext(p, s * 1.1); continue; }
        if (p.kind === 6) { if (!S.pockets.length) continue; b.globalAlpha = clamp(Math.min(1, lt * 5) * (1 - lt) * 1.15 * (0.7 + 0.3 * p.depth), 0, 1); b.setTransform(v.k, 0, 0, v.k, 0, 0); b.drawImage(S.pockets[((p.seed * 10) | 0) % S.pockets.length], p.x - s, p.y - s, s * 2, s * 2); ext(p, s * 1.1); continue; }
        if (direct && p.core && nd < 26) { nd++; dlist.push(p); continue; }
        this.drawTongue(b, v.k, p, s, lt, S); ext(p, s * 2.6);
      }
      if (kind === 0 && !merge) for (const p of ps) { // 前景煙進同一張火焰緩衝（遮擋火光）
        if (p.kind !== 1 || p.depth < 0.62) continue; const lt = p.age / p.life, s = Math.min(p.size * (1 + p.grow * lt), this.smokeCap);
        b.globalAlpha = clamp(Math.sin(Math.PI * Math.min(1, lt * 1.15)) * (0.55 + 0.45 * p.depth) * 0.8, 0, 1); b.setTransform(v.k, 0, 0, v.k, 0, 0); b.drawImage(smoke, p.x - s, p.y - s, s * 2, s * 2); ext(p, s * 1.1);
      }
      b.globalAlpha = 1;
      if (any) { x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(this.region.width, x1); y1 = Math.min(this.region.height, y1);
        if (x1 > x0 && y1 > y0) { v.dirty = [x0, y0, x1, y1]; g.drawImage(v.c, x0 * v.k, y0 * v.k, (x1 - x0) * v.k, (y1 - y0) * v.k, x0, y0, x1 - x0, y1 - y0); } }
      if (dlist.length) { const d = this.dpr; for (const p of dlist) { const lt = p.age / p.life; this.drawTongue(g, d, p, p.size * (1 + p.grow * lt), lt, S); } g.setTransform(d, 0, 0, d, 0, 0); g.globalAlpha = 1; } // 全解析度直畫的熾熱核心火舌
      return;
    }
    if (kind === 3) { const spr = S.spark, d = this.dpr;
      for (const p of ps) { if (p.kind !== 3) continue; const lt = p.age / p.life, sp = Math.hypot(p.vx, p.vy); if (sp < 1) continue; const len = Math.max(4, sp * 0.035), c = p.vx / sp, sn = p.vy / sp; g.globalAlpha = 1 - lt; g.setTransform(d * c, d * sn, -d * sn, d * c, d * p.x, d * p.y); g.drawImage(spr, -len, -p.size, len, p.size * 2); }
      g.setTransform(d, 0, 0, d, 0, 0); g.globalAlpha = 1; return; }
    for (let bucket = 0; bucket < 8; bucket++) { g.fillStyle = this.ember[bucket] || 'rgb(240,140,60)';
      for (const p of ps) { if (p.kind !== 2 && p.kind !== 4) continue; const lt = p.age / p.life; if (Math.min(7, (lt * 8) | 0) !== bucket) continue; const fl = 0.65 + 0.35 * Math.sin(p.seed * 7 + p.age * 22); const a = (p.kind === 4 ? Math.min(1, lt * 3) : 1 - lt) * fl * (0.45 + 0.55 * p.depth); g.globalAlpha = clamp(a, 0, 1); const s = p.size; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); } }
    g.globalAlpha = 1;
    for (const p of ps) { if (p.kind !== 5) continue; const lt = p.age / p.life, a = (lt < 0.1 ? lt * 10 : 1 - (lt - 0.1) / 0.9) * (0.5 + 0.5 * p.depth); const flip = Math.abs(Math.cos(p.seed + p.age * 4)), w = p.size, h = p.size * (0.25 + 0.75 * flip);
      g.globalAlpha = clamp(a, 0, 1); g.fillStyle = 'rgb(34,24,22)'; g.fillRect(p.x - w / 2, p.y - h / 2, w, h); g.globalAlpha = clamp(a * (1 - lt), 0, 1); g.fillStyle = this.ember[1] || 'rgb(230,104,34)'; g.fillRect(p.x - w / 2, p.y + h / 2 - 1, w, 1); }
    g.globalAlpha = 1;
  }
  private drawTongue(b: CanvasRenderingContext2D, k: number, p: P, s: number, lt: number, S: SpriteSet) {
    const key = p.core ? (lt < 0.45 ? 'hot' : lt < 0.8 ? 'mid' : 'cool') : lt < 0.3 ? 'hot' : lt < 0.62 ? 'mid' : 'cool'; const set = S.lick[key]; const spr = set[((p.seed * 10) | 0) % set.length];
    const a = (p.core ? Math.min(1, lt * 6) * (lt < 0.55 ? 1 : (1 - lt) / 0.45) : lt < 0.4 ? 1 : (1 - lt) / 0.6) * (0.7 + 0.3 * p.depth); b.globalAlpha = clamp(a, 0, 1);
    const sp = Math.hypot(p.vx, p.vy), ang = Math.atan2(p.vy, p.vx) - Math.PI / 2 + ((p.seed % 1) - 0.5) * 0.5, c = Math.cos(ang), sn = Math.sin(ang), st = 1 + Math.min(0.6, sp / (s * 10));
    b.setTransform(k * c, k * sn, -k * sn * st, k * c * st, k * p.x, k * p.y); b.drawImage(spr, -s * 0.65, p.core ? -s * 0.8 : -s * 0.35, s * 1.3, s * 2.1);
  }
  /** 精靈尚未建好（極端冷啟動）時的火：柔光圓（同樣封頂，不出白） */
  private drawFallbackFire(g: CanvasRenderingContext2D) { const spr = SPRITES!.glowSoft; for (const p of this.parts) { if (p.kind !== 0) continue; const lt = p.age / p.life, s = p.size * (1 + p.grow * lt); g.globalAlpha = clamp((1 - lt) * 0.8, 0, 1); g.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2); } g.globalAlpha = 1; }
  private drawShards(g: CanvasRenderingContext2D, tb: number, dt: number, layer: number, sc: number) {
    const { x: bx, y: by } = this.box; const ch = this.ch; const rnd = this.rnd;
    for (const s of this.shards) {
      if (layer === 0 && dt > 0) { const dr = s.debris ? 1.0 : 2.1; s.vx *= Math.exp(-dr * dt); s.vy *= Math.exp(-dr * dt); s.vy += ch * (s.debris ? 1.05 : 0.45) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; s.vr *= Math.exp(-0.6 * dt); }
      if (s.layer !== layer) continue;
      const b = clamp((tb - s.burnAt) / s.burnDur, 0, 1); if (b >= 1) continue;
      const zs = 1 + s.z * Math.min(1, tb * 1.6), k = zs * (1 - 0.35 * b * b); const X = bx + (s.cx + s.x) * sc, Y = by + (s.cy + s.y) * sc;
      if (X < -s.bw * sc * 2 || Y > this.region.height + s.bh * sc * 2 || X > this.region.width + s.bw * sc * 2) continue;
      g.save(); g.translate(X, Y); g.rotate(s.rot); g.scale(sc * k, sc * k); const ox = s.bx - s.cx, oy = s.by - s.cy;
      const aClean = this.level >= 1 && b > 0 ? 0 : 1 - clamp(b * 1.6, 0, 1); const aChar = this.level >= 1 && b > 0 ? clamp(b < 0.6 ? 1 : 1 - (b - 0.6) / 0.4, 0, 1) : clamp(b < 0.6 ? b * 1.7 : 1 - (b - 0.6) / 0.4, 0, 1);
      if (s.clean || s.charred) {
        if (aClean > 0.01) { g.globalAlpha = aClean; g.drawImage(s.clean || s.charred!, ox, oy, s.bw, s.bh); }
        if (aChar > 0.01 && s.charred) { g.globalAlpha = aChar; g.drawImage(s.charred, ox, oy, s.bw, s.bh); }
      } else { // 即時裁切（預渲染未完成時的優雅降級）
        this.liveSet.add(s); g.translate(-s.cx, -s.cy); this.shardPath(g, s); g.clip(); g.globalAlpha = Math.max(aClean, aChar); g.drawImage(this.card!, 0, 0, this.cw, this.ch);
        g.globalAlpha = 0.55 * b; g.fillStyle = 'rgb(24,10,6)'; g.fillRect(s.bx, s.by, s.bw, s.bh); g.globalAlpha = 1; g.lineWidth = 3; g.strokeStyle = 'rgba(14,6,4,0.85)'; g.stroke();
      }
      g.restore();
      const px = (dx: number) => X + (rnd() - 0.5) * s.bw * sc * dx, py = (dy: number) => Y + (rnd() - 0.5) * s.bh * sc * dy;
      if (b > 0.8 && !s.ash) { s.ash = true; for (let q = 0; q < 4; q++) this.spawn({ kind: 5, x: px(0.5), y: py(0.5), vx: s.vx * sc * 0.15 + (rnd() - 0.5) * 30, vy: -10 - rnd() * 20, life: 1.4 + rnd(), size: 2 + rnd() * 3.5, grow: 0, depth: rnd() }); }
      const fireP = s.debris ? (tb > 0.15 ? 0.26 : 0) : b > 0 && b < 0.85 ? 0.12 : 0; // 殘骸：落下途中一路拖著火
      if (fireP && rnd() < fireP * (this.lowPower ? 0.6 : 1)) { const fr = Math.max(s.bw, s.bh) * sc * this.areaK * (0.2 + rnd() * 0.22); this.spawn({ kind: 0, x: px(0.5), y: py(0.5), vx: s.vx * sc * 0.25, vy: s.vy * sc * 0.15 - fr * 2, life: 0.3 + rnd() * 0.35, size: fr, grow: 1.05, depth: 0.6 + rnd() * 0.4 }); }
      if ((b > 0 || s.debris) && layer === 0 && rnd() < 0.16) { const dd = rnd(); this.spawn({ kind: 2, x: px(0.6), y: py(0.6), vx: s.vx * sc * 0.2, vy: s.vy * sc * 0.2 - 30, life: 0.7 + rnd(), size: 0.8 + dd * 2, grow: 0, depth: dd }); }
    }
    g.globalAlpha = 1;
  }
  /** 減少動態短版（1.2s）：裂紋自爆心擴展 → 6 階段燒蝕交叉淡化（焦黑帶＋燃燒前緣）；無位移、無色罩、全部在卡內 */
  private frameReduced(t: number) {
    const g = this.ctx; const { x: bx, y: by, width: bw } = this.box; const sc = bw / this.cw; const [icx, icy] = this.impact;
    const p1 = clamp(t / 0.25, 0, 1), q = clamp((t - 0.25) / 0.7, 0, 1);
    g.save(); g.translate(bx, by); g.scale(sc, sc);
    const N = this.dissolve.length;
    if (N && q > 0) { const pos = q * N, i = Math.min(N - 1, Math.floor(pos)), f = pos - i; const prev = i === 0 ? this.card! : this.dissolve[i - 1];
      g.drawImage(this.dissolve[i], 0, 0, this.cw, this.ch); g.globalAlpha = 1 - f; g.drawImage(prev, 0, 0, this.cw, this.ch); g.globalAlpha = 1; }
    else if (q < 1) { g.globalAlpha = 1 - q; g.drawImage(this.card!, 0, 0, this.cw, this.ch); g.globalAlpha = 1; }
    if (this.cracksHot && q < 1) { g.save(); g.beginPath(); g.arc(icx, icy, Math.max(1, easeOutCubic(p1) * this.reach * 1.2), 0, Math.PI * 2); g.clip(); g.globalAlpha = 1 - q; g.drawImage(this.cracksCool!, 0, 0, this.cw, this.ch); g.globalAlpha = p1 * (1 - q); g.drawImage(this.cracksHot, 0, 0, this.cw, this.ch); g.restore(); }
    g.restore(); g.globalAlpha = 1;
  }
}
