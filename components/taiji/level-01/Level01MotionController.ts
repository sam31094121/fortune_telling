import { FRAME_DELTA_CAP, SENSOR_TIMEOUT_MS, SENSOR_WARMUP_TIMEOUT_MS } from './level01.constants';
import { Level01SoundEngine } from './Level01Audio';
import {
  isLevel01Driving,
  resolveEffectivePermission,
  resolveLevel01Mode,
  type Level01Mode,
  type Level01Permission,
} from './Level01Fallback';
import { Level01HapticController } from './Level01Haptics';
import {
  createPhysicsState,
  integrateLevel01Physics,
  level01BubbleOffset,
  snapshotFromPhysics,
  visualPoseFromPhysics,
  type Level01VisualPose,
  type MotionSnapshot,
  type PhysicsState,
} from './Level01Physics';
import {
  createGravityEstimate,
  readMotionEvent,
  readOrientationEvent,
  requestLevel01SensorPermission,
  sensorsSupported,
  type GravityEstimate,
  type MotionSample,
  type OrientationSample,
} from './Level01Orientation';

export interface Level01Pose extends Level01VisualPose {
  fallback: boolean;
  permission: Level01Permission;
  mode: Level01Mode;
  hapticMode: 'LIVE' | 'NO_HAPTIC_MODE';
  snapshot: MotionSnapshot;
}

export class Level01TaijiMotionController {
  readonly pose: Level01Pose;
  private readonly physics: PhysicsState = createPhysicsState();
  private readonly audio = new Level01SoundEngine();
  private readonly haptics = new Level01HapticController();
  private permission: Level01Permission = 'idle';
  private layerEnabled = false;
  private hidden = false;
  private reducedMotion = false;
  private disposed = false;
  private latestOrientation: OrientationSample | null = null;
  private latestMotion: MotionSample | null = null;
  private removeListeners: (() => void) | null = null;
  private onChange: ((pose: Level01Pose) => void) | null = null;
  private lastHudKey = '';
  private bubbleEl: HTMLElement | null = null;
  private armedAt = 0;
  private sensorTimedOut = false;
  private readonly gravity: GravityEstimate = createGravityEstimate();

  constructor() {
    this.pose = this.buildPose(false);
    this.syncEnvironment();
  }

  setOnChange(handler: ((pose: Level01Pose) => void) | null) {
    this.onChange = handler;
  }

  setBubbleElement(element: HTMLElement | null) {
    this.bubbleEl = element;
  }

