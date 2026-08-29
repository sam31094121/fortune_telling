'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { WaterTreasureOrb } from '@/components/bazi/customer/WaterTreasureOrb';
import { useElementTreasureRitual } from '@/components/five-elements/useElementTreasureRitual';
import styles from './TodayDirectionQuest.module.css';

type QuestStage = 'intro' | 'area' | 'tension' | 'action' | 'reward';
type QuestAreaId = 'self' | 'work' | 'relationship';

type QuestPath = {
  id: string;
  label: string;
  reflection: string;
  action: string;
  routeHref: string;
  routeLabel: string;
};

type QuestArea = {
  id: QuestAreaId;
  label: string;
  glyph: string;
  prompt: string;
  paths: QuestPath[];
};

const QUEST_AREAS: QuestArea[] = [
  {
    id: 'self',
    label: '自己',
    glyph: '心',
    prompt: '今天，你最想先整理自己的哪一部分？',
    paths: [
      {
        id: 'self-priority',
        label: '腦中很多事，不知道先做哪一件',
        reflection: '你選的是先替混亂排出順序，不需要一次把全部處理完。',
        action: '寫下目前最掛心的三件事，只圈出今天最值得推進的一件，先留十分鐘給它。',
        routeHref: '/numerology',
        routeLabel: '用一組數字收下今日提醒',
      },
      {
        id: 'self-progress',
        label: '做了很多，卻看不見自己有前進',
        reflection: '你想先看見已經走過的路，而不是再增加一項要求。',
        action: '記下一件今天已經完成的事，再補上一個最小的下一步；小到現在就能開始。',
        routeHref: '/music',
        routeLabel: '生成一段屬於今天的節奏',
      },
      {
        id: 'self-direction',
        label: '想改變，但還沒有決定方向',
        reflection: '你不必立刻決定整條路，可以先辨認哪個方向值得試走一步。',
        action: '分別寫下「想保留」與「想改變」各一件事，先做一個可以撤回的小嘗試。',
        routeHref: '/tarot',
        routeLabel: '用當下提問找一條新線索',
      },
    ],
  },
  {
    id: 'work',
    label: '工作',
    glyph: '行',
    prompt: '今天，工作上的哪一道關卡最需要方向？',
    paths: [
      {
        id: 'work-overload',
        label: '事情太多，優先順序一直被打亂',
        reflection: '你想先把力量集中，而不是用忙碌證明自己有在前進。',
        action: '選出今天最能影響結果的一件事，關掉其他提醒，完整做十五分鐘。',
        routeHref: '/bazi',
        routeLabel: '從生辰八字延伸行動方向',
      },
      {
        id: 'work-choice',
        label: '怕選錯，所以一直停在原地',
        reflection: '你在意的是選擇的代價；今天可以先找一個不必一次定終身的做法。',
        action: '把選項縮成兩個，替每一個寫下一項可逆的小測試，今天只完成其中一項。',
        routeHref: '/numerology',
        routeLabel: '用今日數字整理判斷節奏',
      },
      {
        id: 'work-energy',
        label: '知道要做什麼，卻提不起力量',
        reflection: '你不是要一次恢復全部動力，而是先讓行動重新開始流動。',
        action: '把任務切到五分鐘能完成的大小；完成後先停一下，再決定要不要繼續。',
        routeHref: '/music',
        routeLabel: '找一段適合今天的行動節奏',
      },
    ],
  },
  {
    id: 'relationship',
    label: '關係',
    glyph: '緣',
    prompt: '今天，關係裡的哪件事最想先解開？',
    paths: [
      {
        id: 'relationship-speak',
        label: '有話想說，卻不知道怎麼開口',
        reflection: '你想靠近，也希望自己的話不會變成新的壓力。',
        action: '先寫一句只描述事實、不猜測對方心情的開場，再加上一個你真正想確認的問題。',
        routeHref: '/match',
        routeLabel: '進入雙人互動節奏探索',
      },
      {
        id: 'relationship-conflict',
        label: '同一件事反覆爭執，找不到出口',
        reflection: '你想處理的不只是輸贏，而是那件一直沒有被說清楚的需要。',
        action: '把想反駁的話先放下，寫出自己最想被理解的一件事，再決定何時說。',
        routeHref: '/match',
        routeLabel: '看看彼此的互動落差',
      },
      {
        id: 'relationship-distance',
        label: '感覺有距離，不確定該靠近或等待',
        reflection: '你需要的是一個能確認方向的訊號，不必先替對方下結論。',
        action: '選一個不帶要求的關心方式，清楚表達一次，然後替回應留出時間。',
        routeHref: '/match',
        routeLabel: '整理兩人的關係線索',
      },
    ],
  },
];

