'use client';

import { ReactNode, useMemo } from 'react';
import { PROGRESS_ORBS } from '@/lib/ghost-asura-elements';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import styles from './GhostAsuraProgressOrbs.module.css';

interface ProgressStep {
  label: string;
  completed: boolean;
  orbElement: 'wind' | 'void' | 'light' | 'heart' | 'soul';
  description?: string;
}

interface GhostAsuraProgressOrbsProps {
  steps: ProgressStep[];
  currentStep?: number;
}

/**
 * 進度寶珠版本
 * 風・空・光・心・靈 五顆寶珠
 * 未完成 = 暗黑封印
 * 完成 = 寶珠發亮發光
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
          const orbColor = PROGRESS_ORBS[step.orbElement];
          const isCompleted = step.completed;
          const isActive = index === currentStep;
          const hasConnector = index < steps.length - 1;

          return (
            <div key={index} className={styles.progressStep}>
              {/* 寶珠 */}
              <div
                className={`${styles.orbWrapper} ${isCompleted ? styles.unlocked : styles.sealed}`}
                role="status"
                aria-label={`${step.label} - ${orbColor.nameZh}${isCompleted ? ' (已完成)' : ' (未完成)'}`}
              >
                <div
                  className={styles.orb}
                  style={{
                    backgroundColor: isCompleted ? orbColor.hex : '#2a1a2a',
                    boxShadow: isCompleted
                      ? `0 0 25px ${orbColor.glow}, inset 0 0 15px ${orbColor.glow}`
                      : 'inset 0 0 8px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(60, 40, 60, 0.6)',
                    borderColor: isCompleted ? orbColor.hex : 'rgba(100, 70, 100, 0.4)',
                  }}
                >
                  {/* 寶珠內容 */}
                  <div className={styles.orbContent}>
                    {isCompleted ? (
                      <>
                        <span className={styles.orbSymbol} style={{ color: '#ffffff' }}>
                          {orbColor.nameZh}
                        </span>
                        <span className={styles.orbCheck}>✓</span>
                      </>
                    ) : (
                      <span className={styles.orbLock}>◐</span>
                    )}
                  </div>

                  {/* 發光環 */}
                  {isCompleted && (
                    <div
                      className={styles.orbGlowRing}
                      style={{
                        borderColor: orbColor.hex,
                        boxShadow: `0 0 20px ${orbColor.glow}, inset 0 0 10px ${orbColor.glow}`,
                      }}
                    />
                  )}
                </div>

                {/* 解封漣漪動畫層 */}
                {isCompleted && (
                  <div className={styles.orbUnlockEffect} style={{ borderColor: orbColor.hex }} />
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
                      ? `linear-gradient(90deg, ${orbColor.hex}, ${PROGRESS_ORBS[steps[index + 1].orbElement].hex})`
                      : 'rgba(100, 70, 100, 0.2)',
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
                background: 'linear-gradient(90deg, #7FD8BE, #9B6BA8, #FFD700, #FF8FA3, #7C9FD8)',
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
              <HomeTranslatedText text="五寶珠已全部點亮，準備開始解盤了！" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
