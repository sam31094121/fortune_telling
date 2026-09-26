/**
 * English rendering of lib/match-five-element-engine.ts output.
 * Rebuilds every sentence from the engine's structured values (element keys, need scores,
 * need order, names, relation mode, orbit). Numbers and element choices are never recomputed.
 */
import type { MatchElementGuide, MatchFiveElementKey, MatchFiveElementPersonResult, MatchFiveElementResult } from '../match-five-element-engine';
import { EN_ELEMENT_LABEL, EN_ELEMENT_SHORT, EN_ELEMENT_TRADITIONAL, enWithTraditional } from './terms';
import { resultEnglishCopy } from '../result-english-copy';

type K = MatchFiveElementKey;

export const EN_CHANGE_TARGET: Record<K, string> = {
  earth: 'stability, commitment and a sense of security in the relationship',
  water: 'gentle communication, emotional understanding and seeing things from the other side',
  fire: 'speaking up first, warm interaction and moving the relationship forward',
  air: 'growing together, shared daily rhythm and planning for the future',
  space: 'healthy boundaries, mutual respect and clear decisions',
};

export const EN_ELEMENT_GUIDE_COPY: Record<K, Omit<MatchElementGuide, 'label' | 'short' | 'traditional'>> = {
  space: {
    title: 'Boundaries, perspective and distance',
    story: 'The Space element is the breathing room between two people. It gives the relationship a sense of the bigger picture and shows where to come close and where to hold back.',
    benefit: 'With more Space, it is easier to respect each other, and care is less likely to turn into pressure or guessing.',
    friction: 'When Space is lacking, people may cling too tightly, overthink, or one person suddenly withdraws and leaves the other uneasy.',
    action: 'Agree on how much time together, time alone and reassurance each of you needs, and each give one clear answer.',
  },
  air: {
    title: 'Communication, understanding and shifting perspective',
    story: 'The Air element is signals and language: whether each person can turn the picture in their head into words the other can understand.',
    benefit: 'With more Air, misunderstandings are easier to talk through and interactions feel lighter and clearer.',
    friction: 'When Air is lacking, words get stuck; when Air is chaotic, you can talk a lot without really getting closer.',
    action: 'Whenever there is friction, start with one key sentence: what I care about, and how I hope you will respond.',
  },
  water: {
    title: 'Emotion, empathy and repair',
    story: 'The Water element is the flow of feelings. It moves the relationship past arguing about who is right, toward hearing where each person is really hurt.',
    benefit: 'With more Water, it is easier to show vulnerability and to comfort and repair.',
    friction: 'When Water is lacking, people go cold; when Water is muddy, small feelings pile up into big grievances.',
    action: 'Hold the feeling first, then talk solutions: “I know this is hard for you. Let’s look at the next step together.”',
  },
  fire: {
    title: 'Warmth, initiative and momentum',
    story: 'The Fire element is attraction and drive. It brings open expression, passion and the courage to move forward.',
    benefit: 'With more Fire, you stop just waiting and start creating moments of closeness.',
    friction: 'When Fire is lacking, the relationship cools; when Fire is rushed, one person charges ahead while the other pulls back, and arguments start.',
    action: 'Add Fire through small actions: invite first, compliment first, confirm the next time you will meet.',
  },
  earth: {
    title: 'Stability, commitment and follow-through',
    story: 'The Earth element is the foundation of the relationship. It turns feelings into a reliable daily life, so promises are more than words.',
    benefit: 'With more Earth, there is more security and future plans are easier to carry out.',
    friction: 'When Earth is lacking, people feel uneasy, procrastinate and hold back from commitment; when Earth is too heavy, they become stubborn and controlling.',
    action: 'Make promises small and concrete: a regular check-in, a regular date, one shared task you always finish.',
  },
};

export const EN_FIVE_ELEMENT_BASIS_NOTE = 'The Five Phases reinforcement direction is calculated from each person’s BaZi element balance and useful and favourable elements (yong shen and xi shen). It is a reference for how to get along, not a prediction of how the relationship will turn out.';

/** Element guide copy: the shared dictionary's wording first (lib/result-english-copy.ts, read-only), this file's copy as fallback. */
export function guideCopyEn(k: K, original: MatchElementGuide) {
  const own = EN_ELEMENT_GUIDE_COPY[k];
  const pick = (zh: string, fallback: string) => resultEnglishCopy[zh] ?? fallback;
  return {
    title: pick(original.title, own.title),
    story: pick(original.story, own.story),
    benefit: pick(original.benefit, own.benefit),
    friction: pick(original.friction, own.friction),
    action: pick(original.action, own.action),
  };
}

/** Generating/controlling successor tables read back from the engine's own orbit cycles. */
function tablesOf(result: MatchFiveElementResult) {
  const gen = {} as Record<K, K>;
  const con = {} as Record<K, K>;
  const g = result.orbit.generatingCycle;
  const c = result.orbit.controllingCycle;
  for (let i = 0; i < g.length - 1; i += 1) gen[g[i]] = g[i + 1];
  for (let i = 0; i < c.length - 1; i += 1) con[c[i]] = c[i + 1];
  return { gen, con };
}

export function enRelationPair(result: MatchFiveElementResult) {
  const a = result.personA.primaryElement;
  const b = result.personB.primaryElement;
  const { gen, con } = tablesOf(result);
  const S = EN_ELEMENT_SHORT;
  if (a === b) return `Both need ${S[a]}`;
  if (gen[a] === b) return `${S[a]} generates ${S[b]}`;
  if (gen[b] === a) return `${S[b]} generates ${S[a]}`;
  if (con[a] === b) return `${S[a]} controls ${S[b]}`;
  return `${S[b]} controls ${S[a]}`;
}