const STAGE_NUMBER: Record<Exclude<QuestStage, 'intro' | 'reward'>, number> = {
  area: 1,
  tension: 2,
  action: 3,
};

const WIND_RITUAL_SCENES = [
  '封印正在鬆動，風從縫隙醒來。',
  '第一道光穿過寶珠，今天的選擇正在成形。',
  '符紙化成灰燼，定向之風開始回應。',
  '寶珠即將解封，下一條路正在顯現。',
] as const;

const SEALED_COMPARISON_ORBS = ['空', '水', '火', '地'] as const;
const QUEST_STORAGE_KEY = 'today-direction-quest-v1';

type SavedQuestState = {
  date: string;
  stage: Exclude<QuestStage, 'intro'>;
  areaId: QuestAreaId | null;
  pathId: string | null;
  completed: boolean;
};

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isQuestAreaId(value: unknown): value is QuestAreaId {
  return QUEST_AREAS.some((item) => item.id === value);
}

function isSavedStage(value: unknown): value is SavedQuestState['stage'] {
  return value === 'area' || value === 'tension' || value === 'action' || value === 'reward';
}

function isValidSavedState(value: unknown): value is SavedQuestState {
  if (!value || typeof value !== 'object') return false;
  const saved = value as Partial<SavedQuestState>;
  if (saved.date !== todayKey() || !isSavedStage(saved.stage)) return false;
  if (saved.stage === 'area') return saved.areaId === null && saved.pathId === null;
  if (!isQuestAreaId(saved.areaId)) return false;
  if (saved.stage === 'tension') return saved.pathId === null;
  const savedArea = QUEST_AREAS.find((item) => item.id === saved.areaId);
  return typeof saved.pathId === 'string' && Boolean(savedArea?.paths.some((item) => item.id === saved.pathId));
}

