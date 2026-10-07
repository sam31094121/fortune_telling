# 三合一優化指南

## 概述

三合一優化層在既有的 `lib/three-in-one.ts` 外加一層，提供：
1. **性能指標** — 每個階段的耗時追蹤
2. **快取機制** — 相同輸入的結果快取（5 分鐘有效期）
3. **診斷資訊** — 執行追蹤、檢查點記錄
4. **結果一致性** — 保證相同輸入的相同結果

## 快速開始

### 基本使用

```typescript
import { runThreeInOneOptimized } from '@/lib/three-in-one-optimizer';

const result = await runThreeInOneOptimized({
  birthDate: '1974-06-28',
  birthTime: '18:00',
  gender: 'male',
}, {
  useCache: true,        // 啟用快取
  enableDiagnostics: true // 啟用診斷
});

// 結果包含：
// - result.success / result.status （原始結果）
// - result.metrics （性能指標）
// - result.diagnostics （診斷資訊）
```

### 查看性能指標

```typescript
import { formatMetrics } from '@/lib/three-in-one-optimizer';

console.log(formatMetrics(result.metrics));
/*
總耗時: 234.56ms

各階段耗時:
  輸入驗證: 1.23ms
  八字計算: 58.67ms
  紫微計算: 58.67ms
  四柱驗證: 35.20ms
  易經計算: 70.40ms
  結果組裝: 10.39ms

記憶體(估計): 42.15 KB
*/
```

### 查看診斷資訊

```typescript
import { formatDiagnostics } from '@/lib/three-in-one-optimizer';

console.log(formatDiagnostics(result.diagnostics));
/*
執行 ID: three-in-one-1728301345678-abc1d2e
時間戳: 2026-10-07T14:39:45.678Z
輸入簽名: 10|5|male
快取狀態: ❌ 未命中

檢查點:
  [SKIP] cache_miss (0.00ms) — 快取未命中，開始新計算
  [PASS] input_validation (1.23ms) — 輸入驗證通過
  [PASS] three_in_one_execution (232.90ms) — 三合一執行完成，狀態：PASSED
*/
```

## API 參考

### `runThreeInOneOptimized(input, options)`

執行三合一並返回帶有性能和診斷資訊的結果。

**參數：**
- `input: UnifiedInput` — 出生資訊
- `options?: { useCache?: boolean; enableDiagnostics?: boolean }`
  - `useCache` — 使用快取（預設 `true`）
  - `enableDiagnostics` — 記錄診斷資訊（預設 `true`）

**返回：**
- `Promise<ThreeInOneOptimizedResult>`
  - 包含原始結果 + `metrics` + `diagnostics`

### `ThreeInOneCacheManager.clearAll()`

清除所有快取。

```typescript
ThreeInOneCacheManager.clearAll();
```

### `ThreeInOneCacheManager.stats()`

取得快取狀態。

```typescript
const { size, maxSize } = ThreeInOneCacheManager.stats();
console.log(`${size} / ${maxSize}`);
```

### `formatMetrics(metrics)`

將性能指標格式化為人類可讀的文字。

### `formatDiagnostics(diagnostics)`

將診斷資訊格式化為人類可讀的文字。

## 性能特性

### 快取機制

- **快取時間**：5 分鐘
- **快取大小**：最多 100 個結果
- **快取鍵**：`birthDate|birthTime|hourBranchIndex|gender` (Base64 編碼)
- **快取命中**：完全相同的輸入才會命中

快取命中時，耗時通常減少 **10-20 倍**（例如 200ms → 10ms）。

### 指標精度

性能指標是**估計值**，用於診斷和監控，不應作為 SLA 的基礎。實際耗時會因系統負載而變化。

各階段耗時的分配方式：
- **成功**（PASSED）：按預設比例分配
- **失敗**：按實際失敗點分配耗時

## 診斷最佳實踐

### 1. 追蹤執行流程

```typescript
const result = await runThreeInOneOptimized(input);
console.log(`執行 ID: ${result.diagnostics.executionId}`);
// 用此 ID 在日誌系統中搜尋所有相關的操作
```

### 2. 監控性能退化

```typescript
const result = await runThreeInOneOptimized(input);
if (result.metrics.totalMs > 1000) {
  // 性能告警：耗時超過 1 秒
  logger.warn(`三合一耗時過長: ${result.metrics.totalMs}ms`, {
    executionId: result.diagnostics.executionId,
  });
}
```

### 3. 驗證快取命中率

```typescript
const hitStats = [];
for (let i = 0; i < 100; i++) {
  const result = await runThreeInOneOptimized(input);
  hitStats.push(result.diagnostics.cacheStatus.hit);
}
const hitRate = hitStats.filter(Boolean).length / hitStats.length;
console.log(`快取命中率: ${(hitRate * 100).toFixed(1)}%`);
```

## 故障排查

### 問題：快取沒有命中

**原因**：輸入中有細微差異（空格、大小寫等）

**解決**：確保輸入完全一致
```typescript
// ❌ 不會命中快取
const result1 = await runThreeInOneOptimized({
  ...input,
  birthTime: '18:00 ', // 末尾有空格
});

// ✅ 會命中快取
const result2 = await runThreeInOneOptimized({
  ...input,
  birthTime: '18:00',   // 無空格
});
```

### 問題：性能指標顯示耗時為 0

**原因**：可能是因為系統時鐘解析度或計時誤差

**解決**：快取命中時耗時會非常短，這是正常的

### 問題：診斷資訊缺失

**原因**：`enableDiagnostics` 設為 `false`

**解決**：
```typescript
const result = await runThreeInOneOptimized(input, {
  enableDiagnostics: true,
});
```

## 未來優化方向

1. **分散式快取** — 支援 Redis 等外部快取
2. **非同步批處理** — 批量執行多個三合一查詢
3. **預熱機制** — 系統啟動時預加載常用輸入
4. **詳細時間分析** — 實時監控各引擎的耗時
5. **動態快取策略** — 根據負載調整快取大小和有效期

## 相關檔案

- `lib/three-in-one.ts` — 原始三合一實現
- `lib/three-in-one-optimizer.ts` — 優化層實現
- `tests/three-in-one-optimizer.test.mjs` — 優化層測試
