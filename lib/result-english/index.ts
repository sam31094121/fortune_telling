/**
 * English output layer for the /match result.
 *
 * renderMatchResultEnglish() takes the /api/match-generate response (Chinese, unchanged engine output)
 * and returns a COPY whose display strings are English. Rules:
 * - Structured values (element keys, scores, orders, orbit, tones, image paths, productElement glyphs used
 *   by the orb visuals) are copied as-is. Nothing is recalculated.
 * - People's names stay exactly as entered.
 * - Any string without an English template/entry is kept in its original language, never blanked.
 * - Chinese and Korean callers must not use this function; they keep the original response object.
 */
import type { MatchFiveElementResult } from '../match-five-element-engine';
import type { MatchStory } from '../match-story-engine';
import type { MatchThreeCoreView } from '../match-three-core-view';
import { renderFiveElementMatchEnglish } from './five-element';
import { renderMatchStoryEnglish } from './story';
import { renderThreeCoreEnglish } from './three-core';
import { PATTERN_TYPE_EN, fixedEn } from './tables';
import {
  BEAST_MEANING_EN, CHINESE_ZODIAC_EN, DIRECTION_EN, PILLAR_EN, RED_LUAN_LABEL_EN, ZH_SHORT_TO_KEY, EN_ELEMENT_SHORT, ZODIAC_SIGN_EN,
  ZIWEI_PALACE_EN, enBeastName, enBranch, enGanzhi, enZiweiStar,
} from './terms';

export { renderFiveElementMatchEnglish } from './five-element';
export { renderMatchStoryEnglish } from './story';
export { renderThreeCoreEnglish } from './three-core';

type Zones = { resonance: string[]; complement: string[]; grinding: string[]; conflict: string[] };
type Evidence = { label: string; evidence: string };
type BaziSignal = { annualBranch: string; inputCompleteness: string; natalEvidence: Evidence[]; annualTriggers: Evidence[]; sources: Array<{ title: string; reference: string }>; limitations: string[] };
type ZiweiSignal = { inputCompleteness: string; palaces?: Array<{ palace: string; earthlyBranch: string; majorStars: string[]; minorStars: string[] }>; limitations: string[] };
type Beast = { name: string; coreMeaning: string; direction: string; productElement: string; evidence: string; dayPillar: string };
type Display = { name: string; zodiacZh: string; chineseZodiac: string; bloodType?: string; bloodTypeLabel?: string; wuxing?: string };

/** Structural subset of the page's MatchResponse; every field optional so partial/old records still render. */
export type MatchResultLike = {
  result?: { summary: string; zones: Zones };
  displayA?: Display;
  displayB?: Display;
  fiveElementMatch?: MatchFiveElementResult;
  baziFoundation?: { timeNote: string; personA: { dayMaster: string; primaryReinforcement: string; beastCard?: Beast }; personB: { dayMaster: string; primaryReinforcement: string; beastCard?: Beast } };
  redLuanHeartbeat?: { bazi: { personA: BaziSignal; personB: BaziSignal }; ziwei: { personA: ZiweiSignal; personB: ZiweiSignal }; crossCheck: { summary: string; limitation: string }; iching: { limitation: string } };
  aiInterpretationLayer?: { relationshipPositioning: string };
  teacherReadings?: { google: { reading: string; source: 'google' | 'local' }; ghost?: { reading: string } };
  story?: MatchStory;
  scoreBasis?: string;
  threeCore?: MatchThreeCoreView;
};

function zonesEn(zones: Zones): Zones {
  return { resonance: zones.resonance.map(fixedEn), complement: zones.complement.map(fixedEn), grinding: zones.grinding.map(fixedEn), conflict: zones.conflict.map(fixedEn) };
}

function displayEn(d: Display): Display {
  const blood = d.bloodTypeLabel === '血型不知道' ? 'Blood type unknown' : d.bloodTypeLabel?.replace(/^(A|B|AB|O) 型$/, 'Type $1');
  return { ...d, zodiacZh: ZODIAC_SIGN_EN[d.zodiacZh] ?? d.zodiacZh, chineseZodiac: CHINESE_ZODIAC_EN[d.chineseZodiac] ?? d.chineseZodiac, bloodTypeLabel: blood };
}

