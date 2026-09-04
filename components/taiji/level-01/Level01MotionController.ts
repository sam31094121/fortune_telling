import { FRAME_DELTA_CAP, MAX_FLICK_SPIN_SPEED, SENSOR_WARMUP_TIMEOUT_MS } from './level01.constants';
import { Level01SoundEngine, type Level01StrikeOrigin } from './Level01Audio';
import { resolveEffectivePermission, resolveLevel01Mode, type Level01Mode, type Level01Permission } from './Level01Fallback';
import { Level01GameController, type Level01GameSnapshot } from './Level01GameController';
import { isTaijiMotionGameV1Enabled } from './Level01FeatureFlags';
import { Level01HapticController } from './Level01Haptics';
import { Level01MotionGameEngine, type TaijiMotionGameSnapshot } from './Level01MotionGameEngine';
import { Level01PerformanceGuard } from './Level01PerformanceGuard';
import {
  createPhysicsState,
  integrateLevel01Physics,
  resolveLevel01TiltDirection,
  snapshotFromPhysics,
  visualPoseFromPhysics,
  type Level01VisualPose,
  type MotionSnapshot,
  type PhysicsState,
} from './Level01Physics';
import { Level01QualityManager } from './Level01QualityManager';
import { Level01RenderEngine } from './Level01RenderEngine';
import { Level01RuntimeBoundary } from './Level01RuntimeBoundary';
import { rotationFeedbackProfile } from './Level01SensoryFeedback';
import { Level01SensorController } from './Level01SensorController';
import { Level01SoundPreferenceEngine } from './Level01SoundPreference';
import { Level01Telemetry } from './Level01Telemetry';
import { canAutoStartLevel01Sensors, requestLevel01SensorPermission, sensorsSupported } from './Level01Orientation';
import type { Level01GameState, Level01Score, QualityLevel } from './Level01Runtime';
import type { TaijiSoundVariant } from '@/lib/taiji/experience-types';

export interface Level01Pose extends Level01VisualPose {
  activationId: number;
  fallback: boolean;
  permission: Level01Permission;
  mode: Level01Mode;
  hapticMode: 'LIVE' | 'NO_HAPTIC_MODE';
  gameState: Level01GameState;
  message: string;
  quality: QualityLevel;
  fps: number;
  combo: number;
  score: Level01Score;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  motionEnabled: boolean;
  staticMode: boolean;
  reducedMotion: boolean;
  motionGameEnabled: boolean;
  motionGame: TaijiMotionGameSnapshot;
  unityReady: boolean;
  snapshot: MotionSnapshot;
}

type PointerInput = {
  active: boolean;
  beta: number;
  gamma: number;
  rotationRate: number;
  acceleration: number;
  lastX: number;
  lastY: number;
  lastAt: number;
};

const STATIC_ADVANCE_LOCK_MS = 320;

export class Level01TaijiMotionController {
  readonly pose: Level01Pose;
  private readonly physics: PhysicsState = createPhysicsState();
  private readonly audio = new Level01SoundEngine();
  private readonly haptics = new Level01HapticController();
  private readonly motionGame = new Level01MotionGameEngine();
  private readonly sensors = new Level01SensorController();
  private readonly game = new Level01GameController();
  private readonly performance = new Level01PerformanceGuard();
  private readonly quality = new Level01QualityManager();
  private readonly telemetry = new Level01Telemetry();
  private readonly renderer = new Level01RenderEngine();
  private readonly boundary: Level01RuntimeBoundary;
  private permission: Level01Permission = 'idle';
  private layerEnabled = false;
  private hidden = false;
  private reducedMotion = false;
  private disposed = false;
  private removeListeners: (() => void) | null = null;
  private onChange: ((pose: Level01Pose) => void) | null = null;
  private lastHudKey = '';
  private armedAt = 0;
  private sensorTimedOut = false;
  private lastVisualBurstId = 0;
  private audioEnabled = true;
  private hapticEnabled = true;
  private motionEnabled = true;
  private staticMode = false;
  private featureEnabled = false;
  private preferencesLoaded = false;
  private staticPulseUntil = -Infinity;
  private lastStaticAdvanceAt = -Infinity;
  private completedAt = -1;
  private lastRotationFeedbackAt = -Infinity;
  private lastRotationFeedbackStep: number | null = null;
  private readonly soundPreference = new Level01SoundPreferenceEngine();
  private soundVariant: TaijiSoundVariant | null = null;
  private hasArmedBefore = false;
  private activationEventRecorded = false;
  private armedAudioAt = -Infinity;
  private activationArmInFlight = false;
  private lastActivationAt = -Infinity;
  private manualFallback = false;
  private activationId = 0;
  private lastChaseHitId = 0;
  private pointer: PointerInput = {
    active: false,
    beta: 0,
    gamma: 0,
    rotationRate: 0,
    acceleration: 0,
    lastX: 0,
    lastY: 0,
    lastAt: 0,
  };

