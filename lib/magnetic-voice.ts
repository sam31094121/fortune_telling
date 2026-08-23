/**
 * 磁性催淚聲線分類 · 單一資料來源
 *
 * 「全世界最能感動人、聽了會噴淚」的聲音，不是單一種，而是可分成多型。
 * 每一型都能選男聲／女聲，並且把「聲音」與「歌詞語感」綁在一起，一起催淚。
 *
 * 註：本分類基於聲學特徵（音域、氣息、顫音、共鳴、質地）與全球情歌的共同表現手法歸納，
 * 並非任何單一「全球統計排行」；屬本系統可解釋的專業設定。
 */

export type MagneticVoiceType = 'chest' | 'breath' | 'raspy' | 'crybreak' | 'ethereal';

export type MagneticVoiceGender = 'male' | 'female' | null;

export interface MagneticVoiceArchetype {
  key: MagneticVoiceType;
  /** UI 主標題 */
  label: string;
  /** UI 副標籤 */
  badge: string;
  /** 一句話描述聲音氣質 */
  headline: string;
  /** 適合的情境提示 */
  hint: string;
  tone: 'violet' | 'amber' | 'cyan' | 'pink' | 'rose';
  /** 聲學指令（中文），gender 可調整音域用詞 */
  acousticZh: (gender: MagneticVoiceGender) => string;
  /** 聲學指令（英文），供英文 prompt 使用 */
  acousticEn: (gender: MagneticVoiceGender) => string;
  /** 與此聲線綁定的歌詞語感規則（中文） */
  lyricRuleZh: string;
  /** 語音樣本特徵標籤（供 voiceConsent / 前端預覽用），gender 會加對應標籤 */
  characteristics: (gender: MagneticVoiceGender) => string[];
}

function genderZh(gender: MagneticVoiceGender): string {
  return gender === 'male' ? '男聲' : gender === 'female' ? '女聲' : '主唱';
}

function genderEn(gender: MagneticVoiceGender): string {
  return gender === 'male' ? 'male ' : gender === 'female' ? 'female ' : '';
}

function genderTag(gender: MagneticVoiceGender): string[] {
  return gender === 'male'
    ? ['ai_voice_male', 'male_emotional_lead']
    : gender === 'female'
      ? ['ai_voice_female', 'female_emotional_lead']
      : ['ai_voice_auto'];
}

