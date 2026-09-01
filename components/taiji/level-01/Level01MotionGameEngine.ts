import { clamp01 } from './Level01Physics';

export type TaijiMotionPhase = 'STILL' | 'FLOW' | 'MOVE' | 'SHAKE' | 'BURST';
export type TaijiMotionStage = 'TAIJI' | 'LIANGYI' | 'SIXIANG' | 'BAGUA' | 'FIVE_ELEMENTS' | 'UNITY';
export type TaijiVisualElement = '空' | '風' | '水' | '火' | '地';
export type TaijiCustomerState = '動' | '流' | '定' | '平衡' | '歸一';
export type TaijiChaseDirection = 'N' | 'E' | 'S' | 'W';

export type TaijiMotionState = {
  orientation: { alpha: number; beta: number; gamma: number };
  acceleration: { x: number; y: number; z: number; magnitude: number };
  rotation: { alpha: number; beta: number; gamma: number; magnitude: number };
  motionMagnitude: number;
  shakeIntensity: number;
  tiltIntensity: number;
  state: TaijiMotionPhase;
  level: { x: number; y: number; balanced: boolean };
};

export type TaijiMotionGameSnapshot = TaijiMotionState & {
  stage: TaijiMotionStage;
  visualElement: TaijiVisualElement;
  customerState: TaijiCustomerState;
  message: string;
  combo: number;
  burstId: number;
  chase: { direction: TaijiChaseDirection; hits: number; hitId: number; progress: number };
};

export type TaijiMotionGameInput = {
  alpha: number;
  beta: number;
  gamma: number;
  acceleration: number;
  accelerationX?: number;
  accelerationY?: number;
  accelerationZ?: number;
  rotationRate: number;
  rotationAlpha?: number;
  rotationBeta?: number;
  rotationGamma?: number;
  motionEnergy: number;
  angularVelocity: number;
  balanceState: 'UNBALANCED' | 'APPROACHING' | 'BALANCED' | 'HOLDING' | 'LOCKED';
  now: number;
  delta: number;
  reducedMotion: boolean;
};

const BURST_HOLD_MS = 800;
const BURST_COOLDOWN_MS = 620;
const SAFE_BURST_THRESHOLD = 0.58;
const STAGES: TaijiMotionStage[] = ['TAIJI', 'LIANGYI', 'SIXIANG', 'BAGUA', 'FIVE_ELEMENTS'];
const CHASE_SEQUENCE: readonly TaijiChaseDirection[] = ['E', 'N', 'W', 'S', 'N', 'E', 'S', 'W'];
const CHASE_HOLD_MS = 135;
const CHASE_COOLDOWN_MS = 260;

const messageFor = (state: TaijiCustomerState, stage: TaijiMotionStage) => {
  if (state === '歸一') return '歸一完成';
  if (state === '平衡') return stage === 'FIVE_ELEMENTS' ? '即將歸一' : '尋找平衡';
  if (state === '定') return stage === 'FIVE_ELEMENTS' ? '手機慢慢放平，尋找平衡' : '輕輕移動手機，喚醒太極';
  if (state === '流') return '流動中，轉動手機探索太極';
  return '太極正跟隨你的移動';
};

const elementFor = (
  phase: TaijiMotionPhase,
  energy: number,
  beta: number,
  gamma: number,
  balanceState: TaijiMotionGameInput['balanceState'],
  stage: TaijiMotionStage,
): TaijiVisualElement => {
  if (stage === 'UNITY') return '空';
  if (balanceState === 'BALANCED' || balanceState === 'HOLDING' || balanceState === 'LOCKED') return '地';
  if (phase === 'BURST' || phase === 'SHAKE') return '火';
  if (energy >= 0.34 && Math.abs(gamma) > Math.abs(beta) * 1.08) return '風';
  if (energy > 0.06) return '水';
  return '地';
};

