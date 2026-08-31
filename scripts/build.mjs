#!/usr/bin/env node

// Production builds must never write into the `.next` directory that a running
// dev server is serving from. Sharing it lets the build replace dev manifests
// mid-session, which surfaces as a frozen page or a `clientReferenceManifest`
// runtime failure until the dev server is restarted — the exact hazard the
// `distDir` comment in next.config.mjs describes.
//
// next.config.mjs already honours NEXT_DIST_DIR, so a local build only needs to
// point it at the isolated directory `.gitignore` reserves for exactly this.
// On Vercel the default `.next` is kept so deployment output detection and the
// framework preset behave exactly as before.

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_BIN = path.join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const LOCAL_DIST_DIR = '.next-production';

const isVercel = Boolean(process.env.VERCEL);
const env = { ...process.env };

// An explicit NEXT_DIST_DIR from the caller always wins, so one-off builds can
// still target a custom directory without editing this script.
if (!isVercel && !env.NEXT_DIST_DIR) {
  env.NEXT_DIST_DIR = LOCAL_DIST_DIR;
}

const distDir = env.NEXT_DIST_DIR || '.next';
const context = isVercel
  ? 'Vercel 預設目錄，部署行為不變'
  : '本地隔離目錄，不影響執行中的 dev server';
console.log(`[build] 產物目錄：${distDir}（${context}）`);

const child = spawn(process.execPath, [NEXT_BIN, 'build'], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
  env,
});

child.on('error', (error) => {
  console.error('[build] 無法啟動 next build：', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[build] next build 被訊號中止：${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
