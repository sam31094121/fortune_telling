# 🚀 首頁信任統計 + 私密意見回饋 — 工程師開工指南

**版本**：HOME_TRUST_FEEDBACK_SYSTEM_V3  
**日期**：2026-10-07  
**狀態**：🟢 GREEN 階段開始

---

## 📋 檔案結構（已完成）

```
lib/home-trust/

counters/  ✅ 已分離
  ├── counters.types.ts         ✅ 資料型別（4 個介面）
  ├── counters.repository.ts    ✅ 資料庫層（原子性增量）
  ├── counters.handlers.ts      ✅ 三個處理程序
  ├── counters.health.ts        ✅ 9 項健檢
  ├── counters.service.ts       ⏳ 待創建
  ├── agree.counter.ts          ✅ 認同計數（獨立）
  ├── disagree.counter.ts       ✅ 不認同計數（獨立）
  └── views.counter.ts          ✅ 瀏覽計數（獨立）

feedback/  ✅ 已完成
  ├── feedback.types.ts         ✅ 5 個介面
  ├── feedback.repository.ts    ✅ 私密保存層
  └── feedback.service.ts       ✅ 驗證層（4 個驗證函式）

api/  ⏳ 待創建
  ├── home-trust/route.ts       ⏳ GET：取得全部計數
  ├── agree/route.ts            ⏳ POST：認同 +1
  ├── disagree/route.ts         ⏳ POST：不認同 +1
  ├── view/route.ts             ⏳ POST：瀏覽 +1
  ├── feedback/route.ts         ⏳ POST：提交回饋
  └── feedback/stats/route.ts    ⏳ GET：後台統計（需認證）

frontend/  ⏳ 待創建
  ├── HomeTrustCounters.tsx     ⏳ 計數顯示
  ├── FeedbackPrompt.tsx        ⏳ 回饋邀請對話
  └── FeedbackForm.tsx          ⏳ 回饋表單
```

---

## 🎯 GREEN 階段實作清單

### **第一步：建立計數服務層** ⏳ 即刻開始

```typescript
// lib/home-trust/counters/counters.service.ts

建立統一服務層，分派給獨立計數檔案

export async function agreeAction() {
  return incrementAgreeCount();
}

export async function disagreeAction() {
  return incrementDisagreeCount();
}

export async function viewAction() {
  return incrementViewCount();
}
```

### **第二步：建立 API 路由** ⏳ 20 分鐘

```
app/api/home-trust/

[GET]  /route.ts → 返回 { agreeCount, disagreeCount, viewCount }
[POST] /agree/route.ts → 執行認同 +1
[POST] /disagree/route.ts → 執行不認同 +1
[POST] /view/route.ts → 執行瀏覽 +1
[POST] /feedback/route.ts → 提交回饋
[GET]  /feedback/stats/route.ts → 後台統計（驗證）
```

### **第三步：前端 UI** ⏳ 40 分鐘

**計數顯示**
```typescript
// HomeTrustCounters.tsx
- 讀取初始計數
- Optimistic UI（點擊立即 +1）
- 防連續點擊（disable pending 時）
- 三端同步
```

**回饋邀請**
```typescript
// FeedbackPrompt.tsx（認同/不認同後）
- 溫暖文案
- 選擇：繼續 or 留言
```

**回饋表單**
```typescript
// FeedbackForm.tsx
- 可選留言框
- 快速分類選項（不認同時）
- 送出 → 顯示成功訊息
- 失敗不影響計數
```

### **第四步：測試** ⏳ 30 分鐘

```bash
# 執行現有測試
npm test -- home-trust-counters

# 預期結果：6 個測試 PASS
TEST 01: 認同 +1 ✅
TEST 02: 不認同 +1 ✅
TEST 03: 瀏覽 +1 ✅
TEST 04: 無回饋 +1 ✅
TEST 05: 有回饋 ✅
TEST 06: 三端同步 ✅
```

---

## 🔨 建立順序（按此順序）

| # | 任務 | 檔案 | 時間 | 優先度 |
|---|------|------|------|--------|
| 1️⃣ | 計數服務層 | `counters/counters.service.ts` | 10 分 | 🔴 |
| 2️⃣ | GET API | `api/home-trust/route.ts` | 5 分 | 🔴 |
| 3️⃣ | 認同 API | `api/home-trust/agree/route.ts` | 5 分 | 🔴 |
| 4️⃣ | 不認同 API | `api/home-trust/disagree/route.ts` | 5 分 | 🔴 |
| 5️⃣ | 瀏覽 API | `api/home-trust/view/route.ts` | 5 分 | 🔴 |
| 6️⃣ | 回饋 API | `api/home-trust/feedback/route.ts` | 10 分 | 🟡 |
| 7️⃣ | 計數顯示 | `components/HomeTrustCounters.tsx` | 20 分 | 🔴 |
| 8️⃣ | 回饋邀請 | `components/FeedbackPrompt.tsx` | 15 分 | 🟡 |
| 9️⃣ | 回饋表單 | `components/FeedbackForm.tsx` | 15 分 | 🟡 |
| 🔟 | 整合測試 | 手動測試 | 30 分 | 🔴 |

**總時數**：2 小時

---

## ⚡ 快速參考

### **計數 API 格式**

```javascript
// 請求
POST /api/home-trust/agree
{}

// 回應
{
  "success": true,
  "counters": {
    "agreeCount": 715,
    "disagreeCount": 74,
    "viewCount": 110400,
    "updatedAt": "2026-10-07T16:45:00.000Z"
  },
  "timestamp": "2026-10-07T16:45:00.000Z",
  "requestId": "req_1728318300000_a1b2c3d4"
}
```

