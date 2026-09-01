'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { WaterTreasureOrb } from '@/components/bazi/customer/WaterTreasureOrb';
import { useElementTreasureRitual } from '@/components/five-elements/useElementTreasureRitual';
import styles from './TodayDirectionQuest.module.css';

type QuestStage = 'intro' | 'checkin' | 'area' | 'tension' | 'action' | 'reward';
type QuestAreaId = 'self' | 'work' | 'relationship';
type CheckinResponse = 'done' | 'progress' | 'switch';

type QuestPath = {
  id: string;
  label: string;
  reflection: string;
  action: string;
  smallerAction: string;
  routeHref: string;
  routeLabel: string;
};

type ActionMode = 'ready' | 'check' | 'smaller';

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
        smallerAction: '只寫下一件最掛心的事，不用排序。',
        routeHref: '/numerology',
        routeLabel: '用一組數字收下今日提醒',
      },
      {
        id: 'self-progress',
        label: '做了很多，卻看不見自己有前進',
        reflection: '你想先看見已經走過的路，而不是再增加一項要求。',
        action: '記下一件今天已經完成的事，再補上一個最小的下一步；小到現在就能開始。',
        smallerAction: '只寫下今天已完成的一件小事。',
        routeHref: '/music',
        routeLabel: '生成一段屬於今天的節奏',
      },
      {
        id: 'self-direction',
        label: '想改變，但還沒有決定方向',
        reflection: '你不必立刻決定整條路，可以先辨認哪個方向值得試走一步。',
        action: '分別寫下「想保留」與「想改變」各一件事，先做一個可以撤回的小嘗試。',
        smallerAction: '只寫下你最不想失去的一件事。',
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
        smallerAction: '先關掉一個提醒，專心三分鐘。',
        routeHref: '/bazi',
        routeLabel: '從生辰八字延伸行動方向',
      },
      {
        id: 'work-choice',
        label: '怕選錯，所以一直停在原地',
        reflection: '你在意的是選擇的代價；今天可以先找一個不必一次定終身的做法。',
        action: '把選項縮成兩個，替每一個寫下一項可逆的小測試，今天只完成其中一項。',
        smallerAction: '只寫下兩個選項，今天不用決定。',
        routeHref: '/numerology',
        routeLabel: '用今日數字整理判斷節奏',
      },
      {
        id: 'work-energy',
        label: '知道要做什麼，卻提不起力量',
        reflection: '你不是要一次恢復全部動力，而是先讓行動重新開始流動。',
        action: '把任務切到五分鐘能完成的大小；完成後先停一下，再決定要不要繼續。',
        smallerAction: '只打開任務，完成第一個最小動作。',
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
        smallerAction: '只寫一句想說的話，不必立刻送出。',
        routeHref: '/match',
        routeLabel: '進入雙人互動節奏探索',
      },
      {
        id: 'relationship-conflict',
        label: '同一件事反覆爭執，找不到出口',
        reflection: '你想處理的不只是輸贏，而是那件一直沒有被說清楚的需要。',
        action: '把想反駁的話先放下，寫出自己最想被理解的一件事，再決定何時說。',
        smallerAction: '只寫下你希望對方知道的一件事。',
        routeHref: '/match',
        routeLabel: '看看彼此的互動落差',
      },
      {
        id: 'relationship-distance',
        label: '感覺有距離，不確定該靠近或等待',
        reflection: '你需要的是一個能確認方向的訊號，不必先替對方下結論。',
        action: '選一個不帶要求的關心方式，清楚表達一次，然後替回應留出時間。',
        smallerAction: '先傳一句不要求回覆的關心。',
        routeHref: '/match',
        routeLabel: '整理兩人的關係線索',
      },
    ],
  },
];

const STAGE_NUMBER: Record<Exclude<QuestStage, 'intro' | 'checkin' | 'reward'>, number> = {
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
  stage: QuestStage;
  areaId: QuestAreaId | null;
  pathId: string | null;
  completed: boolean;
  actionMode?: ActionMode;
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
  return value === 'intro' || value === 'checkin' || value === 'area' || value === 'tension' || value === 'action' || value === 'reward';
}

function isActionMode(value: unknown): value is ActionMode {
  return value === 'ready' || value === 'check' || value === 'smaller';
}

