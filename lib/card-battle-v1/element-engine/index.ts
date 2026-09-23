/**
 * 元素對應層（唯一集中處）。
 * 玩家面向：風、空、水、火、地
 * 內部五行（僅私有 map）：木→風、金→空、水→水、火→火、土→地
 *
 * 公開 API 回傳字串禁止出現 金 / 木 / 土。
 */

/** 玩家面向元素（唯一允許出現在 UI / BattleState 的元素標籤） */
export type PlayerElement = '风' | '空' | '水' | '火' | '地';

/** 內部五行代碼（永不暴露給玩家字串） */
type WuxingCode = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

/** 私有對應表 —— 唯一映射來源，禁止在其他模組重複定義 */
const WUXING_TO_PLAYER: Readonly<Record<WuxingCode, PlayerElement>> = {
  metal: '空', // 金 → 空/SPACE
  wood: '风', // 木 → 风/AIR
  water: '水', // 水 → 水/WATER
  fire: '火', // 火 → 火/FIRE
  earth: '地', // 土 → 地/EARTH
};

const PLAYER_LABELS: readonly PlayerElement[] = ['风', '空', '水', '火', '地'];

/** 玩家標籤 → 內部五行（僅引擎內部使用，不供 UI） */
const PLAYER_TO_WUXING: Readonly<Record<PlayerElement, WuxingCode>> = {
  空: 'metal',
  风: 'wood',
  水: 'water',
  火: 'fire',
  地: 'earth',
};

/**
 * 相剋：攻擊方剋防守方 → 傷害加成方向（回傳玩家元素）
 * 風剋地、地剋空、空剋风、风生…（以五行相剋轉寫）
 * 木剋土 → 风剋地
 * 土剋水 → 地剋水
 * 水剋火 → 水剋火
 * 火剋金 → 火剋空
 * 金剋木 → 空剋风
 */
const COUNTERS: Readonly<Record<PlayerElement, PlayerElement>> = {
  风: '地',
  地: '水',
  水: '火',
  火: '空',
  空: '风',
};

/**
 * 相生：產生下一元素
 * 木生火 → 风生火
 * 火生土 → 火生地
 * 土生金 → 地生空
 * 金生水 → 空生水
 * 水生木 → 水生风
 */
const GENERATES: Readonly<Record<PlayerElement, PlayerElement>> = {
  风: '火',
  火: '地',
  地: '空',
  空: '水',
  水: '风',
};

/** 禁止出現在公開字串的五行漢字（水/火作為玩家元素允許） */
const FORBIDDEN_PLAYER_CHARS = ['金', '木', '土'] as const;

export function isPlayerElement(value: string): value is PlayerElement {
  return (PLAYER_LABELS as readonly string[]).includes(value);
}

export function allPlayerElements(): readonly PlayerElement[] {
  return PLAYER_LABELS;
}

/** 玩家元素 → 顯示標籤（恒等，供 UI 統一呼叫） */
export function toPlayerLabel(element: PlayerElement): PlayerElement {
  assertNoForbiddenChars(element);
  return element;
}

/** 內部五行代碼 → 玩家元素 */
export function fromWuxing(code: WuxingCode): PlayerElement {
  const label = WUXING_TO_PLAYER[code];
  assertNoForbiddenChars(label);
  return label;
}

/** 玩家元素 → 內部五行（僅供引擎計算，勿寫入 BattleState 字串） */
export function toWuxingInternal(element: PlayerElement): WuxingCode {
  return PLAYER_TO_WUXING[element];
}

/** 取得被此元素剋制的玩家元素 */
export function getCounteredElement(attacker: PlayerElement): PlayerElement {
  const result = COUNTERS[attacker];
  assertNoForbiddenChars(result);
  return result;
}

/** attacker 是否剋制 defender */
export function isCounter(attacker: PlayerElement, defender: PlayerElement): boolean {
  return COUNTERS[attacker] === defender;
}

/** 相生：此元素產生的下一元素 */
export function getGeneratedElement(source: PlayerElement): PlayerElement {
  const result = GENERATES[source];
  assertNoForbiddenChars(result);
  return result;
}

/**
 * 斷言公開字串不含 金/木/土。
 * 水、火作為玩家元素名稱允許。
 */
export function assertNoForbiddenChars(text: string): void {
  for (const ch of FORBIDDEN_PLAYER_CHARS) {
    if (text.includes(ch)) {
      throw new Error(
        `[element-engine] 玩家面向字串禁止出現「${ch}」: ${JSON.stringify(text)}`,
      );
    }
  }
}

/** 掃描任意字串陣列，確保無違規五行字 */
export function assertPlayerFacingStrings(...texts: string[]): void {
  for (const t of texts) {
    assertNoForbiddenChars(t);
  }
}
