/**
 * 神獸戰鬥武器・暴風型科技武裝
 * ============================================================================
 *
 * 業主定調：「戰鬥卡片要帶有科技功能的武器的概念，
 * 用大數據現有的素材，有授權、科技感風格的武器，暴風型的。」
 *
 * 【武器只是演出，不決定勝負】
 *
 * 規格第十二條：動畫不得決定戰鬥結果。武器在這裡是**名字、外觀與聲音**，
 * 傷害仍然全部由 interactive.ts 與 effects.ts 算。
 * 一旦武器開始加傷害，就變成第二套數值來源，兩邊遲早對不上——
 * 而且平衡是用一萬場抽樣驗過的，武器插一腳那份證據就作廢了。
 *
 * 所以這個檔案裡沒有任何數字會進到傷害公式。守門測試會擋。
 *
 * 【名字就是武器】
 *
 * 沿用專案既有的〈成年本命神獸卡生成規格〉那一條：
 * 「每個星宿名稱都必須提取一個專屬的核心字義武器」。
 * 這裡不另立一套命名法，只是把它做成程式讀得到的表。
 *
 * 【素材全部是既有的、有授權的】
 *
 *   lightning-sprite-cc0.png   CC0 · EVIL_ENT · OpenGameArt        刃身
 *   lightning-impact-cc0.png   CC0 · 13rice · OpenGameArt          命中爆閃
 *   cc0-sfx-100-v2/*.ogg       CC0 音效包（專案既有）              風壓／雷擊／金屬
 *   dry-thunder.mp3            Pixabay 授權（見 audio/taiji/LICENSES.md）
 *
 * 沒有新增任何檔案。閃電精靈在交鋒時本來就會載入，等於零額外流量。
 */

import type { BeastElement } from './elements';

/** 武器型別。第一版全部是暴風型，之後要加別的型再擴充這個聯集。 */
export type WeaponClass = '暴風型';

export interface BeastWeapon {
  /** 武器名。取自宿名的核心字義，不與任何既有作品重複。 */
  name: string;
  weaponClass: WeaponClass;
  /** 一句話說它怎麼打。給卡片詳情用，不進戰鬥計算。 */
  motion: string;
  /**
   * 裸露在外的機構。
   *
   * 業主定調：「要有裸體科技武器……深於暴露霸氣型科技武器」。
   * 這裡的「裸」是**沒有外殼包覆、機構直接露出來**——
   * 動力環、導軌、線圈、關節都看得見，不是包成一塊光滑的殼。
   *
   * 為什麼這樣接得上專案既有的設定：〈成年本命神獸卡生成規格〉寫
   * 「武器必須落在神獸本體可辨識特徵，而非背景或通用特效」。
   * 所以武器不是外掛的裝備，**就是神獸自己那個部位**——
   * 角、喙、尾本身裸露成科技機構，這比再掛一把刀更霸氣，
   * 也不會把六十隻神獸變成六十隻拿武器的同一種東西。
   */
  exposed: string;
  /** 刃身貼圖。CC0，交鋒時本來就會載入。 */
  blade: string;
  /** 命中爆閃。 */
  impact: string;
  /*
    武器沒有自己的聲音。

    一度在這裡放了 charge／strike 兩個音檔路徑，那是錯的：
    本體叫聲、三段式交鋒音已經各有一套，武器再一套就是第三套，
    同一次出手會聽到三種不搭的音色——那不是氣勢，是雜訊。

    現在聲音只有一個來源：lib/beast-battle-fx.ts 的 beastActionTimeline()，
    它從同一張卡的 cardSoundProfile 取音色，把吼、蓄力、命中、餘響
    排成一條時間軸。武器只負責「是什麼武器」，不負責「聽起來怎樣」。
  */
  /** 這件武器長在身上的哪裡。取自專案文件的四象定位，不是另編的。 */
  part: string;
}

const BLADE = '/audio/taiji/lightning-sprite-cc0.png';
const IMPACT = '/audio/taiji/lightning-impact-cc0.png';

/**
 * 五元素各自的暴風武裝。
 *
 * 暴風型的共同語彙是「蓄壓 → 放電 → 餘震」，
 * 但五個元素的放電方式不同，聲音也跟著不同——
 * 全部用同一組音效就聽不出是誰在打。
 */
// 元素只決定「怎麼打」；「打在哪」由 MANSION_WEAPON 提供，兩者在 weaponFor 合起來。
const BY_ELEMENT: Record<BeastElement, Omit<BeastWeapon, 'name' | 'part'>> = {
  SPACE: {
    weaponClass: '暴風型',
    motion: '金屬刃面充能後彈射，命中瞬間放出環形電弧。',
    exposed: '刃脊剖開，導軌與電容環整列外露，充能時逐節亮起。',
    blade: BLADE,
    impact: IMPACT,
  },
  AIR: {
    weaponClass: '暴風型',
    motion: '氣旋在刃口捲成螺壓，撕開對手的護面。',
    exposed: '骨架不包殼，氣旋直接在裸露的螺旋肋間成形。',
    blade: BLADE,
    impact: IMPACT,
  },
  WATER: {
    weaponClass: '暴風型',
    motion: '水膜包覆刃身導電，接觸面同時受壓與過載。',
    exposed: '導流槽開放式外露，水膜沿著溝紋爬過通電的裸金屬。',
    blade: BLADE,
    impact: IMPACT,
  },
  FIRE: {
    weaponClass: '暴風型',
    motion: '過熱刃口在空氣中留下電離尾焰，命中即引爆。',
    exposed: '燃燒室無蓋，過熱的核心直接曝在空氣裡，邊緣泛白。',
    blade: BLADE,
    impact: IMPACT,
  },
  EARTH: {
    weaponClass: '暴風型',
    motion: '岩層裂解成碎屑被磁軌加速，成排轟上目標。',
    exposed: '磁軌全段外露，碎岩在裸露的軌道上被逐段加速。',
    blade: BLADE,
    impact: IMPACT,
  },
};

