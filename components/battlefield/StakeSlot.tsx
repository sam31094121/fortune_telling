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

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './StakeSlot.module.css';
import CatalogBeastCard from './CatalogBeastCard';
import { createSoundPlayer, CLASH_FX } from '@/lib/beast-battle-fx';
import { MAX_STAKE_CARDS, describeStakeBrief } from '@/lib/beast-game/stake-rules';

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
  owned, selected, steps, onSelect, onAddCard, onRemoveCard, onClear, trial, locked = false,
}: {
  /** 可以拿來押的卡：成長中心真正擁有的那些。 */
  owned: StakeCard[];
  selected: string[] | null;
  /** 先後順序。最後一個未完成的就是「現在該做的」。 */
  steps: StakeStep[];
  onSelect: (cardId: string) => void;
  /** 加碼一張／取回一張／清空：以「卡種」為單位，連續按與長按都走這裡（業主 2026-11-12）。 */
  onAddCard?: (cardId: string) => void;
  onRemoveCard?: (cardId: string) => void;
  onClear?: () => void;
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
  const selectedIds = useMemo(() => selected ?? [], [selected]);
  const picked = useMemo(() => selectedIds
    .map(id => owned.find(card => card.id === id))
    .filter((card): card is StakeCard => Boolean(card)), [owned, selectedIds]);
  // 以卡種分組：同一種神獸只出現一列，「押幾張」用數字加減，不再把每一張副本各放一格。
  const groups = useMemo(() => {
    const map = new Map<string, StakeGroup>();
    for (const card of owned) {
      const g = map.get(card.cardId);
      if (g) g.total += 1; else map.set(card.cardId, { cardId: card.cardId, name: card.name, thumbnail: card.thumbnail, total: 1 });
    }
    return [...map.values()];
  }, [owned]);
  const countByType = useMemo(() => {
    const byEntry = new Map(owned.map(card => [card.id, card.cardId]));
    const out = new Map<string, number>();
    for (const id of selectedIds) { const t = byEntry.get(id); if (t) out.set(t, (out.get(t) ?? 0) + 1); }
    return out;
  }, [owned, selectedIds]);
  const full = selectedIds.length >= MAX_STAKE_CARDS;
  const [announceText, setAnnounceText] = useState('');
  useEffect(() => {
    setAnnounceText(
      currentIndex < 0
        ? '四步完成，可以開戰。'
        : `第 ${currentIndex + 1} 步：${steps[currentIndex]?.label ?? ''}`,
    );
  }, [currentIndex, steps]);

  return (
    <section className={styles.panel} data-stake-slot data-needs-stake={picked.length === 0 && !trial} aria-label="押注">
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

      {owned.length > 0 && !trial && <>
        <div className={styles.stakeBar}>
          <p><strong>已押 {selectedIds.length}<em>/{MAX_STAKE_CARDS}</em></strong><span>還可押 {Math.max(0, Math.min(MAX_STAKE_CARDS, owned.length) - selectedIds.length)}</span></p>
          <button type="button" disabled={locked || selectedIds.length === 0} onClick={() => onClear?.()}>清空</button>
        </div>
        {/* 版面不跳動：沒押卡時這一條也佔位（隱藏），第一次點卡時下面的卡片不會往下掉，連點才不會點偏。 */}
        <ul className={styles.stakeOdds} data-stake-brief data-empty={selectedIds.length === 0 || undefined} aria-hidden={selectedIds.length === 0 || undefined}>
          <li data-win><b>贏</b><span>{describeStakeBrief(selectedIds.length || 1).win}</span></li>
          <li data-lose><b>輸</b><span>{describeStakeBrief(selectedIds.length || 1).lose}</span></li>
          <li data-draw><b>平</b><span>{describeStakeBrief(selectedIds.length || 1).draw}</span></li>
        </ul>
        <p className="sr-only" role="status" aria-live="polite">{`目前押注 ${selectedIds.length}/${MAX_STAKE_CARDS} 張`}</p>
      </>}
      {trial && <div className={styles.slotRow}><div className={styles.slotText}><strong>體驗戰・免押注</strong><span className={styles.risk}>不押卡、不發卡也不沒收</span></div></div>}
      {owned.length === 0 ? (
        <div className={styles.empty2}>
          <strong>本場使用試用戰鬥卡</strong>
          <span>試用卡可佈陣和出招，不列入持有卡片，也不能押注。</span>
        </div>
      ) : (
        <>
          <div className={styles.stakeWheel} data-stake-wheel>
          <div ref={pickerRef} className={styles.stakeGrid} role="group" aria-label="從收藏選最多二十張押注">
            {groups.map(group => (
              <StakeRow key={group.cardId} group={group} count={countByType.get(group.cardId) ?? 0} full={full} locked={locked}
                onAdd={onAddCard ?? onSelect} onRemove={onRemoveCard ?? onSelect} />
            ))}
          </div>
          </div>
        </>
      )}
    </section>
  );
}

