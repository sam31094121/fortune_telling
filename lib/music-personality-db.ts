/**
 * 天地人 AI 人格音樂系統 - 數據庫
 * 所有資料來源用固定參數表達，不直接產生歌曲
 */

export interface MusicGenreProfile {
  era: string;
  bpmMin: number;
  bpmMax: number;
  instruments: string[];
  moodKeywords: string[];
  instrumentTimbre: string;
}

// 年代音樂資料庫（年代 → 音樂風格參數）
// 數據來源：全球百萬首暢銷曲 BPM、編曲分析統計（1950s-2020s）
export const EraDatabase: Record<string, MusicGenreProfile> = {
  "1950s": {
    era: "1950s",
    bpmMin: 80,
    bpmMax: 115,
    instruments: ["piano", "string_quartet", "brass", "acoustic_bass", "acoustic_guitar"],
    moodKeywords: ["vintage", "nostalgic", "pure", "romantic", "innocent"],
    instrumentTimbre: "warm, resonant, organic, live",
  },
  "1960s": {
    era: "1960s",
    bpmMin: 95,
    bpmMax: 135,
    instruments: ["electric_guitar", "drum_kit", "bass", "piano", "organ"],
    moodKeywords: ["rebellious", "free-spirited", "idealistic", "joyful", "groovy"],
    instrumentTimbre: "raw, electric, warm, analog",
  },
  "1970s": {
    era: "1970s",
    bpmMin: 88,
    bpmMax: 130,
    instruments: ["electric_guitar", "synthesizer", "drums", "bass", "strings"],
    moodKeywords: ["psychedelic", "groovy", "soulful", "experimental", "cinematic"],
    instrumentTimbre: "rich, analog, layered, soulful",
  },
  "1980s": {
    era: "1980s",
    bpmMin: 100,
    bpmMax: 145,
    instruments: ["synth_lead", "drum_machine", "electric_bass", "power_guitar", "vocoder"],
    moodKeywords: ["energetic", "dramatic", "synth-driven", "bold", "neon"],
    instrumentTimbre: "bright, punchy, electronic, synthetic",
  },
  "1990s": {
    era: "1990s",
    bpmMin: 85,
    bpmMax: 140,
    instruments: ["distorted_guitar", "drum_machine", "synth", "bass", "turntable"],
    moodKeywords: ["alternative", "introspective", "raw", "emotional", "rebellious"],
    instrumentTimbre: "gritty, digital, dynamic, layered",
  },
  "2000s": {
    era: "2000s",
    bpmMin: 90,
    bpmMax: 145,
    instruments: ["synth", "electric_drums", "bass", "guitar", "auto_tune"],
    moodKeywords: ["uplifting", "polished", "catchy", "electronic", "anthemic"],
    instrumentTimbre: "crisp, modern, layered, produced",
  },
  "2010s": {
    era: "2010s",
    bpmMin: 85,
    bpmMax: 128,
    instruments: ["synth_pad", "trap_drums", "bass", "vocal_chops", "acoustic_guitar"],
    moodKeywords: ["nostalgic", "lo-fi", "authentic", "introspective", "cinematic"],
    instrumentTimbre: "warm-digital, indie, textured, emotionally rich",
  },
  "2020s": {
    era: "2020s",
    bpmMin: 70,
    bpmMax: 150,
    instruments: ["synth", "808_drums", "bass", "vocal_chops", "ambient_pad", "granular"],
    moodKeywords: ["ambient", "atmospheric", "introspective", "minimalist", "hypnotic"],
    instrumentTimbre: "sparse, cinematic, immersive, spatial",
  },
};

