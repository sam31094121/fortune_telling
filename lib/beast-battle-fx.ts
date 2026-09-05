/**
 * 神獸決鬥・戰鬥演出素材對照
 * ============================================================================
 *
 * 業主定調：「要更強烈的遊戲感儀式，可以去找現有的素材，把它組合起來。」
 * 以及「要讓客戶感覺兩隻（怪獸）真的在打架。」
 *
 * 所以這裡不做新素材，只把專案裡已經有的東西接起來：
 *
 *   public/audio/taiji/  太極第一層用的 CC0 音效（風雷水火地都有）
 *   public/audio/taiji/lightning-*.png  撞擊閃光圖
 *   六十張神獸的 thumbnail  卡片本人
 *
 * 五元素剛好對得上既有音效，不是硬湊：
 *   風 → 龍捲風／颱風        地 → 地裂
 *   水 → 潮湧                火 → 火焰劈啪／點燃
 *   空 → 乾雷／雷擊          （空屬金，雷從空中來）
 *
 * 【這支檔案不決定任何結果】
 *
 * 規格第十二條：動畫不得決定戰鬥結果。
 * 這裡只有「哪個元素配哪個聲音、配哪張圖」的對照表——
 * 播什麼、播多久，都不會改變任何一個數字。
 */

export type BattleElement = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';

/** 本體聲音由卡片身份決定，與元素、對手或勝負無關。 */
export function beastVoiceFor(cardId: string): string | null {
  const beast = /^beast_[ay](\d{2})$/.exec(cardId);
  const guardian = /^beast_g_(qinglong|zhuque|baihu|xuanwu)$/.test(cardId);
  if (!guardian && (!beast || Number(beast[1]) < 1 || Number(beast[1]) > 28)) return null;
  return `/audio/beast-voices/${cardId}.mp3`;
}

/** 對手動畫照常進行，但絕不播放對手本體叫聲。 */
export function playPlayerBeastVoice(
  play: (src: string, volume?: number, rate?: number) => void,
  side: 'player' | 'opponent',
  cardId: string,
): void {
  if (side !== 'player') return;
  const voice = beastVoiceFor(cardId);
  if (voice) play(voice, 0.55, 1);
}

function reportVoice(src: string, status: 'playing' | 'blocked' | 'stopped') {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('beast-voice-status', { detail: { src, status } }));
  }
}

export interface ElementFx {
  /** 出招音效。用既有的太極音效庫，不另外找。 */
  attack: string;
  /**
   * 三段式的猛烈音效：蓄力 → 撞擊 → 餘響。
   *
   * 一聲「碰」不夠猛。真正有份量的撞擊是三層疊起來的：
   * 衝過去的風聲、命中的實體撞擊、以及撞完之後的碎裂或悶響。
   * 三段各自對應元素的材質——風撞是木裂、地撞是碎石、空撞是金屬，
   * 這樣聽起來才「符合邏輯」，不是每個元素都同一聲。
   */
  charge: string;
  impact: string;
  tail: string;
  /** 卡片衝出去時的顏色（做拖影與閃光用）。 */
  glow: string;
  /** 元素的中文字，畫面上顯示用。 */
  label: string;
}

const AUDIO_BASE = '/audio/taiji';
/** 一百個 CC0 音效的包，本來就在專案裡沒被用到。材質音都從這裡拿。 */
const SFX = `${AUDIO_BASE}/cc0-sfx-100-v2`;

export const ELEMENT_FX: Record<BattleElement, ElementFx> = {
  // 風：龍捲起手 → 木頭被撞裂 → 空氣爆
  AIR: {
    attack: `${AUDIO_BASE}/tornado-wind.m4a`,
    charge: `${SFX}/sfx100v2_air_02.ogg`,
    impact: `${SFX}/sfx100v2_wood_hit_02.ogg`,
    tail: `${SFX}/sfx100v2_air_03.ogg`,
    glow: 'rgba(110, 231, 183, 0.85)', label: '風',
  },
  // 空（屬金）：雷從空中來 → 金屬對撞 → 雷尾
  SPACE: {
    attack: `${AUDIO_BASE}/dry-thunder.mp3`,
    charge: `${SFX}/sfx100v2_metal_03.ogg`,
    impact: `${SFX}/sfx100v2_metal_hit_01.ogg`,
    tail: `${SFX}/sfx100v2_thunder_01.ogg`,
    glow: 'rgba(226, 232, 240, 0.9)', label: '空',
  },
  // 水：潮起 → 重擊悶響 → 水聲收尾
  WATER: {
    attack: `${AUDIO_BASE}/tide-surge.flac`,
    charge: `${SFX}/sfx100v2_loop_water_02.ogg`,
    impact: `${SFX}/sfx100v2_hit_02.ogg`,
    tail: `${SFX}/sfx100v2_loop_water_01.ogg`,
    glow: 'rgba(125, 211, 252, 0.85)', label: '水',
  },
  // 火：點燃 → 重擊 → 玻璃碎（爆裂感）
  FIRE: {
    attack: `${AUDIO_BASE}/cc0-fire-crackle.ogg`,
    charge: `${AUDIO_BASE}/cc0-ignition.flac`,
    impact: `${SFX}/sfx100v2_hit_01.ogg`,
    tail: `${SFX}/sfx100v2_glass_03.ogg`,
    glow: 'rgba(253, 164, 175, 0.9)', label: '火',
  },
  // 地：地裂 → 石頭撞擊 → 碎石落地
  EARTH: {
    attack: `${AUDIO_BASE}/earth-rift.mp3`,
    charge: `${SFX}/sfx100v2_stones_02.ogg`,
    impact: `${SFX}/sfx100v2_hit_03.ogg`,
    tail: `${SFX}/sfx100v2_stones_03.ogg`,
    glow: 'rgba(252, 211, 77, 0.85)', label: '地',
  },
};


