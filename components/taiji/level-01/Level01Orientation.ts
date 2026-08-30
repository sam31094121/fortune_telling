export type OrientationSample = {
  alpha: number;
  beta: number;
  gamma: number;
  receivedAt: number;
};

export type MotionSample = {
  rotationRate: number;
  acceleration: number;
  receivedAt: number;
};

type PermissionName = 'granted' | 'denied';

type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionName>;
};

type DeviceMotionCtor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionName>;
};

export function orientationPermissionRequired() {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  return typeof (DeviceOrientationEvent as DeviceOrientationCtor).requestPermission === 'function';
}

export function motionPermissionRequired() {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  return typeof (DeviceMotionEvent as DeviceMotionCtor).requestPermission === 'function';
}

export function sensorsSupported() {
  return typeof window !== 'undefined'
    && (typeof DeviceOrientationEvent !== 'undefined' || typeof DeviceMotionEvent !== 'undefined');
}

export async function requestLevel01SensorPermission(): Promise<PermissionName | 'unsupported'> {
  if (!sensorsSupported()) return 'unsupported';

  try {
    if (orientationPermissionRequired()) {
      const status = await (DeviceOrientationEvent as DeviceOrientationCtor).requestPermission!();
      if (status !== 'granted') return 'denied';
    }
    if (motionPermissionRequired()) {
      try {
        await (DeviceMotionEvent as DeviceMotionCtor).requestPermission!();
      } catch {
        // Motion is enhancement; orientation grant is enough to proceed.
      }
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

export function readOrientationEvent(event: DeviceOrientationEvent, now: number): OrientationSample | null {
  if (event.alpha == null || event.beta == null || event.gamma == null) return null;
  return {
    alpha: event.alpha,
    beta: event.beta,
    gamma: event.gamma,
    receivedAt: now,
  };
}

export function readMotionEvent(event: DeviceMotionEvent, now: number): MotionSample {
  const rate = event.rotationRate;
  const rotationRate = Math.hypot(rate?.alpha ?? 0, rate?.beta ?? 0, rate?.gamma ?? 0);
  const linear = event.acceleration;
  const withGravity = event.accelerationIncludingGravity;
  const acceleration = linear && (linear.x != null || linear.y != null || linear.z != null)
    ? Math.hypot(linear.x ?? 0, linear.y ?? 0, linear.z ?? 0)
    : Math.hypot(withGravity?.x ?? 0, withGravity?.y ?? 0, withGravity?.z ?? 0);
  return { rotationRate, acceleration, receivedAt: now };
}
