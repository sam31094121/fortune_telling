'use client';

import { useFrame } from '@react-three/fiber';
import { FRAME_DELTA_CAP } from './level01.constants';
import type { Level01TaijiMotionController } from './Level01MotionController';

export function Level01FrameBinder({
  controller,
  enabled,
}: {
  controller: Level01TaijiMotionController;
  enabled: boolean;
}) {
  useFrame((_, delta) => {
    controller.setLayerEnabled(enabled);
    if (!enabled) return;
    controller.tick(Math.min(delta, FRAME_DELTA_CAP));
  });
  return null;
}
