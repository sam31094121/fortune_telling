'use client';

import { ReactNode, useMemo } from 'react';
import { ELEMENT_COLORS } from '@/lib/ghost-asura-elements';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import styles from './GhostAsuraProgressOrbs.module.css';

interface ProgressStep {
  label: string;
  completed: boolean;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  description?: string;
}

interface GhostAsuraProgressOrbsProps {
  steps: ProgressStep[];
  currentStep?: number;
}

/**
 * 進度條五元素寶珠版
 * 將進度條改造為五行寶珠解封系統
 * 每步完成時，對應的五行寶珠逐個亮起
 */
export default function GhostAsuraProgressOrbs({
  steps,
  currentStep = 0,
}: GhostAsuraProgressOrbsProps) {
  const completedCount = useMemo(() => {
    return steps.filter(s => s.completed).length;
  }, [steps]);

  const allCompleted = completedCount === steps.length;
  const completionPercentage = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className={styles.progressContainer}
      role="region"
      aria-label="進度寶珠"
      aria-describedby="progress-description"
    >
      <div id="progress-description" className="sr-only">
        <HomeTranslatedText text={`進度：${completionPercentage}%，已完成${completedCount}/${steps.length}步`} />
      </div>

      {/* 寶珠序列 */}
      <div className={styles.orbSequence}>
        {steps.map((step, index) => {
          const color = ELEMENT_COLORS[step.element];
          const isCompleted = step.completed;
          const isActive = index === currentStep;
          const hasConnector = index < steps.length - 1;

          return (
            <div key={index} className={styles.progressStep}>
              {/* 寶珠 */}
              <div
                className={`${styles.orbWrapper} ${isCompleted ? styles.unlocked : styles.sealed}`}
                role="status"
                aria-label={`${step.label}${isCompleted ? ' - 已完成' : ' - 未完成'}`}
              >
                <div
                  className={styles.orb}
                  style={{
                    backgroundColor: isCompleted ? color.hex : 'rgba(90, 50, 70, 0.5)',
                    boxShadow: isCompleted
                      ? `0 0 20px ${color.glow}, inset 0 0 15px ${color.glow}`
                      : 'inset 0 0 8px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(162, 118, 112, 0.3)',
                    borderColor: isCompleted ? color.hex : 'rgba(162, 118, 112, 0.3)',
                  }}
                >
                  {/* 寶珠內容 */}
                  <div className={styles.orbContent}>
                    {isCompleted ? (
                      <>
                        <span className={styles.orbSymbol} style={{ color: '#ffffff' }}>
                          {color.nameZh}
                        </span>
                        <span className={styles.orbCheck}>✓</span>
                      </>
                    ) : (
                      <span className={styles.orbLock}>🔒</span>
                    )}
                  </div>

                  {/* 發光環 */}
                  {isCompleted && (
                    <div
                      className={styles.orbGlowRing}
                      style={{
                        borderColor: color.hex,
                        boxShadow: `0 0 15px ${color.glow}`,
                      }}
                    />
                  )}
                </div>

                {/* 解封動畫層 */}
                {isCompleted && (
                  <div className={styles.orbUnlockEffect} style={{ borderColor: color.hex }} />
                )}
              </div>

              {/* 步驟標籤 */}
              <div className={styles.stepLabel}>
                <span className={styles.labelText}>{step.label}</span>
                {step.description && (
                  <span className={styles.labelDescription}>{step.description}</span>
                )}
              </div>

              {/* 連接線 */}
              {hasConnector && (
                <div
                  className={`${styles.progressConnector} ${
                    isCompleted ? styles.active : styles.inactive
                  }`}
                  style={{
                    background: isCompleted
                      ? `linear-gradient(90deg, ${color.hex}, ${ELEMENT_COLORS[steps[index + 1].element].hex})`
                      : 'rgba(162, 118, 112, 0.2)',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 進度摘要 */}
      <div className={styles.progressSummary}>
        <div className={styles.summaryLeft}>
          <span className={styles.completedText}>
            <HomeTranslatedText text={`已完成：${completedCount}/${steps.length}`} />
          </span>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressFill}
              style={{
                width: `${completionPercentage}%`,
                background: 'linear-gradient(90deg, #4CAF50, #FF6B6B, #FFD700, #E8E8E8, #2196F3)',
              }}
            />
          </div>
        </div>
        <span className={styles.percentage}>{completionPercentage}%</span>
      </div>

      {/* 完成儀式提示 */}
      {allCompleted && (
        <div className={styles.completionCeremony}>
          <div className={styles.ceremonyContent}>
            <span className={styles.ceremonyIcon}>✨</span>
            <p className={styles.ceremonyText}>
              <HomeTranslatedText text="五元素寶珠已全部解封，準備好開始解盤了！" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
