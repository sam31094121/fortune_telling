/**
 * 鬼魅阿修羅｜技能檔案 API
 * GET → { ok, file }：後端組好的技能檔案（固定順序的區塊與顯示單位），前端只照印。
 * 與 /ghost-asura/skill 頁面使用同一個函式 buildAsuraSkillFile()。
 */
import { NextResponse } from 'next/server';
import { buildAsuraSkillFile } from '@/lib/ghost-asura-skill-file';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ ok: true, file: buildAsuraSkillFile() });
}
