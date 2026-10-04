#!/usr/bin/env node

/**
 * 快速設定管理員後台
 *
 * 使用方式：
 *   npx node scripts/setup-admin.mjs
 *
 * 會生成需要的環境變數
 */

import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.cwd();
const ENV_FILE = join(CWD, '.env.local');
const ENV_EXAMPLE = join(CWD, '.env.example');

console.log('\n🔐 管理員後台快速設定工具\n');

// ========== 步驟 1：生成 SESSION_SECRET ==========
console.log('📝 生成 ADMIN_SESSION_SECRET...');
const sessionSecret = randomBytes(32).toString('hex');
console.log(`✅ ${sessionSecret}\n`);

// ========== 步驟 2：提示用户配置 ==========
console.log('⚙️  需要配置的環境變數：\n');
console.log('1. ADMIN_MASTER_PASSWORD');
console.log('   ➜ 設定為：A7k9$Lm2@Qx8Pn\n');

console.log('2. ADMIN_SESSION_SECRET（已生成）');
console.log(`   ➜ ${sessionSecret}\n`);

console.log('3. ADMIN_AUTHORIZED_IPS');
console.log('   ➜ 需要你的 IP 地址');
console.log('   ➜ 訪問 http://localhost:8888/api/admin/ip-check 查詢\n');

// ========== 步驟 3：嘗試更新 .env.local ==========
console.log('📁 檢查 .env.local...\n');

let envContent = '';
if (existsSync(ENV_FILE)) {
  envContent = readFileSync(ENV_FILE, 'utf-8');
  console.log('✅ .env.local 已存在\n');
} else {
  console.log('⚠️  .env.local 不存在，將建立\n');
}

// ========== 步驟 4：生成配置片段 ==========
const adminConfig = `
# ========== 管理員認證 ==========
ADMIN_MASTER_PASSWORD=A7k9$Lm2@Qx8Pn
ADMIN_SESSION_SECRET=${sessionSecret}
# ⚠️ IMPORTANT: 替換為你的 IP 地址（訪問 /api/admin/ip-check 查詢）
ADMIN_AUTHORIZED_IPS=YOUR_IP_ADDRESS_HERE
`;

console.log('📋 請複製以下內容到 .env.local：\n');
console.log('─'.repeat(60));
console.log(adminConfig);
console.log('─'.repeat(60));
console.log('\n');

console.log('📝 手動步驟：\n');
console.log('1. 打開 .env.local 文件');
console.log('2. 複製上面的內容');
console.log('3. 訪問 http://localhost:8888/api/admin/ip-check');
console.log('4. 將回應中的 clientIP 替換 YOUR_IP_ADDRESS_HERE');
console.log('5. 保存文件');
console.log('6. 重啟開發伺服器 (npm run dev)\n');

console.log('✅ 設定完成後，訪問 http://localhost:8888/admin 登入\n');
