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
  /** A real collection-entry id, not merely the card type. */
  id: string;
  cardId: string;
  name: string;
  thumbnail: string;
  count: number;
  copy: number;
}

export interface StakeStep {
  label: string;
  done: boolean;
}

export default function StakeSlot({
  owned, selected, steps, onSelect, trial, locked = false,
}: {
  /** 可以拿來押的卡：成長中心真正擁有的那些。 */
  owned: StakeCard[];
  selected: string[] | null;
  /** 先後順序。最後一個未完成的就是「現在該做的」。 */
  steps: StakeStep[];
  onSelect: (cardId: string) => void;
  /** 體驗戰：收藏空著、免押注。格子的說法要跟著換，不能還喊「先押一張」。 */
  trial?: boolean;
  locked?: boolean;
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
  const drag = useRef<{ id: number; x: number; left: number } | null>(null);
  const dragged = useRef(false);
  const selectedIds = useMemo(() => selected ?? [], [selected]);
  const picked = useMemo(() => selectedIds
    .map(id => owned.find(card => card.id === id))
    .filter((card): card is StakeCard => Boolean(card)), [owned, selectedIds]);
  const [announceText, setAnnounceText] = useState('');
  const [movement, setMovement] = useState('');
  const choose = (card: StakeCard) => {
    const selectedNow = selectedIds.includes(card.id);
    setMovement(selectedNow
      ? `已取回「${card.name}」1 張，目前押注 ${Math.max(0, selectedIds.length - 1)}/5 張；持有張數不變。`
      : selectedIds.length >= 5
        ? '已選滿五張；先點一張已選卡取回，再換另一張。'
        : `已將「${card.name}」1 張放入押注格，目前 ${selectedIds.length + 1}/5 張。尚未扣卡。`);
    onSelect(card.id);
  };
  useEffect(() => {
    setAnnounceText(
      currentIndex < 0
        ? '四步完成，可以開戰。'
        : `第 ${currentIndex + 1} 步：${steps[currentIndex]?.label ?? ''}`,
    );
  }, [currentIndex, steps]);

  return (
    <section className={styles.panel} data-stake-slot data-needs-stake={picked.length !== 5 && !trial} aria-label="押注">
      {/* 先後順序：做完的變藍、正在做的變金，不必猜下一步。 */}
      {steps.length > 0 && <ol className={styles.steps}>
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
      </ol>}

      {/* 聲音之外也要有字：關掉聲音或聽不到的人一樣要知道進度。 */}
      {steps.length > 0 && <p className="sr-only" role="status" aria-live="polite">{announceText}</p>}

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
          className={styles.stakeTray}
          data-stake-target
          aria-label={trial ? '體驗戰免押卡' : `押注格，已選 ${picked.length}/5 張，點此移到收藏卡`}
          disabled={trial || locked}
          onClick={() => {
            pickerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            pickerRef.current?.querySelector('button')?.focus({ preventScroll: true });
          }}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const card = picked[index];
            return <span className={styles.stakeCell} key={card?.id ?? `empty-${index}`}>
              {card ? <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.thumbnail} alt={card.name} loading="lazy" decoding="async" />
              </> : <span aria-hidden="true">{index + 1}</span>}
            </span>;
          })}
        </button>
        <div className={styles.slotText}>
          {picked.length ? (
            <>
              <strong>押注籌碼 {picked.length}/5 張</strong>
              <span className={styles.risk}>選滿五張才開戰。贏：五張保留＋獎勵一張；輸：扣五張。</span>
              <span>點卡選取或取消，開戰前不扣卡。</span>
            </>
          ) : trial ? (
            <>
              <strong>體驗戰・免押注</strong>
              <span className={styles.risk}>這一場不押卡、不發卡也不沒收。選好主戰卡即可開戰。</span>
            </>
          ) : (
            <>
              <strong>押注籌碼 0/5 張</strong>
              <span className={styles.risk}>從持有卡片選滿五張。輸了才會扣除這五張。</span>
            </>
          )}
        </div>
      </div>
      {movement && <p className={styles.movement} role="status">{movement}</p>}
      {owned.length > 0 && <details className={styles.movement}><summary>收藏與扣卡說明</summary><p>出戰卡的移動與倒下不扣卡，只結算押注格。收藏與結果儲存在本機。</p></details>}

      {owned.length === 0 ? (
        <div className={styles.empty2}>
          <strong>本場使用試用戰鬥卡</strong>
          <span>試用卡可佈陣和出招，不列入持有卡片，也不能押注。</span>
        </div>
      ) : (
        <>
        <div className={styles.pickerNavigation} aria-label="移動收藏卡列">
          <button type="button" onClick={() => pickerRef.current?.scrollBy({ left: -pickerRef.current.clientWidth * .85, behavior: 'auto' })} aria-label="前一排收藏卡">← 前一排</button>
          <span>左右滑動或拖動選卡</span>
          <button type="button" onClick={() => pickerRef.current?.scrollBy({ left: pickerRef.current.clientWidth * .85, behavior: 'auto' })} aria-label="後一排收藏卡">後一排 →</button>
        </div>
        <div ref={pickerRef} className={styles.picker} role="group" aria-label="從收藏選五張押注"
          onPointerDown={event => {
            dragged.current = false;
            if (event.pointerType === 'mouse' && event.button === 0) drag.current = { id: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft };
          }}
          onPointerMove={event => {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            const distance = event.clientX - start.x;
            if (Math.abs(distance) < 6 && !dragged.current) return;
            dragged.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.scrollLeft = start.left - distance;
            event.preventDefault();
          }}
          onPointerUp={event => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; }}
          onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) drag.current = null; }}
          onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
          {owned.map((card) => (
            <button
              key={card.id}
              type="button"
              className={[styles.pick, selectedIds.includes(card.id) ? styles.picked : ''].filter(Boolean).join(' ')}
              aria-label={`${selectedIds.includes(card.id) ? '取回' : '押上'}${card.name}第 ${card.copy} 張，已選 ${selectedIds.length}/5 張`}
              aria-pressed={selectedIds.includes(card.id)}
              disabled={locked}
              onClick={() => {
                choose(card);
                // 押下去給一聲確認——這一下是有代價的，值得一個回饋。
                sound.current?.play(CLASH_FX.impact, 0.28);
                // Keep the chosen card in view. Its pressed state and the confirmation
                // footer show the result without a delayed scroll interrupting touch input.
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.thumbnail} alt={card.name} loading="lazy" decoding="async" draggable={false} />
              <strong>{card.name}</strong>
              <span>第 {card.copy}/{card.count} 張</span>
              <span>{selectedIds.includes(card.id) ? '已選・取消' : selectedIds.length < 5 ? '選這張' : '已選滿五張'}</span>
            </button>
          ))}
        </div>
        </>
      )}
    </section>
  );
}
