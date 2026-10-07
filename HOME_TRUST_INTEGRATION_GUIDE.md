# 首頁信任統計系統 — 前端集成指南

**狀態**：🟢 **後端已就緒，等待前端集成**  
**日期**：2026-10-07

---

## 快速集成（3 步驟，5 分鐘）

### 步驟 1：選擇集成位置

**建議位置**（按優先順序）：

1. **最佳：/trust 誠信說明頁**
   - 位置：`app/trust/page.tsx` 或 `app/pages/trust.tsx`
   - 原因：已有信任主題，增加互動感
   - 影響：現有頁面上方或下方插入組件

2. **其次：獨立頁面 /home-trust**
   - 位置：`app/home-trust/page.tsx`
   - 原因：獨立展示，使用者主動訪問
   - 影響：新增路由

3. **補充：所有頁面 Footer**
   - 位置：全站 layout 組件
   - 原因：每頁都能投票、積累數據
   - 影響：footer 空間占用

### 步驟 2：複製集成代碼

選定位置後，複製以下代碼到頁面檔案：

```typescript
'use client';

import HomeTrustCounters from '@/app/components/home-trust/HomeTrustCounters';
import FeedbackPrompt from '@/app/components/home-trust/FeedbackPrompt';
import FeedbackForm from '@/app/components/home-trust/FeedbackForm';
import { useState } from 'react';

export default function TrustPage() {
  const [feedbackVote, setFeedbackVote] = useState<'agree' | 'disagree' | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {/* 現有頁面內容 */}
      <h1>誠信說明</h1>
      <p>（現有文字）</p>

      {/* ━━━━━━━ 以下為新增內容 ━━━━━━━ */}
      <section style={{ marginTop: '40px' }}>
        <h2>你覺得我們做得怎樣？</h2>
        <p>你的意見很重要，幫助我們持續改善。</p>

        {/* 首頁信任統計系統 */}
        <HomeTrustCounters
          onFeedback={(vote) => {
            setFeedbackVote(vote);
          }}
        />
      </section>

      {/* 回饋對話 */}
      {feedbackVote && (
        <FeedbackPrompt
          vote={feedbackVote}
          onOpenForm={() => setShowForm(true)}
          onClose={() => setFeedbackVote(null)}
        />
      )}

      {/* 回饋表單 */}
      {showForm && feedbackVote && (
        <FeedbackForm
          vote={feedbackVote}
          onSubmit={() => {
            setShowForm(false);
            setFeedbackVote(null);
          }}
          onClose={() => {
            setShowForm(false);
            setFeedbackVote(null);
          }}
        />
      )}
    </div>
  );
}
```

### 步驟 3：測試與驗證

```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 訪問頁面
http://localhost:8888/trust  # 或你選擇的路由

# 3. 測試功能
- 點擊「👍 我認同」→ 數字 +1
- 點擊「👎 我不認同」→ 數字 +1
- 點擊「📖 累計瀏覽次數」→ 查看數字（自動累計）
- 點擊認同/不認同後 → 彈出邀請對話
- 選「📝 留言告訴我們更多」→ 打開回饋表單
- 輸入意見 → 點「送出」→ 成功訊息

# 4. 驗證 API
curl http://localhost:8888/api/home-trust
```

---

## 📱 響應式設計檢查

前端組件已支援三種設備：

| 設備 | 寬度 | 樣式 |
|------|------|------|
| **手機** | < 768px | 垂直排列 |
| **平板** | 768-1024px | 水平排列 |
| **桌面** | > 1024px | 完整寬度 |

### 測試方式
```bash
# 在瀏覽器開發者工具中
1. 按 F12 打開開發者工具
2. 點擊「切換裝置工具列」（手機圖示）
3. 選擇不同設備測試
   - iPhone 12
   - iPad
   - Desktop
```

---

## 🎨 樣式自訂（可選）

如需改變組件樣式，編輯以下檔案：

### 計數按鈕樣式
**檔案**：`app/components/home-trust/HomeTrustCounters.tsx`

```typescript
// 修改這部分
<style jsx>{`
  .counter-button {
    /* 改變這些屬性 */
    background: white;  // 背景色
    border: 1px solid #ddd;  // 邊框
    padding: 12px 16px;  // 內距
    /* ... */
  }
`}</style>
```

### 回饋對話樣式
**檔案**：`app/components/home-trust/FeedbackPrompt.tsx`

類似方式修改 `<style jsx>` 區塊。

---

## 🔄 API 呼叫詳解

### 自動行為
```
使用者操作 → 前端立即顯示 (+1) → 發送 POST → 後端確認
              ↓
              成功：保留更新
              失敗：重新整理，恢復原值
```

### 手動呼叫（進階用法）