function beastEn(beast: Beast | undefined): Beast | undefined {
  if (!beast) return beast;
  const ev = /^(.+?)依地支定位(.+?)，再依天干五行對應(.)元素神獸$/.exec(beast.evidence);
  const elementKey = ev ? ZH_SHORT_TO_KEY[ev[3]] : undefined;
  return {
    ...beast,
    name: enBeastName(beast.name),
    coreMeaning: BEAST_MEANING_EN[beast.coreMeaning] ?? beast.coreMeaning,
    direction: DIRECTION_EN[beast.direction] ?? beast.direction,
    evidence: ev && elementKey ? `The ${ev[1] === '日柱' ? 'day pillar' : ev[1]}’s earthly branch places it in the ${DIRECTION_EN[ev[2]] ?? ev[2]}, and its heavenly stem’s phase matches a ${EN_ELEMENT_SHORT[elementKey]}-element beast` : beast.evidence,
    dayPillar: enGanzhi(beast.dayPillar),
    // productElement stays as the Chinese glyph: the orb visuals key on it.
  };
}

/** 「依出生日的地支丑推出的桃花位（午）」 */
const SCOPE_RE = '依出生(年|日)的地支(.)推出的(紅鸞|天喜|桃花)位（(.)）';
function scopeEn(m: RegExpExecArray, offset: number) {
  const [pillar, basis, label, target] = [m[offset], m[offset + 1], m[offset + 2], m[offset + 3]];
  return `the ${RED_LUAN_LABEL_EN[label] ?? label} position (${enBranch(target)}) derived from the birth ${PILLAR_EN[pillar] ?? pillar} branch ${enBranch(basis)}`;
}
function evidenceEn(text: string) {
  const natal = new RegExp(`^${SCOPE_RE}；命盤的(.)支正好是(.)$`).exec(text);
  if (natal) return `The chart’s ${PILLAR_EN[natal[5]] ?? natal[5]} branch is exactly ${enBranch(natal[6])}, matching ${scopeEn(natal, 1)}`;
  const annual = new RegExp(`^(\\d+) 是(.)年，正好落在${SCOPE_RE}$`).exec(text);
  if (annual) return `${annual[1]} is a ${enBranch(annual[2])} year, landing exactly on ${scopeEn(annual, 3)}`;
  return text;
}
function baziSignalEn(s: BaziSignal): BaziSignal {
  const ev = (item: Evidence) => ({ ...item, label: RED_LUAN_LABEL_EN[item.label] ?? item.label, evidence: evidenceEn(item.evidence) });
  return {
    ...s,
    annualBranch: enBranch(s.annualBranch),
    inputCompleteness: fixedEn(s.inputCompleteness),
    natalEvidence: s.natalEvidence.map(ev),
    annualTriggers: s.annualTriggers.map(ev),
    sources: s.sources.map((src) => ({ title: fixedEn(src.title), reference: fixedEn(src.reference) })),
    limitations: s.limitations.map(fixedEn),
  };
}
function ziweiSignalEn(s: ZiweiSignal): ZiweiSignal {
  return {
    ...s,
    inputCompleteness: fixedEn(s.inputCompleteness),
    palaces: s.palaces?.map((p) => ({ palace: ZIWEI_PALACE_EN[p.palace] ?? p.palace, earthlyBranch: enBranch(p.earthlyBranch), majorStars: p.majorStars.map(enZiweiStar), minorStars: p.minorStars.map(enZiweiStar) })),
    limitations: s.limitations.map(fixedEn),
  };
}

