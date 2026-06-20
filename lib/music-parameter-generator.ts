/**
 * 天地人 AI 人格音樂系統 - 音樂參數生成器
 * 將人格矩陣轉換為具體的音樂參數
 */

import { PersonalityMatrix, PersonalityMatrixInput } from "./personality-matrix-engine";
import { PersonalityToMusicMapping, EraDatabase, MusicParameters } from "./music-personality-db";
import { PersonalityMatrixEngine } from "./personality-matrix-engine";

export class MusicParameterGenerator {
  /**
   * 主生成函數：人格矩陣 → 音樂參數
   */
  static generateMusicParameters(
    personalityInput: PersonalityMatrixInput,
    era: string = "2020s"
  ): MusicParameters {
    // 生成人格矩陣
    const personality = PersonalityMatrixEngine.generatePersonalityMatrix(personalityInput);

    // 從資料庫獲取年代基準
    const eraProfile = EraDatabase[era] || EraDatabase["2020s"];

    // 計算音樂參數
    return {
      bpm: this.calculateBPM(personality, eraProfile),
      key: this.calculateKey(personality),
      genre: this.calculateGenre(personality, eraProfile),
      mood: this.calculateMood(personality),
      vocal_style: this.calculateVocalStyle(personality, personalityInput.gender),
      instrument: this.calculateInstruments(personality, eraProfile),
      lyric_theme: this.calculateLyricTheme(personality),
    };
  }

  /**
   * 計算 BPM（基於領導力、風險、情感）
   */
  private static calculateBPM(personality: PersonalityMatrix, eraProfile: any): number {
    const baseMin = eraProfile.bpmMin || 90;
    const baseMax = eraProfile.bpmMax || 140;
    const range = baseMax - baseMin;

    // leadership 和 risk 影響 BPM
    const speedFactor = (personality.leadership + personality.risk) / 2 / 100;
    const bpm = baseMin + range * speedFactor;

    return Math.round(Math.max(baseMin, Math.min(baseMax, bpm)));
  }

  /**
   * 計算音階（基於安全感、情感）
   */
  private static calculateKey(personality: PersonalityMatrix): string {
    const keys = [
      "C major",   // 最安穩
      "G major",
      "D major",
      "A major",
      "E major",   // 最明亮
      "F major",   // 溫暖
      "A minor",
      "E minor",
      "D minor",
      "C minor",   // 最沈鬱
      "B minor",
    ];

    // security 高 → 大調；低 → 小調
    // 安全感決定大小調；創意決定變異
    const securityScore = personality.security;
    const creativityScore = personality.creativity;

    const isMajor = securityScore > 50;
    const keyIndex = Math.floor((creativityScore / 100) * (keys.length - 1));

    return keys[keyIndex] || "A minor";
  }

  /**
   * 計算音樂風格（基於創意、邏輯、風險）
   */
  private static calculateGenre(personality: PersonalityMatrix, eraProfile: any): string {
    const genres = [
      "classical_ambient",
      "acoustic_pop",
      "indie_folk",
      "alternative_rock",
      "electronic_pop",
      "cinematic_pop",
      "experimental_electronic",
      "avant_garde",
      "ambient_electronic",
      "psychedelic_rock",
    ];

    // creativity 和 risk 決定風格
    const creativityFactor = personality.creativity / 100;
    const riskFactor = personality.risk / 100;
    const styleScore = (creativityFactor + riskFactor) / 2;

    const genreIndex = Math.floor(styleScore * (genres.length - 1));
    return genres[genreIndex] || "cinematic_pop";
  }

  /**
   * 計算心情關鍵詞（基於情感、社交、依戀）
   */
  private static calculateMood(personality: PersonalityMatrix): string[] {
    const moods = [];

    // 情感高 → 表達性
    if (personality.emotion > 70) moods.push("emotional");
    else if (personality.emotion < 40) moods.push("introspective");

    // 社交高 → 明亮
    if (personality.social > 70) moods.push("bright");
    else if (personality.social < 40) moods.push("intimate");

    // 創意高 → 想像力
    if (personality.creativity > 75) moods.push("imaginative");

    // 依戀高 → 溫暖
    if (personality.attachment > 70) moods.push("warm");
    else if (personality.attachment < 40) moods.push("detached");

    // 領導力高 → 自信
    if (personality.leadership > 75) moods.push("confident");

    // 邏輯高 → 清晰
    if (personality.logic > 70) moods.push("clear");

    // 安全感低 → 冒險
    if (personality.security < 40) moods.push("adventurous");

    return moods.length > 0 ? moods : ["neutral", "contemplative"];
  }

