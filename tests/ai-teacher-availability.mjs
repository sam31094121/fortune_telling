#!/usr/bin/env node
/**
 * 健檢：易經老師／鬼魅老師真的接得上 AI 嗎？
 *
 * 紫微三老師在 AI 失敗時會安靜地改用本地統計後備文字，畫面照樣有內容、API 照樣 200，
 * 所以「老師變得怪怪的」完全不會出現在路由健檢裡。2026-09-15 就是這樣：
 * Gemini 專案月度花費上限用完，全站老師都在走後備，健檢卻綠燈。
 *
 * 這一支只打一次最小請求（5 個 token），不印金鑰，失敗就把原因翻成中文。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readKey() {
  const fromEnv = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (fromEnv) return fromEnv;
  const envFile = path.join(ROOT, '.env.local');
  if (!existsSync(envFile)) return null;
  return /^\s*(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)\s*=\s*"?([^"\r\n]+)"?/m.exec(readFileSync(envFile, 'utf8'))?.[1] ?? null;
}

function readModel() {
  const source = readFileSync(path.join(ROOT, 'lib', 'ziwei-teacher', 'teachers.ts'), 'utf8');
  return /const\s+MODEL_NAME\s*=\s*['"`]([^'"`]+)['"`]/.exec(source)?.[1] ?? null;
}

function explain(status, providerStatus, message) {
  if (/spending cap/i.test(message)) return 'Google AI 專案的「每月花費上限」已經用完，老師全部改走後備文字。請到 AI Studio → Spend 調高上限。';
  if (status === 429) return 'Google AI 額度或速率已達上限，老師暫時改走後備文字。';
  if (status === 400 && /api key/i.test(message)) return 'GEMINI_API_KEY 無效。';
  if (status === 403) return 'GEMINI_API_KEY 沒有權限使用這個模型。';
  if (status === 404) return '模型名稱不存在或已下架，請檢查 MODEL_NAME。';
  return `Google AI 回應異常（${status} ${providerStatus ?? ''}）。`;
}

async function main() {
  console.log('\n易經老師／鬼魅老師 AI 連線健檢');
  const key = readKey();
  const model = readModel();
  if (!key) throw new Error('找不到 GEMINI_API_KEY，老師只能走後備文字。');
  if (!model) throw new Error('lib/ziwei-teacher/teachers.ts 找不到 MODEL_NAME。');

  const startedAt = Date.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: '只回一個字：好' }] }],
      generationConfig: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  const ms = Date.now() - startedAt;

  if (!response.ok || body.error) {
    const reason = explain(response.status, body.error?.status, String(body.error?.message ?? ''));
    console.log(`FAIL 模型 ${model}（HTTP ${response.status}，${ms}ms）\n     → ${reason}`);
    console.log('AI_TEACHER_AVAILABLE=false');
    // 不用 process.exit()：Windows 上 fetch 的連線還在關，強制退出會觸發 libuv 斷言崩潰。
    process.exitCode = 1;
    return;
  }
  console.log(`PASS 模型 ${model} 可用（${ms}ms）`);
  console.log('AI_TEACHER_AVAILABLE=true');
}

main().catch((error) => {
  console.log(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  console.log('AI_TEACHER_AVAILABLE=false');
  process.exitCode = 1;
});
