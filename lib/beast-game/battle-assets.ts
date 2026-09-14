/**
 * 戰鬥演出素材登記表（BattleAssetRegistry）
 * ============================================================================
 *
 * 只登記專案裡真的存在的東西。兩種：
 *   MEDIA  — public/ 底下的實體檔案（圖、影片、音效）
 *   PRESET — 已經寫好的 CSS 動畫，evidence 是 @keyframes 名稱
 *
 * 規格書的 23 類是分類架構，不是 23 個檔案；哪一類實際有幾個，
 * 由 scripts/audit-battle-assets.mjs 逐一核對檔案後回報，這裡不寫死數量。
 * 這支檔案不決定任何戰鬥結果，也不擲亂數。
 */

import type { BeastElement } from './elements';

export const BATTLE_ASSET_CATEGORIES = [
  'CARD_AURA', 'ORB', 'CHARGE', 'COLLISION', 'FUSION', 'RAGE', 'ELEMENT', 'LIGHTNING',
  'FIRE', 'ICE', 'WIND', 'EARTH', 'VOID', 'SHOCKWAVE', 'SCREEN_SHAKE', 'FLASH',
  'PARTICLE', 'DEBRIS', 'PORTAL', 'ULTIMATE', 'BACKGROUND', 'AUDIO', 'FINISH',
] as const;
export type BattleAssetCategory = (typeof BATTLE_ASSET_CATEGORIES)[number];

export const BATTLE_ASSET_CATEGORY_LABEL: Record<BattleAssetCategory, string> = {
  CARD_AURA: '卡片氣場', ORB: '能量寶珠', CHARGE: '蓄能', COLLISION: '卡片碰撞', FUSION: '合體',
  RAGE: '暴怒', ELEMENT: '元素爆發', LIGHTNING: '雷電', FIRE: '火焰', ICE: '冰裂', WIND: '風暴',
  EARTH: '地裂', VOID: '空間', SHOCKWAVE: '衝擊波', SCREEN_SHAKE: '螢幕震撼', FLASH: '閃光',
  PARTICLE: '粒子', DEBRIS: '碎裂', PORTAL: '空間門', ULTIMATE: '終極技能', BACKGROUND: '戰場背景',
  AUDIO: '通用音效', FINISH: '終結演出',
};

export type BattleAssetType =
  | 'WEBP' | 'PNG' | 'JPG' | 'SVG' | 'WEBM' | 'MP4' | 'OGG' | 'MP3' | 'FLAC' | 'M4A' | 'CSS_KEYFRAMES';

export interface BattleAsset {
  assetId: string;
  name: string;
  kind: 'MEDIA' | 'PRESET';
  type: BattleAssetType;
  /** MEDIA：網址路徑（public/ 底下）；PRESET：專案內的 CSS 檔。 */
  path: string;
  category: BattleAssetCategory;
  element?: BeastElement;
  /** 只屬於某一張卡的素材（例如本體衝鋒影片），別張卡不得借用。 */
  cardId?: string;
  /** PRESET 的 @keyframes 名稱。 */
  evidence?: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  mobileSafe: boolean;
  preload: boolean;
  license: string;
}

/** 超過就不算手機安全；preload 另有更嚴的上限，避免一次把重素材塞進手機。 */
export const MOBILE_BUDGET_BYTES = { IMAGE: 400_000, AUDIO: 600_000, VIDEO: 2_000_000 } as const;
export const PRELOAD_MAX_BYTES = 150_000;

type Extra = Pick<BattleAsset, 'element' | 'cardId'>;
const id = (n: number) => `BFX_${String(n).padStart(3, '0')}`;
const typeOf = (path: string) => {
  const ext = path.slice(path.lastIndexOf('.') + 1).toUpperCase();
  return (ext === 'JPEG' ? 'JPG' : ext) as BattleAssetType;
};

function media(
  n: number, name: string, path: string, category: BattleAssetCategory,
  intensity: BattleAsset['intensity'], mobileSafe: boolean, preload: boolean, license: string, extra: Extra = {},
): BattleAsset {
  return { assetId: id(n), name, kind: 'MEDIA', type: typeOf(path), path, category, intensity, mobileSafe, preload, license, ...extra };
}

