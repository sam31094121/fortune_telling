/**
 * English rendering of lib/match-story-engine.ts output (teacher pattern, ghost game story, closing action).
 * Scene, event and echo choices are read back from what the engine already picked; nothing is re-seeded.
 */
import type { MatchFiveElementResult } from '../match-five-element-engine';
import type { MatchStory } from '../match-story-engine';
import { guideCopyEn, enRelationPair } from './five-element';
import { fixedEn } from './tables';
import { EN_ELEMENT_LABEL } from './terms';

type Realm = { title: string; location: string; omen: string; exit: string; events: Record<string, string> };
const REALM_EN: Record<string, Realm> = {
  沉水回聲館: { title: 'Hall of Sunken Echoes', location: 'a corridor where rain clings to the glass and the floor reflects footsteps that aren’t there', omen: 'Every grievance left unspoken becomes a water stain creeping down the wall', exit: 'Hold the feelings first, then talk about answers', events: {
    '積水裡先映出一扇沒有開過的門，下一秒才傳來敲門聲。': 'A door that has never opened appears in the standing water, and only a second later comes the knock.',
    '走廊盡頭的水痕逆流而上，停在兩人一直避開的那句話前。': 'At the end of the corridor the water stain flows upward and stops at the sentence you have both been avoiding.',
    '玻璃上的霧氣浮出兩個名字，又被一陣冷風抹去。': 'Two names surface in the mist on the glass, then a cold draught wipes them away.' } },
  燼火密室: { title: 'Chamber of Embers', location: 'a sealed room where the lamps flicker and shadows lag half a beat behind', omen: 'Every rush to prove yourself shrinks the light at the exit a little more', exit: 'Lower your voices first, and leave each other room', events: {
    '蠟燭同時熄滅，牆上的影子卻還停在原地。': 'Every candle goes out at once, yet the shadows on the wall stay where they were.',
    '門把燙得不能碰，只有把話說慢，火光才會退回燈芯。': 'The door handle is too hot to touch; only when you speak slowly does the flame retreat into the wick.',
    '天花板落下一點灰燼，在地面拼出尚未說出口的問題。': 'A little ash falls from the ceiling and spells out on the floor the question no one has asked.' } },
  無聲風廊: { title: 'Corridor of Silent Wind', location: 'a corridor where wind passes through empty doorways and brings back only broken whispers', omen: 'Every guess blows the whispers further away, until you can no longer hear each other', exit: 'Say what you really mean, then wait for the reply', events: {
    '沒有開的門後傳來兩人的聲音，卻把每一句話都說反了。': 'Behind a closed door come both your voices, but every sentence is said backwards.',
    '風鈴無人碰觸卻響了三次，最後一次剛好停在沉默處。': 'The wind chime rings three times untouched, the last time stopping exactly in a silence.',
    '走廊裡的紙片被風吹起，拼成一封沒寄出的回覆。': 'Scraps of paper lift in the wind and form a reply that was never sent.' } },
  封印地窖: { title: 'Sealed Cellar', location: 'a cellar where cold light seeps through the door and two sets of footprints drift closer and apart', omen: 'Every time a promise is avoided, the cellar’s seal sinks another inch', exit: 'Turn the promise into one thing you can actually do', events: {
    '地面傳來第二組腳步聲，停在兩人中間卻看不見任何人。': 'A second set of footsteps sounds on the floor and stops between you, yet no one is there.',
    '石壁裂開一道縫，裡面傳來重複的承諾，直到有人說出能做到的那一句。': 'The stone wall cracks open and a promise repeats inside, until someone says one they can keep.',
    '封印上的灰塵自行落下，露出一條只容兩人並肩走過的路。': 'Dust falls from the seal by itself, revealing a path just wide enough for two to walk side by side.' } },
  空域觀測塔: { title: 'Space Observatory Tower', location: 'an observatory where mirrors show two figures facing different ways and echoes arrive before footsteps', omen: 'Every silence stretches the distance in the mirror, until only outlines remain', exit: 'Before silence becomes distance, reach out and check in with each other', events: {
    '鏡裡多出第三道背影，轉身時卻只剩兩人的倒影。': 'A third figure appears in the mirror, but when you turn around there are only your two reflections.',
    '塔頂的星圖忽然熄掉一角，只有兩人同時靠近才重新亮起。': 'A corner of the star map at the top of the tower goes dark and lights up again only when you both step closer.',
    '空白的牆面傳來低語，像有人把未寄出的心事念了一遍。': 'A whisper comes from the blank wall, as if someone read aloud a feeling that was never sent.' } },
};
const RESONANCE_SCENE_EN: Record<string, string> = {
  '燈沒有熄滅，卻只照出你們彼此靠近時才會出現的影子。': 'The lamp stays lit, but it only shows the shadow that appears when you move toward each other.',
  '門後傳來兩次相同的敲擊聲；不是催促，而是提醒你們有一段話尚未說完。': 'Two identical knocks come from behind the door, not to hurry you but to remind you that something is still unsaid.',
  '鏡面映出兩個方向不同的身影，但只要願意停下來聽，回音會慢慢重合。': 'The mirror shows two figures facing different ways, but if you stop and listen, the echoes slowly overlap.',
};
const ENDING_EN: Record<string, string> = {
  '當警報停下，唯一的出口是：先聽完彼此的感受，再決定答案。': 'When the alarm stops, the only way out is to hear each other’s feelings through before deciding on an answer.',
  '當最後一盞燈亮起，唯一的出口是：把在意說出口，別讓沉默替你們下結論。': 'When the last lamp lights up, the only way out is to say what matters and not let silence decide for you.',
};
const WEAKEST_EN: Record<string, string> = { 共鳴感: 'Resonance', 溝通感: 'Communication', 穩定度: 'Stability', 衝突風險: 'Conflict risk' };

