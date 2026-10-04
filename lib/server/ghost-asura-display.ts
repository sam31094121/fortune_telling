/**
 * 鬼魅阿修羅 — 後端顯示組裝（server-only）
 *
 * 客戶生辰 → calculateDualChart（既有八字／紫微／神煞後端，未改）
 * → buildGhostAsuraReading（既有 adapter → registry → translator → narrative → battle → guard，未改）
 * → 本檔只把管線輸出原樣搬進可直接顯示的文字契約（四柱欄位分組沿用原卡片規則），不改寫、不摘要。
 *
 * 前端不得引用本檔；`server-only` 會讓任何 client bundle 引用直接編譯失敗。
 * features/ghost-asura 本身仍被 node 測試直接載入，故不在那裡加 server-only，改由本包裝層守門。
 */

import 'server-only';
import { calculateDualChart } from '@/lib/dual-chart';
import {
  buildGhostAsuraReading,
  GHOST_ASURA_UI,
  PILLAR_UI,
  type GhostAsuraDisplayItem,
  type GhostAsuraPillarKey,
  type GhostAsuraReading,
} from '@/features/ghost-asura';
import {
  ASURA_DISPLAY_CONTRACT,
  type AsuraDisplay,
  type AsuraDisplaySection,
  type AsuraDisplayColumn,
  type AsuraDisplayEntry,
  type AsuraDisplaySeal,
} from '@/lib/ghost-asura-display-contract';

