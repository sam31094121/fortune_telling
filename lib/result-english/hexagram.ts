/**
 * English display copy for the I Ching layer used on /match (three-core panel).
 * Source strings: data/iching-hexagrams.json (essence/advice by King Wen number),
 * lib/iching-engine.ts (trigram attribute/action, advice suffix) and
 * lib/iching-psychology.ts patternNameOf() (site pattern names = outer word + inner word + 格).
 * Display only: nothing here is used to cast or choose a hexagram.
 */

/** Trigram name → English image (乾 Heaven … 坤 Earth). Also keyed by the nature character. */
export const TRIGRAM_EN: Record<string, string> = {
  乾: 'Heaven', 兌: 'Lake', 離: 'Fire', 震: 'Thunder', 巽: 'Wind', 坎: 'Water', 艮: 'Mountain', 坤: 'Earth',
  天: 'Heaven', 澤: 'Lake', 火: 'Fire', 雷: 'Thunder', 風: 'Wind', 水: 'Water', 山: 'Mountain', 地: 'Earth',
};

/** Trigram action phrases from lib/iching-engine.ts TRIGRAMS[].action. */
export const TRIGRAM_ACTION_EN: Record<string, string> = {
  '主動開局、承擔決定': 'taking the lead and owning the decision',
  '開口對話、以和為進': 'opening a conversation and moving forward through harmony',
  '把事情攤在檯面上看清楚': 'putting things on the table where they can be seen clearly',
  '立即行動、先動再修': 'acting now and adjusting along the way',
  '循序滲透、以柔化阻': 'working in gradually and softening resistance gently',
  '審慎渡險、以智取不以力取': 'crossing danger carefully, using wisdom rather than force',
  '先停、劃界線、守住不該動的': 'pausing first, drawing boundaries and protecting what should not move',
  '順勢承接、先養底盤': 'going with the flow, receiving and building a firm base first',
};

/** Trigram attributes (used only in the engine's fallback essence 「A與B交會」). */
export const TRIGRAM_ATTRIBUTE_EN: Record<string, string> = {
  剛健創始: 'strong creative force', 喜悅溝通: 'joyful communication', 光明顯現: 'clarity coming to light', 行動驚起: 'sudden action',
  柔入滲透: 'gentle penetration', 險中藏智: 'wisdom hidden in danger', 知止有定: 'knowing when to stop', 厚德承載: 'generous support',
};

/** Site pattern names: outer word from the upper trigram, inner word from the lower trigram (iching-psychology.ts). */
export const PATTERN_OUTER_EN: Record<string, string> = {
  天啟: 'Heaven-Revealed', 澤鳴: 'Lake-Singing', 焰照: 'Flame-Lit', 雷引: 'Thunder-Led',
  風行: 'Wind-Borne', 淵藏: 'Deep-Hidden', 山鎮: 'Mountain-Anchored', 地承: 'Earth-Bearing',
};
export const PATTERN_INNER_EN: Record<string, string> = {
  御龍: 'Dragon Rider', 懷珠: 'Pearl Keeper', 抱火: 'Fire Holder', 蟄雷: 'Sleeping Thunder',
  納風: 'Wind Gatherer', 守泉: 'Spring Keeper', 蘊玉: 'Hidden Jade', 載壤: 'Soil Bearer',
};

/** 「山鎮守泉格」→ "Mountain-Anchored Spring Keeper Pattern". Unknown names are returned unchanged. */
export function enPatternName(name: string) {
  const m = /^(.{2})(.{2})格$/.exec(name);
  if (!m || !PATTERN_OUTER_EN[m[1]] || !PATTERN_INNER_EN[m[2]]) return name;
  return `${PATTERN_OUTER_EN[m[1]]} ${PATTERN_INNER_EN[m[2]]} Pattern`;
}