function preset(
  n: number, name: string, file: string, keyframes: string, category: BattleAssetCategory,
  intensity: BattleAsset['intensity'], extra: Extra = {},
): BattleAsset {
  return {
    assetId: id(n), name, kind: 'PRESET', type: 'CSS_KEYFRAMES', path: `components/battlefield/${file}`,
    category, evidence: keyframes, intensity, mobileSafe: true, preload: false, license: '專案自有程式特效', ...extra,
  };
}

const TAIJI = '/audio/taiji';
const SFX = `${TAIJI}/cc0-sfx-100-v2`;
const SFX_LICENSE = 'CC0 1.0（rubberduck《100 CC0 SFX #2》，OpenGameArt）';
const TEXTURE_LICENSE = '檔名標示 CC0；專案內沒有對應授權紀錄，上線前需補查';

function sfxSeries(
  start: number, stem: string, count: number, name: string, category: BattleAssetCategory,
  intensity: BattleAsset['intensity'], extra: Extra = {},
): BattleAsset[] {
  return Array.from({ length: count }, (_, i) => {
    const index = String(i + 1).padStart(2, '0');
    return media(start + i, `${name} ${index}`, `${SFX}/sfx100v2_${stem}_${index}.ogg`, category, intensity, true, false, SFX_LICENSE, extra);
  });
}