/** 撞擊的共用音效與閃光圖。兩張卡撞在一起時放。 */
export const CLASH_FX = {
  impact: `${AUDIO_BASE}/cc0-cannon-hit.ogg`,
  heavyImpact: `${AUDIO_BASE}/loud-thunder.mp3`,
  /** 翻牌的輕音，逐張揭牌時每翻一張放一次。 */
  flip: `${AUDIO_BASE}/cc0-ignition.flac`,
  sprite: `${AUDIO_BASE}/lightning-impact-cc0.png`,
} as const;

/** 同元素共享音色家族，每張卡使用固定、可重現的三段組合。 */
export function cardSoundProfile(cardId: string, element: BattleElement) {
  const match = /^beast_([ay])(\d{2})$/.exec(cardId);
  const guardians = ['beast_g_qinglong', 'beast_g_zhuque', 'beast_g_baihu', 'beast_g_xuanwu'];
  const index = match ? Number(match[2]) - 1 : 28 + Math.max(0, guardians.indexOf(cardId));
  const families: Record<BattleElement, [string[], string[], string[]]> = {
    AIR: [['air_01', 'air_02', 'air_03'], ['wood_hit_01', 'wood_hit_02', 'wood_hit_03'], ['wood_01', 'wood_02', 'wood_03', 'wood_04']],
    SPACE: [['metal_01', 'metal_02', 'metal_03'], ['metal_hit_01', 'metal_hit_02', 'hit_02'], ['metal_04', 'metal_05', 'metal_06', 'thunder_01']],
    WATER: [['loop_water_01', 'loop_water_02', 'loop_water_03'], ['footstep_wet_01', 'footstep_wet_02', 'footstep_wet_03'], ['air_01', 'air_02', 'air_03', 'hit_02']],
    FIRE: [['glass_01', 'glass_02', 'glass_03'], ['hit_01', 'hit_02', 'hit_03'], ['glass_04', 'glass_05', 'glass_06', 'thunder_01']],
    EARTH: [['stones_01', 'stones_02', 'stones_03'], ['hit_01', 'hit_02', 'hit_03'], ['wood_01', 'wood_02', 'wood_03', 'wood_04']],
  };
  const family = families[element];
  return {
    charge: `${SFX}/sfx100v2_${family[0][index % 3]}.ogg`,
    impact: `${SFX}/sfx100v2_${family[1][Math.floor(index / 3) % 3]}.ogg`,
    tail: `${SFX}/sfx100v2_${family[2][Math.floor(index / 9) % 4]}.ogg`,
    rate: match?.[1] === 'y' ? 1.18 : 0.9,
  };
}

/**
 * 放一次三段式撞擊。
 *
 * 蓄力先響（卡片開始衝），撞擊在碰到的那一刻，餘響再跟上。
 * 三段錯開幾十毫秒，聽起來才是「一記重擊」而不是三個聲音同時放。
 * 重擊（有人陣亡）時餘響換成雷鳴，讓份量聽得出差別。
 */
export function playClashSequence(
  play: (src: string, volume?: number, rate?: number) => void,
  element: BattleElement,
  heavy = false,
  cardId?: string,
): () => void {
  const fx = cardId ? cardSoundProfile(cardId, element) : ELEMENT_FX[element];
  if (!fx) return () => {};
  const rate = 'rate' in fx ? fx.rate : 1;
  play(fx.charge, 0.32, rate);
  const impact = window.setTimeout(() => play(fx.impact, heavy ? 0.62 : 0.48, rate), 170);
  const tail = window.setTimeout(() => play(heavy ? CLASH_FX.heavyImpact : fx.tail, heavy ? 0.55 : 0.3, rate), 330);
  return () => { window.clearTimeout(impact); window.clearTimeout(tail); };
}

