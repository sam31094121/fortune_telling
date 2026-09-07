'use client';

/**
 * 戰鬥特效層 - 傷害飄字、命中閃光、元素光斬
 * =============================================================================
 *
 * 責任：純視覺反饋，不參與戰鬥邏輯
 * - 傷害數字飄起動畫
 * - 命中時的閃光與脈動
 * - 元素顏色的動態光效
 */

import { useEffect, useState } from 'react';
import styles from './BattleEffects.module.css';
import type { BeastElement } from '@/lib/beast-game/elements';

interface DamagePopup {
  id: string;
  damage: number;
  x: number;
  y: number;
  element: BeastElement;
  isCritical: boolean;
  isHeal: boolean;
  timestamp: number;
}

interface BattleEffectsProps {
  /** 觸發傷害飄字 */
  onDamageDealt?: (damage: number, x: number, y: number, element: BeastElement, isCritical?: boolean) => void;
  /** 觸發治療飄字 */
  onHealDealt?: (heal: number, x: number, y: number) => void;
  /** 觸發命中閃光 */
  onHit?: (x: number, y: number, isCritical?: boolean) => void;
}

export function useBattleEffects() {
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);

  const addDamagePopup = (
    damage: number,
    x: number,
    y: number,
    element: BeastElement,
    isCritical = false,
  ) => {
    const id = `dmg-${Date.now()}-${Math.random()}`;
    const popup: DamagePopup = {
      id,
      damage,
      x,
      y,
      element,
      isCritical,
      isHeal: false,
      timestamp: Date.now(),
    };
    setDamagePopups(prev => [...prev, popup]);

    // 動畫結束後移除（0.8s）
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  const addHealPopup = (heal: number, x: number, y: number) => {
    const id = `heal-${Date.now()}-${Math.random()}`;
    const popup: DamagePopup = {
      id,
      damage: heal,
      x,
      y,
      element: 'none' as BeastElement,
      isCritical: false,
      isHeal: true,
      timestamp: Date.now(),
    };
    setDamagePopups(prev => [...prev, popup]);

    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  return { damagePopups, addDamagePopup, addHealPopup };
}

export function BattleEffectsLayer({ popups }: { popups: DamagePopup[] }) {
  return (
    <div className={styles.effectsContainer} aria-hidden="true">
      {popups.map((popup) => (
        <DamageNumber
          key={popup.id}
          popup={popup}
        />
      ))}
    </div>
  );
}

function DamageNumber({ popup }: { popup: DamagePopup }) {
  const { damage, x, y, element, isCritical, isHeal } = popup;

  return (
    <div
      className={[
        styles.damagePopup,
        isCritical ? styles.critical : '',
        isHeal ? styles.heal : '',
        `element-${element}`,
      ].filter(Boolean).join(' ')}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <span className={styles.number}>
        {isHeal ? '+' : '−'}{damage}
      </span>
    </div>
  );
}

/**
 * 命中閃光效果組件
 * 在指定位置顯示一次性的白閃或黃金閃光
 */
export function HitFlash({ x, y, isCritical = false }: { x: number; y: number; isCritical?: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={[styles.hitFlash, isCritical ? styles.criticalFlash : ''].filter(Boolean).join(' ')}
      style={{ left: `${x}px`, top: `${y}px` }}
      aria-hidden="true"
    />
  );
}

/**
 * 攻擊方向光線
 * 從攻擊者指向防守者的科技感光軌
 */
export function AttackLine({
  fromX,
  fromY,
  toX,
  toY,
  element,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  element: BeastElement;
}) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      className={styles.attackLine}
      style={{
        left: `${fromX}px`,
        top: `${fromY}px`,
        width: `${distance}px`,
        transform: `rotate(${angle}deg)`,
      }}
      data-element={element}
      aria-hidden="true"
    />
  );
}