export const MAGNETIC_VOICE_ARCHETYPES: MagneticVoiceArchetype[] = [
  {
    key: 'chest',
    label: '深情胸腔磁嗓',
    badge: '厚度・承擔',
    headline: '溫厚、克制，像把沒說出口的話終於唱完。',
    hint: '承擔、守護、遺憾後的力量與人生主題曲。',
    tone: 'cyan',
    acousticZh: (g) => `極致深情的${genderZh(g)}，低頻胸腔共鳴、溫厚圓潤；主歌壓低音量、幾乎貼耳收著氣息，進副歌時音量與音高明顯拉開起伏、絕不平鋪直敘；每個換氣點留下清晰的氣音顆粒與咬字前的呼吸聲，副歌衝上高點時聲音穿透樂器直達心口，力量收在克制裡卻聽得見胸腔的震動，一句定情，像把沒說出口的話終於唱完，讓人胸口一緊。`,
    acousticEn: (g) => `a deeply emotional ${genderEn(g)}lead vocal with rich low chest resonance, warm and rounded; the verse holds back at hushed, close-mic volume while the chorus pulls the dynamics wide open with a clear rise in pitch and power — never flat or monotone; audible breath grain at every phrase intake and word onset, and a penetrating, cutting clarity at the chorus peak that carries straight through the instruments to the listener's chest, restrained power with a felt resonance, landing on a single defining chorus line that tightens the listener's chest.`,
    lyricRuleZh: '歌詞走「承擔、守護、走過來的力量」：句子短而穩，多用第一人稱的承諾，副歌用一句就能定情的核心句，不堆砌華麗詞。',
    characteristics: (g) => [...genderTag(g), 'magnetic_chest', 'warm_low_register', 'restrained_then_release', 'cinematic_confession'],
  },
  {
    key: 'breath',
    label: '氣聲呢喃',
    badge: '貼耳・私密',
    headline: '壓得很低的氣聲，像只對你一個人輕聲說。',
    hint: '私密告白、想念、深夜、只想被一個人聽見。',
    tone: 'violet',
    acousticZh: (g) => `親密到貼耳的氣聲${genderZh(g)}，close-mic 呼吸感、音量壓得很低，像只對你一個人輕聲說；氣音裡藏著細膩起伏，字與字之間的氣流強弱不斷變化，副歌瞬間收緊氣息、音高略為揚起並帶出一絲穿透力，像忍不住靠近了一點又退回氣聲；尾音帶氣音收束、換氣聲與齒音細節放大，聽起來像耳邊私語，讓人起雞皮疙瘩。`,
    acousticEn: (g) => `an intimate close-mic breathy ${genderEn(g)}voice at soft dynamics, ASMR proximity, whispered as if only to one person; subtle dynamic swells move within the whisper as breath intensity shifts word to word, and the chorus briefly tightens the breath and lifts the pitch with a thread of penetrating clarity — leaning in for a moment before sinking back into airiness; breath-tailed phrase endings, audible inhale and consonant-breath detail that raise goosebumps.`,
    lyricRuleZh: '歌詞走「私密告白、只對你說」：第一人稱、當下的小細節，像日記或耳邊話；句尾常以輕聲字收（如「…好嗎」「…別走」）。',
    characteristics: (g) => [...genderTag(g), 'magnetic_breath', 'tearful_breath', 'warm_close_vocal', 'asmr_proximity'],
  },
  {
    key: 'raspy',
    label: '沙啞靈魂嗓',
    badge: '顆粒・滄桑',
    headline: '帶顆粒的沙啞，唱出走過風雨的真實。',
    hint: '滄桑、遺憾、走過風雨後仍站著的人。',
    tone: 'amber',
    acousticZh: (g) => `帶顆粒感的沙啞${genderZh(g)}，vocal fry 與粗糙質地、靈魂藍調的滄桑；主歌壓著喉頭沙沙地唱、氣音混著顆粒感流動，副歌音量與音高大幅拉升，高音帶撕裂張力、穿透力十足地衝破沙啞直刺人心，低音帶磨損感，起伏分明絕非一路平淡；字句起頭帶粗糲的氣音摩擦聲，唱出走過風雨的真實，讓人鼻酸。`,
    acousticEn: (g) => `a grainy raspy ${genderEn(g)}voice with vocal fry and soul-blues weathering; the verse rasps low and breathy with grain woven through every phrase, then the chorus swings the dynamics wide open — tearing, penetrating tension on the highs that cuts straight through the rasp, worn grit on the lows, a clear rise and fall rather than a flat delivery; gritty breath friction at the start of each line voices hard-earned truth and stirs tears.`,
    lyricRuleZh: '歌詞走「滄桑、遺憾、走過風雨」：帶生活與時間感的意象（街、夜、傷疤、來時路），承認脆弱但收在硬氣裡。',
    characteristics: (g) => [...genderTag(g), 'magnetic_raspy', 'vocal_fry_grain', 'soul_blues_weathered', 'raw_truth'],
  },
  {
    key: 'crybreak',
    label: '顫音哽咽',
    badge: '哭腔・臨界',
    headline: '尾音顫抖、喉頭一緊，像快哭還在撐。',
    hint: '思念、放不下、來不及說再見的情緒臨界。',
    tone: 'rose',
    acousticZh: (g) => `帶哭腔的${genderZh(g)}，主歌壓抑著氣音、音量收得很輕，句尾常帶不自覺的吸氣抽噎聲；情緒堆疊到副歌時音高與音量急速起伏拉升，尾音顫抖、喉頭一緊的 cry-break，音準在情緒臨界輕微下滑後再拉回；副歌設一個穿透力極強的破音點，聲音在那一瞬間衝破壓抑直接刺進聽者心口，像快哭出來還在撐，讓人直接噴淚。`,
    acousticEn: (g) => `a ${genderEn(g)}voice with a cry-break: the verse stays hushed and breath-held with involuntary catch-breaths at line ends, then the emotion surges into the chorus with a sharp rise in pitch and volume — trembling tail vibrato, a catch in the throat, a slight pitch bend at the emotional edge pulled back up, and one designed, penetrating vocal break in the chorus that cuts through the restraint straight into the listener—on the verge of tears—that makes listeners cry.`,
    lyricRuleZh: '歌詞走「思念、放不下」：重複呼喚對方、未完成的話；破音點落在副歌最痛那一句，短句反覆堆疊到潰堤。',
    characteristics: (g) => [...genderTag(g), 'magnetic_crybreak', 'cry_break_vibrato', 'throat_catch', 'chorus_break_point'],
  },
  {
    key: 'ethereal',
    label: '空靈穿透',
    badge: '空氣・救贖',
    headline: '空靈高音像有光，唱到釋懷與救贖。',
    hint: '療癒、釋懷、放下之後被光接住的時刻。',
    tone: 'pink',
    acousticZh: (g) => `空靈穿透的${genderZh(g)}，氣聲高音與 falsetto 微顫、大量空間殘響；主歌氣音輕盈、幾乎透明地飄著，副歌音高與能量陡然攀升，falsetto 拉到最高點時穿透力全開、聲音像光一樣刺破雲層，起伏對比鮮明絕不單調；換氣與氣聲細節清晰可聞，克制而遼闊，唱到釋懷與救贖，讓人眼眶一熱後被療癒。`,
    acousticEn: (g) => `an ethereal penetrating ${genderEn(g)}voice with airy head tones, shimmering falsetto and spacious reverb; the verse floats light and near-transparent on breath, then the chorus surges upward in pitch and energy—the falsetto peak breaks fully open with piercing clarity, like light cutting through cloud, a vivid rise and fall rather than a flat drift; audible breath and air detail throughout, restrained yet vast, voicing release and redemption that moves the listener and then heals.`,
    lyricRuleZh: '歌詞走「療癒、釋懷、光與救贖」：畫面遼闊、留白多，少即是多；副歌用一個明亮意象（光、海、天亮）承接放下。',
    characteristics: (g) => [...genderTag(g), 'magnetic_ethereal', 'airy_head_voice', 'falsetto_shimmer', 'cinematic_space'],
  },
];

