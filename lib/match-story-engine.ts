/**
 * 靈魂配對：老師格局、鬼魅遊戲劇情、結尾行動（後端組句，前端只照印）
 * ============================================================================
 *
 * 2026-09-17 米其林審查：這些句子原本寫在 app/match/page.tsx 裡，由前端依分數挑場景、
 * 挑最弱指標、決定格局名——等於前端自己編結論。現在全部搬到這裡，由 /api/match-generate
 * 算好放進 story 送出；同一份資料永遠同一份劇情。守門：npm run test:soul-match
 */
import type { MatchFiveElementKey, MatchFiveElementResult } from './match-five-element-engine';

export type MatchStoryScores = {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  zones: { resonance: string[]; complement: string[]; grinding: string[]; conflict: string[] };
};

export type MatchStoryInput = {
  nameA: string;
  nameB: string;
  result: MatchStoryScores;
  fiveElementMatch: MatchFiveElementResult;
  /** 八字合盤的場景鍵（兩人年月日柱）；有就用它決定劇情，沒有就用分數。 */
  sceneKey?: string | null;
  hasBaziFoundation: boolean;
};

export type MatchStoryTone = 'violet' | 'rose' | 'fuchsia' | 'amber' | 'cyan' | 'slate';

export type MatchStory = {
  version: 'match_story_v1';
  pairStructure: { title: string; copy: string; ghostCopy: string };
  ghostDetail: string;
  mystery: {
    aIdentity: string;
    bIdentity: string;
    realmTitle: string;
    basisBadge: string;
    opening: string;
    soulEcho: { label: string; copy: string; tone: MatchStoryTone };
    acts: Array<{ title: string; copy: string; tone: MatchStoryTone }>;
  };
  closingAction: { title: string; element: MatchFiveElementKey; copy: string; why: string };
};

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStable<T>(items: T[], seed: number, salt = 0) {
  return items[(seed + salt) % items.length];
}

/** 遊戲裡只用名字後兩個字，避免全名出現在劇情裡。 */
function maskGameName(name?: string | null) {
  const trimmed = name?.trim() ?? '';
  return trimmed.length >= 2 ? trimmed.slice(-2) : trimmed || '旅人';
}

const REALM_BY_ELEMENT: Record<MatchFiveElementKey, { title: string; location: string; omen: string; exit: string; events: string[] }> = {
  water: { title: '沉水回聲館', location: '雨聲貼著玻璃、地面倒映著不存在腳步的長廊', omen: '每一次沒說出口的委屈，都會化成牆上的水痕往下蔓延', exit: '先接住情緒，再談答案', events: ['積水裡先映出一扇沒有開過的門，下一秒才傳來敲門聲。', '走廊盡頭的水痕逆流而上，停在兩人一直避開的那句話前。', '玻璃上的霧氣浮出兩個名字，又被一陣冷風抹去。'] },
  fire: { title: '燼火密室', location: '燈火忽明忽暗、影子在牆面延遲半拍的密室', omen: '每一次急著證明自己，都會讓出口的火光再縮小一圈', exit: '先放低音量，再保留彼此的餘地', events: ['蠟燭同時熄滅，牆上的影子卻還停在原地。', '門把燙得不能碰，只有把話說慢，火光才會退回燈芯。', '天花板落下一點灰燼，在地面拼出尚未說出口的問題。'] },
  air: { title: '無聲風廊', location: '風從空門穿過、卻只帶回斷裂耳語的長廊', omen: '每一次猜測都會把耳語吹得更遠，直到兩人聽不見彼此', exit: '把真正的意思說清楚，再等待回應', events: ['沒有開的門後傳來兩人的聲音，卻把每一句話都說反了。', '風鈴無人碰觸卻響了三次，最後一次剛好停在沉默處。', '走廊裡的紙片被風吹起，拼成一封沒寄出的回覆。'] },
  earth: { title: '封印地窖', location: '門縫滲出冷光、地面留著兩串忽近忽遠足跡的地窖', omen: '每一次逃開承諾，地窖的封印就會再往下沉一寸', exit: '把承諾說成能做到的一件事', events: ['地面傳來第二組腳步聲，停在兩人中間卻看不見任何人。', '石壁裂開一道縫，裡面傳來重複的承諾，直到有人說出能做到的那一句。', '封印上的灰塵自行落下，露出一條只容兩人並肩走過的路。'] },
  space: { title: '空域觀測塔', location: '鏡面映出兩個方向不同身影、回音比腳步更早抵達的觀測塔', omen: '每一次沉默都會讓鏡裡的距離拉長，直到彼此只剩輪廓', exit: '在沉默變成距離前，先伸手確認彼此', events: ['鏡裡多出第三道背影，轉身時卻只剩兩人的倒影。', '塔頂的星圖忽然熄掉一角，只有兩人同時靠近才重新亮起。', '空白的牆面傳來低語，像有人把未寄出的心事念了一遍。'] },
};

const PAIR_STRUCTURE: Record<MatchFiveElementResult['relationMode'], { title: string; copy: (shared: string, pair: string) => string }> = {
  generating: { title: '相生共建格局', copy: (shared, pair) => `兩人最需要補的元素相生（${pair}）；先一起把${shared}補起來，會比各補各的更順手。` },
  conflicting: { title: '輪流補強格局', copy: (shared, pair) => `兩人最需要補的元素相剋（${pair}），這是補的先後，不代表感情一定有摩擦；先一起補好${shared}，再輪流照顧各自最缺的。` },
  balancing: { title: '同頻補強格局', copy: (shared) => `兩人最需要補的都是${shared}；一起做同一件事，彼此最容易感受到變化。` },
};