export default function TodayDirectionQuest() {
  const [stage, setStage] = useState<QuestStage>('intro');
  const [areaId, setAreaId] = useState<QuestAreaId | null>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [restoredReleased, setRestoredReleased] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const windRitual = useElementTreasureRitual('風');

  const area = QUEST_AREAS.find((item) => item.id === areaId) ?? null;
  const path = area?.paths.find((item) => item.id === pathId) ?? null;
  const rewardOpening = !restoredReleased && windRitual.opening;
  const rewardReleased = restoredReleased || windRitual.released;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(QUEST_STORAGE_KEY);
      if (!raw) return;
      const saved: unknown = JSON.parse(raw);
      if (!isValidSavedState(saved)) {
        window.localStorage.removeItem(QUEST_STORAGE_KEY);
        return;
      }
      setAreaId(saved.areaId);
      setPathId(saved.pathId);
      setStage(saved.stage);
      setRestoredReleased(saved.stage === 'reward');
    } catch {
      window.localStorage.removeItem(QUEST_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || stage === 'intro') return;
    const saved: SavedQuestState = {
      date: todayKey(),
      stage,
      areaId,
      pathId,
      completed: stage === 'reward',
    };
    window.localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(saved));
  }, [areaId, hydrated, pathId, restoredReleased, stage, windRitual.opening, windRitual.released]);

  useEffect(() => {
    if (stage === 'intro') return;
    panelRef.current?.focus({ preventScroll: true });
  }, [stage]);

  function beginQuest() {
    windRitual.reseal();
    setRestoredReleased(false);
    setAreaId(null);
    setPathId(null);
    setStage('area');
  }

  function chooseArea(nextAreaId: QuestAreaId) {
    setAreaId(nextAreaId);
    setPathId(null);
    setStage('tension');
  }

  function choosePath(nextPathId: string) {
    setPathId(nextPathId);
    setStage('action');
  }

  function goBack() {
    if (stage === 'tension') {
      setAreaId(null);
      setPathId(null);
      setStage('area');
      return;
    }
    if (stage === 'action') {
      setPathId(null);
      setStage('tension');
      return;
    }
    if (stage === 'reward') {
      setStage('action');
    }
  }

  function resetQuest() {
    windRitual.reseal();
    setRestoredReleased(false);
    window.localStorage.removeItem(QUEST_STORAGE_KEY);
    setAreaId(null);
    setPathId(null);
    setStage('intro');
  }

  function completeQuest() {
    setRestoredReleased(false);
    setStage('reward');
    windRitual.start();
  }

  const progressStage = stage === 'area' || stage === 'tension' || stage === 'action'
    ? STAGE_NUMBER[stage]
    : stage === 'reward'
      ? 3
      : 0;

  return (
    <section
      ref={panelRef}
      id="today-direction-quest"
      className={styles.quest}
      aria-labelledby="today-direction-title"
      tabIndex={-1}
      data-quest-stage={stage}
    >
      <span className={styles.windLine} aria-hidden="true" />
      <span className={styles.windGlow} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.topline}>
          <span className={styles.eyebrow}>今日定向關卡</span>
          {stage !== 'intro' && (
            <span className={styles.progressText} aria-live="polite">
              {stage === 'reward'
                ? rewardOpening
                  ? '封印解開中'
                  : rewardReleased
                    ? '今日第一步完成'
                    : '封印準備中'
                : `第 ${progressStage} / 3 層`}
            </span>
          )}
        </div>

        {stage !== 'intro' && (
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${(progressStage / 3) * 100}%` }} />
          </div>
        )}

        {stage === 'intro' && (
          <div className={styles.intro}>
            <div className={styles.introCopy}>
              <p className={styles.kicker}>先成一，再生二</p>
              <h2 id="today-direction-title">今天，只選一件。</h2>
              <p className={styles.lead}>完成它，定向之風才會吹開下一層。</p>
              <div className={styles.promiseRow} aria-label="遊戲說明">
                <span>免費</span>
                <span>約 90 秒</span>
                <span>不用先填資料</span>
              </div>
            </div>

            <div className={styles.introAction}>
              <div className={styles.lockPreview} aria-hidden="true">
                <span className={`treasure-reveal-stage treasure-reveal-stage--sealed ${styles.introOrbStage}`}>
                  <WaterTreasureOrb element="風" released={false} preview />
                </span>
                <span>
                  <small>下一層線索</small>
                  <strong>等待今日選擇</strong>
                </span>
              </div>
              <button type="button" className={styles.primaryButton} onClick={beginQuest} data-quest-action="start">
                <span>進入今日關卡</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {stage === 'area' && (
          <div className={styles.step}>
            <p className={styles.kicker}>第一層｜選一條路</p>
            <h2 id="today-direction-title">你今天最想先解開什麼？</h2>
            <p className={styles.stepLead}>不用想完整答案，只選現在最在意的一項。</p>
            <div className={styles.areaGrid}>
              {QUEST_AREAS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.choiceButton}
                  onClick={() => chooseArea(item.id)}
                  data-quest-area={item.id}
                >
                  <span className={styles.choiceGlyph} aria-hidden="true">{item.glyph}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>打開這條線索</small>
                  </span>
                  <span className={styles.choiceArrow} aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <button type="button" className={styles.quietButton} onClick={resetQuest}>今天先放著</button>
          </div>
        )}

        {stage === 'tension' && area && (
          <div className={styles.step}>
            <p className={styles.kicker}>第二層｜{area.label}</p>
            <h2 id="today-direction-title">{area.prompt}</h2>
            <p className={styles.stepLead}>選擇最接近的一句；它只代表你此刻的選擇。</p>
            <div className={styles.pathList}>
              {area.paths.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.pathButton}
                  onClick={() => choosePath(item.id)}
                  data-quest-path={item.id}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.label}</strong>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <div className={styles.stepActions}>
              <button type="button" className={styles.quietButton} onClick={goBack}>回上一層</button>
              <button type="button" className={styles.quietButton} onClick={resetQuest}>今天先放著</button>
            </div>
          </div>
        )}

        {stage === 'action' && area && path && (
          <div className={styles.step}>
            <p className={styles.kicker}>第三層｜今天的一步</p>
            <h2 id="today-direction-title">先把這一件事做到位。</h2>
            <div className={styles.reflectionCard}>
              <span>依你剛才的選擇</span>
              <p>{path.reflection}</p>
            </div>
            <div className={styles.actionCard}>
              <span>今天的行動</span>
              <p>{path.action}</p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={completeQuest} data-quest-action="complete">
              <span>收下今天這一步</span>
              <span aria-hidden="true">→</span>
            </button>
            <div className={styles.stepActions}>
              <button type="button" className={styles.quietButton} onClick={goBack}>換個方向</button>
              <button type="button" className={styles.quietButton} onClick={resetQuest}>今天先放著</button>
            </div>
          </div>
        )}

        {stage === 'reward' && area && path && (
          <div className={styles.reward} aria-live="polite">
            <div
              className={`treasure-reveal-stage treasure-reveal-stage--hero ${styles.rewardOrb} ${rewardOpening ? 'treasure-reveal-stage--opening' : ''} ${rewardReleased ? 'treasure-reveal-stage--collected' : ''}`}
              role="img"
              aria-label={rewardReleased ? '已獲得的定向之風寶珠' : '正在解封的定向之風寶珠'}
            >
              <WaterTreasureOrb
                element="風"
                released={rewardReleased || rewardOpening}
                burnSealOnRelease={rewardOpening}
                animating={rewardOpening}
                displayProfile="mobile-reward"
              />
            </div>
            <div className={styles.sealedPreview} aria-label="其餘四顆仍在封印中的元素寶珠">
              <span>其餘元素仍封印</span>
              <div>
                {SEALED_COMPARISON_ORBS.map((element) => (
                  <span key={element} className={`treasure-reveal-stage treasure-reveal-stage--sealed ${styles.sealedOrb}`}>
                    <WaterTreasureOrb element={element} released={false} preview />
                    <small>{element}</small>
                  </span>
                ))}
              </div>
            </div>
            {rewardOpening && windRitual.stage !== null ? (
              <>
                <p className={styles.kicker}>解封進行中｜{windRitual.stage + 1} / 4</p>
                <h2 id="today-direction-title">定向之風正在甦醒</h2>
                <p className={styles.rewardLead}>{WIND_RITUAL_SCENES[windRitual.stage]}</p>
                <div className={styles.ritualProgress} aria-label={`寶珠解封進度 ${windRitual.stage + 1} / 4`}>
                  {WIND_RITUAL_SCENES.map((_, index) => (
                    <span key={index} data-active={index <= (windRitual.stage ?? -1)} />
                  ))}
                </div>
                <p className={styles.ritualWait}>請看著封印打開；完成後，下一條線索會自動出現。</p>
              </>
            ) : rewardReleased ? (
              <>
                <p className={styles.kicker}>今日第一步已完成</p>
                <h2 id="today-direction-title">獲得「定向之風寶珠」</h2>
                <p className={styles.rewardLead}>一已經形成。下一層會從今天這一步繼續展開。</p>
                <div className={styles.nextClue}>
                  <span>下一條可探索線索</span>
                  <strong>{path.routeLabel}</strong>
                </div>
                <Link href={path.routeHref} className={styles.primaryButton} data-quest-action="branch">
                  <span>進入相關支線</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <button type="button" className={styles.quietButton} onClick={resetQuest}>再選另一條路</button>
              </>
            ) : (
              <>
                <p className={styles.kicker}>封印準備中</p>
                <h2 id="today-direction-title">定向之風正在聚合</h2>
              </>
            )}
          </div>
        )}

        <p className={styles.disclaimer}>內容依照你的選擇整理，作為文化探索與行動反思，不是心理診斷或確定預測。</p>
      </div>
    </section>
  );
}