function pairTriggerEn(text: string, a: string, b: string) {
  if (text === `在遊戲裡，${a}停下回應時，${b}身後的影子就會先往前一步；直到兩人把真正的意思說出來，影子才退回原位。`) return `In the game, when ${a} stops responding, the shadow behind ${b} steps forward first; it only returns once you both say what you really mean.`;
  if (text === `在遊戲裡，只要${a}與${b}同時想證明自己是對的，兩人中間的燈光就會瞬間熄滅，只留下門後逐漸靠近的回音。`) return `In the game, whenever ${a} and ${b} both try to prove they are right, the light between them goes out at once, leaving only an echo drawing closer behind the door.`;
  if (text === `在遊戲裡，${a}與${b}靠近時，鏡面才會出現完整倒影；只要其中一人退開，倒影就會多出一道陌生輪廓。`) return `In the game, the mirror only shows a complete reflection when ${a} and ${b} move closer; if either steps back, a stranger’s outline appears in it.`;
  return null;
}

function startsWithKey(text: string, table: Record<string, string>) {
  return Object.keys(table).find((key) => text.startsWith(key));
}

function act1En(copy: string, realm: Realm | undefined, a: string, b: string) {
  const scene = startsWithKey(copy, RESONANCE_SCENE_EN);
  if (!scene || !realm) return copy;
  const rest = copy.slice(scene.length);
  if (!rest.startsWith('接著，')) return copy;
  const afterNext = rest.slice(3);
  const event = startsWithKey(afterNext, realm.events);
  if (!event) return copy;
  const trigger = pairTriggerEn(afterNext.slice(event.length), a, b);
  return trigger ? `${RESONANCE_SCENE_EN[scene]} Then ${realm.events[event].charAt(0).toLowerCase()}${realm.events[event].slice(1)} ${trigger}` : copy;
}

function act2En(copy: string, realm: Realm | undefined, zh: RealmZh | undefined) {
  if (!realm || !zh) return copy;
  const m = new RegExp(`^${esc(zh.omen)}。門外的聲音越來越近，門卻始終沒有被打開。遊戲把兩人分數最低的「(.+?)」放在門後：(.*)。越假裝沒事，封印就越緊。$`).exec(copy);
  if (!m) return copy;
  return `${realm.omen}. The voices outside draw closer, yet the door never opens. The game puts your lowest score, “${WEAKEST_EN[m[1]] ?? m[1]}”, behind the door: ${fixedEn(m[2])}. The more you pretend nothing is wrong, the tighter the seal.`;
}

function act3En(copy: string, a: string, b: string) {
  const m = new RegExp(`^${esc(a)}與${esc(b)}，門後的回音不替你們下結論；它只把你們可能正在避開的線索說回來：(.*)。先有人回應，這道門才會開始鬆動。$`).exec(copy);
  return m ? `${a} and ${b}, the echo behind the door does not decide for you; it only repeats the clue you may be avoiding: ${fixedEn(m[1])}. Only when someone answers will the door begin to loosen.` : copy;
}

function act4En(copy: string, realm: Realm | undefined, zh: RealmZh | undefined, sharedLabelEn: string) {
  const ending = startsWithKey(copy, ENDING_EN);
  if (!ending || !realm || !zh) return copy;
  const m = new RegExp(`^本局的出口是「${esc(zh.exit)}」。拿到下方的五元素封印寶珠、解除結界，象徵兩人願意一起練習(.+)這一課。$`).exec(copy.slice(ending.length));
  return m ? `${ENDING_EN[ending]} This round’s exit is “${realm.exit}”. Taking the sealed five-element orb below and breaking the barrier symbolises that you are both willing to practise the lesson of the ${sharedLabelEn} together.` : copy;
}

