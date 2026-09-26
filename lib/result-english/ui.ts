/**
 * English copy for fixed Chinese written directly in the /match results components
 * (app/match/page.tsx results section). Keys are the exact Chinese literals; anything not
 * listed falls back to the original text. Templates rebuild the few literals that wrap values.
 * Element words follow lib/result-english-copy.ts (Space / Air / Water / Fire / Earth).
 */
import { resultEnglishCopy } from '../result-english-copy';
import { enProductElement } from './terms';

export const RESULT_UI_EN: Record<string, string> = {
  // Teacher readings
  '兩人合盤・關係解讀': 'Combined charts · Relationship reading',
  '雙人封印檔案・鬼魅低語': 'Sealed records for two · Ghostly whispers',
  '解盤老師': 'Chart interpretation teacher',
  'Google 解盤老師': 'Google chart interpretation teacher',
  '鬼魅老師': 'Ghost storyteller',
  '兩人關係格局': 'Relationship pattern',
  '封印檔案・關係結界': 'Sealed records · Relationship barrier',
  '情感壓力': 'Emotional pressure',
  '鬼魅回應': 'Ghostly response',
  '神祕封印': 'Mysterious seal',
  '詭異磁場': 'Uncanny energy field',
  '封': 'Seal',
  '這段由 Google AI 依同一份配對資料改寫。': 'Google AI rewrote this section from the same relationship data.',
  '這段是依固定規則寫成的基礎解讀。': 'This is a basic interpretation based on fixed rules.',
  '鬼魅回應・封印低語': 'Ghostly response · Sealed whispers',
  // Beast cards
  '兩人八字・二十八宿神獸': 'BaZi for both · 28 Mansions star beasts',
  '同一份出生資料，會和八字頁的日柱神獸完全一致。': 'The same birth details always give the same Day Pillar beast as the BaZi page.',
  '第一位・我的八字神獸': 'Person 1 · My beast',
  '第二位・對方的八字神獸': 'Person 2 · Their beast',
  '先看本命神獸；神獸幼子需主動深入查看。': 'The natal beast is shown first; tap to look deeper at its young beast.',
  '配對順序：先各自定位神獸，再交叉解讀兩人的互動。': 'Pairing order: first place each person’s beast, then read how the two interact.',
  '八字配對神獸卡': 'BaZi pairing beast card',
  // Red Luan panel
  '先看可核對的八字年度訊號；出生時辰完整後，再展開紫微本命夫妻宮資料。不判定感情好壞，也不保證事件。':
    'Start with the BaZi annual signals that can be checked; once birth times are complete, the Zi Wei natal Spouse Palace details open up. This does not judge whether a relationship is good or bad, and it does not guarantee any event.',
  '資料可並列閱讀': 'Data available for side-by-side reading',
  '待補出生時辰': 'Birth time needed',
  '兩人都已排出': 'Both charts calculated',
  '需完整出生時辰': 'Full birth times needed',
  '時辰尚未提供，因此不以預設時辰排紫微。補上時辰後，才能解鎖本命夫妻宮與三方四正資料。':
    'No birth time was given, so no Zi Wei chart is calculated with a default time. Add the birth time to unlock the natal Spouse Palace and its three-direction, four-position details.',
  '無十四主星': 'no major star',
  // Shared element pearl
  '五元素封印寶珠・本局已解除': 'Five-element sealed orb · Released this round',
  '五元素封印寶珠・結界解除中': 'Five-element sealed orb · Barrier opening',
  '五顆封印寶珠・從這一顆開始解除': 'Five sealed orbs · Start by releasing this one',
  '這一顆是兩人目前共同要補的元素。兩位老師會先解讀原因，最後由你們一起拿到這顆五元素封印寶珠、解除結界並收下它。':
    'This orb is the element you both need to reinforce right now. The two teachers explain why first; then the two of you take this five-element sealed orb together, open the barrier and keep it.',
  '五元素共有五顆封印寶珠：空、風、水、火、地。本局只解除兩人共同先補的這一顆；其餘四顆保留封印作為對照。':
    'There are five sealed orbs, one for each element: Space, Air, Water, Fire and Earth. This round releases only the one you both reinforce first; the other four stay sealed for comparison.',
  '第一位先補': 'Person 1 reinforces first',
  '第二位先補': 'Person 2 reinforces first',
  '儀式完成・五元素封印寶珠已收下': 'Ritual complete · Five-element sealed orb collected',
  '五元素封印寶珠・靜止等待先行者': 'Five-element sealed orb · Waiting for someone to go first',
  '其餘四顆封印元素對照': 'The other four sealed elements, for comparison',
  '還原封印・再次進行完整儀式': 'Reseal · Run the full ritual again',
  '空元素': 'Space element', '風元素': 'Air element', '水元素': 'Water element', '火元素': 'Fire element', '地元素': 'Earth element',
  // Story card
  '鬼魅・神祕・靈異磁場遊戲': 'Ghostly · Mysterious · Supernatural field game',
  '鬼魅儀式・虛構遊戲劇情': 'Ghost ritual · Fictional game story',
  // Orbit
  '把兩人八字五行的補強需求換成五顆星：數字是兩人的平均補強值，越高越需要補。亮起的那顆是兩人共同先補的元素；點星可看它代表什麼、可以先做什麼。':
    'Both people’s BaZi Five Phases reinforcement needs become five stars. Each number is your average reinforcement value: the higher it is, the more it needs reinforcing. The lit star is the element you both reinforce first; tap a star to see what it means and what you can do first.',
  '共同先補元素的生剋對照': 'Generation and control of the shared priority element',
  '・共同先補': ' · Shared first priority',
  '一眼看懂': 'At a glance',
  /** Short form for the narrow orbit summary card (the dictionary's long label wraps mid-word at 390px). */
  '平均補強值（卡片）': 'Average need',
};