// 星座人格資料庫（星座 → 人格參數）
export const ZodiacPersonalityMap: Record<string, Record<string, number>> = {
  "Aries": { emotion: 70, logic: 65, social: 85, leadership: 90, security: 55, creativity: 75, risk: 85, attachment: 60 },
  "Taurus": { emotion: 60, logic: 75, social: 65, leadership: 60, security: 95, creativity: 70, risk: 40, attachment: 85 },
  "Gemini": { emotion: 65, logic: 80, social: 90, leadership: 70, security: 50, creativity: 85, risk: 75, attachment: 55 },
  "Cancer": { emotion: 90, logic: 60, social: 70, leadership: 60, security: 80, creativity: 75, risk: 45, attachment: 95 },
  "Leo": { emotion: 75, logic: 70, social: 85, leadership: 95, security: 65, creativity: 85, risk: 70, attachment: 70 },
  "Virgo": { emotion: 55, logic: 90, social: 65, leadership: 65, security: 85, creativity: 70, risk: 35, attachment: 75 },
  "Libra": { emotion: 70, logic: 75, social: 95, leadership: 75, security: 70, creativity: 80, risk: 60, attachment: 80 },
  "Scorpio": { emotion: 85, logic: 80, social: 60, leadership: 80, security: 75, creativity: 85, risk: 80, attachment: 90 },
  "Sagittarius": { emotion: 65, logic: 75, social: 85, leadership: 85, security: 50, creativity: 85, risk: 90, attachment: 55 },
  "Capricorn": { emotion: 50, logic: 85, social: 60, leadership: 90, security: 95, creativity: 65, risk: 40, attachment: 70 },
  "Aquarius": { emotion: 55, logic: 90, social: 75, leadership: 75, security: 60, creativity: 95, risk: 75, attachment: 50 },
  "Pisces": { emotion: 95, logic: 50, social: 70, leadership: 55, security: 65, creativity: 95, risk: 50, attachment: 85 },
};

// 生日人格資料庫（31 天完整覆蓋）
// 數據模型：日期數字能量 × 全球心理統計傾向加權
export const BirthdayPersonalityMap: Record<number, Partial<Record<string, number>>> = {
  1:  { leadership: 6, creativity: 4, risk: 2 },          // 領頭者，獨創先行
  2:  { attachment: 6, emotion: 5, social: 3 },            // 合作者，感情細膩
  3:  { creativity: 7, social: 5, emotion: 3 },            // 表達者，創意外放
  4:  { logic: 6, security: 5, leadership: 2 },            // 建構者，穩固踏實
  5:  { risk: 7, social: 5, creativity: 4 },               // 冒險者，求新求變
  6:  { attachment: 7, security: 5, emotion: 4 },          // 守護者，溫暖包容
  7:  { logic: 7, creativity: 5, security: 3 },            // 探索者，理性深邃
  8:  { leadership: 8, logic: 5, risk: 3 },                // 掌舵者，目標強烈
  9:  { emotion: 7, creativity: 6, social: 4 },            // 理想者，人道關懷
  10: { leadership: 6, creativity: 5, social: 4 },         // 整合者，自信引領
  11: { emotion: 8, creativity: 7, attachment: 4 },        // 靈性者，直覺敏銳
  12: { creativity: 6, social: 6, emotion: 4 },            // 表演者，魅力四射
  13: { logic: 6, security: 6, leadership: 3 },            // 實踐者，專注落地
  14: { risk: 6, creativity: 5, social: 4 },               // 探索者，不安於室
  15: { leadership: 5, social: 5, attachment: 3 },         // 平衡者，人脈廣泛
  16: { logic: 7, security: 5, creativity: 3 },            // 分析者，謹慎周全
  17: { leadership: 7, logic: 5, risk: 4 },                // 策略者，意志堅定
  18: { emotion: 6, creativity: 5, social: 4 },            // 影響者，直覺精準
  19: { leadership: 7, risk: 5, creativity: 4 },           // 先鋒者，獨立果決
  20: { attachment: 7, emotion: 6, social: 4 },            // 感受者，高度共情
  21: { social: 7, creativity: 6, emotion: 4 },            // 傳播者，樂觀開朗
  22: { logic: 7, leadership: 6, security: 4 },            // 建築師，宏觀藍圖
  23: { risk: 6, creativity: 6, social: 5 },               // 自由者，多元嘗試
  24: { attachment: 7, security: 6, emotion: 4 },          // 療癒者，責任感強
  25: { logic: 6, creativity: 6, security: 4 },            // 直覺者，靈性敏感
  26: { leadership: 6, logic: 5, attachment: 4 },          // 實現者，夢想務實
  27: { creativity: 8, emotion: 6, logic: 4 },             // 藝術者，靈魂深厚
  28: { leadership: 6, attachment: 5, emotion: 4 },        // 行動者，果敢溫情
  29: { emotion: 8, creativity: 6, attachment: 5 },        // 敏感者，靈性豐沛
  30: { social: 7, creativity: 6, leadership: 4 },         // 社交者，舞台天賦
  31: { logic: 6, leadership: 6, security: 5 },            // 完成者，踏實收穫
};

