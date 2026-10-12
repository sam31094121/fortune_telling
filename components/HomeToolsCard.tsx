'use client';

import { useEffect, useState } from 'react';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import { InterfaceLanguagePicker } from '@/components/InterfaceLanguage';
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_OPTIONS,
  applyTextSize,
  readTextSize,
  saveTextSize,
  type TextSizeId,
} from '@/lib/text-size';
import styles from './HomeToolsCard.module.css';

/**
 * 首頁工具卡片：一張卡片裡三樣東西，放在「今日定向關卡」下面、「古老塔羅牌」上面。
 *  上排：閱讀語言（🇹🇼 繁體中文 ▾，點開選語言）
 *  下排：左「存到桌面」金盾牌、右「字體大小 中／大／特大」（「中」是預設標準）
 *
 * 盾牌本身由 components/InstallShield080.tsx 負責，這裡只留兩個位置給它：
 *  - data-install-shield-slot：下排左邊的盾牌按鈕
 *  - data-install-panel-slot：卡片正下方、整條寬度的安裝說明
 * 掛好後發出 tdh:install-slots 通知盾牌元件來認領；找不到這兩個位置的頁面，盾牌維持原本位置。
 * 字體選擇存在這支手機裡，下次回來、換頁都沿用；只改字級，不動內容。
 */
export default function HomeToolsCard() {
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
    <div className={styles.wrap} data-text-size-switch data-home-tools-card>
      <div className={styles.card}>
        <div className={styles.langRow} data-home-tools-language>
          <InterfaceLanguagePicker variant="card" />
        </div>
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
      </div>
      <div className={styles.panelSlot} data-install-panel-slot />
    </div>
  );
}