/** 「山水蒙」→ "Mountain over Water"; 「乾為天」→ "Heaven doubled". */
export function enHexagramImage(name: string) {
  const doubled = /^(.)為(.)$/.exec(name);
  if (doubled && TRIGRAM_EN[doubled[1]]) return `${TRIGRAM_EN[doubled[1]]} doubled`;
  const upper = TRIGRAM_EN[name[0]];
  const lower = TRIGRAM_EN[name[1]];
  return upper && lower ? `${upper} over ${lower}` : null;
}

/** King Wen number → English essence (from data/iching-hexagrams.json `essence`). */
export const HEX_ESSENCE_EN: string[] = ['',
  /* 1 乾 */ 'Sublime success, furthering through perseverance: strong, balanced and upright, never ceasing to strengthen oneself',
  /* 2 坤 */ 'Great virtue carries all things: yielding and steady, it supports everything',
  /* 3 屯 */ 'All things are just being born: a hard beginning, a time to set up helpers rather than rush ahead',
  /* 4 蒙 */ 'Ignorance waiting to be awakened: it is not I who seek the young fool, the young fool seeks me',
  /* 5 需 */ 'Clouds rise up to heaven: wait for the right moment, and sincerity brings success',
  /* 6 訟 */ 'Strength above, danger below: the image of dispute, which ends badly if carried on too long',
  /* 7 師 */ 'Water within the earth: leading many through danger in the right way, with discipline',
  /* 8 比 */ 'Water and earth draw close: mutual support and harmony are the way to good fortune',
  /* 9 小畜 */ 'Dense clouds but no rain: a small store has been gathered, but strength is not yet enough',
  /* 10 履 */ 'Treading on the tiger’s tail without being bitten: move with respect and care, the soft treading on the strong',
  /* 11 泰 */ 'Heaven and earth unite and all things flow: the small departs, the great arrives, peace and success',
  /* 12 否 */ 'Heaven and earth do not meet: things are blocked, and petty forces gain ground',
  /* 13 同人 */ 'Heaven and fire share the same light: of one heart with others, it furthers one to cross the great water',
  /* 14 大有 */ 'Fire high in the heavens: great possession, following heaven’s will',
  /* 15 謙 */ 'A mountain within the earth: modesty honours and shines, humble yet not to be overstepped',
  /* 16 豫 */ 'Thunder bursts from the earth: moving in accord, joyful yet prepared',
  /* 17 隨 */ 'Thunder in the middle of the lake: move with the times and follow what is good',
  /* 18 蠱 */ 'Wind at the foot of the mountain: what is kept too long decays, so clear away old faults',
  /* 19 臨 */ 'Earth above the lake: the great approaching the small, with endless care to teach',
  /* 20 觀 */ 'Wind moves over the earth: observe the people, then teach; look first, then act',
  /* 21 噬嗑 */ 'Thunder and lightning together: bite through the obstacle and make the rules clear',
  /* 22 賁 */ 'Fire at the foot of the mountain: the beauty of adornment, yet substance outweighs form',
  /* 23 剝 */ 'The mountain rests on the earth: yin wears away yang, and it does not further one to go anywhere',
  /* 24 復 */ 'Thunder within the earth: one yang line returns, and the way comes back around',
  /* 25 無妄 */ 'Thunder rolls under heaven: all things free of falseness; gain comes without scheming for it',
  /* 26 大畜 */ 'Heaven within the mountain: great accumulation of virtue and work, strong and solid',
  /* 27 頤 */ 'Thunder at the foot of the mountain: watch how you nourish yourself, careful in words and moderate in eating',
  /* 28 大過 */ 'The lake floods the trees: the ridgepole sags, an extraordinary time',
  /* 29 坎 */ 'Water flows on and on: repeated danger, yet a sincere heart carries you through',
  /* 30 離 */ 'Brightness rises twice: cling to the light, gentle and centred',
  /* 31 咸 */ 'A lake on the mountain: two forces move each other, receiving others with an open heart',
  /* 32 恆 */ 'Thunder and wind work together: the way of lasting, standing firm without changing direction',
  /* 33 遯 */ 'A mountain under heaven: withdrawing without regret, retreating in good measure',
  /* 34 大壯 */ 'Thunder in the heavens: the great is strong, yet do not tread where propriety forbids',
  /* 35 晉 */ 'Light rises over the earth: the image of advancement, letting one’s own virtue shine',
  /* 36 明夷 */ 'Light sinks into the earth: brightness is wounded, so veil your light and stay clear inside',
  /* 37 家人 */ 'Wind comes out of fire: the way of the family, each in their proper place',
  /* 38 睽 */ 'Fire above, lake below: opposition and estrangement, seeking common ground within difference',
  /* 39 蹇 */ 'Water on the mountain: a hard road, so turn back to cultivate yourself',
  /* 40 解 */ 'Thunder and rain arrive: danger is released, faults are forgiven',
  /* 41 損 */ 'A lake at the foot of the mountain: decrease below to increase above, decrease with sincerity',
  /* 42 益 */ 'Wind and thunder strengthen each other: decrease above to increase below, bringing boundless joy',
  /* 43 夬 */ 'The lake rises to heaven: resolute yet harmonious, announced openly at the king’s court',
  /* 44 姤 */ 'Wind under heaven: an unexpected meeting; do not let it grow unchecked',
  /* 45 萃 */ 'The lake over the earth: the image of gathering, bringing people together in the right way',
  /* 46 升 */ 'Wood grows within the earth: rising gently in its time, building the great from the small',
  /* 47 困 */ 'A lake with no water: oppressed, yet not losing one’s way to success',
  /* 48 井 */ 'Water over wood: the well nourishes without end; the town may change, the well does not',
  /* 49 革 */ 'Fire in the lake: heaven and earth change and the seasons are completed; trust comes when the day is right',
  /* 50 鼎 */ 'Fire over wood: the image of renewal, setting things right and securing the mandate',
  /* 51 震 */ 'Thunder repeats and startles: fear leads to good fortune, followed by laughter',
  /* 52 艮 */ 'Mountains stand together: stop when it is time to stop, move when it is time to move',
  /* 53 漸 */ 'A tree on the mountain: gradual progress, like a bride’s well-ordered journey',
  /* 54 歸妹 */ 'Thunder over the lake: feelings stir within, but the position is not right',
  /* 55 豐 */ 'Thunder and lightning arrive together: the image of abundance, best at midday',
  /* 56 旅 */ 'Fire on the mountain: travelling far from home, gentle and centred among strangers',
  /* 57 巽 */ 'Wind follows wind: carry out instructions, the gentle yielding to the strong',
  /* 58 兌 */ 'Lakes resting on each other: friends learning together, joy that leads people',
  /* 59 渙 */ 'Wind moves over water: what is scattered will gather again, first dispersing, then uniting',
  /* 60 節 */ 'Water above the lake: limits create order, but harsh limits cannot last',
  /* 61 中孚 */ 'Wind over the lake: inner truth and sincerity, trust that reaches even the pigs and fishes',
  /* 62 小過 */ 'Thunder on the mountain: small matters may go beyond the norm, but not great ones',
  /* 63 既濟 */ 'Water over fire: completion has been reached; good fortune at first, disorder at the end',
  /* 64 未濟 */ 'Fire over water: not yet complete; carefully tell things apart and put each in its place',
];

