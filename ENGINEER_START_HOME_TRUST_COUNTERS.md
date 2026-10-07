# 🚀 首頁信任統計系統 — 工程師快速開工指南

**版本**：HOME_TRUST_COUNTERS_V2  
**狀態**：🔴 RED (寫測試中)  
**目標**：三個獨立計數 + 共用後端資料源  

---

## 📋 核心需求（不得偏離）

### ✅ 三個獨立功能
```
1. 認同 +1       (agree.counter.ts)
2. 不認同 +1     (disagree.counter.ts)
3. 瀏覽 +1       (views.counter.ts)
```

### ✅ 共用後端資料源
```
三個功能各自有獨立檔案

但是：

所有數字存在同一個資料庫表
home_trust_counters

id = "home"
```

### ✅ 原子性增量（Atomic Increment）
```
禁止：
  agree_count = 715

正確：
  agree_count = agree_count + 1

資料庫負責執行：
  UPDATE home_trust_counters
  SET agree_count = agree_count + 1
  WHERE id = 'home'
```

### ✅ 單調遞增（Monotonic Counter）
```
新值必須 >= 舊值
正常操作只允許 +1

禁止倒退、歸零、跳躍
```

---

## 📁 檔案結構（已建立）

```
lib/home-trust/
  ├── counters.types.ts          ✅ 資料型別定義
  ├── counters.repository.ts      ✅ 資料庫層（唯一入口）
  ├── counters.handlers.ts        ✅ 三個獨立處理程序
  ├── counters.health.ts          ✅ 健康檢查模組
  ├── counters.guard.ts           ⏳ 防重複送出（待實作）
  ├── counters.api.ts             ⏳ API 路由（待實作）
  ├── counters.client.ts          ⏳ 前端客戶端（待實作）
  └── counters.test.ts            ⏳ 整合測試（待實作）

tests/
  └── home-trust-counters.test.ts ✅ TDD 測試套件
```

---

## 🔴 TDD 階段 1：RED

### 已建立的測試

**tests/home-trust-counters.test.ts**

```bash
npm test -- home-trust-counters.test.ts
```

預期：全部 FAIL ❌

#### 6 個測試：

| 序號 | 測試名稱 | 目的 |
|------|---------|------|
| 01 | 認同計數 +1 | 驗證認同能正確增加 |
| 02 | 不認同計數 +1 | 驗證不認同能正確增加 |
| 03 | 瀏覽計數 +1 | 驗證瀏覽能正確增加 |
| 04 | Reload 後不倒退 | 驗證持久化 |
| 05 | 單調性約束 | 驗證不能倒退/跳躍 |
| 06 | 三端同步 | 驗證手機/平板/電腦一致 |

---

## 🟢 TDD 階段 2：GREEN

### 最小修改讓測試通過

#### 步驟 1：實作資料庫模擬

檔案：`lib/home-trust/counters.repository.ts`

```typescript
// 目前是模擬資料庫
let mockDatabase: HomeTrustCountersRecord = {
  id: 'home',
  agree_count: 714,
  disagree_count: 74,
  view_count: 110399,
  updated_at: new Date().toISOString(),
};

// TODO: 連接真實資料庫
// - PostgreSQL / MySQL / MongoDB
// - 確保原子性 Increment
```

#### 步驟 2：實作原子性增量

```typescript
// counters.repository.ts 裡的 atomicIncrementInDatabase()

async function atomicIncrementInDatabase(
  field: 'agree_count' | 'disagree_count' | 'view_count'
): Promise<HomeTrustCountersRecord> {
  // 真實資料庫應該：
  // UPDATE home_trust_counters
  // SET [field] = [field] + 1, updated_at = NOW()
  // WHERE id = 'home'
  // RETURNING *
  
  mockDatabase[field] += 1;
  return mockDatabase;
}
```

#### 步驟 3：確認測試通過

```bash
npm test -- home-trust-counters.test.ts
```

預期：全部 PASS ✅

---

## 🔵 TDD 階段 3：REFACTOR

### 整理程式碼（測試保持通過）

#### 待實作的獨立檔案

```typescript
// agree.counter.ts
export async function handleAgreeIncrement() { ... }

// disagree.counter.ts
export async function handleDisagreeIncrement() { ... }

// views.counter.ts
export async function handleViewIncrement() { ... }
```

#### 防重複送出保護

檔案：`counters.guard.ts`

```typescript
// 防止同一 Request 重複執行
export async function withRequestGuard(
  requestId: string,
  handler: () => Promise<T>
): Promise<T> {
  if (isPending(requestId)) {
    throw new Error('DUPLICATE_REQUEST');
  }
  
  setPending(requestId);
  try {
    return await handler();
  } finally {
    clearPending(requestId);
  }
}
```

#### API 路由

