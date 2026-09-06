'use client';

/**
 * 押注格・戰鬥前堵住輸贏
 * ============================================================================
 *
 * 業主定調：「在戰鬥開始前堵住輸贏的格子，讓客戶可以壓卡片，科技感的格式，
 * 客戶自己選擇卡片，自己壓賭注的卡片要有聲的引導，先後順序。」
 *
 * 【「堵住」是功能，不是裝飾】
 *
 * 沒押注就開不了戰。而且要看得出來是**被擋住**，不是壞掉——
 * 所以空格會脈動、會寫「押上一張」，而不是安靜地灰在那裡。
 * 一個灰掉的按鈕不會告訴客戶要做什麼；一個在等東西的凹槽會。
 *
 * 【有聲的引導】
 *
 * 每完成一步給一個短音，用的是專案既有的 CC0 音效庫，沒有新增檔案。
 * 三條紀律：
 *   不擋流程 —— 播不出來就靜靜跳過（行動瀏覽器在手勢前不准播）
 *   不重複 —— 同一步只響一次，不會因為重新渲染一直叫
 *   尊重減少動態 —— 那些人不想要突然的聲音
 *
 * 【先後順序】
 *
 * 四步排成一列，做完的變藍、正在做的變金。客戶不必猜下一步是什麼。
 *
 * 【這一層不判斷輸贏】
 *
 * 押注的結算走 lib/beast-collection-ledger 的 reserveCard／settleCard，
 * 勝負來自戰鬥核心。這個元件只負責「選哪一張」與「講清楚代價」。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './StakeSlot.module.css';
import { createSoundPlayer, CLASH_FX } from '@/lib/beast-battle-fx';

export interface StakeCard {
  id: string;
  name: string;
  thumbnail: string;
}

export interface StakeStep {
  label: string;
  done: boolean;
}

export default function StakeSlot({
  owned, selected, steps, onSelect,
}: {
  /** 可以拿來押的卡：成長中心真正擁有的那些。 */
  owned: StakeCard[];
  selected: string | null;
  /** 先後順序。最後一個未完成的就是「現在該做的」。 */
  steps: StakeStep[];
  onSelect: (cardId: string) => void;
}) {
  const sound = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  if (sound.current === null && typeof window !== 'undefined') sound.current = createSoundPlayer();
  useEffect(() => () => sound.current?.dispose(), []);

  /*
    同一步只響一次。

    沒有這個守衛，每次重新渲染都會再播一次——
    客戶會聽到連續的提示音，那不是引導，是噪音。
  */
  const announced = useRef<number>(-1);
  const currentIndex = steps.findIndex((step) => !step.done);
  useEffect(() => {
    if (currentIndex === announced.current) return;
    // 第一次進來（-1 → 0）不播：客戶還沒做任何事，不需要被通知。
    if (announced.current >= 0) sound.current?.play(CLASH_FX.flip, 0.3);
    announced.current = currentIndex;
  }, [currentIndex]);

  const pickerRef = useRef<HTMLDivElement>(null);
  const picked = useMemo(() => owned.find((card) => card.id === selected) ?? null, [owned, selected]);
  const [announceText, setAnnounceText] = useState('');
  useEffect(() => {
    setAnnounceText(
      currentIndex < 0
        ? '四步完成，可以開戰。'
        : `第 ${currentIndex + 1} 步：${steps[currentIndex]?.label ?? ''}`,
    );
  }, [currentIndex, steps]);

  return (
    <section className={styles.panel} data-stake-slot aria-label="押注">
      {/* 先後順序：做完的變藍、正在做的變金，不必猜下一步。 */}
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={[styles.step, step.done ? styles.done : '', index === currentIndex ? styles.current : ''].filter(Boolean).join(' ')}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            <span className={styles.stepIndex}>{index + 1}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      {/* 聲音之外也要有字：關掉聲音或聽不到的人一樣要知道進度。 */}
      <p className="sr-only" role="status" aria-live="polite">{announceText}</p>

      <div className={styles.slotRow}>
        {/*
          押注格本身可以點。

          業主定調：「壓住的卡片，只要點擊壓住的框架，再回到卡片點擊，
          連貫起來就可以。」

          原本格子是死的：要換一張，得自己往下找那排小卡。
          現在點格子就把選卡列帶到眼前並聚焦第一張——
          「點格子 → 點卡 → 回到格子」變成一個閉環，
          不需要客戶自己在畫面上找路。

          已經押了的再點一次＝要換，所以先清掉，回到「等你押」的狀態。
        */}
        <button
          type="button"
          className={styles.slot}
          data-stake-target
          aria-label={picked ? `已押上${picked.name}，點此重新選擇` : '押注格，點此選一張收藏卡'}
          onClick={() => {
            if (picked) onSelect(picked.id); // 再點一次＝取消，回到等待狀態
            pickerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            pickerRef.current?.querySelector('button')?.focus();
          }}
        >
          {picked ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.thumbnail} alt={picked.name} loading="lazy" decoding="async" />
          ) : (
            <>
              {/*
                空的押注格用既有授權的牌背「堵住」——業主定調要用現有授權素材。

                為什麼用 beast-game/card-back.webp 而不是 tarot/card-back-luxe.png：
                前者 6.2KB，後者 3.2MB。這一格在手機上只有約 100px 見方，
                為它多載三百多倍的位元組沒有道理（太極憲章：手機優先）。

                牌背蓋著＋「押上一張」的字，客戶一眼看得出這裡被擋著、
                而且知道怎麼解開——灰掉的框只做到前一半。
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/beast-game/card-back.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
              <span className={styles.empty}>押上<br />一張</span>
            </>
          )}
        </button>
        <div className={styles.slotText}>
          {picked ? (
            <>
              <strong>你押上的是「{picked.name}」</strong>
              <span className={styles.risk}>贏：原卡保留，再贏一張。輸：這張被沒收。平手：退回。</span>
            </>
          ) : (
            <>
              <strong>先押一張，才開得了戰</strong>
              <span className={styles.risk}>從你的成長收藏挑一張。輸了它會真的被沒收。</span>
            </>
          )}
        </div>
      </div>

      {owned.length === 0 ? (
        <div className={styles.empty2}>
          <strong>成長收藏裡還沒有卡</strong>
          <span>完成使命領一張，才有東西可以押。</span>
        </div>
      ) : (
        <div ref={pickerRef} className={styles.picker} role="group" aria-label="從收藏選一張押注">
          {owned.map((card) => (
            <button
              key={card.id}
              type="button"
              className={[styles.pick, card.id === selected ? styles.picked : ''].filter(Boolean).join(' ')}
              aria-label={`押上${card.name}`}
              aria-pressed={card.id === selected}
              onClick={() => {
                onSelect(card.id);
                // 押下去給一聲確認——這一下是有代價的，值得一個回饋。
                sound.current?.play(CLASH_FX.impact, 0.28);
                // 回到格子：客戶剛做的決定要看得到結果，不是留在小卡列上猜。
                requestAnimationFrame(() => {
                  const slot = document.querySelector<HTMLElement>('[data-stake-target]');
                  slot?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.thumbnail} alt={card.name} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
