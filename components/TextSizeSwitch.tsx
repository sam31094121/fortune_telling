'use client';

import { useEffect, useState } from 'react';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_OPTIONS,
  applyTextSize,
  readTextSize,
  saveTextSize,
  type TextSizeId,
} from '@/lib/text-size';
import styles from './TextSizeSwitch.module.css';

/**
 * 首頁手機工具列：左邊「存到桌面」金盾牌、右邊字體大小（中／大／特大，「中」是預設標準）。
 *
 * 盾牌本身由 components/InstallShield080.tsx 負責，這裡只留兩個位置給它：
 *  - data-install-shield-slot：工具列左邊的盾牌按鈕
 *  - data-install-panel-slot：工具列正下方、整條寬度的安裝說明
 * 掛好後發出 tdh:install-slots 通知盾牌元件來認領；找不到這兩個位置的頁面，盾牌維持原本位置。
 * 字體選擇存在這支手機裡，下次回來、換頁都沿用；只改字級，不動內容。
 */
export default function TextSizeSwitch() {
  const [current, setCurrent] = useState<TextSizeId>(TEXT_SIZE_DEFAULT);

  useEffect(() => {
    setCurrent(readTextSize());
    window.dispatchEvent(new Event('tdh:install-slots'));
    return () => {
      window.dispatchEvent(new Event('tdh:install-slots'));
    };
  }, []);

  const choose = (id: TextSizeId) => {
    setCurrent(id);
    applyTextSize(id);
    saveTextSize(id);
  };

  return (
    <div className={styles.wrap} data-text-size-switch>
      <div className={styles.bar}>
        <div className={styles.shieldSlot} data-install-shield-slot />
        <div className={styles.sizeGroup} role="group" aria-label="字體大小">
          <span className={styles.label}><HomeTranslatedText text="字體大小" /></span>
          <div className={styles.options}>
            {TEXT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.option} ${styles[`size_${option.id}`]}`}
                aria-pressed={current === option.id}
                data-text-size-option={option.id}
                onClick={() => choose(option.id)}
              >
                <HomeTranslatedText text={option.label} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.panelSlot} data-install-panel-slot />
    </div>
  );
}