interface StakeGroup { cardId: string; name: string; thumbnail: string; total: number }

/**
 * 按一下＝加一張（放開時才算）；按住 350ms 後每 90ms 連續加。
 * 手指一滑動（在捲列表）就取消，不會因為捲動而誤押；放開、移開、取消、失焦、卸載都會停（不會卡住）。
 */
function useHoldRepeat(action: () => void, canRun: () => boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const repeating = useRef(false);
  const live = useRef({ action, canRun });
  live.current = { action, canRun };
  const stop = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } start.current = null; repeating.current = false; }, []);
  useEffect(() => stop, [stop]);
  const loop = useCallback((delay: number) => {
    timer.current = setTimeout(() => {
      if (!live.current.canRun()) { timer.current = null; repeating.current = false; return; }
      repeating.current = true;
      live.current.action();
      loop(90);
    }, delay);
  }, []);
  return {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      stop();
      start.current = { x: event.clientX, y: event.clientY };
      loop(350);
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      const s = start.current;
      if (s && !repeating.current && Math.hypot(event.clientX - s.x, event.clientY - s.y) > 10) stop();
    },
    onPointerUp: () => {
      const tap = start.current !== null && !repeating.current;
      stop();
      if (tap && live.current.canRun()) live.current.action();
    },
    onPointerLeave: stop, onPointerCancel: stop, onBlur: stop,
    // 鍵盤（Enter／空白鍵）沒有 pointer 事件：detail === 0 代表鍵盤觸發的 click。
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => { if (event.detail === 0 && live.current.canRun()) live.current.action(); },
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  };
}

const StakeRow = memo(function StakeRow({ group, count, full, locked, onAdd, onRemove }: {
  group: StakeGroup; count: number; full: boolean; locked: boolean;
  onAdd: (cardId: string) => void; onRemove: (cardId: string) => void;
}) {
  const canAdd = !locked && !full && count < group.total;
  const canRemove = !locked && count > 0;
  const stateRef = useRef({ canAdd, canRemove });
  stateRef.current = { canAdd, canRemove };
  const add = useHoldRepeat(() => onAdd(group.cardId), () => stateRef.current.canAdd);
  const remove = useHoldRepeat(() => onRemove(group.cardId), () => stateRef.current.canRemove);
  return (
    <div className={[styles.stakeRow, count > 0 ? styles.stakeRowOn : ''].filter(Boolean).join(' ')} data-stake-row data-count={count}>
      {/* 卡片本身已經寫了名字與介紹：這裡不再重複文字，只放卡面與張數。 */}
      <button type="button" className={styles.stakeMain} aria-label={`加碼一張${group.name}，已押 ${count} 張，持有 ${group.total} 張`} disabled={!canAdd} {...add}>
        <CatalogBeastCard id={group.cardId} />
      </button>
      <div className={styles.stakeStrip}>
        <button type="button" className={styles.stakeMinus} aria-label={`取回一張${group.name}`} disabled={!canRemove} data-hidden={count === 0 || undefined} {...remove}>－</button>
        <output className={styles.stakeCount} data-on={count > 0 || undefined}>{count}<i>/{group.total}</i></output>
      </div>
    </div>
  );
});
