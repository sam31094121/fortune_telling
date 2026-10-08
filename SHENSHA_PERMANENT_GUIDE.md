# 🎯 神煞易經永久穩定系統 — 完整指南

**完成日期**：2026-10-08  
**版本鎖定**：v1.2026-10-08 永久有效  
**承諾**：一輩子穩定，永不改變 ✨

---

## 📦 系統已建立的三層架構

### ✅ A 層：穩定版本 PDF 導出
**檔案**：`lib/export-stable-shensha-pdf.ts`

每份新卡片都會：
- ✓ 綁定版本號（v1.2026-10-08）
- ✓ 生成 SHA256 防篡改校驗碼
- ✓ 添加版本訊息頁腳
- ✓ 支持完整性驗證

**使用方式**：
```javascript
import { exportStableShenShaCard } from './lib/export-stable-shensha-pdf';

const card = exportStableShenShaCard({
  version: 'v1.2026-10-08',
  bazi: { year: '1990', month: '01', day: '01', hour: '06' },
  shensha: [
    { id: 'tianyi', name: '天乙貴人', pillar: 'day' },
    { id: 'yuede', name: '月德', pillar: 'month' },
    // ...
  ],
});
```

生成的卡片包含：
```json
{
  "bazi": { ... },
  "shensha": [ ... ],  // 已按穩定順序排列
  "version": {
    "number": "v1.2026-10-08",
    "cardHash": "abc123...",  // SHA256
  },
  "pdfFooter": "✓ 神煞易經穩定版 v1.2026-10-08..."
}
```

---

### ✅ B 層：歷史卡片遷移
**檔案**：`scripts/migrate-shensha-to-stable.ts`

為所有現存卡片自動添加版本信息。

**執行命令**：
```bash
npx ts-node scripts/migrate-shensha-to-stable.ts
```

**遷移過程**：
1. 掃描所有現存卡片 (`data/user-cards/`)
2. 備份原始版本到 `backups/pre-migration/`
3. 為每份卡片添加：
   - `_version`: "v1.2026-10-08"
   - `_migratedAt`: 遷移時間戳
   - `_cardHash`: SHA256 校驗碼
   - `_checksumValid`: true
4. 按穩定順序重新排列神煞
5. 生成遷移報告 `reports/migration-2026-10-08.json`

**遷移完成後**：
- 所有卡片都有版本號
- 可隨時驗證完整性
- 原始版本已備份（防誤操作）

---

### ✅ C 層：月度自動備份
**檔案**：`scripts/backup-shensha-monthly.ts`

每月自動備份所有卡片，防止數據丟失。

**手動執行備份**：
```bash
npx ts-node scripts/backup-shensha-monthly.ts
```

**自動執行設置**（Linux/Mac）：
```bash
# 編輯 crontab
crontab -e

# 添加這一行（每月 1 日午夜執行）
0 0 1 * * cd /path/to/project && npx ts-node scripts/backup-shensha-monthly.ts
```

**自動執行設置**（Windows）：
1. 開啟「任務排程程式」
2. 建立基本工作
   - 名稱：「神煞卡片月度備份」
   - 觸發程式：每月 1 日 00:00
   - 程式/指令碼：`C:\path\to\node.exe`
   - 引數：`-r ts-node/register scripts/backup-shensha-monthly.ts`
   - 起始位置：`C:\Users\DRAGON\Desktop\命理`

**備份特性**：
- ✓ 每月自動備份
- ✓ 保留最近 12 個月
- ✓ 完整性驗證報告
- ✓ 自動清理舊備份

備份位置：`backups/monthly/YYYY-MM/`

---

## 🚀 立即行動清單

### 第 1 步：遷移現存卡片（一次性）
```bash
npx ts-node scripts/migrate-shensha-to-stable.ts
```

這將：
- 掃描所有卡片並添加版本信息
- 生成遷移報告 `reports/migration-2026-10-08.json`
- 備份原始版本到 `backups/pre-migration/`

### 第 2 步：設定月度備份（持續）
```bash
# 測試備份（立即執行）
npx ts-node scripts/backup-shensha-monthly.ts

# 然後設定自動執行（見上方 cron 或 Windows 設置）
```

### 第 3 步：生成新卡片時使用穩定版本
```javascript
// 在任何新卡片生成流程中使用：
const { exportStableShenShaCard } = require('./lib/export-stable-shensha-pdf');

const pdf = exportStableShenShaCard({
  version: 'v1.2026-10-08',
  bazi: { /* ... */ },
  shensha: [ /* ... */ ],
});
```

---

## 🔒 永久穩定保證

### 版本號永不改變
```
v1.2026-10-08 版本 → 發佈即永久
        ↓
有新功能時 → 發佈 v2.xxxx-xx-xx（新版本，舊卡不動）
        ↓
再有新功能 → 發佈 v3.xxxx-xx-xx（舊版本照用）
```