export function buildMatchStory(input: MatchStoryInput): MatchStory {
  const { result, fiveElementMatch } = input;
  const aName = maskGameName(input.nameA);
  const bName = maskGameName(input.nameB);
  const sharedElement = fiveElementMatch.sharedElement;
  const sharedGuide = fiveElementMatch.elementGuide[sharedElement];
  const seed = stableHash(input.sceneKey ?? [aName, bName, result.match_score, result.resonance, result.communication, result.stability, result.conflict_risk].join('|'));
  const weakest = [
    ['共鳴感', result.resonance],
    ['溝通感', result.communication],
    ['穩定度', result.stability],
    ['衝突風險', 100 - result.conflict_risk],
  ].sort((a, b) => Number(a[1]) - Number(b[1]))[0][0] as string;

  const structure = PAIR_STRUCTURE[fiveElementMatch.relationMode];
  const structureCopy = structure.copy(sharedGuide.label, fiveElementMatch.relationPair);

  const realm = REALM_BY_ELEMENT[sharedElement];
  const paranormalEvent = pickStable(realm.events, seed + 17);
  const resonanceScene = pickStable([
    '燈沒有熄滅，卻只照出你們彼此靠近時才會出現的影子。',
    '門後傳來兩次相同的敲擊聲；不是催促，而是提醒你們有一段話尚未說完。',
    '鏡面映出兩個方向不同的身影，但只要願意停下來聽，回音會慢慢重合。',
  ], seed);
  const friction = result.zones.conflict[seed % Math.max(1, result.zones.conflict.length)] ?? result.zones.grinding[0] ?? '把真正的感受說清楚';
  const pairTrigger = result.communication < 65
    ? `在遊戲裡，${aName}停下回應時，${bName}身後的影子就會先往前一步；直到兩人把真正的意思說出來，影子才退回原位。`
    : result.conflict_risk >= 55
      ? `在遊戲裡，只要${aName}與${bName}同時想證明自己是對的，兩人中間的燈光就會瞬間熄滅，只留下門後逐漸靠近的回音。`
      : `在遊戲裡，${aName}與${bName}靠近時，鏡面才會出現完整倒影；只要其中一人退開，倒影就會多出一道陌生輪廓。`;
  const ending = result.communication < 65
    ? '當警報停下，唯一的出口是：先聽完彼此的感受，再決定答案。'
    : '當最後一盞燈亮起，唯一的出口是：把在意說出口，別讓沉默替你們下結論。';
  const soulEcho: MatchStory['mystery']['soulEcho'] = result.resonance >= 75 && result.communication >= 65
    ? { label: '回音明顯', copy: `${aName}與${bName}的共鳴與溝通分數都偏高，容易在相處後留下牽掛；這代表比較容易想起彼此，不等於能讀到對方當下正在想什麼。`, tone: 'cyan' }
    : result.resonance >= 60
      ? { label: '回音存在', copy: `${aName}與${bName}之間有牽掛的訊號，但容易被忙碌、沉默或猜測蓋住。想確認彼此是否在意，最可靠的方式仍是主動而清楚的聯絡。`, tone: 'violet' }
      : { label: '回音微弱', copy: '目前這組分數的回音較淡，不能從分數推定誰一定在想誰。先用一次真誠、無壓力的聯絡，讓關係有重新被聽見的機會。', tone: 'slate' };

  return {
    version: 'match_story_v1',
    pairStructure: {
      title: structure.title,
      copy: structureCopy,
      ghostCopy: `鬼魅將它標記為「${structure.title}」：${structureCopy}`,
    },
    ghostDetail: result.communication < 65
      ? '鬼魅的低語：沉默正在替你們把門鎖上。先有人伸手，封印才會開始鬆動。'
      : '鬼魅的低語：你們已經聽見彼此的回音；別讓它停在門後，留下可以一起解開的封印。',
    mystery: {
      aIdentity: aName,
      bIdentity: bName,
      realmTitle: realm.title,
      basisBadge: input.hasBaziFoundation ? '依八字合盤選場景' : '虛構遊戲情境',
      opening: `${aName}與${bName}，本局進入「${realm.title}」：${realm.location}。${input.hasBaziFoundation ? '場景依兩人的八字共同補強元素選出；以下是虛構的遊戲劇情。' : '場景依兩人的配對資料選出；以下是虛構的遊戲劇情。'}`,
      soulEcho,
      acts: [
        { title: '第一幕・靈異磁場啟動', copy: `${resonanceScene}接著，${paranormalEvent}${pairTrigger}`, tone: 'violet' },
        { title: '第二幕・情感壓力逼近', copy: `${realm.omen}。門外的聲音越來越近，門卻始終沒有被打開。遊戲把兩人分數最低的「${weakest}」放在門後：${friction}。越假裝沒事，封印就越緊。`, tone: 'rose' },
        { title: '第三幕・鬼魅低語回應', copy: `${aName}與${bName}，門後的回音不替你們下結論；它只把你們可能正在避開的線索說回來：${friction}。先有人回應，這道門才會開始鬆動。`, tone: 'fuchsia' },
        { title: '第四幕・神祕封印出口', copy: `${ending}本局的出口是「${realm.exit}」。拿到下方的五元素封印寶珠、解除結界，象徵兩人願意一起練習${sharedGuide.label}這一課。`, tone: 'amber' },
      ],
    },
    closingAction: {
      title: '這週可以一起做的一件事',
      element: sharedElement,
      copy: sharedGuide.action,
      why: `兩人共同先補${sharedGuide.label}（${sharedGuide.title}）。${fiveElementMatch.sharedReason}`,
    },
  };
}