const BATTLE_ASSETS: readonly BattleAsset[] = [
  media(1, '閃電精靈圖', `${TAIJI}/lightning-sprite-cc0.png`, 'LIGHTNING', 4, true, false, 'CC0（EVIL_ENT，OpenGameArt）', { element: 'SPACE' }),
  media(2, '放射雷擊閃光', `${TAIJI}/lightning-impact-cc0.png`, 'FLASH', 4, true, true, 'CC0（13rice，OpenGameArt）'),
  media(3, '太極圖', '/assets/taiji/esoteric-taijitu-public-domain.svg', 'FUSION', 3, true, true, 'Public Domain（見 public/assets/taiji/TAIJI_ASSET_LICENSE.md）'),
  media(4, '水波材質', '/textures/cc0-y2k-water-texture.png', 'ELEMENT', 2, false, false, TEXTURE_LICENSE, { element: 'WATER' }),
  media(5, '翡翠浮雕材質', '/textures/polyhaven/cc0-emerald-relief.jpg', 'EARTH', 2, true, false, TEXTURE_LICENSE, { element: 'EARTH' }),
  media(6, '木紋浮雕材質', '/textures/polyhaven/cc0-fine-wood-relief.jpg', 'WIND', 2, true, false, TEXTURE_LICENSE, { element: 'AIR' }),
  media(7, '霧林戰場', '/beast-game/stage/venues/forest-battle.webp', 'BACKGROUND', 1, true, true, 'CC0-1.0（見 stage/venues/LICENSE.txt）'),
  media(8, '擂台戰場', '/beast-game/stage/venues/ring-arena.webp', 'BACKGROUND', 1, true, true, 'CC0-1.0（見 stage/venues/LICENSE.txt）'),
  media(9, '馬戲擂台', '/beast-game/stage/default/circus_arena.jpg', 'BACKGROUND', 1, true, false, '見 stage/default/LICENSE.txt'),
  media(10, '馬戲擂台寬版', '/beast-game/stage/default/circus_arena_wide.jpg', 'BACKGROUND', 1, false, false, '見 stage/default/LICENSE.txt'),
  media(11, '雷擊', `${TAIJI}/lightning-strike.mp3`, 'LIGHTNING', 4, true, true, 'Pixabay Content License（DRAGON-STUDIO）', { element: 'SPACE' }),
  media(12, '乾雷', `${TAIJI}/dry-thunder.mp3`, 'LIGHTNING', 3, true, false, 'Pixabay Content License（DRAGON-STUDIO）', { element: 'SPACE' }),
  media(13, '巨雷', `${TAIJI}/loud-thunder.mp3`, 'LIGHTNING', 5, true, false, 'Pixabay Content License（Universfield）'),
  media(14, '連環雷鳴', `${TAIJI}/peals-of-thunder.mp3`, 'LIGHTNING', 5, true, false, 'Pixabay Content License（Universfield）'),
  media(15, '雷聲', `${SFX}/sfx100v2_thunder_01.ogg`, 'LIGHTNING', 3, true, false, SFX_LICENSE),
  media(16, '砲擊發射', `${TAIJI}/cc0-cannon-fire.ogg`, 'CHARGE', 4, true, false, 'CC0 1.0（Thimras《Battle at sea》）'),
  media(17, '砲彈命中', `${TAIJI}/cc0-cannon-hit.ogg`, 'COLLISION', 4, true, false, 'CC0 1.0（Thimras《Battle at sea》）'),
  media(18, '砲彈對撞', `${TAIJI}/cc0-cannon-hit-cannon.ogg`, 'COLLISION', 5, true, false, 'CC0 1.0（Thimras《Battle at sea》）'),
  media(19, '地裂低鳴', `${TAIJI}/earth-rift.mp3`, 'EARTH', 4, true, false, 'CC0 1.0（gmason）', { element: 'EARTH' }),
  media(20, '潮湧', `${TAIJI}/tide-surge.flac`, 'ELEMENT', 3, true, false, 'CC0 1.0（transitking）', { element: 'WATER' }),
  media(21, '龍捲風', `${TAIJI}/tornado-wind.m4a`, 'WIND', 3, true, false, 'CC0 1.0（IgnasD）', { element: 'AIR' }),
  media(22, '颱風', `${TAIJI}/typhoon-wind.m4a`, 'WIND', 3, true, false, 'CC0 1.0（IgnasD）', { element: 'AIR' }),
  media(23, '火焰劈啪', `${TAIJI}/cc0-fire-crackle.ogg`, 'FIRE', 2, true, false, 'CC0 1.0（AntumDeluge）', { element: 'FIRE' }),
  media(24, '點燃', `${TAIJI}/cc0-ignition.flac`, 'FIRE', 3, true, false, 'CC0 1.0（qubodup）', { element: 'FIRE' }),
  ...sfxSeries(25, 'air', 3, '風切', 'WIND', 2, { element: 'AIR' }),
  ...sfxSeries(28, 'glass', 6, '玻璃碎裂', 'DEBRIS', 2),
  ...sfxSeries(34, 'hit', 3, '重擊', 'COLLISION', 3),
  ...sfxSeries(37, 'metal', 6, '金屬震鳴', 'VOID', 2, { element: 'SPACE' }),
  ...sfxSeries(43, 'metal_hit', 2, '金屬對撞', 'COLLISION', 3, { element: 'SPACE' }),
  ...sfxSeries(45, 'stones', 3, '碎石', 'EARTH', 2, { element: 'EARTH' }),
  ...sfxSeries(48, 'wood', 4, '木裂', 'DEBRIS', 2),
  ...sfxSeries(52, 'wood_hit', 3, '木擊', 'COLLISION', 3, { element: 'AIR' }),
  ...sfxSeries(55, 'loop_water', 3, '水流', 'ELEMENT', 2, { element: 'WATER' }),
  media(58, '角木蛟本體衝鋒影片', '/skill-battle-archive/cards/beast_a01/clips/charge-battle.webm', 'CHARGE', 4, true, false, '專案技能戰鬥檔案產出', { cardId: 'beast_a01' }),
  media(59, '亢金龍本體衝鋒影片', '/skill-battle-archive/cards/beast_a02/clips/charge-battle.webm', 'CHARGE', 4, true, false, '專案技能戰鬥檔案產出', { cardId: 'beast_a02' }),
  media(60, '氐土貉本體衝鋒影片', '/skill-battle-archive/cards/beast_a03/clips/charge-battle.webm', 'CHARGE', 4, true, false, '專案技能戰鬥檔案產出', { cardId: 'beast_a03' }),

  preset(101, '卡片全息掃光', 'BattleArena.module.css', 'holoSweep', 'CARD_AURA', 1),
  preset(102, '待攻擊呼吸光框', 'BattleArena.module.css', 'attackReady', 'CARD_AURA', 2),
  preset(103, '3D 元素寶珠', 'ElementOrbDisplay.module.css', 'orbPulse', 'ORB', 2),
  preset(104, '太極氣彈', 'BattleArena.module.css', 'taijiBolt', 'ORB', 3),
  preset(105, '卡片衝鋒', 'BattleArena.module.css', 'cardCharge', 'CHARGE', 3),
  preset(106, '技能蓄力', 'BattleArena.module.css', 'skillCharge', 'CHARGE', 3),
  preset(107, '受擊後座', 'BattleArena.module.css', 'cardHit', 'COLLISION', 3),
  preset(108, '暴怒合體衝鋒', 'BattleArena.module.css', 'rageFusionRush', 'COLLISION', 4),
  preset(109, '太極旋轉光圈', 'BattleArena.module.css', 'taijiSpin', 'FUSION', 4),
  preset(110, '雙層太極環', 'BattleArena.module.css', 'strikeOuterSpin', 'FUSION', 4),
  preset(111, '暴怒合體七層全螢幕', 'RageComboEffect.module.css', 'rageParticleExplode', 'RAGE', 5),
  preset(112, '元素場爆發', 'BattleArena.module.css', 'elementFieldBurst', 'ELEMENT', 3),
  preset(113, '水紋流淌', 'BattleArena.module.css', 'waterFlow', 'ELEMENT', 3, { element: 'WATER' }),
  preset(114, '雷電位移', 'BattleArena.module.css', 'lightningShift', 'LIGHTNING', 4, { element: 'SPACE' }),
  preset(115, '三重衝擊漣漪', 'BattleArena.module.css', 'impactTriple', 'SHOCKWAVE', 4),
  preset(116, '暴怒衝擊波', 'RageComboEffect.module.css', 'shockwaveExpand', 'SHOCKWAVE', 5),
  preset(117, '光子衝擊脈衝', 'PhotonParticleEffect.module.css', 'shockWavePulse', 'SHOCKWAVE', 3),
  preset(118, '勝利震屏', 'VictoryMoment.module.css', 'shake', 'SCREEN_SHAKE', 3),
  preset(119, '命中四角閃光', 'BattleArena.module.css', 'techHitFlash', 'FLASH', 2),
  preset(120, '勝利閃光爆', 'VictoryMoment.module.css', 'flashBurst', 'FLASH', 4),
  preset(121, '光子粒子', 'PhotonParticleEffect.module.css', 'particleFloat', 'PARTICLE', 3),
  preset(122, '勝利粒子爆散', 'VictoryMoment.module.css', 'victoryParticleExplode', 'PARTICLE', 4),
  preset(123, '戰場太極氣場', 'BattleArena.module.css', 'arenaTaijiField', 'BACKGROUND', 1),
  preset(124, '勝利落幣爆光', 'VictoryAnimation.module.css', 'burstExpand', 'FINISH', 3),
  preset(125, '傳說閃光', 'VictoryMoment.module.css', 'legendaryFlash', 'FINISH', 5),
  // —— 誠實補類：只用已存在的 CSS／音檔，不造假媒體 ——
  preset(126, '勝利傳奇閃光（大絕）', 'VictoryMoment.module.css', 'legendaryFlash', 'ULTIMATE', 5),
  preset(127, '勝利爆發擴張（大絕）', 'VictoryAnimation.module.css', 'burstExpand', 'ULTIMATE', 4),
  media(61, '戰場環境氛圍 01', `${SFX}/sfx100v2_loop_ambient_01.ogg`, 'AUDIO', 1, true, false, SFX_LICENSE),
  media(62, '戰場環境氛圍 02', `${SFX}/sfx100v2_loop_ambient_02.ogg`, 'AUDIO', 1, true, false, SFX_LICENSE),
  media(63, '開鎖儀式音', `${SFX}/sfx100v2_lock_open_01.ogg`, 'AUDIO', 2, true, false, SFX_LICENSE),
];

const battleAssetRegistry = new Map<string, BattleAsset>();

export function registerBattleAsset(asset: BattleAsset): void {
  if (battleAssetRegistry.has(asset.assetId)) throw new Error(`DUPLICATE_BATTLE_ASSET:${asset.assetId}`);
  battleAssetRegistry.set(asset.assetId, asset);
}

export function getBattleAsset(assetId: string): BattleAsset {
  const asset = battleAssetRegistry.get(assetId);
  if (!asset) throw new Error(`BATTLE_ASSET_NOT_FOUND:${assetId}`);
  return asset;
}

export function battleAssets(): BattleAsset[] {
  return [...battleAssetRegistry.values()];
}

export function assetsInCategory(category: BattleAssetCategory): BattleAsset[] {
  return battleAssets().filter((asset) => asset.category === category);
}

for (const asset of BATTLE_ASSETS) registerBattleAsset(asset);
