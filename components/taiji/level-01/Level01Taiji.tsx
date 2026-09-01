'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Level01ErrorBoundary } from './Level01ErrorBoundary';
import type { Level01Pose, Level01TaijiMotionController } from './Level01MotionController';
import styles from './level01.module.css';

const clonePose = (pose: Level01Pose): Level01Pose => ({
  ...pose,
  visualEuler: { ...pose.visualEuler },
  snapshot: { ...pose.snapshot },
  score: { ...pose.score },
});

function RuntimeOverlay({
  controller,
  visible,
  onDrivingChange,
}: {
  controller: Level01TaijiMotionController;
  visible: boolean;
  onDrivingChange?: (driving: boolean) => void;
}) {
  const [pose, setPose] = useState<Level01Pose>(() => clonePose(controller.pose));
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    controller.setOnChange((next) => setPose(clonePose(next)));
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
    void controller.attemptAutomaticSensorStart().then((next) => setPose(clonePose(next)));
  }, [controller, visible]);

  const arm = useCallback(() => {
    void controller.armFromUserGesture().then((next) => setPose(clonePose(next)));
  }, [controller]);

  const pointerPosition = useCallback((event: PointerEvent<HTMLDivElement>, begin: boolean) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (begin) {
      event.currentTarget.setPointerCapture(event.pointerId);
      controller.beginPointer(x, y, rect.width, rect.height);
    } else {
      controller.updatePointer(x, y, rect.width, rect.height);
    }
  }, [controller]);

  if (!visible) return null;

  const direction = Math.abs(pose.snapshot.gamma) >= Math.abs(pose.snapshot.beta)
    ? (pose.snapshot.gamma > 4 ? 'E' : pose.snapshot.gamma < -4 ? 'W' : 'N')
    : (pose.snapshot.beta > 4 ? 'S' : pose.snapshot.beta < -4 ? 'N' : 'N');
  const active = !['IDLE', 'PERMISSION', 'CALIBRATING', 'LEVEL_COMPLETE'].includes(pose.gameState);
  const fallbackPlayable = pose.gameState === 'FALLBACK';
  const ringStyle = {
    '--balance-angle': `${Math.round(pose.balanceProgress * 360)}deg`,
    '--hold-angle': `${Math.round(pose.holdProgress * 360)}deg`,
    '--motion-energy': pose.motionEnergy.toFixed(3),
  } as CSSProperties;

  return (
    <div
      className={styles.overlay}
      data-level01-root="true"
      data-level01-mode={pose.mode}
      data-level01-state={pose.gameState}
      data-level01-balance-state={pose.balanceState}
      data-level01-permission={pose.permission}
      data-level01-direction={direction}
      data-level01-quality={pose.quality}
      style={ringStyle}
    >
      {/* LEVEL_01 UI SCOPE LOCK: this overlay is unmounted for levels 02–24. */}
      {fallbackPlayable && (
        <div
          className={styles.pointerSurface}
          aria-label="拖曳控制太極平衡"
          onPointerDown={(event) => pointerPosition(event, true)}
          onPointerMove={(event) => pointerPosition(event, false)}
          onPointerUp={() => controller.endPointer()}
          onPointerCancel={() => controller.endPointer()}
        />
      )}

      <div className={styles.worldReference} aria-hidden="true" data-level01-layer="world-reference">
        <span className={styles.cueNorth}>N</span><span className={styles.cueEast}>E</span>
        <span className={styles.cueSouth}>S</span><span className={styles.cueWest}>W</span>
      </div>
      <div className={styles.energyField} aria-hidden="true" data-level01-layer="energy-field" />
      <div className={styles.balanceRing} aria-hidden="true" data-level01-layer="balance-ring" />

      <div className={styles.balanceWell} aria-hidden="true" data-level01-layer="balance-indicator" data-level01-surface="dynamic-shadow">
        <span className={styles.shadowGlow} />
        <span className={styles.particlePair}><span /><span /></span>
        <span ref={bubbleRef} className={styles.balanceBubble} />
      </div>

      {pose.gameState === 'IDLE' && (
        <div className={styles.startPanel}>
          <p>{pose.message}</p>
          <button type="button" className={styles.startButton} onClick={arm}>啟動太極</button>
        </div>
      )}

      {pose.gameState !== 'IDLE' && (
        <output className={styles.stateMessage} aria-live="polite">{pose.message}</output>
      )}

      {pose.gameState === 'SENSOR_LOST' && (
        <div className={styles.recoveryPanel}>
          <button type="button" onClick={() => void controller.reconnect()}>重新連接</button>
          <button type="button" onClick={() => controller.useFallback()}>改用拖曳</button>
        </div>
      )}

      {active && (
        <div className={styles.controls} aria-label="第一層必要控制">
          <button type="button" onClick={() => controller.exitGame()}>退出</button>
          <button type="button" aria-pressed={!pose.audioEnabled} onClick={() => controller.toggleAudio()}>{pose.audioEnabled ? '音效開' : '音效關'}</button>
          <button type="button" onClick={() => controller.recalibrate()}>重新校正</button>
        </div>
      )}

      {fallbackPlayable && <p className={styles.fallbackHint}>拖曳球面產生動能，放回中心完成平衡</p>}
      {pose.combo > 1 && pose.gameState !== 'LEVEL_COMPLETE' && <div className={styles.combo}>平衡 Combo × {pose.combo}</div>}
      {pose.gameState === 'LEVEL_COMPLETE' && (
        <div className={styles.completeCard} role="status">
          <strong>第一層・平衡完成</strong>
          <span>平衡度 {pose.score.overall}</span>
        </div>
      )}
      <span className={styles.qualityBadge} aria-hidden="true">{pose.quality} · {Math.round(pose.fps)} FPS</span>
    </div>
  );
}

export default function Level01TaijiOverlay(props: {
  controller: Level01TaijiMotionController;
  visible: boolean;
  onDrivingChange?: (driving: boolean) => void;
}) {
  return (
    <Level01ErrorBoundary fallback={<div className={styles.errorFallback}>第一層已切換為安全觀賞模式</div>}>
      <RuntimeOverlay {...props} />
    </Level01ErrorBoundary>
  );
}
