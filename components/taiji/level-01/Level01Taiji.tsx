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

  useEffect(() => {
    if (!visible) return;
    // On browsers that do not require a user gesture, begin sensing as soon as
    // the first layer appears. Safari/iOS safely remains idle until a natural
    // touch reaches the ball or its shadow.
    void controller.attemptAutomaticSensorStart().then((next) => {
      setPose({ ...next, visualEuler: { ...next.visualEuler }, snapshot: { ...next.snapshot } });
    });
  }, [controller, visible]);

  const arm = useCallback(() => {
    void controller.armFromUserGesture().then((next) => setPose({ ...next, visualEuler: { ...next.visualEuler }, snapshot: { ...next.snapshot } }));
  }, [controller]);

  useEffect(() => {
    if (!visible || pose.permission === 'granted' || pose.permission === 'pending') return;
    // iOS requires a real user gesture before it will show the sensor dialog.
    // Any first natural touch on the visible page (including the start of a
    // scroll) counts; we never prevent that gesture or show a text instruction.
    const armFromNaturalGesture = () => arm();
    window.addEventListener('pointerdown', armFromNaturalGesture, { capture: true, passive: true, once: true });
    window.addEventListener('touchstart', armFromNaturalGesture, { capture: true, passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', armFromNaturalGesture, true);
      window.removeEventListener('touchstart', armFromNaturalGesture, true);
    };
  }, [arm, pose.permission, visible]);

  if (!visible) return null;

  const direction = Math.abs(pose.snapshot.gamma) >= Math.abs(pose.snapshot.beta)
    ? (pose.snapshot.gamma > 4 ? 'E' : pose.snapshot.gamma < -4 ? 'W' : 'N')
    : (pose.snapshot.beta > 4 ? 'S' : pose.snapshot.beta < -4 ? 'N' : 'N');
  return (
    <div
      className={styles.overlay}
      data-level01-root="true"
      data-level01-mode={pose.mode}
      data-level01-state={pose.balanceState}
      data-level01-permission={pose.permission}
      data-level01-direction={direction}
    >
      {/* LEVEL_01 UI SCOPE LOCK: do not add controls or layout changes for levels 02–24 here. */}
      <div className={styles.orientationCue} aria-hidden="true" data-level01-layer="orientation-cue"><span className={styles.cueNorth}>N</span><span className={styles.cueEast}>E</span><span className={styles.cueSouth}>S</span><span className={styles.cueWest}>W</span></div>
      <button type="button" className={styles.balanceWell} onClick={arm} aria-label="啟用太極平衡感測" data-level01-layer="balance-indicator" data-level01-surface="dynamic-shadow">
        <span className={styles.shadowGlow} aria-hidden="true" />
        <span className={styles.particlePair} aria-hidden="true">
          <span /><span />
        </span>
        <span ref={bubbleRef} className={styles.balanceBubble} />
      </button>
    </div>
  );
}