/**
 * 二十八宿的武器部位。
 *
 * 【為什麼是這張表，不是隨便配一把刀】
 *
 * 業主定調：「「五合」本身承受本體的武器，要有邏輯。」
 * 五元素給的是**打法**（暴風型怎麼放電），這張表給的是**打在哪**——
 * 兩者合起來才是一隻神獸的武裝。
 *
 * 部位不是我編的，是專案文件裡就有的四象定位
 * （docs/beast-game-skill.md 的二十八宿逐宿條目：蒼龍之角、玄武之首…）。
 * 守門測試會回頭比對那份文件，改了一邊沒改另一邊就報錯——
 * 兩份對不上的設定，比只有一份還糟。
 *
 * 武器名取部位的核心字，因為〈成年本命神獸卡生成規格〉寫明
 * 「武器必須落在神獸本體可辨識特徵，而非背景或通用特效」。
 * 所以角木蛟的武器是「角」，不是給牠一把劍——
 * 六十隻拿同一把劍，就等於沒有武器設計。
 */
export const MANSION_WEAPON: Record<string, { part: string; core: string }> = {
  角木蛟: { part: '蒼龍之角', core: '角' },
  亢金龍: { part: '蒼龍咽喉', core: '喉' },
  氐土貉: { part: '蒼龍胸肋', core: '肋' },
  房日兔: { part: '蒼龍腹部', core: '腹' },
  心月狐: { part: '蒼龍心臟', core: '心' },
  尾火虎: { part: '蒼龍之尾', core: '尾' },
  箕水豹: { part: '蒼龍尾末', core: '梢' },
  斗木獬: { part: '玄武之首', core: '首' },
  牛金牛: { part: '玄武脖頸', core: '頸' },
  女土蝠: { part: '玄武身軀', core: '軀' },
  虛日鼠: { part: '玄武虛位', core: '虛' },
  危月燕: { part: '玄武屋脊', core: '脊' },
  室火豬: { part: '玄武宮室', core: '室' },
  壁水貐: { part: '玄武牆壁', core: '壁' },
  // 奎的本義是胯（兩髀之間），奎宿正在白虎的胯尾。
  // 用「尾」會跟尾火虎（蒼龍之尾）撞名——規格寫明各卡武器不得複製。
  奎木狼: { part: '白虎之尾', core: '胯' },
  婁金狗: { part: '白虎聚眾', core: '聚' },
  胃土雉: { part: '白虎之胃', core: '胃' },
  昴日雞: { part: '白虎耳目', core: '目' },
  畢月烏: { part: '白虎邊疆', core: '疆' },
  觜火猴: { part: '白虎之口', core: '喙' },
  參水猿: { part: '白虎將軍', core: '臂' },
  井木犴: { part: '朱雀之冠', core: '冠' },
  鬼金羊: { part: '朱雀之眼', core: '瞳' },
  柳土獐: { part: '朱雀之嘴', core: '顎' },
  星日馬: { part: '朱雀頸部', core: '鬃' },
  張月鹿: { part: '朱雀羽翼', core: '翎' },
  翼火蛇: { part: '朱雀翅膀', core: '翅' },
  軫水蚓: { part: '朱雀尾端', core: '軸' },
};

/** 形態決定武器的級數字尾。幼子的武裝還沒成形，四象是完整體。 */
function tierSuffix(cardId: string): string {
  if (/^beast_g_/.test(cardId)) return '天樞';
  if (/^beast_y\d{2}$/.test(cardId)) return '初鋒';
  return '暴雷';
}

/**
 * 取出這張卡的武器。
 *
 * 「五合」在這裡的意思：元素給打法、宿位給部位，兩者合起來才是武裝。
 * 名字＝部位核心字 ＋ 級數字尾，例如「角・暴雷」「角・初鋒」。
 *
 * 對不到宿位（四象或未知卡）就退回卡名首字，不回 null——
 * 戰鬥畫面一定要有東西可顯示，不能開天窗。
 */
export function weaponFor(cardId: string, cardName: string, element: BeastElement): BeastWeapon {
  const base = BY_ELEMENT[element] ?? BY_ELEMENT.SPACE;
  // 卡名可能是「角木蛟・幼子」，取「・」前面那三個字對表。
  const mansion = cardName.split('・')[0].trim();
  const entry = MANSION_WEAPON[mansion];
  const core = entry?.core ?? mansion.charAt(0) ?? '鋒';
  return {
    ...base,
    name: `${core}・${tierSuffix(cardId)}`,
    part: entry?.part ?? '四象本體',
  };
}

/** 這一版所有武器都是暴風型。畫面拿它當標記，不必逐張問。 */
export const WEAPON_CLASSES: readonly WeaponClass[] = ['暴風型'];