export class Level01MotionGameEngine {
  private combo = 0;
  private burstId = 0;
  private burstUntil = -Infinity;
  private lastBurstAt = -Infinity;
  private burstArmed = true;
  private stage: TaijiMotionStage = 'TAIJI';
  private chaseIndex = 0;
  private chaseHits = 0;
  private chaseHitId = 0;
  private chaseHoldSince = -1;
  private lastChaseHitAt = -Infinity;
  private snapshotValue: TaijiMotionGameSnapshot = {
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    acceleration: { x: 0, y: 0, z: 0, magnitude: 0 },
    rotation: { alpha: 0, beta: 0, gamma: 0, magnitude: 0 },
    motionMagnitude: 0,
    shakeIntensity: 0,
    tiltIntensity: 0,
    state: 'STILL',
    level: { x: 0, y: 0, balanced: false },
    stage: 'TAIJI',
    visualElement: '地',
    customerState: '定',
    message: '輕輕移動手機，喚醒太極',
    combo: 0,
    burstId: 0,
    chase: { direction: CHASE_SEQUENCE[0], hits: 0, hitId: 0, progress: 0 },
  };

  reset() {
    this.combo = 0;
    this.burstId = 0;
    this.burstUntil = -Infinity;
    this.lastBurstAt = -Infinity;
    this.burstArmed = true;
    this.stage = 'TAIJI';
    this.chaseIndex = 0;
    this.chaseHits = 0;
    this.chaseHitId = 0;
    this.chaseHoldSince = -1;
    this.lastChaseHitAt = -Infinity;
    this.snapshotValue = {
      orientation: { alpha: 0, beta: 0, gamma: 0 },
      acceleration: { x: 0, y: 0, z: 0, magnitude: 0 },
      rotation: { alpha: 0, beta: 0, gamma: 0, magnitude: 0 },
      motionMagnitude: 0,
      shakeIntensity: 0,
      tiltIntensity: 0,
      state: 'STILL',
      level: { x: 0, y: 0, balanced: false },
      stage: 'TAIJI',
      visualElement: '地',
      customerState: '定',
      message: '輕輕移動手機，喚醒太極',
      combo: 0,
      burstId: 0,
      chase: { direction: CHASE_SEQUENCE[0], hits: 0, hitId: 0, progress: 0 },
    };
  }

  advanceStaticStage(now = 0) {
    if (this.stage === 'UNITY') return this.snapshotValue;
    this.combo = Math.min(4, this.combo + 1);
    this.stage = STAGES[this.combo];
    this.burstId += 1;
    this.burstArmed = false;
    this.lastBurstAt = now;
    this.snapshotValue = {
      ...this.snapshotValue,
      state: 'MOVE',
      stage: this.stage,
      visualElement: this.stage === 'FIVE_ELEMENTS' ? '火' : '風',
      customerState: '動',
      message: '太極正跟隨你的移動',
      combo: this.combo,
      burstId: this.burstId,
      chase: { direction: CHASE_SEQUENCE[this.chaseIndex], hits: this.chaseHits, hitId: this.chaseHitId, progress: 0 },
    };
    return this.snapshotValue;
  }

  markUnity() {
    this.stage = 'UNITY';
    this.snapshotValue = {
      ...this.snapshotValue,
      state: 'STILL',
      stage: 'UNITY',
      visualElement: '空',
      customerState: '歸一',
      message: '歸一完成',
      combo: this.combo,
    };
    return this.snapshotValue;
  }

