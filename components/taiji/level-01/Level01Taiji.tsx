'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
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
    },
  };
};

const MOTION_STAGES = [
  ['TAIJI', '太極'],
  ['LIANGYI', '兩儀'],
  ['SIXIANG', '四象'],
  ['BAGUA', '八卦'],
  ['FIVE_ELEMENTS', '五元素'],
  ['UNITY', '歸一'],
] as const;

const VISUAL_ELEMENTS = ['空', '風', '水', '火', '地'] as const;

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

  const startStatic = useCallback(() => {
    if (controller.pose.staticMode) controller.useFallback();
    else controller.toggleStaticMode();
    setPose(clonePose(controller.pose));
  }, [controller]);

  const startToday = useCallback(() => {
    document.getElementById('home-eight-card-route')?.scrollIntoView({ behavior: pose.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [pose.reducedMotion]);

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
  const fallbackPlayable = pose.gameState === 'FALLBACK' || (pose.motionGameEnabled && pose.staticMode);
  const motionGameActive = pose.motionGameEnabled && pose.gameState !== 'IDLE';
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
      data-taiji-motion-game={pose.motionGameEnabled ? 'enabled' : 'disabled'}
      data-taiji-motion-state={pose.motionGame.state}
      data-taiji-motion-stage={pose.motionGame.stage}
      data-taiji-visual-element={pose.motionGame.visualElement}
      data-taiji-static-mode={pose.staticMode ? 'true' : 'false'}
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
          <p>{pose.motionGameEnabled ? '輕輕移動手機，讓太極醒來' : pose.message}</p>
          <div className={styles.startActions}>
            <button type="button" className={styles.startButton} onClick={arm}>{pose.motionGameEnabled ? '啟動體感' : '啟動太極'}</button>
            {pose.motionGameEnabled && <button type="button" className={styles.staticStartButton} onClick={startStatic}>靜態模式</button>}
          </div>
        </div>
      )}

      {pose.gameState !== 'IDLE' && (
        <output className={styles.stateMessage} aria-live="polite">
          {motionGameActive ? <><b>{pose.motionGame.customerState}</b><span>{pose.message}</span></> : pose.message}
        </output>
      )}

      {motionGameActive && pose.gameState !== 'LEVEL_COMPLETE' && (
        <div className={styles.motionHud} aria-label="太極體感進度">
          <div className={styles.stageRail}>
            {MOTION_STAGES.slice(0, 5).map(([key, label]) => (
              <span key={key} data-active={key === pose.motionGame.stage ? 'true' : 'false'} data-passed={MOTION_STAGES.findIndex(([stage]) => stage === key) <= MOTION_STAGES.findIndex(([stage]) => stage === pose.motionGame.stage) ? 'true' : 'false'}>{label}</span>
            ))}
          </div>
          <div className={styles.elementSignal} aria-label="五元素互動視覺訊號，非命理分析">
            {VISUAL_ELEMENTS.map((element) => <span key={element} data-active={element === pose.motionGame.visualElement ? 'true' : 'false'}>{element}</span>)}
          </div>
          <small>互動視覺訊號・非命理分析</small>
        </div>
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
          {pose.motionGameEnabled && <button type="button" aria-pressed={pose.hapticEnabled} onClick={() => controller.toggleHaptics()}>{pose.hapticEnabled ? '震動開' : '震動關'}</button>}
          {pose.motionGameEnabled && <button type="button" aria-pressed={pose.staticMode} onClick={() => controller.toggleStaticMode()}>{pose.staticMode ? '靜態中' : '體感中'}</button>}
          {!pose.motionGameEnabled && <button type="button" onClick={() => controller.recalibrate()}>重新校正</button>}
        </div>
      )}

      {fallbackPlayable && !pose.staticMode && <p className={styles.fallbackHint}>拖曳球面產生動能，放回中心完成平衡</p>}
      {pose.motionGameEnabled && pose.staticMode && pose.gameState !== 'LEVEL_COMPLETE' && (
        <div className={styles.staticPanel}>
          <span>不移動手機也能完整探索</span>
          {pose.motionGame.stage === 'FIVE_ELEMENTS'
            ? <button type="button" onClick={() => controller.settleStaticMotion()}>回到平衡</button>
            : <button type="button" onClick={() => controller.advanceStaticMotion()}>輕觸推進</button>}
        </div>
      )}
      {pose.combo > 1 && pose.gameState !== 'LEVEL_COMPLETE' && <div className={styles.combo}>{pose.motionGameEnabled ? '流動' : '平衡'} Combo × {pose.combo}</div>}
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