/** King Wen number → English action advice (from data/iching-hexagrams.json `advice`). */
export const HEX_ADVICE_EN: string[] = ['',
  /* 1 */ 'Heaven moves with strength: take the initiative and hold the lead, but beware the arrogant dragon who goes too far',
  /* 2 */ 'The earth is receptive: receive first, then act; move with the larger trend, and not rushing ahead works in your favour',
  /* 3 */ 'A hard start is normal: put down roots, find helpers and do not rush to expand',
  /* 4 */ 'Admit what you do not know: ask for guidance and build a learning rhythm, and the fog will lift',
  /* 5 */ 'If the time is not yet right, build up your strength: waiting is not delay, it is preparation',
  /* 6 */ 'If you can settle, do not go to war: spend your energy solving the problem, not winning the argument',
  /* 7 */ 'Leading a team takes discipline: set the rules and roles first, then mobilise',
  /* 8 */ 'Choose the right allies and draw close sincerely: when the relationship comes first, things go smoothly',
  /* 9 */ 'A time of accumulation: build strength in small steps and avoid big moves right now',
  /* 10 */ 'You are on sensitive ground: keep good manners and a sense of measure, and care will see you through',
  /* 11 */ 'A time of flow: use the momentum to push exchange and cooperation, but stay alert even when things are calm',
  /* 12 */ 'Things are blocked: hold back your edge, protect your bottom line and wait for the turn instead of forcing it',
  /* 13 */ 'Find people on the same path: form alliances openly, and a shared heart can cross the great river',
  /* 14 */ 'A time of harvest: share generously and keep what you have steady, prosperous without pride',
  /* 15 */ 'The more capable you are, the lower your profile should be: modesty is what takes you furthest',
  /* 16 */ 'Move with the trend and prepare ahead: in the middle of joy, do not forget to stay alert',
  /* 17 */ 'Follow the right people and the times: let go of your own view and adjust your route as things change',
  /* 18 */ 'Problems build up over time: face long-standing faults directly and clean them up thoroughly',
  /* 19 */ 'Be there in person and lead the way: get close to people and events, and the opportunity grows',
  /* 20 */ 'See the whole picture before you move: this is a time to observe, not to commit or place bets',
  /* 21 */ 'If there is a hard bone, bite through it: deal with obstacles head-on and decide what must be decided',
  /* 22 */ 'Presentation is fine, but the content must be real: polish the surface without forgetting the root',
  /* 23 */ 'A time of stripping away: stop expanding, protect the core and wait for the next revival',
  /* 24 */ 'A turning point appears: start again in small ways and nurture that first spark of life',
  /* 25 */ 'Do your part without speculating: do what you should do steadily, and mishaps stay away',
  /* 26 */ 'Store up strength and talent in quantity: the deeper you build, the further you can go later',
  /* 27 */ 'Nourish your body and your words: mind what you say, look after your supplies, and care for yourself and others',
  /* 28 */ 'Extraordinary times call for extraordinary measures: dare to stand on your own, but do not overload yourself',
  /* 29 */ 'Sailing through danger: cross it with sincerity and wisdom, keep your faith and do not panic',
  /* 30 */ 'Move toward the light: bring things into the open and attach yourself to the right platform and people',
  /* 31 */ 'Respond to each other sincerely: open yourself first, and the relationship will resonate',
  /* 32 */ 'Persistence is what counts: once the direction is set, do not waver; results show over time',
  /* 33 */ 'Retreat when it is time to retreat: a graceful withdrawal preserves strength for the next round',
  /* 34 */ 'Your strength is at its peak: you can advance, but keep to the rules and do not overpower others',
  /* 35 */ 'A rising period: show what you can do openly and make sure you are seen',
  /* 36 */ 'The environment is against you: hide your edge, stay low-key and quietly protect your own light',
  /* 37 */ 'Put the inside in order first: when everyone is in their proper role and the home is steady, the work is steady too',
  /* 38 */ 'Differences are inevitable: seek the big common ground, allow small differences, and start by cooperating on small things',
  /* 39 */ 'The road ahead is hard: do not force it; turn back to work on yourself and look for help',
  /* 40 */ 'A time of release: cut through the tangle, let old scores go and travel light',
  /* 41 */ 'Give up first, gain later: cut what is unnecessary to make room for what matters most',
  /* 42 */ 'A time of increase: invest boldly in yourself and others, and move toward what is good when you see it',
  /* 43 */ 'Resolve it decisively: bring what must be settled into the open and decide it, but do not push the other side to ruin',
  /* 44 */ 'Unexpected meetings carry variables: opportunity and risk come together, so tell the real from the false early',
  /* 45 */ 'Gather resources and people’s hearts: before a big undertaking, bring everyone together and united',
  /* 46 */ 'Rise steadily: grow like a tree, one section at a time, without skipping steps',
  /* 47 */ 'A time of being stuck: talking more will not help; keep your resolve and do the one thing you can do',
  /* 48 */ 'Deepen the basics: dig your own well deeper, and when the source is alive, everyone can draw from it',
  /* 49 */ 'A time of change: when the moment is ripe, make a bold overhaul, but win people’s trust first',
  /* 50 */ 'Replace the old with the new: build a new structure and order, and put the right people in place',
  /* 51 */ 'Thunder strikes suddenly: steady your mind first, then turn the shock into alertness and action',
  /* 52 */ 'Stop when it is time to stop: hold your boundaries, and do not step in where it is not your move',
  /* 53 */ 'Slow is fast: move forward step by step, and do not force what cannot be hurried',
  /* 54 */ 'The relationship and the position may not match: be clear about where you stand before you commit',
  /* 55 */ 'A time of fullness: make the most of the midday light and act quickly, but guard against decline after the peak',
  /* 56 */ 'Playing away from home: stay modest and adapt quickly, and do not act big on someone else’s ground',
  /* 57 */ 'Work in gently: communicate again and again and enter with the flow, as wind finds its way through the smallest gap',
  /* 58 */ 'Communicate with joy: talk things through and win people over, and harmony brings prosperity',
  /* 59 */ 'When people drift apart: take the lead in breaking up the old setup and rebuilding a new shared understanding',
  /* 60 */ 'Moderation in measure: set rules and control the pace, but do not restrict yourself so hard that it chokes you',
  /* 61 */ 'Move others with sincerity: keep your word all the way, and even the hardest person will be moved',
  /* 62 */ 'Small stretches are fine, big moves are not: handle small matters with care and precision',
  /* 63 */ 'The thing has taken shape: finishing is not the end, and keeping it going needs more care than starting it',
  /* 64 */ 'Not there yet: the last mile is where things most easily capsize, so take extra care with the finish',
];

