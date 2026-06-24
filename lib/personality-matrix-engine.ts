/**
 * 天地人 AI 人格音樂系統 - 人格矩陣引擎
 * 將天、地、人模型的所有資料轉換為統一的人格矩陣（0-100 分制）
 */

import {
  ZodiacPersonalityMap,
  BirthdayPersonalityMap,
  BloodTypeMap,
  NameSemanticMap,
  GenderVoiceMap,
  VoiceCharacteristicMap,
} from "./music-personality-db";

export interface PersonalityMatrix {
  emotion: number;
  logic: number;
  social: number;
  leadership: number;
  security: number;
  creativity: number;
  risk: number;
  attachment: number;
}

export interface PersonalityMatrixInput {
  // 天：出生資料
  birthDate: string; // YYYY-MM-DD
  zodiacSign: string; // e.g., "Aries"
  
  // 地：身體與行為資料
  gender: "male" | "female" | "non-binary";
  bloodType: "A" | "B" | "AB" | "O";
  voiceCharacteristics?: string[]; // e.g., ["confident", "emotional_tone"]
  
  // 人：個人識別資料
  firstName: string;
  lastName?: string;
}

export class PersonalityMatrixEngine {
  /**
   * 從天模型提取人格參數（35%）
   */
  static extractSkyModel(birthDate: string, zodiacSign: string): Partial<PersonalityMatrix> {
    const matrix: Partial<PersonalityMatrix> = {
      emotion: 0,
      logic: 0,
      social: 0,
      leadership: 0,
      security: 0,
      creativity: 0,
      risk: 0,
      attachment: 0,
    };

    // 星座基礎人格
    const zodiacBase = ZodiacPersonalityMap[zodiacSign] || {
      emotion: 70,
      logic: 70,
      social: 70,
      leadership: 70,
      security: 70,
      creativity: 70,
      risk: 70,
      attachment: 70,
    };

    // 生日微調（逐日）
    const date = new Date(birthDate);
    const dayOfMonth = date.getDate();
    const birthdayAdjust = BirthdayPersonalityMap[dayOfMonth] || {};

    // 月份微調（季節性）
    const monthOfYear = date.getMonth() + 1;
    const seasonAdjust = this.getSeasonAdjustment(monthOfYear);

    // 合併
    for (const key of Object.keys(matrix) as (keyof PersonalityMatrix)[]) {
      const zodiacVal = zodiacBase[key] || 70;
      const birthdayVal = (birthdayAdjust[key] || 0) * 5; // 放大倍數
      const seasonVal = (seasonAdjust[key] || 0) * 3;
      matrix[key] = Math.max(0, Math.min(100, zodiacVal + birthdayVal + seasonVal));
    }

    return matrix;
  }

  /**
   * 從地模型提取人格參數（35%）
   */
  static extractEarthModel(
    bloodType: "A" | "B" | "AB" | "O",
    voiceCharacteristics: string[] = []
  ): Partial<PersonalityMatrix> {
    const matrix: Partial<PersonalityMatrix> = {
      emotion: 0,
      logic: 0,
      social: 0,
      leadership: 0,
      security: 0,
      creativity: 0,
      risk: 0,
      attachment: 0,
    };

    // 血型人格基礎
    const bloodTypeBase = BloodTypeMap[bloodType] || {
      emotion: 70,
      logic: 70,
      social: 70,
      leadership: 70,
      security: 70,
      creativity: 70,
      risk: 70,
      attachment: 70,
    };

    // 聲音特徵修正
    let voiceAdjust: Record<string, number> = {
      emotion: 0,
      logic: 0,
      social: 0,
      leadership: 0,
      security: 0,
      creativity: 0,
      risk: 0,
      attachment: 0,
    };
    for (const characteristic of voiceCharacteristics) {
      const charAdjust = VoiceCharacteristicMap[characteristic] || {};
      for (const key of Object.keys(charAdjust)) {
        voiceAdjust[key] = (voiceAdjust[key] ?? 0) + (charAdjust[key] ?? 0);
      }
    }

    // 合併
    for (const key of Object.keys(matrix) as (keyof PersonalityMatrix)[]) {
      const bloodVal = bloodTypeBase[key] || 70;
      const voiceVal = (voiceAdjust[key] || 0) * 1.5;
      matrix[key] = Math.max(0, Math.min(100, bloodVal + voiceVal));
    }

    return matrix;
  }