  constructor() {
    this.boundary = new Level01RuntimeBoundary(() => {
      const now = this.now();
      this.permission = 'unsupported';
      this.game.fallback(now);
      this.telemetry.update({ fallbackUsed: true });
    });
    this.featureEnabled = isTaijiMotionGameV1Enabled();
    this.pose = this.buildPose(false, this.game.snapshot());
    this.syncEnvironment();
  }

  setOnChange(handler: ((pose: Level01Pose) => void) | null) {
    this.onChange = handler;
  }

  setBubbleElement(element: HTMLElement | null) {
    this.renderer.bindBubble(element);
  }

  setLayerEnabled(enabled: boolean) {
    if (this.layerEnabled === enabled) return;
    this.layerEnabled = enabled;
    if (enabled) {
      this.performance.start();
      if (this.permission === 'granted') this.attachSensors();
      this.updateSensorPause();
    }
    else {
      this.performance.stop();
      this.detachSensors();
      this.resetRotationFeedback();
      this.pointer.active = false;
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'UNBALANCED', lockChime: false, active: false });
      this.publish(false, this.game.snapshot());
    }
  }

  setHidden(hidden: boolean) {
    const wasHidden = this.hidden;
    this.hidden = hidden;
    if (hidden) this.detachSensors();
    else if (this.layerEnabled && this.permission === 'granted') this.attachSensors();
    this.updateSensorPause();
    this.audio.setPaused(hidden);
    if (hidden) {
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
    } else if (wasHidden && this.permission === 'granted') {
      // V3：背景分頁切回時，感測器暫停期間的濾波基準已經過期，重新確認/校正
      // 一次比繼續沿用舊資料安全，也不會讓角度瞬跳（recalibrate 本身走平滑取樣）。
      this.recalibrate();
    }
  }

  async armFromUserGesture(initialStrikeOrigin: Level01StrikeOrigin = 'N') {
    if (this.disposed || this.permission === 'pending') return this.pose;
    return this.boundary.run(this.pose, () => {
      const now = this.now();
      this.manualFallback = false;
      this.completedAt = -1;
      this.motionGame.reset();
      this.resetRotationFeedback();
      this.lastStaticAdvanceAt = -Infinity;
      this.syncEnvironment();
      this.game.beginPermission(now);
      this.armAudioFromUserGesture(true, initialStrikeOrigin);
      this.haptics.armFromUserGesture();
      this.activationId += 1;
      this.haptics.playActivationImpact(now);
      void this.enableSensors();
      this.publish(false, this.game.snapshot());
      return this.pose;
    });
  }

  playTouchReboundFeedback(phase: 'press' | 'release' = 'press', strikeOrigin: Level01StrikeOrigin = 'N') {
    if (this.disposed) return false;
    // MOBILE_AUDIO_READY_LOCK: a strike that also unlocks or resumes audio is
    // queued until the context and decoded thunder are genuinely ready. If the
    // graph is already running, the same call plays immediately instead.
    this.armAudioFromUserGesture(phase === 'press', strikeOrigin);
    this.haptics.armFromUserGesture();
    const profile = rotationFeedbackProfile({
      spin: phase === 'press' ? 0.46 : 0.3,
      energy: phase === 'press' ? 0.58 : 0.36,
      pulseIndex: this.activationId + (phase === 'press' ? 2 : 3),
      reducedMotion: this.reducedMotion,
    });
    this.audio.playRotationPulse(profile);
    return phase === 'press' ? this.haptics.playTouchRebound(this.now()) : true;
  }

  /** Start the visible experience immediately. Browsers that require a gesture
   * keep sensor permission for the first natural sphere touch. */
  async attemptAutomaticSensorStart() {
    if (this.disposed || this.pose.gameState !== 'IDLE') return this.pose;
    this.syncEnvironment();
    this.telemetry.update({ sensorAvailable: sensorsSupported() });
    const now = this.now();
    this.completedAt = -1;
    this.motionGame.reset();
    this.resetRotationFeedback();
    this.activationId += 1;
    if (canAutoStartLevel01Sensors()) {
      this.manualFallback = false;
      this.game.beginPermission(now);
      this.publish(false, this.game.snapshot());
      void this.enableSensors();
    } else {
      this.manualFallback = true;
      this.game.fallback(now);
      this.telemetry.update({ fallbackUsed: true });
      this.publish(true, this.game.snapshot());
    }
    return this.pose;
  }

  recalibrate() {
    if (this.disposed) return this.pose;
    const now = this.now();
    if (this.permission !== 'granted') return this.useFallback();
    this.manualFallback = false;
    this.sensorTimedOut = false;
    this.armedAt = now;
    this.sensors.beginCalibration(now);
    this.game.beginCalibration(now);
    this.publish(false, this.game.snapshot());
    return this.pose;
  }

  reconnect() {
    if (this.disposed) return Promise.resolve(this.pose);
    if (this.permission === 'granted') {
      this.manualFallback = false;
      this.attachSensors();
      return Promise.resolve(this.recalibrate());
    }
    return this.armFromUserGesture();
  }

  useFallback(fromUserGesture = false) {
    const now = this.now();
    if (fromUserGesture) {
      this.armAudioFromUserGesture();
      if (this.hapticEnabled) this.haptics.armFromUserGesture();
      this.activationId += 1;
      this.haptics.playActivationImpact(now);
    }
    if (this.pose.gameState === 'IDLE' || this.pose.gameState === 'LEVEL_COMPLETE') {
      this.completedAt = -1;
      this.motionGame.reset();
      this.resetRotationFeedback();
      this.lastStaticAdvanceAt = -Infinity;
    }
    this.manualFallback = true;
    this.game.fallback(now);
    this.telemetry.update({ fallbackUsed: true });
    this.publish(true, this.game.snapshot());
    return this.pose;
  }

  exitGame() {
    this.manualFallback = false;
    this.pointer.active = false;
    this.game.exit(this.now());
    this.motionGame.reset();
    this.completedAt = -1;
    this.lastStaticAdvanceAt = -Infinity;
    this.resetRotationFeedback();
    this.haptics.stop();
    this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'UNBALANCED', lockChime: false, active: false });
    this.publish(false, this.game.snapshot());
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    if (this.audioEnabled) this.armAudioFromUserGesture();
    else if (this.soundVariant && this.hasArmedBefore && this.now() - this.armedAudioAt < 4000) {
      // 啟動音才剛播沒幾秒就被關掉，算一次「立即靜音」，是偏好學習要看的負向訊號。
      this.soundPreference.recordEvent({ variant: this.soundVariant, mutedImmediately: true });
    }
    this.audio.setEnabled(this.audioEnabled);
    this.persistPreferences();
    this.publish(this.pose.driving, this.game.snapshot(this.physics.holdProgress));
    return this.audioEnabled;
  }

  /** A visible first-layer control calls this from a real user gesture. It is
   * intentionally explicit so browsers can resume/decode Web Audio without
   * relying on an ambiguous first strike on the Taiji. */
  enableAudioFromUserGesture(strikeOrigin: Level01StrikeOrigin = 'N') {
    this.audioEnabled = true;
    this.audio.setEnabled(true);
    // This visible control grants browser audio permission only. Sound begins
    // at the next actual lightning point, never as an unrelated unlock cue.
    this.armAudioFromUserGesture(false, strikeOrigin);
    this.publish(false, this.game.snapshot());
    return this.audioEnabled;
  }

  toggleHaptics() {
    this.hapticEnabled = !this.hapticEnabled;
    if (this.hapticEnabled) this.haptics.armFromUserGesture();
    this.haptics.setEnabled(this.hapticEnabled);
    this.persistPreferences();
    this.publish(this.pose.driving, this.game.snapshot(this.physics.holdProgress));
    return this.hapticEnabled;
  }

  toggleMotion() {
    this.motionEnabled = !this.motionEnabled;
    this.staticMode = !this.motionEnabled;
    this.manualFallback = this.staticMode || this.permission !== 'granted';
    if (this.staticMode && !this.game.isFinished()) this.game.fallback(this.now());
    this.pointer.active = false;
    if (this.motionEnabled && this.permission === 'granted') this.attachSensors();
    else this.detachSensors();
    this.updateSensorPause();
    this.persistPreferences();
    this.publish(this.pose.driving, this.game.snapshot(this.physics.holdProgress));
    return this.motionEnabled;
  }

  toggleStaticMode() {
    this.staticMode = !this.staticMode;
    this.motionEnabled = !this.staticMode;
    if (this.staticMode) {
      this.armAudioFromUserGesture();
      this.haptics.armFromUserGesture();
      this.activationId += 1;
      this.haptics.playActivationImpact(this.now());
      this.manualFallback = true;
      this.lastStaticAdvanceAt = -Infinity;
      if (this.pose.gameState === 'IDLE' || this.pose.gameState === 'LEVEL_COMPLETE') {
        this.completedAt = -1;
        this.motionGame.reset();
      }
      if (!this.game.isFinished()) this.game.fallback(this.now());
    } else {
      this.manualFallback = this.permission !== 'granted';
      if (this.permission === 'granted') this.recalibrate();
    }
    if (this.staticMode) this.detachSensors();
    else if (this.permission === 'granted') this.attachSensors();
    this.updateSensorPause();
    this.persistPreferences();
    this.publish(this.staticMode, this.game.snapshot(this.physics.holdProgress));
    return this.staticMode;
  }

  advanceStaticMotion() {
    if (!this.featureEnabled || !this.staticMode || this.game.isFinished()) return this.pose;
    const now = this.now();
    if (now - this.lastStaticAdvanceAt < STATIC_ADVANCE_LOCK_MS) return this.pose;
    this.lastStaticAdvanceAt = now;
    const next = this.motionGame.advanceStaticStage(now);
    this.pointer.active = false;
    this.pointer.beta = next.combo % 2 === 0 ? 9 : -9;
    this.pointer.gamma = next.combo % 2 === 0 ? -15 : 15;
    this.pointer.rotationRate = 250;
    this.pointer.acceleration = 5.2;
    this.staticPulseUntil = now + 260;
    this.publish(true, this.game.snapshot(this.physics.holdProgress));
    return this.pose;
  }

  settleStaticMotion() {
    this.pointer.active = false;
    this.pointer.beta = 0;
    this.pointer.gamma = 0;
    this.pointer.rotationRate = 0;
    this.pointer.acceleration = 0;
    this.staticPulseUntil = -Infinity;
    return this.pose;
  }

  beginPointer(clientX: number, clientY: number, width: number, height: number) {
    if (this.game.isFinished()) return;
    if (this.pose.gameState === 'IDLE') this.useFallback(true);
    const now = this.now();
    this.pointer.active = true;
    this.pointer.lastX = clientX;
    this.pointer.lastY = clientY;
    this.pointer.lastAt = now;
    this.updatePointer(clientX, clientY, width, height);
  }

  updatePointer(clientX: number, clientY: number, width: number, height: number) {
    if (!this.pointer.active) return;
    const now = this.now();
    const dt = Math.max(0.016, (now - this.pointer.lastAt) / 1000);
    const dx = clientX - this.pointer.lastX;
    const dy = clientY - this.pointer.lastY;
    this.pointer.gamma = Math.max(-32, Math.min(32, (clientX / Math.max(1, width) - 0.5) * 64));
    this.pointer.beta = Math.max(-32, Math.min(32, (clientY / Math.max(1, height) - 0.5) * 64));
    this.pointer.rotationRate = Math.min(720, Math.hypot(dx, dy) / dt * 0.72);
    this.pointer.acceleration = Math.min(18, Math.hypot(dx, dy) / Math.max(1, Math.min(width, height)) * 20);
    this.pointer.lastX = clientX;
    this.pointer.lastY = clientY;
    this.pointer.lastAt = now;
  }

  endPointer() {
    this.pointer.active = false;
    this.pointer.rotationRate = 0;
    this.pointer.acceleration = 0;
  }

  playReentryWhoosh() {
    this.audio.playReentryWhoosh();
    this.haptics.scheduleReentryCheer();
  }

  recordNextStepCompleted() {
    if (!this.soundVariant) return;
    this.soundPreference.recordEvent({ variant: this.soundVariant, nextStepCompleted: true });
  }

  tick(delta: number) {
    return this.boundary.run(this.pose, () => this.tickInternal(delta));
  }

  dispose() {
    this.disposed = true;
    this.removeListeners?.();
    this.removeListeners = null;
    this.performance.stop();
    this.haptics.stop();
    this.audio.dispose();
    this.boundary.dispose();
  }

  private async enableSensors() {
    const now = this.now();
    if (!sensorsSupported()) {
      this.manualFallback = true;
      this.permission = 'unsupported';
      this.game.fallback(now);
      this.telemetry.update({ sensorAvailable: false, permissionResult: 'unsupported', fallbackUsed: true });
      this.publish(true, this.game.snapshot());
      return this.pose;
    }
    this.permission = 'pending';
    this.publish(false, this.game.snapshot());
    const status = await requestLevel01SensorPermission();
    this.permission = status === 'granted' ? 'granted' : status === 'unsupported' ? 'unsupported' : 'denied';
    this.telemetry.update({ sensorAvailable: true, permissionResult: this.permission });
    if (this.permission === 'granted') {
      this.manualFallback = false;
      this.armedAt = this.now();
      this.sensorTimedOut = false;
      this.sensors.beginCalibration(this.armedAt);
      this.attachSensors();
      this.game.beginCalibration(this.armedAt);
    } else {
      this.manualFallback = true;
      this.game.fallback(this.now());
      this.telemetry.update({ fallbackUsed: true });
    }
    this.publish(this.permission !== 'granted', this.game.snapshot());
    return this.pose;
  }

  private tickInternal(delta: number) {
    if (this.disposed || this.hidden || !this.layerEnabled) {
      this.publish(false, this.game.snapshot(this.physics.holdProgress));
      return this.pose;
    }
    const now = this.now();
    const metrics = this.performance.recordFrame(delta, now);
    if (metrics) {
      const quality = this.quality.update(metrics, now);
      const critical = metrics.fps < 30 || metrics.memoryPressure || metrics.longTasks >= 3;
      this.game.lowPerformance(critical, now);
      this.telemetry.update({ qualityLevel: quality, averageFPS: metrics.fps });
    }

    const sensor = this.sensors.snapshot(now);
    if (this.permission === 'granted' && sensor.fresh) this.sensorTimedOut = false;
    else if (this.permission === 'granted' && this.armedAt > 0 && now - this.armedAt > SENSOR_WARMUP_TIMEOUT_MS) this.sensorTimedOut = true;

    if (!this.manualFallback && this.permission === 'granted' && !sensor.calibrated) {
      if (this.sensorTimedOut) {
        this.manualFallback = true;
        this.detachSensors();
        this.game.fallback(now);
        this.telemetry.update({ fallbackUsed: true });
      } else this.game.beginCalibration(now);
      this.publish(this.manualFallback, this.game.snapshot());
      return this.pose;
    }
    if (this.permission === 'granted' && sensor.calibrated && this.pose.gameState === 'CALIBRATING') this.game.ready(now);

    const fallback = this.manualFallback
      || this.permission !== 'granted'
      || this.pose.gameState === 'FALLBACK'
      || (this.featureEnabled && (!this.motionEnabled || this.staticMode));
    if (!this.manualFallback && this.permission === 'granted' && !sensor.fresh && this.sensorTimedOut) {
      this.manualFallback = true;
      this.detachSensors();
      this.game.fallback(now);
      this.telemetry.update({ fallbackUsed: true });
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
      this.publish(true, this.game.snapshot());
      return this.pose;
    }
    if (this.game.isFinished()) {
      if (this.featureEnabled) {
        if (this.completedAt < 0) this.completedAt = now;
        this.motionGame.markUnity();
      }
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'LOCKED', lockChime: false, active: false });
      this.publish(false, this.game.snapshot(1));
      return this.pose;
    }

    if (!this.pointer.active && fallback) {
      const pulseActive = this.staticMode && now < this.staticPulseUntil;
      if (!pulseActive) {
        this.pointer.beta *= Math.exp(-delta * 3.4);
        this.pointer.gamma *= Math.exp(-delta * 3.4);
        this.pointer.rotationRate *= Math.exp(-delta * 5);
        this.pointer.acceleration *= Math.exp(-delta * 5);
      }
    }
    const input = fallback ? {
      alpha: 0,
      beta: this.pointer.beta,
      gamma: this.pointer.gamma,
      rotationRate: this.pointer.rotationRate,
      acceleration: this.pointer.acceleration,
      accelerationX: 0,
      accelerationY: 0,
      accelerationZ: 0,
      rotationAlpha: 0,
      rotationBeta: 0,
      rotationGamma: 0,
    } : sensor;
    const canDrive = fallback || sensor.fresh;
    if (!canDrive) {
      this.publish(false, this.game.snapshot());
      return this.pose;
    }

    integrateLevel01Physics(this.physics, {
      ...input,
      now,
      delta: Math.min(delta, FRAME_DELTA_CAP),
      reducedMotion: this.reducedMotion,
    });
    const visual = visualPoseFromPhysics(this.physics, true);
    const motionGame = this.featureEnabled
      ? this.motionGame.update({
        ...input,
        motionEnergy: this.physics.motionEnergy,
        angularVelocity: this.physics.angularVelocity,
        balanceState: this.physics.balanceState,
        now,
        delta: Math.min(delta, FRAME_DELTA_CAP),
        reducedMotion: this.reducedMotion || this.staticMode,
      })
      : this.motionGame.snapshot();
    if (motionGame.chase.hitId !== this.lastChaseHitId) {
      this.lastChaseHitId = motionGame.chase.hitId;
      this.audio.playChaseHit(motionGame.chase.hits);
      this.haptics.playChaseHit(now, motionGame.chase.hits);
    }
    const stageReadyForUnity = !this.featureEnabled || motionGame.stage === 'FIVE_ELEMENTS' || motionGame.stage === 'UNITY';
    const balanceStateForGame = !stageReadyForUnity && this.physics.balanceState === 'LOCKED'
      ? 'BALANCED'
      : this.physics.balanceState;
    const game = this.game.sync({
      balanceState: balanceStateForGame,
      balanceProgress: this.physics.balanceProgress,
      holdProgress: this.physics.holdProgress,
      motionEnergy: this.physics.motionEnergy,
      now,
    });
    let visualBurstTriggered = false;
    if (visual.visualBurstId !== this.lastVisualBurstId) {
      this.lastVisualBurstId = visual.visualBurstId;
      visualBurstTriggered = true;
      this.audio.playRotationBurst(visual.visualBurstTurns, visual.visualBurstDuration, visual.visualMomentum);
      this.haptics.scheduleVisualBurst(visual.visualBurstTurns, visual.visualBurstDuration, visual.visualMomentum);
    }
    const direction = resolveLevel01TiltDirection(this.physics.beta, this.physics.gamma);
    const directionAcknowledged = this.haptics.pulse({
      now,
      motionEnergy: this.physics.motionEnergy,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
      direction,
      gameEvent: game.event,
      rotationSynchronized: this.featureEnabled,
      suppressDirectional: this.featureEnabled && visualBurstTriggered,
    });
    if (directionAcknowledged) this.audio.playTiltAccent(direction!, this.physics.motionEnergy);
    if (this.featureEnabled && !visualBurstTriggered) this.syncRotationFeedback(now);
    this.audio.sync({
      motionEnergy: this.physics.motionEnergy,
      angularVelocity: this.physics.angularVelocity,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
      active: true,
    });
    if (game.state === 'LEVEL_COMPLETE') {
      this.telemetry.update({ completionSuccess: true });
      if (this.soundVariant && !this.activationEventRecorded) {
        this.activationEventRecorded = true;
        this.soundPreference.recordEvent({ variant: this.soundVariant, completedInteraction: true });
      }
      if (this.featureEnabled) {
        this.completedAt = now;
        this.motionGame.markUnity();
      }
    }
    this.publish(true, game);
    return this.pose;
  }

  private syncRotationFeedback(now: number) {
    const spin = Math.min(1, Math.abs(this.physics.angularVelocity) / MAX_FLICK_SPIN_SPEED);
    const step = Math.floor(this.physics.spinAngle / (Math.PI / 2));
    if (this.lastRotationFeedbackStep === null) {
      this.lastRotationFeedbackStep = step;
      return;
    }
    if (step === this.lastRotationFeedbackStep) return;
    this.lastRotationFeedbackStep = step;
    if (spin < 0.08 || this.physics.motionEnergy < 0.1 || this.physics.balanceState === 'LOCKED') return;
    const profile = rotationFeedbackProfile({
      spin,
      energy: this.physics.motionEnergy,
      pulseIndex: step,
      reducedMotion: this.reducedMotion,
    });
    const cooldown = Math.round(250 - profile.intensity * 32);
    if (now - this.lastRotationFeedbackAt < cooldown) return;
    this.lastRotationFeedbackAt = now;
    // Same frame, same envelope: hearing and touch describe one rotation beat.
    this.audio.playRotationPulse(profile);
    this.haptics.pulseRotation({ now, hapticMs: profile.hapticMs, intensity: profile.intensity });
  }

  private armAudioFromUserGesture(playInitialLightning = false, strikeOrigin: Level01StrikeOrigin = 'N') {
    if (!this.audioEnabled) return;
    if (this.audio.isReadyForPlayback()) {
      if (playInitialLightning) this.audio.playLightningStrike(strikeOrigin);
      return;
    }
    if (this.activationArmInFlight) return;
    this.activationArmInFlight = true;
    void this.audio.armFromUserGesture().then((ready) => {
      if (!ready || this.disposed) return;
      // Assign the local experiment only after a real gesture successfully
      // unlocks audio; constructing the page itself records nothing.
      const variant = this.soundVariant ?? this.soundPreference.resolveVariant();
      this.soundVariant = variant;
      this.audio.playActivationChime(variant);
      // The first mobile press is also the browser's audio-unlock gesture.
      // Schedule the strike only after resume succeeds, otherwise the visual
      // lightning appears while the first thunder is silently discarded.
      if (playInitialLightning) this.audio.playLightningStrike(strikeOrigin);
      this.armedAudioAt = this.now();
      this.lastActivationAt = this.armedAudioAt;
      this.soundPreference.recordEvent({ variant, replayed: this.hasArmedBefore });
      this.hasArmedBefore = true;
      this.activationEventRecorded = false;
      // 背景確認跨使用者聚合有沒有已經產生真正的贏家；不 await，不擋這次的儀式節奏。
      void this.soundPreference.refreshWinnerFromServer();
    }).finally(() => {
      this.activationArmInFlight = false;
    });
  }

  private resetRotationFeedback() {
    this.lastRotationFeedbackAt = -Infinity;
    this.lastRotationFeedbackStep = null;
  }

  private attachSensors() {
    if (this.removeListeners || typeof window === 'undefined') return;
    if (!this.layerEnabled || this.hidden || (this.featureEnabled && (!this.motionEnabled || this.staticMode))) {
      this.updateSensorPause();
      return;
    }
    const onOrientation = (event: DeviceOrientationEvent) => this.sensors.pushOrientationEvent(event, performance.now());
    const onMotion = (event: DeviceMotionEvent) => this.sensors.pushMotionEvent(event, performance.now());
    // V3：直向/橫向切換會讓校正基準跟著偏移，螢幕方向一變就重新校正一次，
    // 避免使用者轉手機之後太極一直傾向某一邊。
    const onOrientationChange = () => {
      if (this.disposed || this.permission !== 'granted') return;
      this.recalibrate();
    };
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    window.addEventListener('devicemotion', onMotion, { passive: true });
    window.addEventListener('orientationchange', onOrientationChange, { passive: true });
    const screenOrientation = typeof screen !== 'undefined' ? screen.orientation : undefined;
    screenOrientation?.addEventListener?.('change', onOrientationChange);
    this.removeListeners = () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
      window.removeEventListener('orientationchange', onOrientationChange);
      screenOrientation?.removeEventListener?.('change', onOrientationChange);
    };
    this.updateSensorPause();
  }

  private detachSensors() {
    this.removeListeners?.();
    this.removeListeners = null;
    this.sensors.setPaused(true);
  }

  private updateSensorPause() {
    this.sensors.setPaused(
      this.hidden
      || !this.layerEnabled
      || (this.featureEnabled && (!this.motionEnabled || this.staticMode)),
    );
  }

  private effectivePermission(hasSensorData: boolean): Level01Permission {
    return resolveEffectivePermission({ permission: this.permission, sensorTimedOut: this.sensorTimedOut, hasSensorData });
  }

  private syncEnvironment() {
    if (typeof window === 'undefined') return;
    const nextFeatureEnabled = isTaijiMotionGameV1Enabled();
    this.featureEnabled = nextFeatureEnabled;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this.loadPreferences();
    this.audio.setReducedMotion(this.reducedMotion);
    this.audio.setEnabled(this.audioEnabled);
    this.haptics.setReducedMotion(this.reducedMotion);
    this.haptics.setEnabled(this.hapticEnabled);
    this.haptics.syncSupport();
    this.updateSensorPause();
  }

  private loadPreferences() {
    if (!this.featureEnabled || this.preferencesLoaded || typeof window === 'undefined') return;
    this.preferencesLoaded = true;
    try {
      const stored = window.localStorage.getItem('taijiMotionGameV1.preferences');
      if (!stored) return;
      const preferences = JSON.parse(stored) as { audio?: boolean; haptic?: boolean; mode?: 'motion' | 'static' };
      // The customer surface has no visible audio switch. A historical local
      // mute must not silently defeat the first real black/white-point strike;
      // each fresh visit starts with the explicit product default enabled.
      if (preferences.audio === true) this.audioEnabled = true;
      if (typeof preferences.haptic === 'boolean') this.hapticEnabled = preferences.haptic;
      if (preferences.mode === 'static') {
        this.staticMode = true;
        this.motionEnabled = false;
      } else if (preferences.mode === 'motion') {
        this.staticMode = false;
        this.motionEnabled = true;
      }
    } catch {
      // A blocked or malformed local preference never blocks the game.
    }
  }

  private persistPreferences() {
    if (!this.featureEnabled || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('taijiMotionGameV1.preferences', JSON.stringify({
        audio: this.audioEnabled,
        haptic: this.hapticEnabled,
        mode: this.staticMode ? 'static' : 'motion',
      }));
    } catch {
      // Privacy/storage restrictions fall back to session defaults.
    }
  }

  private publish(driving: boolean, game: Level01GameSnapshot) {
    const visual = visualPoseFromPhysics(this.physics, driving);
    const hasSensorData = this.sensors.snapshot(this.now()).fresh;
    const permission = this.effectivePermission(hasSensorData);
    const fallback = game.state === 'FALLBACK' || permission === 'denied' || permission === 'unsupported';
    const mode = resolveLevel01Mode({ permission, hasSensorData, layerEnabled: this.layerEnabled });
    const motionGame = this.motionGame.snapshot();
    const motionMessageAllowed = this.featureEnabled
      && !['IDLE', 'PERMISSION', 'CALIBRATING', 'SENSOR_LOST', 'LOW_PERFORMANCE'].includes(game.state);
    this.pose.driving = driving;
    this.pose.fallback = fallback;
    this.pose.permission = permission;
    this.pose.mode = fallback ? 'FALLBACK_MODE' : mode;
    this.pose.hapticMode = this.haptics.mode;
    this.pose.gameState = game.state;
    this.pose.message = motionMessageAllowed ? motionGame.message : game.message;
    this.pose.quality = this.quality.quality;
    this.pose.fps = this.performance.snapshot().fps;
    this.pose.combo = this.featureEnabled ? motionGame.combo : game.combo;
    this.pose.score = game.score;
    this.pose.audioEnabled = this.audioEnabled;
    this.pose.hapticEnabled = this.hapticEnabled;
    this.pose.motionEnabled = this.motionEnabled;
    this.pose.staticMode = this.staticMode;
    this.pose.reducedMotion = this.reducedMotion;
    this.pose.motionGameEnabled = this.featureEnabled;
    this.pose.motionGame = motionGame;
    this.pose.unityReady = game.state === 'LEVEL_COMPLETE' && this.completedAt >= 0 && this.now() - this.completedAt >= 1500;
    this.pose.visualEuler = visual.visualEuler;
    this.pose.activationId = this.activationId;
    this.pose.visualOffset = visual.visualOffset;
    this.pose.angularVelocity = visual.angularVelocity;
    this.pose.spinAngle = visual.spinAngle;
    this.pose.motionEnergy = visual.motionEnergy;
    this.pose.balanceState = visual.balanceState;
    this.pose.balanceProgress = visual.balanceProgress;
    this.pose.holdProgress = visual.holdProgress;
    this.pose.visualMomentum = visual.visualMomentum;
    this.pose.visualBurstId = visual.visualBurstId;
    this.pose.visualBurstTurns = visual.visualBurstTurns;
    this.pose.visualBurstDuration = visual.visualBurstDuration;
    this.pose.snapshot = snapshotFromPhysics(this.physics);
    this.renderer.render(this.physics, visual.visualMomentum, visual.balanceProgress, game.holdProgress, this.quality.quality);
    const hudKey = `${this.pose.mode}|${permission}|${driving}|${game.state}|${this.pose.hapticMode}|${this.pose.quality}|${this.audioEnabled}|${this.hapticEnabled}|${this.motionEnabled}|${this.staticMode}|${motionGame.state}|${motionGame.stage}|${motionGame.visualElement}|${motionGame.customerState}|${motionGame.combo}|${motionGame.chase.direction}|${motionGame.chase.hitId}|${this.pose.unityReady}`;
    if (hudKey !== this.lastHudKey) {
      this.lastHudKey = hudKey;
      const notify = this.onChange;
      if (notify) queueMicrotask(() => notify(this.pose));
    }
  }

  private buildPose(driving: boolean, game: Level01GameSnapshot): Level01Pose {
    const visual = visualPoseFromPhysics(this.physics, driving);
    return {
      ...visual,
      activationId: this.activationId,
      fallback: true,
      permission: this.permission,
      mode: 'FALLBACK_MODE',
      hapticMode: this.haptics.mode,
      gameState: game.state,
      message: game.message,
      quality: this.quality.quality,
      fps: 60,
      combo: game.combo,
      score: game.score,
      audioEnabled: this.audioEnabled,
      hapticEnabled: this.hapticEnabled,
      motionEnabled: this.motionEnabled,
      staticMode: this.staticMode,
      reducedMotion: this.reducedMotion,
      motionGameEnabled: this.featureEnabled,
      motionGame: this.motionGame.snapshot(),
      unityReady: false,
      snapshot: snapshotFromPhysics(this.physics),
    };
  }

  private now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}
