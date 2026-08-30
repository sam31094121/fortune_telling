'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Level01Compass } from './Level01Compass';
import type { Level01Pose, Level01TaijiMotionController } from './Level01MotionController';
import styles from './level01.module.css';

const STATE_LABEL: Record<Level01Pose['balanceState'], string> = {
  UNBALANCED: '尋找水平',
  APPROACHING: '接近平衡',
  BALANCED: '已水平',
  LOCKED: '平衡鎖定',
};

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

  const arm = useCallback(() => {
    void controller.armFromUserGesture().then((next) => {
      setPose({ ...next, visualEuler: { ...next.visualEuler }, snapshot: { ...next.snapshot } });
    });
  }, [controller]);

  if (!visible) return null;

  const showStart = pose.mode !== 'LIVE';
  const startLabel = pose.permission === 'denied'
    ? '感測未授權，改以觀賞模式'
    : pose.permission === 'unsupported'
      ? '此裝置改以觀賞模式'
      : pose.permission === 'pending'
        ? '授權中'
        : pose.permission === 'granted'
          ? '等待水平儀'
          : '啟動太極';

  return (
    <div
      className={styles.overlay}
      data-level01-root="true"
      data-level01-mode={pose.mode}
      data-level01-state={pose.balanceState}
      data-level01-permission={pose.permission}
    >
      <Level01Compass />
      <div className={styles.status} data-level01-layer="balance-indicator">
        {pose.mode === 'LIVE' ? STATE_LABEL[pose.balanceState] : '第一層水平儀待命'}
      </div>
      <div className={styles.balanceWell} aria-hidden="true">
        <span className={styles.balanceCross} />
        <span ref={bubbleRef} className={styles.balanceBubble} />
      </div>
      {showStart && (
        <button type="button" className={styles.startButton} onClick={arm} disabled={pose.permission === 'pending'}>
          {startLabel}
        </button>
      )}
    </div>
  );
}
