'use client';

import { useMemo } from 'react';
import {
  ElementTask,
  ElementProgress,
  ELEMENT_COLORS,
  getOrbPosition,
  getOrbGlowIntensity,
  getCompletionPercentage,
  getProgressMessage,
  getElementDescription,
  getFullUnlockMessage,
} from '@/lib/ghost-asura-elements';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import styles from './GhostAsuraFiveElementOrbs.module.css';

interface GhostAsuraFiveElementOrbsProps {
  tasks: ElementTask[];
  progress: ElementProgress;
  showDetails?: boolean;
}

/**
 * 五元素寶珠系統
 * 用戶完成5項任務，寶珠逐個亮起
 */
export default function GhostAsuraFiveElementOrbs({
  tasks,
  progress,
  showDetails = true,
}: GhostAsuraFiveElementOrbsProps) {
  const orderedTasks = useMemo(() => {
    return ['wood', 'fire', 'earth', 'metal', 'water'].map(element =>
      tasks.find(t => t.element === element)
    ).filter(Boolean) as ElementTask[];
  }, [tasks]);

  const completionPercentage = getCompletionPercentage(progress);
  const progressMessage = getProgressMessage(completionPercentage);

  return (
    <div
      className={styles.orbSystem}
      role="region"
      aria-label="五元素寶珠系統"
      aria-describedby="orb-system-description"
    >
      <div id="orb-system-description" className="sr-only">
        <HomeTranslatedText text={`五元素寶珠進度：${completionPercentage}%。${progressMessage}`} />
      </div>

      {/* 進度概覽 */}
      <div className={styles.progressOverview}>
        <div className={styles.progressHeader}>
          <h3 className={styles.title}>
            <HomeTranslatedText text="五元素寶珠" />
            <span className={styles.percentage} aria-label={`${completionPercentage}%`}>
              {completionPercentage}%
            </span>
          </h3>
          <p className={styles.message}>
            <HomeTranslatedText text={progressMessage} />
          </p>
        </div>

        {/* 進度條 */}
        <div className={styles.progressBar} role="progressbar" aria-valuenow={completionPercentage} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={styles.progressFill}
            style={{ width: `${completionPercentage}%` }}
            aria-hidden="true"
          />
        </div>

        {/* 完成標記 */}
        <div className={styles.completionStats}>
          <span className={styles.stat}>
            <span className={styles.label}>
              <HomeTranslatedText text="已解鎖" />
            </span>
            <span className={styles.value}>{progress.totalCompleted}/5</span>
          </span>
          {progress.allUnlocked && (
            <span className={styles.milestone}>
              <span className={styles.icon}>✨</span>
              <HomeTranslatedText text="圓滿成就" />
            </span>
          )}
        </div>
      </div>

      {/* 寶珠容器 */}
      <div className={styles.orbContainer} role="list">
        {orderedTasks.map((task, index) => {
          const position = getOrbPosition(index, orderedTasks.length);
          const color = ELEMENT_COLORS[task.element];
          const isCompleted = task.completed;
          const glowIntensity = getOrbGlowIntensity(isCompleted);

          return (
            <div
              key={task.id}
              className={styles.orbWrapper}
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
              role="listitem"
            >
              {/* 寶珠本體 */}
              <button
                className={`${styles.orb} ${isCompleted ? styles.unlocked : styles.locked}`}
                style={{
                  backgroundColor: isCompleted ? color.hex : 'rgba(90, 50, 70, 0.5)',
                  boxShadow: isCompleted
                    ? `0 0 30px ${color.glow}, inset 0 0 20px ${color.glow}`
                    : 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
                }}
                aria-label={`${color.nameZh}元素寶珠：${task.name}${isCompleted ? ' (已解鎖)' : ' (未解鎖)'}`}
                aria-pressed={isCompleted}
                title={task.description}
              >
                <span className={styles.orbInner} aria-hidden="true">
                  {isCompleted && (
                    <>
                      <span className={styles.orbSymbol}>{color.nameZh}</span>
                      <span className={styles.orbGlow} />
                    </>
                  )}
                  {!isCompleted && (
                    <span className={styles.orbPlaceholder}>⊝</span>
                  )}
                </span>
              </button>

              {/* 元素標籤 */}
              <div className={styles.orbLabel}>
                <span className={styles.elementName}>{task.name}</span>
                <span className={styles.elementSymbol}>{color.nameZh}</span>
              </div>

              {/* 解鎖時間標記 */}
              {isCompleted && task.unlockedAt && (
                <div className={styles.unlockedMark} aria-hidden="true">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 詳細信息（可選）*/}
      {showDetails && (
        <div className={styles.detailsSection} role="region" aria-label="任務詳情">
          <div className={styles.tasksList}>
            {orderedTasks.map(task => {
              const color = ELEMENT_COLORS[task.element];
              const isCompleted = task.completed;

              return (
                <div
                  key={task.id}
                  className={`${styles.taskItem} ${isCompleted ? styles.completed : styles.pending}`}
                >
                  <div className={styles.taskHeader}>
                    <div
                      className={styles.taskElement}
                      style={{
                        borderColor: color.hex,
                        color: isCompleted ? color.hex : '#a8a0a8',
                      }}
                    >
                      {color.nameZh}
                    </div>
                    <div className={styles.taskTitleSection}>
                      <h4 className={styles.taskTitle}>{task.name}</h4>
                      <p className={styles.taskDescription}>
                        <HomeTranslatedText text={task.description} />
                      </p>
                    </div>
                    <div
                      className={styles.taskStatus}
                      aria-label={isCompleted ? '已完成' : '未完成'}
                    >
                      {isCompleted ? '✓' : '○'}
                    </div>
                  </div>

                  <div className={styles.taskRequirement}>
                    <span className={styles.requirementLabel}>
                      <HomeTranslatedText text="要求：" />
                    </span>
                    <span className={styles.requirementText}>
                      <HomeTranslatedText text={task.requirement} />
                    </span>
                  </div>

                  {isCompleted && (
                    <div className={styles.elementHint}>
                      <span className={styles.hintIcon}>💡</span>
                      <HomeTranslatedText text={getElementDescription(task.element)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 完成提示 */}
          {progress.allUnlocked && (
            <div className={styles.fullUnlockMessage}>
              <div className={styles.messageContent}>
                <span className={styles.messageIcon}>✨✨✨</span>
                <p className={styles.messageText}>
                  <HomeTranslatedText text={getFullUnlockMessage()} />
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