const EN_RELATION_COPY: Record<MatchFiveElementResult['relationMode'], (pair: string, shared: string) => { title: string; story: string; focus: string }> = {
  generating: (pair, shared) => ({
    title: 'Priorities that generate each other',
    story: `The elements you each need most generate each other in the Five Phases (${pair}): when one person is reinforced, it becomes easier for the other to move too.`,
    focus: `First reinforce the ${shared} together, then each work on your own second priority.`,
  }),
  conflicting: (pair, shared) => ({
    title: 'Priorities that control each other',
    story: `The elements you each need most control each other in the Five Phases (${pair}). This is about the order of reinforcement, not a sign that the relationship must have friction: take turns, and don’t let one person’s way of reinforcing override the other’s.`,
    focus: `First reinforce the ${shared} together, then take turns looking after what each of you needs most.`,
  }),
  balancing: (pair, shared) => ({
    title: 'The same priority',
    story: `You both need the same element most (${pair}): doing the same thing together is where you will each feel the change most easily.`,
    focus: `Make the ${shared} a shared practice for both of you.`,
  }),
};

function enPersonReason(person: MatchFiveElementPersonResult) {
  return `Based on ${person.name}’s BaZi element balance and useful/favourable elements: the greatest need right now is the ${EN_ELEMENT_LABEL[person.primaryElement]}, followed by the ${EN_ELEMENT_LABEL[person.secondaryElement]}.`;
}

function enSharedReason(result: MatchFiveElementResult, pair: string) {
  const { personA, personB, sharedElement } = result;
  const label = EN_ELEMENT_LABEL[sharedElement];
  if (personA.primaryElement === personB.primaryElement) return `You both need the ${label} most, so you start by reinforcing the ${label} together.`;
  if (result.relationMode === 'generating') {
    const owner = sharedElement === personA.primaryElement ? personA : personB;
    const other = owner === personA ? personB : personA;
    if (owner.needScores[sharedElement] !== other.needScores[other.primaryElement]) {
      return `The elements you each need most generate each other (${pair}), so you start with the one with the higher need score: the ${label} (${owner.name} ${owner.needScores[sharedElement]}).`;
    }
    return `The elements you each need most generate each other (${pair}) and have equal need scores. The ${label} ranks #1 for ${owner.name} and #${other.needOrder.indexOf(sharedElement) + 1} for ${other.name}, the highest combined, so you reinforce the ${label} together first.`;
  }
  return `The elements you each need most control each other, so the combined need of both people decides: the highest is the ${label}.`;
}

/** Returns a copy of the engine result with every display string in English. Keys, scores and orbit data are untouched. */
export function renderFiveElementMatchEnglish(result: MatchFiveElementResult): MatchFiveElementResult {
  const pair = enRelationPair(result);
  const sharedLabel = EN_ELEMENT_LABEL[result.sharedElement];
  const copy = EN_RELATION_COPY[result.relationMode](pair, sharedLabel);
  const personA = { ...result.personA, reason: enPersonReason(result.personA), changeTarget: `When reinforcing, start with ${EN_CHANGE_TARGET[result.personA.primaryElement]}.` };
  const personB = { ...result.personB, reason: enPersonReason(result.personB), changeTarget: `When reinforcing, start with ${EN_CHANGE_TARGET[result.personB.primaryElement]}.` };
  const sharedAction = `Shared first priority for both of you: the ${sharedLabel}. Start with ${EN_CHANGE_TARGET[result.sharedElement]}.`;
  const summary = `${personA.name} most needs the ${EN_ELEMENT_LABEL[personA.primaryElement]}; ${personB.name} most needs the ${EN_ELEMENT_LABEL[personB.primaryElement]}. ${sharedAction}`;
  const s = result.orbit.shared;
  const sh = EN_ELEMENT_SHORT[result.sharedElement];
  const keys: K[] = ['space', 'air', 'water', 'fire', 'earth'];
  return {
    ...result,
    summary,
    relationPair: pair,
    relationTitle: copy.title,
    relationStory: copy.story,
    relationFocus: copy.focus,
    sharedReason: enSharedReason(result, pair),
    sharedAction,
    relationReason: `The elements you each need most stand in this Five Phases relationship: “${pair}”.`,
    personA,
    personB,
    integratedAdvice: `${summary} ${EN_FIVE_ELEMENT_BASIS_NOTE}`,
    inlineHighlights: [personA.reason, personB.reason, sharedAction, copy.story],
    orbit: {
      ...result.orbit,
      cycleNote: `Classic Five Phases cycle: ${enWithTraditional(s.generatedBy)} generates ${sh}, and ${sh} generates ${enWithTraditional(s.generates)}; ${enWithTraditional(s.controlledBy)} controls ${sh}, and ${sh} controls ${enWithTraditional(s.controls)}. This is a map of how the elements relate, not something happening between the two of you.`,
      mappingNote: `The site’s five elements map onto the classic Five Phases: ${keys.map((k) => `${EN_ELEMENT_SHORT[k]} = ${EN_ELEMENT_TRADITIONAL[k]}`).join(', ')}.`,
    },
    elementGuide: Object.fromEntries(
      (Object.keys(result.elementGuide) as K[]).map((k) => [k, { label: EN_ELEMENT_LABEL[k], short: EN_ELEMENT_SHORT[k], traditional: EN_ELEMENT_TRADITIONAL[k], ...guideCopyEn(k, result.elementGuide[k]) }]),
    ) as Record<K, MatchElementGuide>,
    basisNote: EN_FIVE_ELEMENT_BASIS_NOTE,
  };
}