檔案：`counters.api.ts` 或 `app/api/home-trust/route.ts`

```typescript
// GET /api/home-trust
export async function GET() {
  const counters = await getCurrentCounters();
  return Response.json(counters);
}

// POST /api/home-trust/agree
export async function POST(req: Request) {
  if (req.nextUrl.pathname.endsWith('/agree')) {
    const result = await handleAgreeIncrement();
    return Response.json(result);
  }
  // ...
}
```

#### 前端客戶端

檔案：`counters.client.ts`

```typescript
// 前端 Optimistic UI + 同步
export async function incrementAgreeUI() {
  // 1. 立即顯示 +1 (Optimistic)
  setCounters(prev => ({
    ...prev,
    agreeCount: prev.agreeCount + 1
  }));
  
  // 2. 送後端
  try {
    const result = await fetch('/api/home-trust/agree', { method: 'POST' });
    
    // 3. 確認成功，保留 +1
    setCounters(await result.json());
  } catch (error) {
    // 4. 失敗，回滾
    const latest = await fetch('/api/home-trust');
    setCounters(await latest.json());
  }
}
```

---

## ⏰ 開發時間表

```
🔴 RED (今天)：
  ✅ 寫測試
  ✅ 確認全部 FAIL

🟢 GREEN (明天)：
  ⏳ 實作資料庫
  ⏳ 實作原子性
  ⏳ 確認全部 PASS

🔵 REFACTOR (後天)：
  ⏳ 分離獨立檔案
  ⏳ 加入保護機制
  ⏳ 實作 API 和前端
  ⏳ 最終測試
```

---

## 🔍 健康檢查

隨時運行：

```bash
npm run health:home-trust
```

或在程式碼中：

```typescript
import { runHomeTrustCounterHealthCheck } from './lib/home-trust/counters.health';

const health = await runHomeTrustCounterHealthCheck();
console.log(health);
```

檢查項目：

```
✓ AGREE_READ       讀取認同
✓ AGREE_WRITE      寫入認同
✓ DISAGREE_READ    讀取不認同
✓ DISAGREE_WRITE   寫入不認同
✓ VIEW_READ        讀取瀏覽
✓ VIEW_WRITE       寫入瀏覽
✓ DATABASE         資料庫連線
✓ CROSS_DEVICE     三端一致
✓ MONOTONIC        單調性約束

总体: PASSED ✅
```

---

## 🚫 永久禁止清單

```
禁止：
  ❌ 前端直接修改計數
  ❌ localStorage 作為正式數據
  ❌ 資料庫每次 Deploy 覆蓋
  ❌ agree_count = 715（直接賦值）
  ❌ 計數倒退
  ❌ 顯示「人」字
  ❌ 顯示「瀏覽人數」
  ❌ 重複送出（超過一次）

只允許：
  ✅ agree_count = agree_count + 1
  ✅ 原子性增量
  ✅ 單調遞增
  ✅ 三端同步
  ✅ 後端唯一數據源
```

---

## 📞 立即開工清單

```
[ ] 1. 讀完本指南
[ ] 2. 查看 tests/home-trust-counters.test.ts
[ ] 3. 運行 npm test -- home-trust-counters
[ ] 4. 確認全部 FAIL（紅燈）
[ ] 5. 打開 lib/home-trust/counters.repository.ts
[ ] 6. 實作 atomicIncrementInDatabase()
[ ] 7. 運行測試，確認 PASS（綠燈）
[ ] 8. 分離獨立檔案
[ ] 9. 實作 API 和前端
[ ] 10. 最終健康檢查
[ ] 11. Push & PR
```

---

## 🆘 遇到問題

| 問題 | 解決 |
|------|------|
| 測試不 FAIL | 檢查 counters.repository.ts 是否真正實作 |
| 測試不 PASS | 檢查原子性增量邏輯 |
| 三端不同步 | 檢查資料庫是否真的有存 |
| 單調性失敗 | 確保只 +1，不能倒退 |

---

## ✅ 完成標記

當以下全部完成時，這個功能才算「Done」：

```
TDD 完成:
  ✅ 6/6 測試通過
  ✅ 健康檢查通過
  
代碼完成:
  ✅ 三個獨立檔案
  ✅ 共用 Repository
  ✅ API 端點
  ✅ 前端客戶端
  ✅ 防重複保護
  
驗收:
  ✅ 手機認同 +1
  ✅ 平板不認同 +1
  ✅ 電腦瀏覽 +1
  ✅ 三端看到相同數字
  ✅ 數字不倒退
  ✅ 無重複送出
  
上線:
  ✅ 已提交 PR
  ✅ Code Review 通過
  ✅ 已部署生產
  ✅ 監控正常
```

---

**準備好了嗎？** 🚀

開始寫測試！

```bash
npm test -- home-trust-counters.test.ts
```

加油！💪