  /**
   * 計算唱腔風格（基於情感、依戀、社交、性別）
   */
  private static calculateVocalStyle(
    personality: PersonalityMatrix,
    gender: "male" | "female" | "non-binary"
  ): string {
    const components = [];

    // 情感 → 溫度
    if (personality.emotion > 70) components.push("soulful");
    else if (personality.emotion < 40) components.push("restrained");
    else components.push("balanced");

    // 依戀 → 親密度
    if (personality.attachment > 70) components.push("intimate");
    else if (personality.attachment < 40) components.push("artistic");

    // 社交 → 能量
    if (personality.social > 70) components.push("expressive");
    else if (personality.social < 40) components.push("introspective");

    // 性別特徵
    const genderVocals: Record<string, string> = {
      male: "deep, grounded",
      female: "ethereal, clear",
      "non-binary": "adaptive, neutral",
    };
    components.push(genderVocals[gender] || "universal");

    return components.join(", ");
  }

  /**
   * 計算樂器編成（基於創意、邏輯、領導力）
   */
  private static calculateInstruments(personality: PersonalityMatrix, eraProfile: any): string[] {
    const baseInstruments = eraProfile.instruments || [
      "piano",
      "strings",
      "synth",
    ];

    const instruments: string[] = [];

    // 邏輯高 → 結構性樂器（鋼琴、鼓）
    if (personality.logic > 70) {
      instruments.push("piano", "drum");
    }

    // 創意高 → 實驗性樂器（合成器、特效）
    if (personality.creativity > 75) {
      instruments.push("synth", "ambient_pad");
    }

    // 情感高 → 撥弦樂器（吉他、弦樂）
    if (personality.emotion > 70) {
      instruments.push("strings", "guitar");
    }

    // 社交高 → 豐富編排
    if (personality.social > 70) {
      instruments.push("brass", "vocal_chops");
    }

    // 安全感高 → 傳統樂器
    if (personality.security > 70) {
      instruments.push("acoustic", "bass");
    }

    // 風險高 → 電子感
    if (personality.risk > 75) {
      instruments.push("808_drums", "digital_fx");
    }

    // 依戀高 → 溫暖樂器
    if (personality.attachment > 75) {
      instruments.push("cello", "warm_synth");
    }

    // 去重並回傳
    return Array.from(new Set(instruments.slice(0, 6)));
  }

  /**
   * 計算歌詞主題（基於所有維度）
   */
  private static calculateLyricTheme(personality: PersonalityMatrix): string[] {
    const themes = [];

    // 情感高 → 內心世界
    if (personality.emotion > 75) themes.push("self-awareness", "inner_world");

    // 社交高 → 連結
    if (personality.social > 75) themes.push("connection", "harmony");

    // 創意高 → 想像
    if (personality.creativity > 75) themes.push("imagination", "dreams");

    // 領導力高 → 願景
    if (personality.leadership > 75) themes.push("vision", "growth");

    // 安全感高 → 根基
    if (personality.security > 75) themes.push("roots", "belonging");

    // 邏輯高 → 思考
    if (personality.logic > 75) themes.push("reason", "truth");

    // 依戀高 → 記憶
    if (personality.attachment > 75) themes.push("memory", "love");

    // 風險高 → 冒險
    if (personality.risk > 75) themes.push("adventure", "transformation");

    // 命理元素（通用）
    themes.push("destiny");

    // 善念哲學（核心價值觀）
    if (personality.emotion > 60 && personality.social > 60) {
      themes.push("compassion", "kindness");
    }

    return Array.from(new Set(themes.slice(0, 6)));
  }

  /**
   * 生成人格音樂報告（JSON）
   */
  static generateReport(
    personalityInput: PersonalityMatrixInput,
    personality: PersonalityMatrix,
    musicParams: MusicParameters
  ): Record<string, any> {
    return {
      input: {
        birthDate: personalityInput.birthDate,
        zodiac: personalityInput.zodiacSign,
        gender: personalityInput.gender,
        bloodType: personalityInput.bloodType,
        name: `${personalityInput.firstName} ${personalityInput.lastName || ""}`.trim(),
      },
      personality_matrix: personality,
      music_parameters: musicParams,
      interpretation: {
        dominant_trait: this.getDominantTrait(personality),
        emotional_signature: this.getEmotionalSignature(personality),
        creative_potential: personality.creativity,
        social_capacity: personality.social,
        life_philosophy: "心存善念，多行善事，才是真正改變命運的開始。",
      },
      ai_note: "此系統透過天地人模型，融合年代音樂、人格大數據與聲音特徵，為您生成一首專屬的人格歌曲。",
    };
  }

  private static getDominantTrait(personality: PersonalityMatrix): string {
    const traits = Object.entries(personality).sort(([, a], [, b]) => b - a);
    return `${traits[0][0]} (${traits[0][1]})`;
  }

  private static getEmotionalSignature(personality: PersonalityMatrix): string {
    if (personality.emotion > 80) return "Deeply Expressive";
    if (personality.emotion > 60) return "Emotionally Open";
    if (personality.emotion > 40) return "Balanced";
    return "Reserved";
  }
}