function positioningEn(text: string, a?: string, b?: string) {
  if (!a || !b) return text;
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^${esc(a)}帶著「(.+?)」進入關係，${esc(b)}帶著「(.+?)」回應關係。這代表關係的主軸是「(兩個底色相近的人，怎麼不把同一個盲點一起放大|兩個底色不同的人，怎麼在同一個日常裡對齊)」。$`).exec(text);
  if (!m || !PATTERN_TYPE_EN[m[1]] || !PATTERN_TYPE_EN[m[2]]) return text;
  const axis = m[3].startsWith('兩個底色相近') ? 'how two people with a similar base avoid magnifying the same blind spot together' : 'how two people with different bases line up in the same daily life';
  return `${a} enters the relationship as the ${PATTERN_TYPE_EN[m[1]]}; ${b} responds as the ${PATTERN_TYPE_EN[m[2]]}. So the relationship’s central theme is ${axis}.`;
}

function localReadingEn(text: string) {
  const tail = '這是關係可以繼續加深的情感根基。溝通需要先回到「確認」而不是「說服」。當雙方能先確認感受與事實，關係比較容易回到可以修復的狀態。';
  const m = /^雙方的共鳴來自：(.*)。$/.exec(text.endsWith(tail) ? text.slice(0, -tail.length) : '');
  if (!m) return text;
  const items = m[1].split('；').map(fixedEn);
  return `Your resonance comes from: ${items.join('; ')}. This is an emotional foundation the relationship can keep deepening. ${fixedEn('溝通需要先回到「確認」而不是「說服」。當雙方能先確認感受與事實，關係比較容易回到可以修復的狀態。')}`;
}

const TENSION_EN: Record<string, string> = {
  兩股節奏一靠近封印就開始震動: 'the moment your two rhythms come close, the seal starts to shake',
  '兩股節奏一靠近，封印就開始震動': 'the moment your two rhythms come close, the seal starts to shake',
  未回應的話正在結界裡留下回音: 'unanswered words are leaving echoes inside the barrier',
  '回音尚未失控，但結界仍在等待第一個人伸手': 'the echo is not out of control yet, but the barrier is still waiting for the first person to reach out',
};
function ghostReadingEn(text: string, beastA?: string, beastB?: string) {
  if (!beastA || !beastB) return text;
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^封印沒有睡著。${esc(beastA)}與${esc(beastB)}在同一個結界裡相望；(.+?)。鬼魅把暗線指向「(.*)」，要讓這一局往前，必須先解除共同元素的封印。$`).exec(text);
  if (!m || !TENSION_EN[m[1]]) return text;
  const thread = fixedEn(m[2].replace(/『/g, '「').replace(/』/g, '」'));
  return `The seal is not asleep. ${enBeastName(beastA)} and ${enBeastName(beastB)} face each other inside the same barrier; ${TENSION_EN[m[1]]}. The ghost points the hidden thread at “${thread}”. To move this round forward, the shared element’s seal must be broken first.`;
}

export function renderMatchResultEnglish<T extends MatchResultLike>(data: T): T {
  const out: MatchResultLike = { ...data };
  const fe = data.fiveElementMatch;
  const feEn = fe ? renderFiveElementMatchEnglish(fe) : undefined;
  if (data.result) out.result = { ...data.result, summary: fixedEn(data.result.summary), zones: zonesEn(data.result.zones) };
  if (data.displayA) out.displayA = displayEn(data.displayA);
  if (data.displayB) out.displayB = displayEn(data.displayB);
  if (feEn) out.fiveElementMatch = feEn;
  if (data.baziFoundation) {
    const bf = data.baziFoundation;
    out.baziFoundation = {
      ...bf,
      timeNote: fixedEn(bf.timeNote),
      personA: { ...bf.personA, beastCard: beastEn(bf.personA.beastCard) },
      personB: { ...bf.personB, beastCard: beastEn(bf.personB.beastCard) },
    };
  }
  if (data.redLuanHeartbeat) {
    const r = data.redLuanHeartbeat;
    out.redLuanHeartbeat = {
      ...r,
      bazi: { personA: baziSignalEn(r.bazi.personA), personB: baziSignalEn(r.bazi.personB) },
      ziwei: { personA: ziweiSignalEn(r.ziwei.personA), personB: ziweiSignalEn(r.ziwei.personB) },
      crossCheck: { ...r.crossCheck, summary: fixedEn(r.crossCheck.summary), limitation: fixedEn(r.crossCheck.limitation) },
      iching: { ...r.iching, limitation: fixedEn(r.iching.limitation) },
    };
  }
  if (data.aiInterpretationLayer) {
    out.aiInterpretationLayer = { ...data.aiInterpretationLayer, relationshipPositioning: positioningEn(data.aiInterpretationLayer.relationshipPositioning, data.displayA?.name, data.displayB?.name) };
  }
  if (data.teacherReadings) {
    const t = data.teacherReadings;
    out.teacherReadings = {
      ...t,
      // Google/AI rewrites are free text and stay as written; only the rule-based local reading is templated.
      google: { ...t.google, reading: t.google.source === 'local' ? localReadingEn(t.google.reading) : t.google.reading },
      ghost: t.ghost && { ...t.ghost, reading: ghostReadingEn(t.ghost.reading, data.baziFoundation?.personA.beastCard?.name, data.baziFoundation?.personB.beastCard?.name) },
    };
  }
  if (data.story && fe && feEn) out.story = renderMatchStoryEnglish(data.story, fe, feEn.sharedReason);
  if (data.scoreBasis) out.scoreBasis = fixedEn(data.scoreBasis);
  if (data.threeCore) out.threeCore = renderThreeCoreEnglish(data.threeCore);
  return out as unknown as T;
}