const ARCHETYPE_MAP: Record<MagneticVoiceType, MagneticVoiceArchetype> =
  MAGNETIC_VOICE_ARCHETYPES.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {} as Record<MagneticVoiceType, MagneticVoiceArchetype>);

export const DEFAULT_MAGNETIC_VOICE_TYPE: MagneticVoiceType = 'chest';

export function getMagneticVoiceArchetype(type?: MagneticVoiceType | null): MagneticVoiceArchetype {
  return (type && ARCHETYPE_MAP[type]) || ARCHETYPE_MAP[DEFAULT_MAGNETIC_VOICE_TYPE];
}

/** 中文聲學指令：類型 + 男/女 */
export function buildMagneticVoiceDirectiveZh(type?: MagneticVoiceType | null, gender: MagneticVoiceGender = null): string {
  const a = getMagneticVoiceArchetype(type);
  return `【全世界最有磁性的聲音 · ${a.label}｜${genderZh(gender)}】${a.acousticZh(gender)}`;
}

/** 英文聲學指令：類型 + 男/女 */
export function buildMagneticVoiceDirectiveEn(type?: MagneticVoiceType | null, gender: MagneticVoiceGender = null): string {
  const a = getMagneticVoiceArchetype(type);
  return `The world's most magnetic, tear-inducing lead vocal (${a.key}): ${a.acousticEn(gender)}`;
}

/** 與聲線綁定的歌詞語感規則 */
export function getMagneticLyricRuleZh(type?: MagneticVoiceType | null): string {
  return getMagneticVoiceArchetype(type).lyricRuleZh;
}