  update(input: TaijiMotionGameInput) {
    const dt = Math.max(0, Math.min(0.05, input.delta));
    const accelerationEnergy = clamp01(input.acceleration / 6.5);
    const rotationEnergy = clamp01(Math.max(input.rotationRate / 360, Math.abs(input.angularVelocity) / 7));
    const targetEnergy = clamp01(Math.max(input.motionEnergy, accelerationEnergy * 0.92, rotationEnergy * 0.82));
    const smoothing = 1 - Math.exp(-dt * 12);
    const motionMagnitude = this.snapshotValue.motionMagnitude + (targetEnergy - this.snapshotValue.motionMagnitude) * smoothing;
    const shakeIntensity = clamp01(accelerationEnergy * 0.65 + rotationEnergy * 0.35);
    const tiltIntensity = clamp01(Math.hypot(input.beta, input.gamma) / 28);

    if (targetEnergy < SAFE_BURST_THRESHOLD * 0.55) this.burstArmed = true;
    const burstAllowed = this.burstArmed
      && targetEnergy >= SAFE_BURST_THRESHOLD
      && input.now - this.lastBurstAt >= BURST_COOLDOWN_MS;
    if (burstAllowed) {
      this.burstArmed = false;
      this.lastBurstAt = input.now;
      this.burstUntil = input.reducedMotion ? -Infinity : input.now + BURST_HOLD_MS;
      this.burstId += 1;
      this.combo = Math.min(4, this.combo + 1);
      this.stage = STAGES[this.combo];
    }

    let phase: TaijiMotionPhase;
    if (input.now < this.burstUntil && !input.reducedMotion) phase = 'BURST';
    else if (targetEnergy >= 0.75 && !input.reducedMotion) phase = 'SHAKE';
    else if (motionMagnitude >= 0.5) phase = 'MOVE';
    else if (motionMagnitude >= 0.08) phase = 'FLOW';
    else phase = 'STILL';

    const balanced = input.balanceState === 'BALANCED' || input.balanceState === 'HOLDING' || input.balanceState === 'LOCKED';
    let customerState: TaijiCustomerState = phase === 'STILL' ? '定' : phase === 'FLOW' ? '流' : '動';
    if (balanced && this.stage === 'FIVE_ELEMENTS') customerState = '平衡';
    if (this.stage === 'UNITY') customerState = '歸一';
    const visualElement = elementFor(phase, Math.max(motionMagnitude, targetEnergy), input.beta, input.gamma, input.balanceState, this.stage);

    const chaseDirection: TaijiChaseDirection | null = Math.hypot(input.beta, input.gamma) < 7
      ? null
      : Math.abs(input.gamma) >= Math.abs(input.beta)
        ? input.gamma >= 0 ? 'E' : 'W'
        : input.beta >= 0 ? 'S' : 'N';
    const chaseTarget = CHASE_SEQUENCE[this.chaseIndex];
    const chaseMatching = chaseDirection === chaseTarget && targetEnergy >= 0.06;
    if (chaseMatching) {
      if (this.chaseHoldSince < 0) this.chaseHoldSince = input.now;
      if (input.now - this.chaseHoldSince >= CHASE_HOLD_MS && input.now - this.lastChaseHitAt >= CHASE_COOLDOWN_MS) {
        this.lastChaseHitAt = input.now;
        this.chaseHits += 1;
        this.chaseHitId += 1;
        this.chaseIndex = (this.chaseIndex + 1) % CHASE_SEQUENCE.length;
        this.chaseHoldSince = -1;
        this.combo = Math.min(4, Math.max(this.combo, Math.min(4, this.chaseHits)));
        this.stage = STAGES[this.combo];
      }
    } else {
      this.chaseHoldSince = -1;
    }
    const chaseProgress = this.chaseHoldSince < 0 ? 0 : clamp01((input.now - this.chaseHoldSince) / CHASE_HOLD_MS);

    this.snapshotValue = {
      orientation: { alpha: input.alpha, beta: input.beta, gamma: input.gamma },
      acceleration: { x: input.accelerationX ?? 0, y: input.accelerationY ?? 0, z: input.accelerationZ ?? 0, magnitude: input.acceleration },
      rotation: { alpha: input.rotationAlpha ?? 0, beta: input.rotationBeta ?? 0, gamma: input.rotationGamma ?? 0, magnitude: input.rotationRate },
      motionMagnitude,
      shakeIntensity,
      tiltIntensity,
      state: phase,
      level: { x: input.gamma, y: input.beta, balanced },
      stage: this.stage,
      visualElement,
      customerState,
      message: messageFor(customerState, this.stage),
      combo: this.combo,
      burstId: this.burstId,
      chase: {
        direction: CHASE_SEQUENCE[this.chaseIndex],
        hits: this.chaseHits,
        hitId: this.chaseHitId,
        progress: chaseProgress,
      },
    };
    return this.snapshotValue;
  }

  snapshot() {
    return this.snapshotValue;
  }
}