/** Engine advice 「{知識庫行動語}（動爻第N爻，落在下卦X，關鍵在{action}）。」 → English; unknown shapes are returned unchanged. */
export function enHexagramAdvice(advice: string, kingWen: number | null) {
  const m = /^(.*)（動爻第(\d)爻，落在(下卦|上卦)(.)，關鍵在(.+)）。$/.exec(advice);
  if (!m) return advice;
  const head = kingWen && HEX_ADVICE_EN[kingWen] ? HEX_ADVICE_EN[kingWen] : TRIGRAM_ACTION_EN[m[1]];
  const action = TRIGRAM_ACTION_EN[m[5]];
  const trigram = TRIGRAM_EN[m[4]];
  if (!head || !action || !trigram) return advice;
  const where = m[3] === '下卦' ? 'lower' : 'upper';
  return `${head} (moving line ${m[2]}, in the ${where} trigram ${trigram}; the key is ${action}).`;
}

/** Engine essence → English; the engine's fallback 「A與B交會」 is rebuilt from trigram attributes. */
export function enHexagramEssence(essence: string, kingWen: number | null) {
  if (kingWen && HEX_ESSENCE_EN[kingWen]) return HEX_ESSENCE_EN[kingWen];
  const m = /^(.+)與(.+)交會$/.exec(essence);
  if (m && TRIGRAM_ATTRIBUTE_EN[m[1]] && TRIGRAM_ATTRIBUTE_EN[m[2]]) return `Where ${TRIGRAM_ATTRIBUTE_EN[m[1]]} meets ${TRIGRAM_ATTRIBUTE_EN[m[2]]}`;
  return essence;
}