```typescript
// 在任意 React 元件中呼叫計數 API
async function handleVote(type: 'agree' | 'disagree' | 'view') {
  try {
    const response = await fetch(`/api/home-trust/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    
    if (data.success) {
      console.log('新計數：', data.counters);
    } else {
      console.error('失敗');
    }
  } catch (error) {
    console.error('網路錯誤', error);
  }
}
```

---

## 📊 監控回饋（後台用）

### 查看回饋統計
```bash
curl http://localhost:8888/api/feedback/stats
```

### 回應格式
```json
{
  "success": true,
  "stats": {
    "totalFeedback": 12,
    "agreeCount": 8,
    "disagreeCount": 4,
    "byCategory": {
      "CONTENT_ACCURACY": 5,
      "FEATURE_SUGGESTION": 2,
      "USABILITY": 3,
      "DISPLAY": 1,
      "SPEED": 0,
      "OTHER": 1
    },
    "unreviewed": 3
  }
}
```

---

## 🚨 常見問題

### Q1：計數沒有立即增加
**A**：檢查瀏覽器開發者工具（F12）→ Network，看 API 是否成功。

### Q2：回饋提交後什麼都沒有發生
**A**：正常行為。回饋已儲存到後台（私密系統），使用者看不到其他人的留言。

### Q3：多個設備的計數不同步
**A**：這表示快取未清除。按 F5 重新整理頁面。

### Q4：想隱藏「累計瀏覽次數」計數
**A**：編輯 `HomeTrustCounters.tsx`，刪除或註解掉 `<div className="views-count">` 區塊。

### Q5：想改變文案
**A**：編輯 `lib/home-trust/feedback/feedback.types.ts` 中的 `FEEDBACK_MESSAGES` 常數。

---

## ✅ 集成檢查清單

集成完成後，確認以下項目：

```
[ ] 1. 選擇了集成位置
[ ] 2. 複製了前端集成代碼
[ ] 3. 導入了三個組件
      - HomeTrustCounters
      - FeedbackPrompt
      - FeedbackForm
[ ] 4. 設置了 useState 狀態管理
[ ] 5. 頁面已編譯成功（npm run build）
[ ] 6. 開發伺服器正常運行（npm run dev）
[ ] 7. 訪問頁面，計數按鈕可點擊
[ ] 8. 認同/不認同 +1 成功
[ ] 9. 回饋對話正常彈出
[ ] 10. 可提交回饋並看到成功訊息
[ ] 11. 多個設備訪問，計數同步 ✅
```

---

## 🎯 進階自訂（可選）

### 自訂組件位置
```typescript
// 不使用預設布局，自訂位置
<div style={{ marginTop: '40px', padding: '20px' }}>
  <HomeTrustCounters />
</div>
```

### 自訂回調函式
```typescript
<HomeTrustCounters
  onAgreeClick={() => console.log('使用者認同')}
  onDisagreeClick={() => console.log('使用者不認同')}
  onViewTrack={() => console.log('瀏覽次數 +1')}
/>
```

### 禁用某些按鈕
修改 `HomeTrustCounters.tsx`：
```typescript
// 隱藏瀏覽計數
return (
  <div className="home-trust-counters">
    {/* 認同按鈕 */}
    {/* 不認同按鈕 */}
    {/* 移除：瀏覽計數 */}
  </div>
);
```

---

## 📞 支援與反饋

如集成過程中遇到問題：

1. **檢查編譯錯誤**
   ```bash
   npm run build
   ```

2. **檢查 API 連線**
   ```bash
   curl http://localhost:8888/api/home-trust
   ```

3. **檢查瀏覽器控制台**
   - F12 → Console
   - 查看是否有紅色錯誤訊息

4. **查看完整驗證報告**
   - 檔案：`HOME_TRUST_SYSTEM_VERIFICATION_REPORT.md`

---

## 🎬 集成完成後

```
✅ 系統已投入使用
   ├─ 使用者可投票（認同/不認同/瀏覽）
   ├─ 自動累計數字
   ├─ 三端同步顯示
   ├─ 可提交私密意見
   └─ 後台可查看統計

📊 開始收集使用者反饋
   ├─ 追蹤認同度
   ├─ 蒐集改善建議
   ├─ 按分類統計
   └─ 後台查閱意見

🔄 持續優化
   ├─ 根據回饋改進
   ├─ 監控計數趨勢
   ├─ 提升用戶滿意度
   └─ 增加信任度
```

---

**集成就是這麼簡單！** 🎉

只需複製代碼、選擇位置、測試完成。  
前端組件已完全準備好，隨時可上線。

---

**版本**：HOME_TRUST_FEEDBACK_SYSTEM_V3  
**狀態**：🟢 待集成  
**預計時間**：5-10 分鐘