function isValidSavedState(value: unknown): value is SavedQuestState {
  if (!value || typeof value !== 'object') return false;
  const saved = value as Partial<SavedQuestState>;
  if (typeof saved.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.date) || !isSavedStage(saved.stage)) return false;
  if (saved.actionMode !== undefined && !isActionMode(saved.actionMode)) return false;
  if (saved.stage === 'intro') return saved.areaId === null && saved.pathId === null;
  if (saved.stage === 'checkin') return saved.completed === true && saved.areaId === null && saved.pathId === null;
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
  const [actionMode, setActionMode] = useState<ActionMode>('ready');
  const [collectedToday, setCollectedToday] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restoredReleased, setRestoredReleased] = useState(false);
  const [returnNote, setReturnNote] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
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
      if (saved.date !== todayKey()) {
        if (saved.completed) {
          setAreaId(null);
          setPathId(null);
          setStage('checkin');
          setCollectedToday(true);
          setRestoredReleased(true);
        }
        return;
      }
      setAreaId(saved.areaId);
      setPathId(saved.pathId);
      setStage(saved.stage);
      setActionMode(saved.actionMode ?? 'ready');
      setCollectedToday(saved.completed);
      setRestoredReleased(saved.stage === 'reward' && saved.completed);
    } catch {
      window.localStorage.removeItem(QUEST_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved: SavedQuestState = {
      date: todayKey(),
      stage,
      areaId,
      pathId,
      completed: collectedToday || stage === 'reward',
      actionMode,
    };
    window.localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(saved));
  }, [actionMode, areaId, collectedToday, hydrated, pathId, stage]);

  useEffect(() => {
    if (stage === 'intro') return;
    panelRef.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (stage !== 'reward') return;
    if (new URLSearchParams(window.location.search).get('taijiMotionGame') === '1') return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rewardRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  function beginQuest() {
    windRitual.reseal();
    setRestoredReleased(false);
    setActionMode('ready');
    setAreaId(null);
    setPathId(null);
    setStage('area');
  }

  function chooseArea(nextAreaId: QuestAreaId) {
    setReturnNote(null);
    setActionMode('ready');
    setAreaId(nextAreaId);
    setPathId(null);
    setStage('tension');
  }

  function choosePath(nextPathId: string) {
    setActionMode('ready');
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
      setActionMode('ready');
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
    setActionMode('ready');
    setAreaId(null);
    setPathId(null);
    setStage('intro');
  }

  function completeQuest() {
    setCollectedToday(true);
    setRestoredReleased(false);
    setStage('reward');
    windRitual.start();
  }

  function answerCheckin(response: CheckinResponse) {
    const notes: Record<CheckinResponse, string> = {
      done: '做到了。今天再讓一件事往前。',
      progress: '有前進就算數。今天再走一小步。',
      switch: '換路也算前進。今天重新選一條。',
    };
    setReturnNote(notes[response]);
    setActionMode('ready');
    setAreaId(null);
    setPathId(null);
    setStage('area');
  }

  function chooseAnotherPath() {
    windRitual.reseal();
    setRestoredReleased(false);
    setActionMode('ready');
    setAreaId(null);
    setPathId(null);
    setStage('area');
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
          <span className={styles.topStatus}>
            {collectedToday && stage !== 'intro' && stage !== 'reward' && (
              <span className={styles.collectedMini} aria-label="今日風寶珠已取得">
                風珠已取得
              </span>
            )}
            {stage !== 'intro' && (
              <span className={styles.progressText} aria-live="polite">
                {stage === 'checkin'
                  ? '歡迎回來'
                  : stage === 'reward'
                  ? rewardOpening
                    ? '解封中'
                    : rewardReleased
                      ? '完成'
                      : '準備中'
                  : `${progressStage} / 3`}
              </span>
            )}
          </span>
        </div>

        {stage !== 'intro' && stage !== 'checkin' && (
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${(progressStage / 3) * 100}%` }} />
          </div>
        )}

        {stage === 'intro' && (
          <div className={styles.intro}>
            <div className={styles.introCopy}>
              <p className={styles.kicker}>先成一，再生二</p>
              <h2 id="today-direction-title">今天，只做好一件事。</h2>
              <p className={styles.lead}>先走一步，讓明天開始改變。</p>
              <div className={styles.promiseRow} aria-label="遊戲說明">
                <span>免費</span>
                <span>90 秒</span>
                <span>免填資料</span>
              </div>
            </div>

            <div className={styles.introAction}>
              <div className={styles.lockPreview} aria-hidden="true">
                <span className={`treasure-reveal-stage ${collectedToday ? 'treasure-reveal-stage--collected' : 'treasure-reveal-stage--sealed'} ${styles.introOrbStage}`}>
                  <WaterTreasureOrb element="風" released={collectedToday} preview displayProfile={collectedToday ? 'mobile-reward' : 'default'} />
                </span>
                <span>
                  <small>{collectedToday ? '今日成果' : '下一層'}</small>
                  <strong>{collectedToday ? '風寶珠已取得' : '等你選擇'}</strong>
                </span>
              </div>
              <button type="button" className={styles.primaryButton} onClick={beginQuest} data-quest-action="start">
                <span>{collectedToday ? '再選一條路' : '開始'}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {stage === 'checkin' && (
          <div className={styles.step}>
            <p className={styles.kicker}>風寶珠記得你</p>
            <h2 id="today-direction-title">上次那一步，現在怎麼樣？</h2>
            <div className={styles.checkinOrb} aria-label="已保留的風寶珠，寶珠進度一共五顆，目前一顆">
              <span className={`treasure-reveal-stage treasure-reveal-stage--collected ${styles.introOrbStage}`}>
                <WaterTreasureOrb element="風" released preview displayProfile="mobile-reward" />
              </span>
              <span>
                <small>成果已保留</small>
                <strong>寶珠 1 / 5</strong>
              </span>
            </div>
            <div className={styles.feedbackGrid} aria-label="回訪選擇">
              <button type="button" className={styles.primaryButton} onClick={() => answerCheckin('done')}>我完成了</button>
              <button type="button" className={styles.secondaryButton} onClick={() => answerCheckin('progress')}>我有前進</button>
              <button type="button" className={styles.quietButton} onClick={() => answerCheckin('switch')}>我想換條路</button>
            </div>
            <p className={styles.checkinPromise}>不論答案，成果都會保留。</p>
          </div>
        )}

        {stage === 'area' && (
          <div className={styles.step}>
            <p className={styles.kicker}>第一層</p>
            <h2 id="today-direction-title">今天想先整理哪裡？</h2>
            {returnNote && <p className={styles.returnNote} aria-live="polite">{returnNote}</p>}
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
                  </span>
                  <span className={styles.choiceArrow} aria-hidden="true">→</span>
                </button>
              ))}
            </div>
            <button type="button" className={styles.quietButton} onClick={resetQuest}>稍後再來</button>
          </div>
        )}

        {stage === 'tension' && area && (
          <div className={styles.step}>
            <p className={styles.kicker}>第二層｜{area.label}</p>
            <h2 id="today-direction-title">哪一句最接近現在？</h2>
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
              <button type="button" className={styles.quietButton} onClick={resetQuest}>稍後再來</button>
            </div>
          </div>
        )}

        {stage === 'action' && area && path && (
          <div className={styles.step}>
            <p className={styles.kicker}>第三層</p>
            <h2 id="today-direction-title">先完成眼前這一步。</h2>
            <div className={styles.reflectionCard}>
              <span>現在需要</span>
              <p>{path.reflection}</p>
            </div>
            <div className={styles.actionCard}>
              <span>{actionMode === 'smaller' ? '更小一步' : '現在做'}</span>
              <p>{actionMode === 'smaller' ? path.smallerAction : path.action}</p>
            </div>
            {actionMode === 'ready' && (
              <button type="button" className={styles.primaryButton} onClick={() => setActionMode('check')} data-quest-action="start-action">
                <span>開始這一步</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
            {actionMode === 'check' && (
              <div className={styles.feedbackGrid} aria-label="行動回報">
                <button type="button" className={styles.primaryButton} onClick={completeQuest} data-quest-action="complete">我做完了</button>
                <button type="button" className={styles.secondaryButton} onClick={completeQuest} data-quest-action="started">我有開始</button>
                <button type="button" className={styles.quietButton} onClick={() => setActionMode('smaller')}>這一步太大</button>
              </div>
            )}
            {actionMode === 'smaller' && (
              <button type="button" className={styles.primaryButton} onClick={() => setActionMode('check')} data-quest-action="start-smaller">
                <span>開始更小一步</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
            <div className={styles.stepActions}>
              <button type="button" className={styles.quietButton} onClick={goBack}>換個方向</button>
              <button type="button" className={styles.quietButton} onClick={resetQuest}>稍後再來</button>
            </div>
          </div>
        )}

        {stage === 'reward' && area && path && (
          <div className={styles.reward} aria-live="polite">
            <div
              ref={rewardRef}
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
              <span>{rewardReleased ? '寶珠進度 1 / 5' : '其餘元素仍封印'}</span>
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
                <p className={styles.kicker}>解封中｜{windRitual.stage + 1} / 4</p>
                <h2 id="today-direction-title">風正在甦醒</h2>
                <p className={styles.rewardLead}>{WIND_RITUAL_SCENES[windRitual.stage]}</p>
                <div className={styles.ritualProgress} aria-label={`寶珠解封進度 ${windRitual.stage + 1} / 4`}>
                  {WIND_RITUAL_SCENES.map((_, index) => (
                    <span key={index} data-active={index <= (windRitual.stage ?? -1)} />
                  ))}
                </div>
              </>
            ) : rewardReleased ? (
              <>
                <p className={styles.kicker}>今天已前進</p>
                <h2 id="today-direction-title">風寶珠已解封</h2>
                <p className={styles.rewardLead}>今天的一步，正在改變明天。</p>
                <p className={styles.tomorrowClue}>明天，風寶珠會帶回下一條線索。</p>
                <div className={styles.nextClue}>
                  <span>繼續探索</span>
                  <strong>{path.routeLabel}</strong>
                </div>
                <Link href={path.routeHref} className={styles.primaryButton} data-quest-action="branch">
                  <span>下一步</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <button type="button" className={styles.quietButton} onClick={chooseAnotherPath}>再選一條路</button>
              </>
            ) : (
              <>
                <p className={styles.kicker}>封印準備中</p>
                <h2 id="today-direction-title">定向之風正在聚合</h2>
              </>
            )}
          </div>
        )}

        <p className={styles.disclaimer}>文化探索・非心理診斷或確定預測</p>
      </div>
    </section>
  );
}