const PILLAR_ORDER: GhostAsuraPillarKey[] = ['year', 'month', 'day', 'hour'];
const HOUR_BRANCHES = new Set(['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'unknown', 'pending']);

/** 只收既有阿修羅表單會送的欄位；曆法與時區沿用既有頁面固定值。 */
export function normalizeAsuraInput(raw: unknown): Record<string, unknown> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const input: Record<string, unknown> = {
    calendarType: 'solar',
    timezone: 'Asia/Taipei',
  };
  if (typeof body.birthDate === 'string') input.birthDate = body.birthDate.trim().slice(0, 10);
  if (typeof body.birthTime === 'string') input.birthTime = body.birthTime.trim().slice(0, 5);
  if (body.gender === 'male' || body.gender === 'female') input.gender = body.gender;
  if (typeof body.birthHourBranch === 'string' && HOUR_BRANCHES.has(body.birthHourBranch)) input.birthHourBranch = body.birthHourBranch;
  if (body.timeUnknown === true) input.timeUnknown = true;
  if (typeof body.name === 'string') input.name = body.name.slice(0, 60);
  return input;
}

function toSeal(item: GhostAsuraDisplayItem): AsuraDisplaySeal {
  const clash = [item.battleSignificance, item.verdict].filter(Boolean).join(' ');
  return {
    id: item.resultId,
    name: item.displayName,
    tone: item.sealStatus,
    sealLabel: item.sealLabel,
    declaration: item.sealStatus === 'pending' ? null : item.shortDeclaration,
    meaning: item.sealStatus === 'pending' ? item.pendingReason ?? GHOST_ASURA_UI.pendingHint : item.coreMeaning,
    clash: item.sealStatus === 'pending' || !clash ? null : clash,
  };
}

export function toAsuraDisplay(reading: GhostAsuraReading): AsuraDisplay {
  const columns: AsuraDisplayColumn[] = PILLAR_ORDER.map((key) => {
    const label = PILLAR_UI[key].label;
    const seals = reading.items
      .filter((item) => item.sealStatus === 'awakened' && item.pillarLabels.includes(label))
      .map(toSeal);
    return {
      key,
      heading: PILLAR_UI[key].traditional,
      lead: seals[0]?.name ?? '暫無命中',
      countText: `共 ${seals.length} 枚印記`,
      seals,
    };
  });

  const failed = reading.guard.status === 'FAILED';
  const pendingNames = reading.pendingEntries.slice(0, 8).map((entry) => entry.label || entry.resultId);
  const alert = failed
    ? [
        GHOST_ASURA_UI.incompleteBanner,
        reading.pendingEntries.length > 0
          ? `待補 ${reading.pendingEntries.length} 筆：${pendingNames.join('、')}${reading.pendingEntries.length > 8 ? '…' : ''}`
          : '',
      ].filter(Boolean).join(' ')
    : null;

  const bf = reading.battleField;
  const battleRows: AsuraDisplayEntry[] = (
    [
      ['主戰魂', bf.mainSoul],
      ['主要護印', bf.mainGuardian],
      ['主要劫印', bf.mainTribulation],
      ['主要陰影', bf.mainShadow],
      ['魅緣力量', bf.charmPower],
      ['權勢力量', bf.authorityPower],
      ['財庫力量', bf.treasurePower],
      ['移動力量', bf.movementPower],
      ['突破口', bf.breakthrough],
      ['戰局宣判', bf.finalVerdict],
    ] as const
  ).map(([label, text]) => ({ label, text }));

  // 三段一律照印既有管線輸出（buildGhostAsuraReading），依管線原順序，不另改寫、不另摘要。
  const hits = reading.items.filter((item) => item.sealStatus === 'awakened');
  const hitsSection: AsuraDisplaySection = {
    key: 'hits',
    heading: '過去',
    label: '命中神煞',
    lead: '',
    items: hits.map((item) => ({
      label: item.displayName,
      text: [item.pillarLabels.join('、'), item.shortDeclaration, item.coreMeaning].filter(Boolean).join('｜'),
    })),
    emptyText: hits.length === 0 ? GHOST_ASURA_UI.noReading : null,
  };

  const pillarsSection: AsuraDisplaySection = {
    key: 'pillars',
    heading: '現在',
    label: '柱位與封印狀態',
    lead: '',
    items: reading.items.map((item) => ({
      label: item.displayName,
      text: [item.pillarLabels.join('、'), item.sealLabel].filter(Boolean).join('｜'),
    })),
    emptyText: reading.items.length === 0 ? GHOST_ASURA_UI.noReading : null,
  };

  const verdictItems: AsuraDisplayEntry[] = reading.items
    .filter((item) => item.verdict)
    .map((item) => ({ label: item.displayName, text: item.verdict as string }));
  const verdictSection: AsuraDisplaySection = {
    key: 'verdict',
    heading: '未來',
    label: '阿修羅判語',
    lead: bf.finalVerdict,
    items: verdictItems,
    emptyText: null,
  };

  return {
    contract: ASURA_DISPLAY_CONTRACT,
    title: reading.cardTitle,
    subtitle: `${GHOST_ASURA_UI.natalAsura}｜${GHOST_ASURA_UI.battleField}｜${GHOST_ASURA_UI.secretScroll}`,
    lines: ['別人還沒看見風暴，阿修羅先看見。', '命盤是戰場，不是保護區。你已經站上去了。'],
    alert,
    scrollHint: '左右滑動查看四柱，印記依柱對齊。',
    columns,
    stats: [
      { value: String(reading.items.length), label: '項印記' },
      { value: String(reading.awakenedCount), label: GHOST_ASURA_UI.sealAwakened, tone: 'awakened' },
      { value: String(reading.dormantCount), label: GHOST_ASURA_UI.sealDormant, tone: 'dormant' },
      { value: String(reading.pendingCount), label: GHOST_ASURA_UI.sealPending, tone: 'pending' },
    ],
    statsHint: '統計為印記種類；同一印記命中多柱時，各柱分別呈現。',
    supplements: [
      {
        key: 'dual' as const,
        heading: GHOST_ASURA_UI.printClash,
        entries: reading.dualClashes.map((clash) => ({
          id: clash.comboId,
          title: clash.title,
          members: `${clash.memberDisplayNames.join(' ↔ ')}${clash.pillarLabel ? `｜${clash.pillarLabel}` : ''}`,
          text: clash.evidenceText,
        })),
      },
      {
        key: 'chain' as const,
        heading: GHOST_ASURA_UI.asuraChain,
        entries: reading.chains.map((chain) => ({
          id: chain.comboId,
          title: chain.title,
          members: chain.memberDisplayNames.join('、'),
          text: chain.evidenceText,
        })),
      },
    ].filter((group) => group.entries.length > 0),
    battleField: { heading: GHOST_ASURA_UI.battleField, rows: battleRows },
    sections: [hitsSection, pillarsSection, verdictSection],
    glowIds: hits.map((item) => item.resultId),
    scopeNote: '印記故事用於文化象徵與自我反思，不代表心理診斷或必然發生的預言。',
  };
}

/** 生辰 → 既有後端排盤 → 既有阿修羅管線 → 顯示契約。錯誤訊息沿用既有後端的中文驗證訊息。 */
export function computeGhostAsuraDisplay(raw: unknown): AsuraDisplay {
  const result = calculateDualChart(normalizeAsuraInput(raw));
  return toAsuraDisplay(buildGhostAsuraReading({ result }));
}