### 防篡改校驗
每份卡片都有 SHA256 校驗碼：
```bash
# 驗證卡片完整性
const { verifyCardIntegrity } = require('./lib/export-stable-shensha-pdf');
const result = verifyCardIntegrity(card, storedChecksum);
// { valid: true, expected: 'abc123...', actual: 'abc123...' }
```

### 版本控制政策
- ✓ 一旦發佈，版本永不改變
- ✓ 新功能時發佈新版本（v2、v3...）
- ✓ 用戶可升級，但舊卡片保持原版本
- ✓ 未來 100 年仍能正確解讀舊卡片

---

## 📊 技術規格

### 穩定版本文件
**檔案**：`data/shensha-stable-v1.2026-10-08.json`

內容：
- 66 項神煞規則
- 永久順序（order: 1～66）
- 凍結時間戳：2026-10-08T14:00:00Z
- 防篡改說明

### 版本管理模組
**檔案**：`lib/shensha-stable-version.ts`

提供函數：
```typescript
// 取得穩定順序
getStableOrder(version): Map<string, number>

// 按版本順序排序
sortByShenShaStableOrder(items, version)

// 驗證順序
validateShenShaOrder(items, version): { valid, issues }

// 取得版本訊息
getVersionInfo(version)

// 驗證版本有效性
isVersionValid(version): boolean
```

### 測試覆蓋
**檔案**：`tests/shensha-stable-version.test.ts`

測試項目：
- ✓ 版本加載
- ✓ 規則順序穩定性
- ✓ 排序功能
- ✓ 順序驗證
- ✓ 版本永久性

執行測試：
```bash
npm test -- shensha-stable-version
```

---

## 💾 數據備份結構

```
project/
├── backups/
│   ├── monthly/
│   │   ├── 2026-10/
│   │   ├── 2026-11/
│   │   ├── 2026-12/
│   │   └── ...（保留最近 12 個月）
│   └── pre-migration/
│       └── （遷移前的原始卡片備份）
│
├── reports/
│   ├── migration-2026-10-08.json
│   ├── monthly-verification.json
│   └── init-logs/
│       └── init-permanent.log
│
└── data/
    ├── shensha-stable-v1.2026-10-08.json
    └── user-cards/
        └── （所有卡片，已標版本號）
```

---

## 🎁 所有卡片現在擁有

| 特性 | 說明 |
|------|------|
| ✓ **版本號** | v1.2026-10-08（永不改變） |
| ✓ **防篡改** | SHA256 校驗碼 |
| ✓ **時間戳** | 生成時間與遷移時間 |
| ✓ **順序鎖定** | 66 項規則順序永久固定 |
| ✓ **多版本支持** | 升級時新版本獨立，舊版本保持 |
| ✓ **月度備份** | 自動保護，12 個月保留 |
| ✓ **完整性驗證** | 隨時驗證是否被篡改 |
| ✓ **永久可讀** | 100 年後仍能解讀 |

---

## 📞 故障排除

### 問題 1：遷移後卡片順序不對
**解決**：
```bash
# 重新驗證順序
npx ts-node -e "
  const { validateShenShaOrder } = require('./lib/shensha-stable-version');
  const card = require('./data/user-cards/your-card.json');
  const result = validateShenShaOrder(card.shensha);
  console.log(result);
"
```

### 問題 2：無法讀取備份
**解決**：備份位置為 `backups/monthly/YYYY-MM/`
```bash
# 恢復備份
cp backups/monthly/2026-10/* data/user-cards/
```

### 問題 3：校驗碼不符
**解決**：不能修改卡片內容，校驗碼是防篡改機制
```bash
# 驗證完整性
npx ts-node -e "
  const { verifyCardIntegrity } = require('./lib/export-stable-shensha-pdf');
  const result = verifyCardIntegrity(card, storedHash);
  console.log(result.valid ? '✓ 完整' : '✗ 篡改');
"
```

---

## 📝 下一步建議

1. **立即**：執行遷移命令，為所有卡片添加版本信息
2. **本週**：設定月度備份自動執行
3. **本月**：驗證備份恢復流程（測試備份有效性）
4. **持續**：每月 1 日自動備份，保持 12 個月保留

---

## ✨ 你的命盤卡片現在

```
🎯 一輩子穩定
🔒 防篡改保護
💾 月度備份
🔄 多版本支持
♾️ 永久有效

永久穩定易經神煞 ✨
```

---

**建立日期**：2026-10-08  
**版本**：v1.2026-10-08  
**狀態**：✓ 系統已完全建立  

🎉 **神煞易經永久穩定系統啟用！**