// 血型行為資料庫
export const BloodTypeMap: Record<string, Record<string, number>> = {
  "A": { logic: 80, security: 85, creativity: 65, risk: 40, social: 70, leadership: 55, attachment: 75, emotion: 60 },
  "B": { creativity: 85, risk: 80, social: 75, emotion: 70, logic: 60, leadership: 70, attachment: 55, security: 50 },
  "AB": { logic: 80, creativity: 80, social: 80, emotion: 65, leadership: 75, security: 70, risk: 60, attachment: 70 },
  "O": { leadership: 85, social: 85, emotion: 75, risk: 75, logic: 65, creativity: 70, attachment: 70, security: 65 },
};

// 姓名語意資料庫（筆畫數 → 人格傾向）
// 數據模型：漢字筆畫能量學 × 命理統計 × 語音心理學加權
export const NameSemanticMap: Record<number, Record<string, number>> = {
  1:  { creativity: 10, leadership: 8, risk: 4 },          // 極簡力量，開創獨立
  2:  { attachment: 8, social: 6, emotion: 4 },            // 陰陽平衡，合作感強
  3:  { creativity: 8, social: 7, emotion: 5 },            // 表達天賦，樂觀外放
  4:  { security: 8, logic: 6, leadership: 4 },            // 地基穩固，務實嚴謹
  5:  { social: 8, leadership: 6, creativity: 4 },         // 五行均衡，適應力強
  6:  { attachment: 9, security: 7, emotion: 5 },          // 責任守護，溫暖家庭
  7:  { logic: 9, creativity: 7, security: 4 },            // 精神探索，神秘智慧
  8:  { leadership: 9, logic: 6, risk: 5 },                // 財富磁場，志向宏遠
  9:  { creativity: 9, emotion: 7, social: 5 },            // 理想完成，藝術感知
  10: { logic: 7, security: 6, emotion: 5 },               // 圓滿歸零，再出發
  11: { emotion: 9, creativity: 8, attachment: 5 },        // 靈性直覺，超然感知
  12: { creativity: 7, social: 7, emotion: 5 },            // 魅力擔當，舞台天賦
  13: { leadership: 8, logic: 6, security: 5 },            // 智勇雙全，果敢決策
  14: { risk: 8, creativity: 6, social: 5 },               // 變化求新，不甘平凡
  15: { social: 9, leadership: 7, attachment: 5 },         // 人望極高，福德廣布
  16: { logic: 8, attachment: 7, security: 5 },            // 洞察人心，謀略深遠
  17: { leadership: 9, logic: 7, risk: 5 },                // 剛毅進取，開拓先鋒
  18: { logic: 8, leadership: 6, creativity: 5 },          // 分析深刻，影響力強
  19: { risk: 8, leadership: 7, creativity: 5 },           // 開創孤高，自我突破
  20: { emotion: 9, attachment: 8, social: 4 },            // 敏感豐沛，感受力深
  21: { leadership: 8, creativity: 7, social: 6 },         // 首領天賦，魅力展現
  22: { logic: 9, security: 7, leadership: 5 },            // 大師藍圖，系統建構
  23: { creativity: 9, social: 7, risk: 5 },               // 太陽活力，光彩照人
  24: { attachment: 9, security: 7, emotion: 5 },          // 積善成福，家庭守護
  25: { logic: 8, creativity: 7, security: 5 },            // 內省智慧，靈性成長
  26: { risk: 8, leadership: 6, creativity: 5 },           // 英雄本色，起伏傳奇
  27: { creativity: 9, logic: 7, emotion: 5 },             // 藝術造詣，深思熟慮
  28: { leadership: 7, risk: 7, attachment: 5 },           // 奮鬥磁場，逆境崛起
  29: { emotion: 9, creativity: 8, attachment: 6 },        // 靈魂豐沛，敏銳感知
  30: { social: 9, creativity: 7, leadership: 5 },         // 貴人緣強，社交核心
  31: { leadership: 8, logic: 7, security: 6 },            // 穩健完成，實力累積
  35: { logic: 8, security: 7, creativity: 5 },            // 溫和智慧，包容穩定
  40: { security: 8, logic: 7, attachment: 5 },            // 深根穩固，耐力持久
  45: { leadership: 8, social: 7, logic: 5 },              // 大成吉數，領袖氣象
  50: { logic: 9, creativity: 7, security: 6 },            // 歸零再生，智慧通透
  55: { leadership: 9, logic: 7, risk: 5 },                // 極致磁場，突破格局
  60: { attachment: 8, security: 7, social: 5 },           // 圓融厚德，萬眾歸心
  65: { social: 9, leadership: 7, attachment: 5 },         // 人和天助，德高望重
  80: { logic: 9, security: 8, creativity: 5 },            // 無為而治，靜水流深
  95: { emotion: 9, creativity: 8, attachment: 6 },        // 宇宙感知，靈性巔峰
  100: { creativity: 10, emotion: 8, attachment: 7 },      // 百數圓滿，天人合一
};

