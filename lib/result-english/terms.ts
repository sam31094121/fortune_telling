/**
 * English display terms for the /match result output layer.
 * Display only: never feed these values back into any calculation.
 */
import type { MatchFiveElementKey } from '../match-five-element-engine';

export type ElementKey = MatchFiveElementKey;

/** Site elements (本站五元素). */
/** Same words as lib/result-english-copy.ts (空元素 Space element, 風元素 Air element …). */
export const EN_ELEMENT_SHORT: Record<ElementKey, string> = { space: 'Space', air: 'Air', water: 'Water', fire: 'Fire', earth: 'Earth' };
export const EN_ELEMENT_LABEL: Record<ElementKey, string> = { space: 'Space element', air: 'Air element', water: 'Water element', fire: 'Fire element', earth: 'Earth element' };
/** Classic Five Phases (傳統五行) the site element maps onto. */
export const EN_ELEMENT_TRADITIONAL: Record<ElementKey, string> = { space: 'Metal', air: 'Wood', water: 'Water', fire: 'Fire', earth: 'Earth' };

/** Chinese product-element glyph (空風水火地) → key. */
export const ZH_SHORT_TO_KEY: Record<string, ElementKey> = { 空: 'space', 風: 'air', 水: 'water', 火: 'fire', 地: 'earth' };
/** Classic five phases glyphs. */
export const ZH_PHASE_EN: Record<string, string> = { 木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water' };

/** 「空（金）」style: only add the classic phase when the English names differ. */
export function enWithTraditional(key: ElementKey) {
  return EN_ELEMENT_SHORT[key] === EN_ELEMENT_TRADITIONAL[key] ? EN_ELEMENT_SHORT[key] : `${EN_ELEMENT_SHORT[key]} (${EN_ELEMENT_TRADITIONAL[key]})`;
}

export const STEM_EN: Record<string, string> = { 甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu', 己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui' };
export const BRANCH_EN: Record<string, string> = { 子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai' };
export const BRANCH_ANIMAL_EN: Record<string, string> = { 子: 'Rat', 丑: 'Ox', 寅: 'Tiger', 卯: 'Rabbit', 辰: 'Dragon', 巳: 'Snake', 午: 'Horse', 未: 'Goat', 申: 'Monkey', 酉: 'Rooster', 戌: 'Dog', 亥: 'Pig' };

/** 地支 → "Wu (午)". Unknown input is returned unchanged. */
export function enBranch(branch: string) {
  return BRANCH_EN[branch] ? `${BRANCH_EN[branch]} (${BRANCH_ANIMAL_EN[branch]})` : branch;
}

/** 干支「庚午」→ "Geng-Wu". Anything that is not a stem+branch pair is returned unchanged. */
export function enGanzhi(value: string) {
  const [stem, branch] = [...value];
  return value.length === 2 && STEM_EN[stem] && BRANCH_EN[branch] ? `${STEM_EN[stem]}-${BRANCH_EN[branch]}` : value;
}

/** 日主「丁火」→ "Ding Fire". */
export function enDayMaster(value: string) {
  const [stem, phase] = [...value];
  return STEM_EN[stem] && ZH_PHASE_EN[phase] ? `${STEM_EN[stem]} ${ZH_PHASE_EN[phase]}` : value;
}

export const ZODIAC_SIGN_EN: Record<string, string> = {
  牡羊座: 'Aries', 白羊座: 'Aries', 金牛座: 'Taurus', 雙子座: 'Gemini', 巨蟹座: 'Cancer', 獅子座: 'Leo', 處女座: 'Virgo',
  天秤座: 'Libra', 天蠍座: 'Scorpio', 射手座: 'Sagittarius', 人馬座: 'Sagittarius', 摩羯座: 'Capricorn', 山羊座: 'Capricorn', 水瓶座: 'Aquarius', 雙魚座: 'Pisces',
};
export const CHINESE_ZODIAC_EN: Record<string, string> = {
  鼠: 'Rat', 牛: 'Ox', 虎: 'Tiger', 兔: 'Rabbit', 龍: 'Dragon', 蛇: 'Snake', 馬: 'Horse', 羊: 'Goat', 猴: 'Monkey', 雞: 'Rooster', 狗: 'Dog', 豬: 'Pig',
};

/** 28 lunar-mansion beasts: mansion, luminary/phase and animal (names from data/star-beasts.json). */
const MANSION_EN: Record<string, string> = {
  角: 'Jiao', 亢: 'Kang', 氐: 'Di', 房: 'Fang', 心: 'Xin', 尾: 'Wei', 箕: 'Ji', 斗: 'Dou', 牛: 'Niu', 女: 'Nü', 虛: 'Xu', 危: 'Wei', 室: 'Shi', 壁: 'Bi',
  奎: 'Kui', 婁: 'Lou', 胃: 'Wei', 昴: 'Mao', 畢: 'Bi', 觜: 'Zi', 參: 'Shen', 井: 'Jing', 鬼: 'Gui', 柳: 'Liu', 星: 'Xing', 張: 'Zhang', 翼: 'Yi', 軫: 'Zhen',
};
const LUMINARY_EN: Record<string, string> = { 木: 'Wood', 金: 'Metal', 土: 'Earth', 日: 'Sun', 月: 'Moon', 火: 'Fire', 水: 'Water' };
const BEAST_ANIMAL_EN: Record<string, string> = {
  蛟: 'Flood Dragon', 龍: 'Dragon', 貉: 'Badger', 兔: 'Hare', 狐: 'Fox', 虎: 'Tiger', 豹: 'Leopard', 獬: 'Xiezhi', 牛: 'Ox', 蝠: 'Bat', 鼠: 'Rat', 燕: 'Swallow',
  豬: 'Boar', 貐: 'Yayu', 狼: 'Wolf', 狗: 'Dog', 雉: 'Pheasant', 雞: 'Rooster', 烏: 'Crow', 猴: 'Monkey', 猿: 'Ape', 犴: 'Hound', 羊: 'Goat', 獐: 'Muntjac',
  馬: 'Horse', 鹿: 'Deer', 蛇: 'Serpent', 蚓: 'Earthworm',
};
/** 「觜火猴」→ "Zi Fire Monkey". Unknown names are returned unchanged. */
export function enBeastName(name: string) {
  const [m, l, a] = [...name];
  return name.length === 3 && MANSION_EN[m] && LUMINARY_EN[l] && BEAST_ANIMAL_EN[a] ? `${MANSION_EN[m]} ${LUMINARY_EN[l]} ${BEAST_ANIMAL_EN[a]}` : name;
}

export const BEAST_MEANING_EN: Record<string, string> = {
  突破開創: 'Breakthrough and pioneering', 正直威權: 'Integrity and authority', 承載基石: 'A foundation that carries weight', 明朗財祿: 'Bright fortune and prosperity',
  權謀多疑: 'Strategic and wary', 爭鬥好勝: 'Competitive drive', 風浪漂泊: 'Drifting through storms', 才華穩健: 'Steady talent', 勞碌基業: 'Hard work that builds a legacy',
  技能內斂: 'Quiet, understated skill', 空虛靈性: 'Empty space and spirituality', 高危機警: 'Alert under pressure', 建設剛猛: 'Bold building energy', 守護智慧: 'Protective wisdom',
  文采反差: 'Hidden literary talent', 繁衍利索: 'Growth and efficiency', 財庫剛強: 'A strong treasury', 名聲清高: 'Refined reputation', 堅韌守衛: 'Resilient guardian',
  口舌機變: 'Quick wit and eloquence', 變革煞氣: 'Force for change', 敏銳陰鬱: 'Sensitive and brooding', 神秘庇護: 'Mysterious protection', 柔順多疑: 'Gentle yet doubtful',
  奔波忠烈: 'Restless loyalty', 華麗受矚: 'Glamour and attention', 輔助飛翔: 'Helping others take flight', 車輿協調: 'Coordination on the move',
};
export const DIRECTION_EN: Record<string, string> = { 東方蒼龍: 'Azure Dragon of the East', 南方朱雀: 'Vermilion Bird of the South', 西方白虎: 'White Tiger of the West', 北方玄武: 'Black Tortoise of the North' };

/** 十四主星 and common auxiliary stars. Unknown names stay in Chinese. */
export const ZIWEI_STAR_EN: Record<string, string> = {
  紫微: 'Zi Wei', 天機: 'Tian Ji', 太陽: 'Tai Yang', 武曲: 'Wu Qu', 天同: 'Tian Tong', 廉貞: 'Lian Zhen', 天府: 'Tian Fu', 太陰: 'Tai Yin', 貪狼: 'Tan Lang', 巨門: 'Ju Men',
  天相: 'Tian Xiang', 天梁: 'Tian Liang', 七殺: 'Qi Sha', 破軍: 'Po Jun', 左輔: 'Zuo Fu', 右弼: 'You Bi', 文昌: 'Wen Chang', 文曲: 'Wen Qu', 天魁: 'Tian Kui', 天鉞: 'Tian Yue',
  祿存: 'Lu Cun', 天馬: 'Tian Ma', 擎羊: 'Qing Yang', 陀羅: 'Tuo Luo', 火星: 'Huo Xing', 鈴星: 'Ling Xing', 地空: 'Di Kong', 地劫: 'Di Jie', 紅鸞: 'Hong Luan', 天喜: 'Tian Xi',
  天才: 'Tian Cai', 天壽: 'Tian Shou', 破碎: 'Po Sui', 咸池: 'Xian Chi', 天德: 'Tian De', 月德: 'Yue De', 恩光: 'En Guang', 天貴: 'Tian Gui', 空亡: 'Kong Wang', 旬空: 'Xun Kong',
  天刑: 'Tian Xing', 天月: 'Tian Yue (Moon)', 孤辰: 'Gu Chen', 寡宿: 'Gua Su', 天姚: 'Tian Yao', 三台: 'San Tai', 八座: 'Ba Zuo', 台輔: 'Tai Fu', 天廚: 'Tian Chu', 天空: 'Tian Kong',
  封誥: 'Feng Gao', 天巫: 'Tian Wu', 天哭: 'Tian Ku', 天虛: 'Tian Xu', 龍池: 'Long Chi', 鳳閣: 'Feng Ge', 紅豔: 'Hong Yan', 蜚廉: 'Fei Lian', 華蓋: 'Hua Gai', 天官: 'Tian Guan',
  天福: 'Tian Fu (Blessing)', 解神: 'Jie Shen', 陰煞: 'Yin Sha', 天使: 'Tian Shi', 天傷: 'Tian Shang', 截路: 'Jie Lu', 截空: 'Jie Kong', 年解: 'Nian Jie', 大耗: 'Da Hao',
};
export const ZIWEI_BRIGHTNESS_EN: Record<string, string> = { 廟: 'temple', 旺: 'prosperous', 得: 'favourable', 利: 'beneficial', 平: 'neutral', 不: 'weak', 陷: 'fallen' };
/** 「廉貞（陷）」→ "Lian Zhen (fallen)". */
export function enZiweiStar(value: string) {
  const match = /^(.+?)(?:（(.)）)?$/.exec(value);
  if (!match) return value;
  const name = ZIWEI_STAR_EN[match[1]] ?? match[1];
  return match[2] ? `${name} (${ZIWEI_BRIGHTNESS_EN[match[2]] ?? match[2]})` : name;
}
export const ZIWEI_PALACE_EN: Record<string, string> = {
  命宮: 'Life Palace', 兄弟: 'Siblings Palace', 兄弟宮: 'Siblings Palace', 夫妻: 'Spouse Palace', 夫妻宮: 'Spouse Palace', 子女: 'Children Palace', 子女宮: 'Children Palace',
  財帛: 'Wealth Palace', 財帛宮: 'Wealth Palace', 疾厄: 'Health Palace', 疾厄宮: 'Health Palace', 遷移: 'Travel Palace', 遷移宮: 'Travel Palace', 僕役: 'Friends Palace', 交友: 'Friends Palace', 交友宮: 'Friends Palace', 僕役宮: 'Friends Palace',
  官祿: 'Career Palace', 官祿宮: 'Career Palace', 事業宮: 'Career Palace', 田宅: 'Property Palace', 田宅宮: 'Property Palace', 福德: 'Fortune Palace', 福德宮: 'Fortune Palace', 父母: 'Parents Palace', 父母宮: 'Parents Palace',
};
export const ZIWEI_PATTERN_EN: Record<string, string> = {
  殺破狼格局: 'Sha-Po-Lang pattern (Qi Sha, Po Jun, Tan Lang)', 府相朝垣格局: 'Fu-Xiang Chao Yuan pattern (Tian Fu and Tian Xiang facing the Life Palace)',
  紫府同宮格局: 'Zi-Fu Together pattern', 機月同梁格局: 'Ji-Yue-Tong-Liang pattern', 日月並明格局: 'Sun and Moon Both Bright pattern', 石中隱玉格局: 'Jade Hidden in Stone pattern',
};

/** King Wen number → common English hexagram name (Wilhelm/Baynes tradition). */
export const HEXAGRAM_EN: string[] = ['',
  'The Creative', 'The Receptive', 'Difficulty at the Beginning', 'Youthful Folly', 'Waiting', 'Conflict', 'The Army', 'Holding Together', 'Small Taming', 'Treading',
  'Peace', 'Standstill', 'Fellowship', 'Great Possession', 'Modesty', 'Enthusiasm', 'Following', 'Work on the Decayed', 'Approach', 'Contemplation',
  'Biting Through', 'Grace', 'Splitting Apart', 'Return', 'Innocence', 'Great Taming', 'Nourishment', 'Great Exceeding', 'The Abysmal', 'The Clinging',
  'Influence', 'Duration', 'Retreat', 'Great Power', 'Progress', 'Darkening of the Light', 'The Family', 'Opposition', 'Obstruction', 'Deliverance',
  'Decrease', 'Increase', 'Breakthrough', 'Coming to Meet', 'Gathering Together', 'Pushing Upward', 'Oppression', 'The Well', 'Revolution', 'The Cauldron',
  'The Arousing', 'Keeping Still', 'Development', 'The Marrying Maiden', 'Abundance', 'The Wanderer', 'The Gentle', 'The Joyous', 'Dispersion', 'Limitation',
  'Inner Truth', 'Small Exceeding', 'After Completion', 'Before Completion'];

export const RED_LUAN_LABEL_EN: Record<string, string> = { 紅鸞: 'Hong Luan (Red Phoenix)', 天喜: 'Tian Xi (Heavenly Joy)', 桃花: 'Peach Blossom' };
export const PILLAR_EN: Record<string, string> = { 年: 'year', 月: 'month', 日: 'day', 時: 'hour' };

/** Site element character (空/風/水/火/地, the orb ProductElement) → English short name. */
export function enProductElement(value: string) {
  const key = ZH_SHORT_TO_KEY[value];
  return key ? EN_ELEMENT_SHORT[key] : value;
}
