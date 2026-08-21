import 'server-only';

import os from 'node:os';
import path from 'node:path';

/**
 * 本地檔案計數器（like/suggestion/visitor）共用的可寫入資料夾。
 *
 * 2026-08-23 修正：正式站（Vercel）已證實這幾個計數器 API 100% 回 503——
 * 根因是舊寫法固定用 `path.join(process.cwd(), 'data')`，但 Vercel serverless
 * 執行環境裡專案目錄是唯讀的，只有 `/tmp` 可寫，導致每次 `mkdir`/`writeFile`
 * 都丟出 EROFS，整條計數器邏輯連讀帶寫都失敗。
 *
 * 修法：Vercel 執行環境一律會設定 `VERCEL` 這個環境變數，偵測到就改用
 * `os.tmpdir()`（Vercel 上等於 `/tmp`，可寫，但跨執行個體不保證共用——
 * 這跟專案其他地方對這類暫存資料的一致限制是同一件事，不是新問題）；
 * 本機開發環境維持原本寫進專案 `data/` 資料夾的行為，不影響現有本機檔案。
 */
export function resolveLocalDataDirectory(): string {
  const base = process.env.VERCEL ? os.tmpdir() : process.cwd();
  return path.join(base, 'data');
}
