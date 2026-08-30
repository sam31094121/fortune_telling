import { GRAVITY_FILTER_FACTOR, GRAVITY_MAGNITUDE } from './level01.constants';

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

/**
 * 重力估計：許多 Android 裝置的 event.acceleration 為 null，只能退回
 * accelerationIncludingGravity。若直接取模，靜止手機恆讀到 ~9.81，
 * 會讓 motionEnergy 永遠有假底值。改用低通估計重力向量，只取殘差當真實加速度。
 */
export type GravityEstimate = {
  x: number;
  y: number;
  z: number;
  primed: boolean;
};

export function createGravityEstimate(): GravityEstimate {
  return { x: 0, y: 0, z: 0, primed: false };
}

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

export function readMotionEvent(
  event: DeviceMotionEvent,
  now: number,
  gravity?: GravityEstimate,
): MotionSample {
  const rate = event.rotationRate;
  const rotationRate = Math.hypot(rate?.alpha ?? 0, rate?.beta ?? 0, rate?.gamma ?? 0);

  const linear = event.acceleration;
  if (linear && (linear.x != null || linear.y != null || linear.z != null)) {
    return {
      rotationRate,
      acceleration: Math.hypot(linear.x ?? 0, linear.y ?? 0, linear.z ?? 0),
      receivedAt: now,
    };
  }

  const raw = event.accelerationIncludingGravity;
  const x = raw?.x ?? 0;
  const y = raw?.y ?? 0;
  const z = raw?.z ?? 0;

  if (!gravity) {
    return {
      rotationRate,
      acceleration: Math.abs(Math.hypot(x, y, z) - GRAVITY_MAGNITUDE),
      receivedAt: now,
    };
  }

  if (!gravity.primed) {
    gravity.x = x;
    gravity.y = y;
    gravity.z = z;
    gravity.primed = true;
  } else {
    gravity.x += (x - gravity.x) * GRAVITY_FILTER_FACTOR;
    gravity.y += (y - gravity.y) * GRAVITY_FILTER_FACTOR;
    gravity.z += (z - gravity.z) * GRAVITY_FILTER_FACTOR;
  }

  return {
    rotationRate,
    acceleration: Math.hypot(x - gravity.x, y - gravity.y, z - gravity.z),
    receivedAt: now,
  };
}
