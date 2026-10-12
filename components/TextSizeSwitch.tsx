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
 * 首頁字體大小開關（手機）：小／中／大／特大，「中」是預設標準。
 * 選擇存在這支手機裡，下次回來、換頁都沿用；只改字級，不動內容。
 */
export default function TextSizeSwitch() {
  const [current, setCurrent] = useState<TextSizeId>(TEXT_SIZE_DEFAULT);

  useEffect(() => {
    setCurrent(readTextSize());
  }, []);

  const choose = (id: TextSizeId) => {
    setCurrent(id);
    applyTextSize(id);
    saveTextSize(id);
  };

  return (
    <div className={styles.bar} role="group" aria-label="字體大小" data-text-size-switch>
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
  );
}