/** Pearl names and titles by element key (MATCH_PEARL_META in page.tsx). */
export const PEARL_NAME_EN: Record<string, string> = {
  space: 'Star-Abyss Space Orb', air: 'Azure Gale Orb', water: 'Tidal Echo Orb', fire: 'Ember-Star Karmic Fire Orb', earth: 'Earth-Vein Amber Orb',
};
export const PEARL_TITLE_EN: Record<string, string> = {
  space: 'Boundaries and perspective', air: 'Communication and understanding', water: 'Emotion and repair', fire: 'Warmth and momentum', earth: 'Stability and commitment',
};

/** Exact-literal lookup: this table, then the shared result dictionary, then the original text. */
export function resultUiEn(zh: string) {
  return RESULT_UI_EN[zh] ?? resultEnglishCopy[zh] ?? zh;
}

/** Templates for literals that wrap engine values. Inputs are already-English display values. */
export const RESULT_UI_TEMPLATES = {
  age: (age: number) => ` · age ${age}`,
  productElement: (element: string) => `${enProductElement(element)} element`,
  dayPillar: (pillar: string) => `Day Pillar ${pillar}`,
  culturalReference: (year: number | string) => `${year} cultural reference`,
  crossCheck: (status: string) => `Cross-check summary · ${resultUiEn(status)}`,
  annualLine: (completeness: string, year: number | string, branch: string) => `${completeness} · ${year} is a ${branch} year`,
  majorStars: (stars: string[]) => `Major stars: ${stars.join(', ') || 'no major star'}`,
  minorStars: (stars: string[]) => `Minor stars: ${stars.join(', ') || '—'}`,
  ritualOpening: (step: number) => `Unsealing ritual in progress · ${step}/4`,
  sealedElement: (element: string) => `${enProductElement(element)} element · sealed`,
  pickUpOrb: (name: string) => `${name} picks up the sealed orb`,
  released: (name: string, orb: string) => `${name} released the five-element sealed orb first · collected the ${orb}`,
  releasing: (name: string) => `${name} is opening the barrier · please wait twelve seconds`,
  realm: (title: string) => `This round’s stage · ${title}`,
  soulEcho: (label: string) => `Soul echo · ${label}`,
  redLine: (short: string) => `Red line = the link that controls ${short}`,
  goldLine: (short: string) => `Bright gold line = the link ${short} generates`,
  viewReading: (label: string) => `View the ${label} reading`,
  generatedBy: (short: string) => `Generates ${short}`,
  generates: (short: string) => `${short} generates`,
  controlledBy: (short: string) => `Controls ${short}`,
  controls: (short: string) => `${short} controls`,
  /** Star-button caption inside the 66–98px orbit circles: kept short so it fits. */
  starCaption: (isShared: boolean, isSelected: boolean) => (isShared ? 'Shared' : isSelected ? 'Reading' : 'Tap'),
  greatestNeed: (a: string, b: string) => `${a} · ${b}`,
} as const;

/** Labels for the shared StarBeastLineageReveal / ElementUnsealSoundToggle (optional props, Chinese defaults). */
export const STAR_BEAST_LABELS_EN = {
  adult: 'Natal beast',
  child: 'Young beast',
  showChild: 'Look deeper at the young beast',
  showAdult: 'Back to the natal beast',
  showChildAria: (name: string) => `Look deeper at ${name}’s young beast`,
  showAdultAria: (name: string) => `Back to ${name}’s natal beast`,
};
export const UNSEAL_SOUND_LABELS_EN = {
  soundOn: 'Unseal sound: on',
  soundOff: 'Unseal sound: off',
  turnOn: 'Turn on the unseal sound',
  turnOff: 'Turn off the unseal sound',
  volume: 'Volume: ',
  enhanced: 'Boosted',
  standard: 'Standard',
  enhance: 'Boost the unseal volume',
  restore: 'Restore standard unseal volume',
};