### **回饋 API 格式**

```javascript
// 請求
POST /api/home-trust/feedback
{
  "vote": "DISAGREE",
  "message": "圖表看不清楚",
  "category": "DISPLAY",
  "deviceType": "mobile"
}

// 回應
{
  "success": true,
  "feedbackId": "fb_1728318300000_x5y6z7a8",
  "timestamp": "2026-10-07T16:45:00.000Z",
  "message": "回饋已收到，感謝你的意見。"
}
```

### **計數顯示組件**

```typescript
// 使用方式
<HomeTrustCounters 
  onAgreeClick={handleAgree}
  onDisagreeClick={handleDisagree}
  onViewTrack={handleView}
  isLoading={loading}
/>

// 返回
{
  agreeCount: 715,
  disagreeCount: 74,
  viewCount: 110400,
  lastUpdated: "2026-10-07T16:45:00.000Z"
}
```

---

## 🚫 禁止清單（必須遵守）

```
❌ 直接賦值：agree_count = 715
❌ 倒退計數：agree_count -= 1
❌ 歸零操作：agree_count = 0
❌ Deploy 時覆蓋數字
❌ 在前端儲存計數主資料
❌ 顯示「人」字（是「次數」不是「人數」）
❌ 公開留言板
❌ 使用者互相回覆留言
❌ 強迫填寫身份資訊
❌ 蒐集真實姓名、電話、位置
❌ 對負面回饋防衛
❌ 阻擋提供不認同的使用者
```

---

## ✅ 必須清單（必須實現）

```
✅ 原子性增量：count = count + 1（資料庫執行）
✅ 資料庫執行，不在前端
✅ Optimistic UI（立即顯示 +1）
✅ 三端同步（手機 = 平板 = 電腦）
✅ 防連續點擊（pending 時 disable）
✅ 離開後可重新投票
✅ 回饋 API 失敗不影響計數
✅ 留言完全自願
✅ 溫暖文案（不防衛、不改口）
✅ 手機優先設計（mobile first）
✅ 後台私密查看回饋
✅ 計數與回饋完全分離
```

---

## 🧪 健檢指令

```bash
# 編譯檢查
npm run build

# 測試運行
npm test -- home-trust

# 型別檢查
npx tsc --noEmit

# 推送前
npm run hooks:install
git push
```

---

## 📞 API 端點最終確認

| 方法 | 路由 | 功能 | 驗證 |
|------|------|------|------|
| GET | `/api/home-trust` | 取得三個計數 | 無 |
| POST | `/api/home-trust/agree` | 認同 +1 | 無 |
| POST | `/api/home-trust/disagree` | 不認同 +1 | 無 |
| POST | `/api/home-trust/view` | 瀏覽 +1 | 無 |
| POST | `/api/home-trust/feedback` | 提交回饋 | 無 |
| GET | `/api/home-trust/feedback/stats` | 後台統計 | 🔐 需要 |

---

## 🎯 驗收標準

### ✅ 計數功能
- [ ] 認同計數 +1，且頁面重新整理仍是新值
- [ ] 不認同計數 +1，且頁面重新整理仍是新值
- [ ] 瀏覽計數 +1，且頁面重新整理仍是新值
- [ ] 同時按認同（兩台電腦） = 正確計數 +2，不是 +1
- [ ] 連續點擊，第 2 下被 disable

### ✅ 回饋功能
- [ ] 認同後可選擇留言
- [ ] 不認同後可選擇留言
- [ ] 留言失敗時計數已 +1（不倒退）
- [ ] 後台可看所有回饋
- [ ] 前台使用者看不到其他人的留言

### ✅ UI/UX
- [ ] 手機版計數清晰可見
- [ ] 回饋文案溫暖友善
- [ ] 快速選項可快速點擊
- [ ] 載入中顯示 spinner

---

## 🚀 啟動工作

```bash
# 1. 檢查目前狀態
git status

# 2. 建立新檔案（按順序）
touch lib/home-trust/counters/counters.service.ts
touch app/api/home-trust/route.ts
# ... 依此類推

# 3. 實作並運行測試
npm test -- home-trust

# 4. 前端開發
npm run dev

# 5. 最終提交
git add .
git commit -m "feat(home-trust): 首頁信任統計 + 私密回饋系統完整實現"
```

---

## 📚 參考檔案

- **規範**：[SYSTEM_SPEC_HOME_TRUST_FEEDBACK_V3.md](./SYSTEM_SPEC_HOME_TRUST_FEEDBACK_V3.md)
- **計數型別**：[lib/home-trust/counters/counters.types.ts](./lib/home-trust/counters/counters.types.ts)
- **回饋型別**：[lib/home-trust/feedback/feedback.types.ts](./lib/home-trust/feedback/feedback.types.ts)
- **資料庫層**：[lib/home-trust/counters/counters.repository.ts](./lib/home-trust/counters/counters.repository.ts)

---

## 💡 建議

1. **優先完成計數 API** — 這是核心功能
2. **再做前端顯示** — 讓使用者看到數字
3. **最後整合回饋** — 這可以失敗，但計數不能
4. **經常運行測試** — TDD 就是這樣做的
5. **手機優先測試** — 90% 使用者用手機

---

**版本**：HOME_TRUST_FEEDBACK_SYSTEM_V3  
**日期**：2026-10-07  
**工程師**：立即開始

🚀 **Let's build this!**