type RealmZh = { omen: string; exit: string };
/** Chinese omen/exit per realm title, needed to split act copy (kept in sync with REALM_BY_ELEMENT). */
const REALM_ZH: Record<string, RealmZh> = {
  沉水回聲館: { omen: '每一次沒說出口的委屈，都會化成牆上的水痕往下蔓延', exit: '先接住情緒，再談答案' },
  燼火密室: { omen: '每一次急著證明自己，都會讓出口的火光再縮小一圈', exit: '先放低音量，再保留彼此的餘地' },
  無聲風廊: { omen: '每一次猜測都會把耳語吹得更遠，直到兩人聽不見彼此', exit: '把真正的意思說清楚，再等待回應' },
  封印地窖: { omen: '每一次逃開承諾，地窖的封印就會再往下沉一寸', exit: '把承諾說成能做到的一件事' },
  空域觀測塔: { omen: '每一次沉默都會讓鏡裡的距離拉長，直到彼此只剩輪廓', exit: '在沉默變成距離前，先伸手確認彼此' },
};

function esc(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PAIR_STRUCTURE_EN: Record<MatchFiveElementResult['relationMode'], (shared: string, pair: string) => string> = {
  generating: (shared, pair) => `The elements you each need most generate each other (${pair}); reinforcing the ${shared} together first goes more smoothly than each working alone.`,
  conflicting: (shared, pair) => `The elements you each need most control each other (${pair}). This is about the order of reinforcement, not a sign of inevitable friction: reinforce the ${shared} together first, then take turns with what each of you needs most.`,
  balancing: (shared) => `You both need the ${shared} most; doing the same thing together is where you will each feel the change most easily.`,
};

/** English copy of the story. `fe` must be the ORIGINAL engine result (Chinese) so reasons can be re-rendered from its values. */
export function renderMatchStoryEnglish(story: MatchStory, fe: MatchFiveElementResult, sharedReasonEn: string): MatchStory {
  const a = story.mystery.aIdentity;
  const b = story.mystery.bIdentity;
  const shared = fe.sharedElement;
  const sharedLabel = EN_ELEMENT_LABEL[shared];
  const guide = guideCopyEn(shared, fe.elementGuide[shared]);
  const pair = enRelationPair(fe);
  const titleEn = fixedEn(story.pairStructure.title);
  const structureCopy = PAIR_STRUCTURE_EN[fe.relationMode](sharedLabel, pair);
  const realmZhTitle = story.mystery.realmTitle;
  const realm = REALM_EN[realmZhTitle];
  const realmZh = REALM_ZH[realmZhTitle];
  const basisBazi = story.mystery.basisBadge === '依八字合盤選場景';
  const openingZh = realm && new RegExp(`^${esc(a)}與${esc(b)}，本局進入「${esc(realmZhTitle)}」：`).test(story.mystery.opening);
  const echo = story.mystery.soulEcho;
  const echoCopy = echo.label === '回音明顯'
    ? `${a} and ${b} both score high on resonance and communication, so you tend to keep each other in mind after time together. That means you think of each other easily; it does not mean you can read what the other is thinking right now.`
    : echo.label === '回音存在'
      ? `There is a signal of care between ${a} and ${b}, but it is easily buried by busyness, silence or guessing. The most reliable way to know whether you matter to each other is still to reach out clearly.`
      : fixedEn(echo.copy);
  const [act1, act2, act3, act4] = story.mystery.acts;
  return {
    ...story,
    pairStructure: { title: titleEn, copy: structureCopy, ghostCopy: `The ghost marks it as “${titleEn}”: ${structureCopy}` },
    ghostDetail: fixedEn(story.ghostDetail),
    mystery: {
      ...story.mystery,
      realmTitle: realm?.title ?? realmZhTitle,
      basisBadge: fixedEn(story.mystery.basisBadge),
      opening: openingZh && realm
        ? `${a} and ${b}, this round you enter “${realm.title}”: ${realm.location}. ${basisBazi ? 'The scene was chosen from the element you both most need to reinforce in your BaZi charts; what follows is a fictional game story.' : 'The scene was chosen from your pairing data; what follows is a fictional game story.'}`
        : story.mystery.opening,
      soulEcho: { ...echo, label: fixedEn(echo.label), copy: echoCopy },
      acts: [
        act1 && { ...act1, title: fixedEn(act1.title), copy: act1En(act1.copy, realm, a, b) },
        act2 && { ...act2, title: fixedEn(act2.title), copy: act2En(act2.copy, realm, realmZh) },
        act3 && { ...act3, title: fixedEn(act3.title), copy: act3En(act3.copy, a, b) },
        act4 && { ...act4, title: fixedEn(act4.title), copy: act4En(act4.copy, realm, realmZh, sharedLabel) },
        ...story.mystery.acts.slice(4),
      ].filter(Boolean) as MatchStory['mystery']['acts'],
    },
    closingAction: {
      ...story.closingAction,
      title: fixedEn(story.closingAction.title),
      copy: guide.action,
      why: `Shared first priority for both of you: the ${sharedLabel} (${guide.title.toLowerCase()}). ${sharedReasonEn}`,
    },
  };
}
