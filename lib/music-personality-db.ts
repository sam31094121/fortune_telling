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
export const EraDatabase: Record<string, MusicGenreProfile> = {
  "1950s": {
    era: "1950s",
    bpmMin: 90,
    bpmMax: 120,
    instruments: ["piano", "string_quartet", "brass", "acoustic_bass"],
    moodKeywords: ["vintage", "nostalgic", "gentle", "romantic"],
    instrumentTimbre: "warm, classical, organic",
  },
  "1970s": {
    era: "1970s",
    bpmMin: 100,
    bpmMax: 130,
    instruments: ["electric_guitar", "synth", "drums", "bass"],
    moodKeywords: ["psychedelic", "groovy", "soulful", "experimental"],
    instrumentTimbre: "rich, analog, textured",
  },
  "1990s": {
    era: "1990s",
    bpmMin: 90,
    bpmMax: 140,
    instruments: ["electric_guitar", "drum_machine", "synth", "bass"],
    moodKeywords: ["alternative", "introspective", "raw", "emotional"],
    instrumentTimbre: "gritty, digital, dynamic",
  },
  "2000s": {
    era: "2000s",
    bpmMin: 95,
    bpmMax: 145,
    instruments: ["synth", "electric_drums", "bass", "guitar"],
    moodKeywords: ["uplifting", "polished", "catchy", "electronic"],
    instrumentTimbre: "crisp, modern, layered",
  },
  "2020s": {
    era: "2020s",
    bpmMin: 100,
    bpmMax: 150,
    instruments: ["synth", "808_drums", "bass", "vocal_chops"],
    moodKeywords: ["ambient", "atmospheric", "introspective", "minimalist"],
    instrumentTimbre: "sparse, cinematic, immersive",
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

// 生日人格資料庫（逐日調整）
export const BirthdayPersonalityMap: Record<number, Partial<Record<string, number>>> = {
  1: { emotion: 5, creativity: 2 }, // 1月1日：新起點，冷靜開始
  15: { leadership: 3, social: 2 }, // 月中：主導感提升
  28: { attachment: 5, emotion: 3 }, // 月底：思鄉感
};

// 血型行為資料庫
export const BloodTypeMap: Record<string, Record<string, number>> = {
  "A": { logic: 80, security: 85, creativity: 65, risk: 40, social: 70, leadership: 55, attachment: 75, emotion: 60 },
  "B": { creativity: 85, risk: 80, social: 75, emotion: 70, logic: 60, leadership: 70, attachment: 55, security: 50 },
  "AB": { logic: 80, creativity: 80, social: 80, emotion: 65, leadership: 75, security: 70, risk: 60, attachment: 70 },
  "O": { leadership: 85, social: 85, emotion: 75, risk: 75, logic: 65, creativity: 70, attachment: 70, security: 65 },
};

// 姓名語意資料庫（姓名首字筆畫 → 人格傾向）
export const NameSemanticMap: Record<number, Record<string, number>> = {
  1: { creativity: 10, leadership: 5, risk: 2 }, // 1筆：創新
  5: { logic: 5, security: 5, creativity: 3 }, // 5筆：穩定
  10: { emotion: 8, attachment: 5, creativity: 2 }, // 10筆：感受力
  15: { leadership: 8, social: 5, logic: 3 }, // 15筆：領導
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
