// lib/nameologyEngine.ts
import fs from 'fs';
import path from 'path';

/**
 * 知識庫結構：每個漢字映射到部首、意象說明與命名意圖。
 * 例子：
 * {
 *   "安": { radical: "宀", meaning: "安穩、守護", namingIntent: "求平安" },
 *   "文": { radical: "文", meaning: "文化、才華", namingIntent: "期望有文采" }
 * }
 */
export interface GlyphInfo {
  radical: string;
  meaning: string;
  namingIntent: string;
}

export interface CharInfo {
  position: number; // 字在姓名中的次序
  char: string; // 本身字形
  role: string; // 例如 主、輔
  strokeCount: number; // 笔画数（可在後續擴充）
  element: string; // 五行
  yinYang: string; // 陰陽
  glyph: GlyphInfo; // 部首 + 意境說明
  tendencies: Array<{ key: string; label: string }>; // 簡化版性情趨勢
}

export interface NameologyAnalysis {
  name: string;
  characters: CharInfo[];
  // 其餘屬性（分數、格局、性情等）在前端已有結構，這裡僅提供拆字資料。
}

/**
 * 載入姓名學知識庫。若檔案不存在或解析失敗，回傳空物件，後續會以「未知」填充。
 */
const knowledgePath = path.resolve(__dirname, '..', 'data', 'nameologyKnowledge.json');
let knowledge: Record<string, { radical: string; meaning: string; namingIntent: string }> = {};
try {
  const raw = fs.readFileSync(knowledgePath, 'utf-8');
  knowledge = JSON.parse(raw);
} catch (e) {
  console.warn('Nameology knowledge base not found, fallback to empty.');
}

/**
 * 依據姓名字串返回每個字的部首與意境資訊。
 * - 文字分割使用 `Array.from` 以支援 Unicode 組字。
 * - 若字典中找不到對應資料，使用預設「未知」文字。
 */
export async function analyze(name: string): Promise<NameologyAnalysis> {
  const chars = Array.from(name.trim());
  const characters: CharInfo[] = chars.map((ch, idx) => {
    const info = knowledge[ch] || { radical: '未知', meaning: '暫無資料', namingIntent: '無說明' };
    return {
      position: idx + 1,
      char: ch,
      role: '主', // 目前僅示範，未來可根據姓/名位置調整
      strokeCount: 0, // TODO: 透過字典或第三方 API 取得筆畫數
      element: '-', // TODO: 依五行映射
      yinYang: '-', // TODO: 依陰陽屬性映射
      glyph: {
        radical: info.radical,
        meaning: info.meaning,
        namingIntent: info.namingIntent,
      },
      tendencies: [], // 後端可自行呼叫 AI 生成或直接返回空陣列
    } as CharInfo;
  });

  return {
    name,
    characters,
  } as NameologyAnalysis;
}
