'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Level01ErrorBoundary } from './Level01ErrorBoundary';
import type { Level01Pose, Level01TaijiMotionController } from './Level01MotionController';
import styles from './level01.module.css';

const EMPTY_MOTION_GAME: Level01Pose['motionGame'] = {
  orientation: { alpha: 0, beta: 0, gamma: 0 },
  acceleration: { x: 0, y: 0, z: 0, magnitude: 0 },
  rotation: { alpha: 0, beta: 0, gamma: 0, magnitude: 0 },
  motionMagnitude: 0,
  shakeIntensity: 0,
  tiltIntensity: 0,
  state: 'STILL',
  level: { x: 0, y: 0, balanced: false },
  stage: 'TAIJI',
  visualElement: '地',
  customerState: '定',
  message: '輕輕移動手機，喚醒太極',
  combo: 0,
  burstId: 0,
  chase: { direction: 'E', hits: 0, hitId: 0, progress: 0 },
};

const clonePose = (pose: Level01Pose): Level01Pose => {
  const motionGame = pose.motionGame ?? EMPTY_MOTION_GAME;
  return {
    ...pose,
    visualEuler: { ...pose.visualEuler },
    snapshot: { ...pose.snapshot },
    score: { ...pose.score },
    motionGame: {
      ...motionGame,
      orientation: { ...motionGame.orientation },
      acceleration: { ...motionGame.acceleration },
      rotation: { ...motionGame.rotation },
      level: { ...motionGame.level },
      chase: { ...motionGame.chase },
    },
  };
};

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

  const startToday = useCallback(() => {
    controller.recordNextStepCompleted();
    document.getElementById('home-eight-card-route')?.scrollIntoView({ behavior: pose.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [controller, pose.reducedMotion]);

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

  const fallbackPlayable = pose.gameState === 'FALLBACK' || (pose.motionGameEnabled && pose.staticMode);
  const motionGameActive = pose.motionGameEnabled && pose.gameState !== 'IDLE';
  return (
    <div
      className={styles.overlay}
      data-level01-root="true"
      data-level01-mode={pose.mode}
      data-level01-state={pose.gameState}
      data-level01-balance-state={pose.balanceState}
      data-level01-permission={pose.permission}
      data-level01-quality={pose.quality}
      data-taiji-motion-game={pose.motionGameEnabled ? 'enabled' : 'disabled'}
      data-taiji-motion-state={pose.motionGame.state}
      data-taiji-motion-stage={pose.motionGame.stage}
      data-taiji-visual-element={pose.motionGame.visualElement}
      data-taiji-static-mode={pose.staticMode ? 'true' : 'false'}
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

      <div className={styles.balanceWell} aria-hidden="true" data-level01-layer="balance-indicator" data-level01-surface="dynamic-shadow">
        <span className={styles.shadowGlow} />
        <span className={styles.particlePair}><span /><span /></span>
        <span ref={bubbleRef} className={styles.balanceBubble} />
      </div>

      {motionGameActive && !pose.staticMode && pose.gameState !== 'LEVEL_COMPLETE' && (
        <div className={styles.chaseField} aria-label={`追光目標：${pose.motionGame.chase.direction}`} data-direction={pose.motionGame.chase.direction}>
          <span key={`${pose.motionGame.chase.direction}-${pose.motionGame.chase.hitId}`} className={styles.chaseLight} />
          <span key={`yin-${pose.motionGame.chase.direction}-${pose.motionGame.chase.hitId}`} className={styles.chaseCounterLight} data-screen-arrow-target="level01-yin-light" aria-hidden="true" />
        </div>
      )}

      {pose.gameState === 'LEVEL_COMPLETE' && (
        <div className={styles.completeCard} role="status">
          <strong>{pose.motionGameEnabled ? '● 歸一完成' : '第一層・平衡完成'}</strong>
          {!pose.motionGameEnabled && <span>平衡度 {pose.score.overall}</span>}
          {pose.motionGameEnabled && pose.unityReady && <button type="button" onClick={startToday}>開始今日探索</button>}
        </div>
      )}
      {!pose.motionGameEnabled && <span className={styles.qualityBadge} aria-hidden="true">{pose.quality} · {Math.round(pose.fps)} FPS</span>}
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
