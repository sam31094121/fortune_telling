import { FRAME_DELTA_CAP, SENSOR_WARMUP_TIMEOUT_MS } from './level01.constants';
import { Level01SoundEngine } from './Level01Audio';
import { resolveEffectivePermission, resolveLevel01Mode, type Level01Mode, type Level01Permission } from './Level01Fallback';
import { Level01GameController, type Level01GameSnapshot } from './Level01GameController';
import { Level01HapticController } from './Level01Haptics';
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
import { Level01SensorController } from './Level01SensorController';
import { Level01Telemetry } from './Level01Telemetry';
import { requestLevel01SensorPermission, sensorsSupported } from './Level01Orientation';
import type { Level01GameState, Level01Score, QualityLevel } from './Level01Runtime';

export interface Level01Pose extends Level01VisualPose {
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

export class Level01TaijiMotionController {
  readonly pose: Level01Pose;
  private readonly physics: PhysicsState = createPhysicsState();
  private readonly audio = new Level01SoundEngine();
  private readonly haptics = new Level01HapticController();
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
  private manualFallback = false;
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
    if (enabled) this.performance.start();
    else {
      this.performance.stop();
      this.pointer.active = false;
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'UNBALANCED', lockChime: false, active: false });
      this.publish(false, this.game.snapshot());
    }
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.sensors.setPaused(hidden);
    this.audio.setPaused(hidden);
    if (hidden) {
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
    }
  }

  async armFromUserGesture() {
    if (this.disposed || this.permission === 'pending') return this.pose;
    return this.boundary.run(this.pose, () => {
      const now = this.now();
      this.manualFallback = false;
      this.syncEnvironment();
      this.game.beginPermission(now);
      void this.audio.armFromUserGesture();
      this.haptics.armFromUserGesture();
      void this.enableSensors();
      this.publish(false, this.game.snapshot());
      return this.pose;
    });
  }

  /** Explicit-start V2: preflight only; permission remains behind the central button. */
  async attemptAutomaticSensorStart() {
    this.syncEnvironment();
    this.telemetry.update({ sensorAvailable: sensorsSupported() });
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

  useFallback() {
    const now = this.now();
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
    this.haptics.stop();
    this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'UNBALANCED', lockChime: false, active: false });
    this.publish(false, this.game.snapshot());
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    this.audio.setEnabled(this.audioEnabled);
    this.publish(this.pose.driving, this.game.snapshot(this.physics.holdProgress));
    return this.audioEnabled;
  }

  beginPointer(clientX: number, clientY: number, width: number, height: number) {
    if (this.game.isFinished()) return;
    if (this.pose.gameState === 'IDLE') this.useFallback();
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
      if (this.sensorTimedOut) this.game.sensorLost(now);
      else this.game.beginCalibration(now);
      this.publish(false, this.game.snapshot());
      return this.pose;
    }
    if (this.permission === 'granted' && sensor.calibrated && this.pose.gameState === 'CALIBRATING') this.game.ready(now);

    const fallback = this.manualFallback || this.permission !== 'granted' || this.pose.gameState === 'FALLBACK';
    if (!this.manualFallback && this.permission === 'granted' && !sensor.fresh && this.sensorTimedOut) {
      this.game.sensorLost(now);
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
      this.publish(false, this.game.snapshot());
      return this.pose;
    }
    if (this.game.isFinished()) {
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'LOCKED', lockChime: false, active: false });
      this.publish(false, this.game.snapshot(1));
      return this.pose;
    }

    if (!this.pointer.active && fallback) {
      this.pointer.beta *= Math.exp(-delta * 3.4);
      this.pointer.gamma *= Math.exp(-delta * 3.4);
      this.pointer.rotationRate *= Math.exp(-delta * 5);
      this.pointer.acceleration *= Math.exp(-delta * 5);
    }
    const input = fallback ? {
      alpha: 0,
      beta: this.pointer.beta,
      gamma: this.pointer.gamma,
      rotationRate: this.pointer.rotationRate,
      acceleration: this.pointer.acceleration,
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
    const game = this.game.sync({
      balanceState: this.physics.balanceState,
      balanceProgress: this.physics.balanceProgress,
      holdProgress: this.physics.holdProgress,
      motionEnergy: this.physics.motionEnergy,
      now,
    });
    const direction = resolveLevel01TiltDirection(this.physics.beta, this.physics.gamma);
    const directionAcknowledged = this.haptics.pulse({
      now,
      motionEnergy: this.physics.motionEnergy,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
      direction,
      gameEvent: game.event,
    });
    if (directionAcknowledged) this.audio.playTiltAccent(direction!, this.physics.motionEnergy);
    if (visual.visualBurstId !== this.lastVisualBurstId) {
      this.lastVisualBurstId = visual.visualBurstId;
      this.haptics.scheduleVisualBurst(visual.visualBurstTurns, visual.visualBurstDuration, visual.visualMomentum);
    }
    this.audio.sync({
      motionEnergy: this.physics.motionEnergy,
      angularVelocity: this.physics.angularVelocity,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
      active: true,
    });
    if (game.state === 'LEVEL_COMPLETE') this.telemetry.update({ completionSuccess: true });
    this.publish(true, game);
    return this.pose;
  }

  private attachSensors() {
    if (this.removeListeners || typeof window === 'undefined') return;
    const onOrientation = (event: DeviceOrientationEvent) => this.sensors.pushOrientationEvent(event, performance.now());
    const onMotion = (event: DeviceMotionEvent) => this.sensors.pushMotionEvent(event, performance.now());
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    window.addEventListener('devicemotion', onMotion, { passive: true });
    this.removeListeners = () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
    };
  }

  private effectivePermission(hasSensorData: boolean): Level01Permission {
    return resolveEffectivePermission({ permission: this.permission, sensorTimedOut: this.sensorTimedOut, hasSensorData });
  }

  private syncEnvironment() {
    if (typeof window === 'undefined') return;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this.audio.setReducedMotion(this.reducedMotion);
    this.haptics.setReducedMotion(this.reducedMotion);
    this.haptics.syncSupport();
  }

  private publish(driving: boolean, game: Level01GameSnapshot) {
    const visual = visualPoseFromPhysics(this.physics, driving);
    const hasSensorData = this.sensors.snapshot(this.now()).fresh;
    const permission = this.effectivePermission(hasSensorData);
    const fallback = game.state === 'FALLBACK' || permission === 'denied' || permission === 'unsupported';
    const mode = resolveLevel01Mode({ permission, hasSensorData, layerEnabled: this.layerEnabled });
    this.pose.driving = driving;
    this.pose.fallback = fallback;
    this.pose.permission = permission;
    this.pose.mode = fallback ? 'FALLBACK_MODE' : mode;
    this.pose.hapticMode = this.haptics.mode;
    this.pose.gameState = game.state;
    this.pose.message = game.message;
    this.pose.quality = this.quality.quality;
    this.pose.fps = this.performance.snapshot().fps;
    this.pose.combo = game.combo;
    this.pose.score = game.score;
    this.pose.audioEnabled = this.audioEnabled;
    this.pose.visualEuler = visual.visualEuler;
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
    const hudKey = `${this.pose.mode}|${permission}|${driving}|${game.state}|${this.pose.hapticMode}|${this.pose.quality}|${this.audioEnabled}|${game.combo}`;
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
      snapshot: snapshotFromPhysics(this.physics),
    };
  }

  private now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}
