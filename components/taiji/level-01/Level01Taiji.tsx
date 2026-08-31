'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Level01Pose, Level01TaijiMotionController } from './Level01MotionController';
import styles from './level01.module.css';

export default function Level01TaijiOverlay({
  controller,
  visible,
  onDrivingChange,
}: {
  controller: Level01TaijiMotionController;
  visible: boolean;
  onDrivingChange?: (driving: boolean) => void;
}) {
  const [pose, setPose] = useState<Level01Pose>(controller.pose);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    controller.setOnChange((next) => setPose({ ...next, visualEuler: { ...next.visualEuler }, snapshot: { ...next.snapshot } }));
    return () => controller.setOnChange(null);
  }, [controller]);

  useEffect(() => {
    if (!visible) {
      controller.setBubbleElement(null);
      return;
    }
    controller.setBubbleElement(bubbleRef.current);
    return () => controller.setBubbleElement(null);
  }, [controller, visible]);

  useEffect(() => {
    onDrivingChange?.(visible && pose.driving);
  }, [onDrivingChange, pose.driving, visible]);

  if (!visible) return null;

  return (
    <div
      className={styles.overlay}
      data-level01-root="true"
      data-level01-mode={pose.mode}
      data-level01-state={pose.balanceState}
      data-level01-permission={pose.permission}
    >
      {/* LEVEL_01 UI SCOPE LOCK: do not add controls or layout changes for levels 02–24 here. */}
      <div className={styles.balanceWell} aria-label="太極平衡控制" data-level01-layer="balance-indicator">
        <span className={styles.balanceCross} />
        <span ref={bubbleRef} className={styles.balanceBubble} />
      </div>
    </div>
  );
}