/**
 * 一個很小的音效播放器。
 *
 * 刻意做得保守：
 *   · 戰鬥音效固定啟用，隨揭牌與交鋒播放，不需另外開啟。
 *   · 播不出來就靜靜跳過（很多行動瀏覽器在沒有使用者手勢前不准播）。
 *   · 減少動態僅控制動畫，不影響戰鬥音效。
 *
 * 它不會 await、不會擋住任何流程——聲音失敗絕不能影響遊戲進行。
 */
export function createSoundPlayer(): {
  play: (src: string, volume?: number, rate?: number) => void;
  dispose: () => void;
} {
  const cache = new Map<string, HTMLAudioElement>();
  const stops = new Map<string, number>();
  let activeVoice: HTMLAudioElement | undefined;


  return {
    dispose() {
      stops.forEach((timer) => window.clearTimeout(timer));
      cache.forEach((audio, src) => { audio.pause(); reportVoice(src, 'stopped'); });
      stops.clear();
      cache.clear();
      activeVoice = undefined;
    },
    play(src: string, volume = 0.45, rate = 1) {
      if (typeof window === 'undefined') return;
      try {
        let audio = cache.get(src);
        if (!audio) {
          audio = new Audio(src);
          audio.preload = 'auto';
          cache.set(src, audio);
        }
        audio.currentTime = 0;
        audio.volume = volume;
        audio.playbackRate = rate;
        audio.preservesPitch = false;
        const isVoice = src.startsWith('/audio/beast-voices/');
        if (isVoice) {
          activeVoice?.pause();
          activeVoice = audio;
        }
        window.clearTimeout(stops.get(src));
        stops.set(src, window.setTimeout(() => audio.pause(), isVoice ? 2400 : 1100));
        // 播放被拒絕（未經手勢、格式不支援）就算了，不能讓遊戲卡住。
        void audio.play().then(() => reportVoice(src, 'playing')).catch(() => reportVoice(src, 'blocked'));
      } catch {
        /* 音效永遠是加分項，壞掉不影響遊戲。 */
      }
    },
  };
}

/**
 * 逐張揭牌的順序。
 *
 * 業主定調：「打輸或打贏的概念，可以一張一張地翻牌，不要一次就六張牌一起翻。
 * 要同時『我翻一張，對方翻一張』的概念。」
 *
 * 所以順序是交替的：我的前鋒 → 對方前鋒 → 我的中軍 → 對方中軍 → …
 * 一張一張對上去，客戶看得出誰對上誰。
 */
export const REVEAL_ORDER: Array<{ side: 'player' | 'opponent'; index: number }> = [
  { side: 'player', index: 0 },
  { side: 'opponent', index: 0 },
  { side: 'player', index: 1 },
  { side: 'opponent', index: 1 },
  { side: 'player', index: 2 },
  { side: 'opponent', index: 2 },
];

/** 每翻一張之間的間隔（毫秒）。減少動態時直接全開，不折磨人。 */
export const REVEAL_INTERVAL_MS = 620;

/**
 * 神獸本體立繪（去背）。
 *
 * 業主定調：「每一張都要生成牠本體的神獸跑過去對方的牌，
 * 60 都以他的神獸本體生成出來……生成出來後放在後端檔案裡作為技能。」
 *
 * 由 scripts/gen-beast-spirits.mjs 以既有插畫為底重繪並去背，
 * 存在 public/beast-game/spirit/NN.png。卡片 id 帶宿號，
 * 所以 beast_a01 / beast_y01 / 四象 都對得回同一隻本體。
 *
 * 沒有立繪時回 null——三維演出會退回用卡面，不會開天窗。
 */
export function spiritArtFor(cardId: string): string | null {
  // 成獸與幼子是不同形態，本體立繪也分開——幼子用成獸的圖，
  // 就是拿大人的圖冒充小孩。幼子的檔名多一個 y。
  const beast = /^beast_([ay])(\d{2})$/.exec(cardId);
  if (beast) {
    const [, form, id] = beast;
    return `/beast-game/spirit/${id}${form === 'y' ? 'y' : ''}.webp`;
  }

  // 四象使用自己的本體，不可用首宿動物冒充。
  const guardian: Record<string, string> = {
    beast_g_qinglong: 'qinglong',
    beast_g_zhuque: 'zhuque',
    beast_g_baihu: 'baihu',
    beast_g_xuanwu: 'xuanwu',
  };
  const id = guardian[cardId];
  return id ? `/beast-game/spirit/guardian-${id}.webp` : null;
}

/** 《技能戰鬥檔案》演出技能（本體衝鋒／命中／隨時戰鬥）。數值技能不在此。 */
export {
  skillBodyArtFor,
  loadCardBattleSkills,
  presentationSkillsFor,
  PRESENTATION_SKILL_IDS,
} from './beast-skill-archive';
