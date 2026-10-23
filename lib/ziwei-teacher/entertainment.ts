// 2026-10-23 ai-to-asura：娛樂老師直接轉用鬼魅老師的決定性內容，已移除 Google AI SDK 與 runOne／prompt 死碼。
/**
 * 娛樂老師（恐怖／鬼魅，2026-08-22）
 *
 * 跟三位專業老師（./teachers.ts）是兩套完全獨立的呼叫路徑，不共用 prompt、不共用 schema、
 * 不混進同一份輸出。這兩位老師被明確授權可以在真實星曜/宮位之外加入虛構的靈異情節，
 * 但角色與場景靈感仍須借用下面提供的真實命盤資料（不是憑空亂編跟命盤無關的內容），
 * 且禁止：宣稱真實命運預測、恐嚇使用者、色情或血腥暴力細節、代入真實他人姓名。
 * 每次輸出固定附上 disclaimer，前端必須原樣顯示，不得拿掉。
 */

import type { PalaceAnalysisContext } from './types';
import type { EntertainmentTeacherId, EntertainmentTeacherResult } from './entertainment-types';
import { runNarrativeTeacher } from './teachers';
import { INSUFFICIENT_DATA } from './types';
const DISCLAIMER = '本篇為娛樂虛構創作，靈感借用命盤星曜與宮位，並非命理專業判讀，請勿當真。';

export async function runEntertainmentTeacher(teacherId: EntertainmentTeacherId, context: PalaceAnalysisContext): Promise<EntertainmentTeacherResult> {
  const result = await runNarrativeTeacher(context);
  if (result === INSUFFICIENT_DATA) throw new Error('命盤資料不足，請先完成命盤。');
  return {
    teacherId, title: result.visualTitle, openingScene: result.scene,
    narrative: result.story, chillingTwist: result.futureShadow,
    closingWhisper: result.finalMetaphor, inspiredBy: result.evidenceRefs,
    disclaimer: DISCLAIMER,
  };
}
