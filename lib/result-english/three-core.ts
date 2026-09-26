/**
 * English rendering of lib/match-three-core-view.ts output. Pillars, palace branch, stars and
 * hexagram numbers are read from the engine's own strings; nothing is re-cast.
 */
import type { MatchThreeCorePerson, MatchThreeCoreView } from '../match-three-core-view';
import { fixedEn } from './tables';
import { BRANCH_EN, HEXAGRAM_EN, ZIWEI_PATTERN_EN, enBranch, enGanzhi, enZiweiStar } from './terms';
import { enHexagramAdvice, enHexagramEssence, enHexagramImage, enPatternName } from './hexagram';

function pillarsEn(value: string) {
  const unknownHour = value.endsWith('（時柱不推定）');
  const core = unknownHour ? value.slice(0, -'（時柱不推定）'.length) : value;
  const parts = core.split('・');
  if (!parts.every((p) => enGanzhi(p) !== p)) return value;
  return `${parts.map(enGanzhi).join(' · ')}${unknownHour ? ' (hour pillar not inferred)' : ''}`;
}

function ziweiValueEn(value: string) {
  const m = /^命宮在(.)・(.+)$/.exec(value);
  if (!m) return fixedEn(value);
  const branch = BRANCH_EN[m[1]] ? enBranch(m[1]) : m[1];
  const stars = m[2] === '無十四主星（空宮）' ? 'no major star (empty palace)' : m[2].split('、').map(enZiweiStar).join(', ');
  return `Life Palace in ${branch} · ${stars}`;
}

function ziweiDetailEn(detail: string) {
  const m = /^三方四正格局：(.+)。$/.exec(detail);
  if (m) return `Three directions and four positions pattern: ${ZIWEI_PATTERN_EN[m[1]] ?? m[1]}.`;
  return fixedEn(detail);
}

function hexDetailEn(detail: string) {
  const m = /^四柱核對一致後，依生辰起卦，起到(.+?)；「(.+?)」是本站替這一卦取的名字，不是古籍卦名。卦義與起卦依據在下方。$/.exec(detail);
  return m ? `After the four pillars matched, a hexagram was cast from the birth data: ${hexNameEn(m[1])}. “${enPatternName(m[2])}” is the site’s own name for this hexagram, not a classical name. Its meaning and casting basis are below.` : fixedEn(detail);
}

/** 「山水蒙」→ "Youthful Folly (Mountain over Water)" when the King Wen number is known from the same view. */
const HEX_NUMBER_BY_NAME = new Map<string, number>();
function hexNameEn(name: string) {
  const n = HEX_NUMBER_BY_NAME.get(name);
  const image = enHexagramImage(name);
  if (n && HEXAGRAM_EN[n]) return image ? `${HEXAGRAM_EN[n]} (${image})` : HEXAGRAM_EN[n];
  return image ?? name;
}

function kingWenOf(line: string) {
  const m = /^(.+)・第 (\d+) 卦・動爻第 (\d+) 爻$/.exec(line);
  if (!m) return null;
  HEX_NUMBER_BY_NAME.set(m[1], Number(m[2]));
  return Number(m[2]);
}

function lineEn(line: string) {
  const m = /^(.+)・第 (\d+) 卦・動爻第 (\d+) 爻$/.exec(line);
  if (!m) return line;
  const n = Number(m[2]);
  const image = enHexagramImage(m[1]);
  return `Hexagram ${n}${HEXAGRAM_EN[n] ? ` · ${HEXAGRAM_EN[n]}` : ''}${image ? ` (${image})` : ''} · moving line ${m[3]}`;
}

function basisEn(basis: string) {
  const m = /^起卦依據：梅花易數生辰起卦，生日 (\d{4}-\d{2}-\d{2})、時辰數 (\d+)。同一生辰永遠同一卦，可回查驗算。$/.exec(basis);
  if (m) return `Casting basis: Plum Blossom (Mei Hua Yi Shu) birth-time casting, birth date ${m[1]}, hour number ${m[2]}. The same birth data always gives the same hexagram, so it can be re-checked.`;
  const g = /^起卦依據：(.+)（同一輸入永遠同一卦，可回查驗算）。$/.exec(basis);
  return g ? `Casting basis: ${g[1]} (the same input always gives the same hexagram, so it can be re-checked).` : basis;
}

function personEn(person: MatchThreeCorePerson): MatchThreeCorePerson {
  const kingWen = person.hexagram ? kingWenOf(person.hexagram.line) : null;
  const steps = person.steps.map((step) => {
    const value = step.order === 1 ? pillarsEn(step.value) : step.order === 2 ? ziweiValueEn(step.value) : enPatternName(fixedEn(step.value));
    const detail = step.order === 2 ? ziweiDetailEn(step.detail) : step.order === 3 ? hexDetailEn(step.detail) : fixedEn(step.detail);
    // title keeps its literal union type in the engine; the English copy is display-only.
    return { ...step, title: fixedEn(step.title) as typeof step.title, value, detail };
  });
  const teaserPrefix = `${person.name}：`;
  const teaserBody = person.teaser.startsWith(teaserPrefix) ? person.teaser.slice(teaserPrefix.length) : null;
  const teaser = teaserBody === null ? person.teaser : teaserBody === '補上出生時辰才起卦' ? `${person.name}: add a birth time to cast a hexagram` : `${person.name}: ${enPatternName(teaserBody)}`;
  return {
    ...person,
    steps,
    hexagram: person.hexagram && {
      ...person.hexagram,
      patternName: enPatternName(person.hexagram.patternName),
      line: lineEn(person.hexagram.line),
      essence: enHexagramEssence(person.hexagram.essence, kingWen),
      advice: enHexagramAdvice(person.hexagram.advice, kingWen),
      basis: basisEn(person.hexagram.basis),
    },
    teaser,
  };
}

function pairNoteEn(note: string, people: MatchThreeCorePerson[]) {
  const tail = '雙人合卦目前沒有能查證出處的起卦規則，所以不把兩個卦硬合成一個結論；卦是給自己看的一面鏡子，不是對這段關係的預測。';
  if (!note.endsWith(tail)) return note;
  const lead = note.slice(0, -tail.length);
  const one = people.find((p) => lead === `這次只有${p.name}起了卦；另一位補上出生時辰後，才會依自己的生辰起卦。`);
  const leadEn = one ? `Only ${one.name} has a hexagram this time; the other person needs to add a birth time to cast one from their own birth data.` : fixedEn(lead);
  return leadEn === lead ? note : `${leadEn} ${fixedEn(tail)}`;
}

export function renderThreeCoreEnglish(view: MatchThreeCoreView): MatchThreeCoreView {
  const people = view.people.map(personEn) as MatchThreeCoreView['people'];
  return {
    ...view,
    orderNote: fixedEn(view.orderNote),
    people,
    pairNote: pairNoteEn(view.pairNote, view.people),
    sourceChecks: view.sourceChecks.map(fixedEn),
  };
}