  /**
   * 從人模型提取人格參數（30%）
   * 人 = 姓名 + 性別（男女）+ 時辰（時辰加成於 generatePersonalityMatrix 併入）
   */
  static extractHumanModel(
    firstName: string,
    gender: "male" | "female" | "non-binary",
    lastName?: string,
  ): Partial<PersonalityMatrix> {
    const matrix: Partial<PersonalityMatrix> = {
      emotion: 70,
      logic: 70,
      social: 70,
      leadership: 70,
      security: 70,
      creativity: 70,
      risk: 70,
      attachment: 70,
    };

    // 姓名筆畫分析（第一字）
    const nameChar = firstName.charAt(0);
    const strokeCount = this.estimateStrokeCount(nameChar);
    const nameAdjust = NameSemanticMap[strokeCount] || {};

    // 聲調偏好（漢語聲調或拼音）
    const toneAdjust = this.getToneAdjustment(firstName);

    // 性別（男女）修正：併入人 30%，不再算在地層
    const genderVoice = GenderVoiceMap[gender];
    const genderModifier = genderVoice?.emotionModifier || {};

    // 合併
    for (const key of Object.keys(matrix) as (keyof PersonalityMatrix)[]) {
      const baseVal = matrix[key] ?? 70;
      const nameVal = (nameAdjust[key] ?? 0) * 3;
      const toneVal = (toneAdjust[key] ?? 0) * 2;
      const genderVal = (genderModifier[key] ?? 0) * 2;
      matrix[key] = Math.max(0, Math.min(100, baseVal + nameVal + toneVal + genderVal));
    }

    return matrix;
  }

  /**
   * 融合三模型生成最終人格矩陣
   * 公式：天 35% + 地 35% + 人 30% + 聲音校正
   */
  static generatePersonalityMatrix(
    input: PersonalityMatrixInput,
    destinyAdjust?: Partial<PersonalityMatrix>,
    shichenAdjust?: Partial<PersonalityMatrix>,
  ): PersonalityMatrix {
    const sky = this.extractSkyModel(input.birthDate, input.zodiacSign);
    const earth = this.extractEarthModel(input.bloodType, input.voiceCharacteristics);
    const human = this.extractHumanModel(input.firstName, input.gender, input.lastName);

    const result: PersonalityMatrix = {
      emotion: 0, logic: 0, social: 0, leadership: 0,
      security: 0, creativity: 0, risk: 0, attachment: 0,
    };

    // 時辰（八字時柱）併入「人 30%」子層，不另立權重；放大係數讓它有感但不壓過姓名。
    const SHICHEN_SCALE = 2;

    for (const key of Object.keys(result) as (keyof PersonalityMatrix)[]) {
      const skyVal = sky[key] || 70;
      const earthVal = earth[key] || 70;

      // 人層 = 姓名 + 時辰（時辰加成併進人 30% 內，不超出三層權重）
      const shichenBoost = (shichenAdjust?.[key] ?? 0) * SHICHEN_SCALE;
      const humanVal = Math.max(0, Math.min(100, (human[key] || 70) + shichenBoost));

      // 公式：天 35% + 地 35% + 人 30%
      let score = skyVal * 0.35 + earthVal * 0.35 + humanVal * 0.3;

      // 命理加成（五行 + 生肖）：在天模型基礎上疊加，影響 ±8%
      if (destinyAdjust?.[key]) {
        score += destinyAdjust[key]! * 0.08;
      }

      result[key] = Math.max(0, Math.min(100, Math.round(score)));
    }

    return result;
  }

  /**
   * 輔助方法：估計漢字筆畫（簡化版）
   */
  private static estimateStrokeCount(char: string): number {
    const charCode = char.charCodeAt(0);
    // 簡化邏輯：根據字碼估計筆畫
    return ((charCode % 20) + 1) * 5;
  }

  /**
   * 輔助方法：聲調調整
   */
  private static getToneAdjustment(firstName: string): Partial<PersonalityMatrix> {
    // 簡化邏輯：根據首字母判斷發音氣質
    const firstChar = firstName.toLowerCase().charAt(0);
    const mapping: Record<string, Partial<PersonalityMatrix>> = {
      a: { emotion: 5, creativity: 3 },
      e: { emotion: 3, attachment: 5 },
      i: { logic: 3, security: 5 },
      o: { social: 5, leadership: 3 },
      u: { creativity: 5, emotion: 2 },
    };
    return mapping[firstChar] || {};
  }

  /**
   * 輔助方法：季節調整
   */
  private static getSeasonAdjustment(month: number): Partial<PersonalityMatrix> {
    const seasonMap: Record<number, Partial<PersonalityMatrix>> = {
      1: { security: 5, emotion: -3 }, // 冬：安穩但內向
      2: { emotion: 3, creativity: 2 }, // 冬末：萌動
      3: { creativity: 5, risk: 3 }, // 春：創新
      4: { social: 5, leadership: 2 }, // 春：社交
      5: { emotion: 5, creativity: 3 }, // 春末：感受力
      6: { emotion: 8, risk: 3 }, // 夏：熱情
      7: { creativity: 5, emotion: 5 }, // 盛夏：自由
      8: { leadership: 5, social: 3 }, // 夏末：主動
      9: { logic: 3, security: 3 }, // 秋：理性
      10: { attachment: 5, emotion: 2 }, // 秋：思念
      11: { logic: 5, security: 5 }, // 晚秋：內斂
      12: { security: 8, creativity: -2 }, // 冬：沉靜
    };
    return seasonMap[month] || {};
  }
}