  setLayerEnabled(enabled: boolean) {
    if (this.layerEnabled === enabled) return;
    this.layerEnabled = enabled;
    if (!enabled) {
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: 'UNBALANCED', lockChime: false, active: false });
      this.publish(false);
    }
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.haptics.stop();
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
    }
  }

  async armFromUserGesture() {
    if (this.disposed) return this.pose;
    this.syncEnvironment();
    void this.audio.armFromUserGesture();
    if (!sensorsSupported()) {
      this.permission = 'unsupported';
      this.publish(false);
      return this.pose;
    }
    this.permission = 'pending';
    this.publish(false);
    const status = await requestLevel01SensorPermission();
    this.permission = status === 'granted' ? 'granted' : status === 'unsupported' ? 'unsupported' : 'denied';
    if (this.permission === 'granted') {
      this.armedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.sensorTimedOut = false;
      this.attachSensors();
    }
    this.publish(false);
    return this.pose;
  }

  playReentryWhoosh() {
    // The engine only exists after armFromUserGesture, so this can never autoplay.
    this.audio.playReentryWhoosh();
  }

  tick(delta: number) {
    if (this.disposed || this.hidden || !this.layerEnabled) {
      this.publish(false);
      return this.pose;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const orientationFresh = Boolean(
      this.latestOrientation && now - this.latestOrientation.receivedAt < SENSOR_TIMEOUT_MS,
    );
    // 暖機逾時只降級顯示；事件晚到時 orientationFresh 會把旗標清掉並自動回到 LIVE。
    if (this.permission === 'granted') {
      if (orientationFresh) this.sensorTimedOut = false;
      else if (this.armedAt > 0 && now - this.armedAt > SENSOR_WARMUP_TIMEOUT_MS) this.sensorTimedOut = true;
    }
    const driving = isLevel01Driving(resolveLevel01Mode({
      permission: this.effectivePermission(orientationFresh),
      hasSensorData: orientationFresh,
      layerEnabled: this.layerEnabled,
    }));

    if (!driving || !this.latestOrientation) {
      this.audio.sync({ motionEnergy: 0, angularVelocity: 0, balanceState: this.physics.balanceState, lockChime: false, active: false });
      this.publish(false);
      return this.pose;
    }

    integrateLevel01Physics(this.physics, {
      alpha: this.latestOrientation.alpha,
      beta: this.latestOrientation.beta,
      gamma: this.latestOrientation.gamma,
      rotationRate: this.latestMotion?.rotationRate ?? 0,
      acceleration: this.latestMotion?.acceleration ?? 0,
      now,
      delta: Math.min(delta, FRAME_DELTA_CAP),
      reducedMotion: this.reducedMotion,
    });
    this.haptics.pulse({
      now,
      motionEnergy: this.physics.motionEnergy,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
    });
    this.audio.sync({
      motionEnergy: this.physics.motionEnergy,
      angularVelocity: this.physics.angularVelocity,
      balanceState: this.physics.balanceState,
      lockChime: this.physics.lockChimePending,
      active: true,
    });

    this.publish(true);
    return this.pose;
  }

  dispose() {
    this.disposed = true;
    this.removeListeners?.();
    this.removeListeners = null;
    this.haptics.stop();
    this.audio.dispose();
  }

  private attachSensors() {
    if (this.removeListeners || typeof window === 'undefined') return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const sample = readOrientationEvent(event, performance.now());
      if (!sample) return;
      this.latestOrientation = sample;
    };
    const onMotion = (event: DeviceMotionEvent) => {
      this.latestMotion = readMotionEvent(event, performance.now(), this.gravity);
    };
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    window.addEventListener('devicemotion', onMotion, { passive: true });
    this.removeListeners = () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
    };
  }

  private effectivePermission(hasSensorData: boolean): Level01Permission {
    return resolveEffectivePermission({
      permission: this.permission,
      sensorTimedOut: this.sensorTimedOut,
      hasSensorData,
    });
  }

  private syncEnvironment() {
    if (typeof window === 'undefined') return;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    this.audio.setReducedMotion(this.reducedMotion);
    this.haptics.setReducedMotion(this.reducedMotion);
    this.haptics.syncSupport();
  }

  private publish(driving: boolean) {
    const visual = visualPoseFromPhysics(this.physics, driving);
    this.pose.driving = driving;
    this.pose.fallback = !driving;
    this.pose.permission = this.effectivePermission(driving);
    this.pose.mode = driving ? 'LIVE' : 'FALLBACK_MODE';
    this.pose.hapticMode = this.haptics.mode;
    this.pose.visualEuler = visual.visualEuler;
    this.pose.angularVelocity = visual.angularVelocity;
    this.pose.spinAngle = visual.spinAngle;
    this.pose.motionEnergy = visual.motionEnergy;
    this.pose.balanceState = visual.balanceState;
    this.pose.snapshot = snapshotFromPhysics(this.physics);
    if (this.bubbleEl) {
      // The shadow control and its glow share filtered physics state with the ball;
      // never read raw sensor events here or the visual will jitter on a phone.
      const x = level01BubbleOffset(this.physics.gamma);
      const y = level01BubbleOffset(this.physics.beta);
      this.bubbleEl.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
      const shadow = this.bubbleEl.parentElement;
      if (shadow) {
        const tilt = Math.hypot(this.physics.beta, this.physics.gamma);
        const energy = this.physics.motionEnergy;
        shadow.style.setProperty('--shadow-shift-x', `${(x * 0.32).toFixed(2)}px`);
        shadow.style.setProperty('--shadow-shift-y', `${(y * 0.12).toFixed(2)}px`);
        shadow.style.setProperty('--shadow-spread', `${(1 + Math.min(0.14, tilt * 0.008 + energy * 0.08)).toFixed(3)}`);
        shadow.style.setProperty('--shadow-opacity', `${(0.72 - Math.min(0.2, energy * 0.16)).toFixed(3)}`);
        shadow.style.setProperty('--shadow-glow', `${(0.42 + Math.min(0.3, energy * 0.24)).toFixed(3)}`);
        shadow.style.setProperty('--shadow-angle', `${Math.max(-3, Math.min(3, this.physics.gamma * 0.08)).toFixed(2)}deg`);
      }
    }
    const hudKey = `${this.pose.mode}|${this.pose.permission}|${this.pose.driving}|${this.pose.balanceState}|${this.pose.hapticMode}`;
    if (hudKey !== this.lastHudKey) {
      this.lastHudKey = hudKey;
      const notify = this.onChange;
      if (notify) queueMicrotask(() => notify(this.pose));
    }
  }

  private buildPose(driving: boolean): Level01Pose {
    const visual = visualPoseFromPhysics(this.physics, driving);
    return {
      ...visual,
      fallback: !driving,
      permission: this.permission,
      mode: driving ? 'LIVE' : 'FALLBACK_MODE',
      hapticMode: this.haptics.mode,
      snapshot: snapshotFromPhysics(this.physics),
    };
  }
}