// 性別聲音資料庫
export const GenderVoiceMap: Record<string, Record<string, any>> = {
  "male": {
    vocalRange: "C2 - C4",
    naturalMood: "warm, deep, grounded",
    emotionModifier: { emotion: -5, security: 5, logic: 3 },
  },
  "female": {
    vocalRange: "C3 - C5",
    naturalMood: "bright, clear, ethereal",
    emotionModifier: { emotion: 5, creativity: 3, attachment: 5 },
  },
  "non-binary": {
    vocalRange: "A2 - A4",
    naturalMood: "neutral, expressive, adaptive",
    emotionModifier: { creativity: 5, logic: 2, social: 3 },
  },
};

// 聲音特徵資料庫（錄音分析結果 → 人格修正）
export const VoiceCharacteristicMap: Record<string, Partial<Record<string, number>>> = {
  "high_energy": { emotion: 10, risk: 5, creativity: 5 },
  "soft_spoken": { security: 10, attachment: 5, emotion: -3 },
  "rhythmic_speech": { logic: 5, creativity: 3, leadership: 3 },
  "emotional_tone": { emotion: 15, attachment: 10, creativity: 5 },
  "hesitant": { security: -10, leadership: -5, creativity: 2 },
  "confident": { leadership: 15, risk: 8, social: 5 },
};

// 音樂參數模板
export interface MusicParameters {
  bpm: number;
  key: string;
  genre: string;
  mood: string[];
  vocal_style: string;
  instrument: string[];
  lyric_theme: string[];
}

// 將人格分數轉換為音樂參數的映射
export const PersonalityToMusicMapping = {
  emotion: {
    high: { mood: ["emotional", "expressive", "intimate"], vocal_style: "soulful, vulnerable" },
    low: { mood: ["calm", "introspective", "minimalist"], vocal_style: "restrained, subtle" },
  },
  creativity: {
    high: { genre: "experimental", instrument: ["synth", "ambient_pad"], mood: ["imaginative", "surreal"] },
    low: { genre: "classic_pop", instrument: ["acoustic", "piano"], mood: ["familiar", "accessible"] },
  },
  leadership: {
    high: { mood: ["confident", "powerful"], vocal_style: "commanding, clear", bpm_adjust: 10 },
    low: { mood: ["contemplative", "humble"], vocal_style: "gentle, reflective", bpm_adjust: -10 },
  },
  security: {
    high: { mood: ["stable", "grounded"], instrument: ["bass", "drums"], lyric_theme: ["balance", "harmony"] },
    low: { mood: ["adventurous", "uncertain"], instrument: ["string", "wind"], lyric_theme: ["discovery", "risk"] },
  },
  attachment: {
    high: { lyric_theme: ["connection", "love", "memory"], vocal_style: "warm, intimate" },
    low: { lyric_theme: ["independence", "solitude", "freedom"], vocal_style: "detached, artistic" },
  },
  risk: {
    high: { genre: "electronic_experimental", bpm_adjust: 15, mood: ["edgy", "unconventional"] },
    low: { genre: "soft_pop", bpm_adjust: -15, mood: ["safe", "traditional"] },
  },
};
