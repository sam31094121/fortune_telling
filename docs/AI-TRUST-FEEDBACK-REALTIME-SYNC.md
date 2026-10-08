# 🚀 易經回饋校準 - 全球實時同步優化方案

## 📋 現狀分析

### 既有組件：`components/AiTrustFeedback.tsx`

**當前架構：**
```
用戶點擊
  ↓
發送到 /api/home-trust/agree (POST)
  ↓
後端計數 +1
  ↓
返回給前端
  ↓
前端更新本地計數
  ❌ 其他設備不知道有人投票
```

**問題：** 沒有即時推送機制，其他設備需要手動刷新才能看到新計數

---

## 🎯 優化目標

### 前：只有投票者看到 +1

```
用戶 A 點擊                用戶 B 看到的
  ↓                        ↓
立即顯示 715              714（舊的）
                           ↓
                        刷新後才看到 715
```

### 後：全球用戶同時看到 +1

```
用戶 A 點擊              用戶 B 即時看到
  ↓                        ↓
顯示 715               WebSocket 推送 → 715
                           ↓
                        無須刷新，自動更新
```

---

## 🛠️ 實現方案

### 第 1 步：添加 WebSocket 連接到 `AiTrustFeedback.tsx`

在 `useEffect` 中添加 WebSocket 監聽器：

```tsx
useEffect(() => {
  if (typeof window === 'undefined') return;

  // 建立 WebSocket 連接
  const ws = new WebSocket(
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/trust-feedback/ws`
  );

  ws.onopen = () => {
    console.log('✓ 實時同步連接已建立');
  };

  // 監聽其他用戶的投票推送
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // 接收其他用戶的投票
      if (data.type === 'agree') {
        commitLikeCount(data.agreeCount);
        pulseAcceptedCount('like');  // 播放脈衝動畫
      } else if (data.type === 'disagree') {
        commitImproveCount(data.disagreeCount);
        pulseAcceptedCount('improve');
      }
      
      console.log(`✓ 全球同步 - ${data.type}: ${data[data.type + 'Count']}`);
    } catch (error) {
      console.error('WebSocket 消息解析失敗:', error);
    }
  };

  ws.onerror = (error) => {
    console.warn('⚠️ WebSocket 連接錯誤（降級到輪詢模式）:', error);
  };

  return () => {
    ws.close();
  };
}, [commitLikeCount, commitImproveCount, pulseAcceptedCount]);
```

### 第 2 步：後端 API 路由

建立 `/api/trust-feedback/ws` 用於 WebSocket 連接

```ts
// app/api/trust-feedback/ws/route.ts
const clients = new Set<WebSocket>();

export function broadcastTrustFeedbackUpdate(data: {
  type: 'agree' | 'disagree';
  agreeCount?: number;
  disagreeCount?: number;
}) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  console.log(`📡 廣播到 ${clients.size} 個用戶`);
}
```

### 第 3 步：修改既有 API 端點以支援廣播

在 `/api/home-trust/agree` 和 `/api/home-trust/disagree` 中：

```ts
// 當有人投票時，廣播給所有連接
if (data.ok && data.agreeCount) {
  broadcastTrustFeedbackUpdate({
    type: 'agree',
    agreeCount: data.agreeCount,
    disagreeCount: currentDisagreeCount
  });
}
```

---

## 📊 優化後的完整流程

### 時間軸

```
時間    用戶 A                  伺服器            用戶 B、C、D
────────────────────────────────────────────────────────────
T+0     🖱️ 點擊按鈕
        ↓
T+1     🎨 前端立即 +1          
        顯示 715
        ↓
T+50    📤 發送 POST            ✅ 接收請求
        /api/home-trust/agree   計數 +1
                                ↓
T+70                            📡 廣播到所有 WS
                                ├─ 用戶 B
                                ├─ 用戶 C
                                └─ 用戶 D
                                ↓
T+100                                           🔔 收到推送
                                                更新 715
                                                無須手動刷新
                                                ↓
T+120   ✓ 同步完成              ✓ 同步完成      ✓ 同步完成
```

---

## 🎨 UI 反饋

### 優化前

```
用戶 A           用戶 B
715 ✓            714
                 （不知道有人投票）
```

### 優化後

```
用戶 A           用戶 B              用戶 C              用戶 D
715 ✓            714 → 715 ✨        714 → 715 ✨        714 → 715 ✨
                 （自動更新）       （自動更新）        （自動更新）
```

**脈衝動畫**
- 用戶投票時，計數數字會有輕微的脈衝效果
- 其他用戶接收推送時也會看到相同的脈衝

---

## 🔄 整合到既有組件

### 不需要改：
- ✅ 防重複機制（deviceId + eventId）
- ✅ 本地計數存儲（localStorage）
- ✅ 離線支援（pendingFeedback 隊列）
- ✅ 既有 API 端點

### 只需要添加：
- ✅ WebSocket 連接邏輯（useEffect）
- ✅ WebSocket 消息處理（onmessage）
- ✅ 後端廣播函數

**改動最小化** — 不破壞既有功能，只擴展實時推送

---

## 🌍 跨設備同步範例

### 場景：用戶 A 有三台設備

```
【A的iPhone】          【A的MacBook】       【A的iPad】
                           ↑
                    ← 網路 / WiFi →
                           ↑
    所有設備同時看到 715
    ↓
認同計數：715 (都是)
```

### 場景：不同用戶的設備

```
【用戶 A 手機】        【用戶 B 電腦】       【用戶 C 平板】
    點擊               看 714              看 714
    立即 715           WebSocket 推送 →    WebSocket 推送 →
                       即時 715             即時 715
```

---

## 🛡️ 防重複機制保證

### 前端防重複
```tsx
// 同一會話只能投一次
if (choice) {
  showNotice({
    title: COPY.thankLikeTitle,
    body: COPY.thankLikeBody,
    tone: 'like'
  });
  return;
}
```

### 後端防重複
```ts
// 檢查 eventId（同一次投票只算一次）
if (alreadyExists(eventId)) {
  return { ok: true, agreeCount: current, message: 'Already counted' };
}
```

### 結果
- ✅ 用戶 A 在三台設備投票 → 只算一次
- ✅ 用戶 A 刷新頁面重新投 → 不算（eventId 防重複）
- ✅ 其他用戶都看到 +1（不是 +3）

---

## 📱 跨平台兼容性

| 平台 | 支援 | 備註 |
|------|------|------|
| 桌面 Chrome | ✅ | 完全支援 WebSocket |
| 桌面 Safari | ✅ | 完全支援 WebSocket |
| iPhone Safari | ✅ | 完全支援 WebSocket |
| Android Chrome | ✅ | 完全支援 WebSocket |
| 微信內嵌瀏覽器 | ⚠️ | 降級到輪詢（不阻斷） |
| LINE 內嵌瀏覽器 | ⚠️ | 降級到輪詢（不阻斷） |

---

## 🚀 性能優化

### 廣播優化
```ts
// 批量廣播（防止刷屏）
const pendingBroadcasts = new Map();

setTimeout(() => {
  const batch = Object.fromEntries(pendingBroadcasts);
  broadcast(batch);
  pendingBroadcasts.clear();
}, 100);
```

### 連接管理
```ts
// 清理斷開的連接
clients.forEach((client) => {
  if (client.readyState !== WebSocket.OPEN) {
    clients.delete(client);
  }
});
```

### 記憶體效率
```ts
// 最多保留 1000 個連接
if (clients.size > 1000) {
  const array = Array.from(clients);
  array.slice(0, 100).forEach(c => c.close());
}
```

---

## 🧪 測試檢查清單

- [ ] **前端立即 +1**
  - 用戶點擊 → 立即看到 +1（無延遲）
  
- [ ] **後端計數**
  - 後端接收 → 儲存 +1

- [ ] **全球推送**
  - 開三個瀏覽器 → 在一個點擊 → 其他兩個 <100ms 內自動更新

- [ ] **跨設備同步**
  - 在手機點擊 → 電腦立即看到更新

- [ ] **防重複**
  - 同一設備投票兩次 → 只算一次
  - 三台設備投票 → 只算一次

- [ ] **離線支援**
  - 點擊後斷網 → 自動排隊
  - 連網後 → 自動發送

- [ ] **脈衝動畫**
  - 收到推送 → 計數有輕微脈衝效果

---

## 🔧 部署清單

### 前端改動
- [ ] 在 `AiTrustFeedback.tsx` 添加 WebSocket 邏輯
- [ ] 測試實時推送

### 後端改動
- [ ] 建立 `/api/trust-feedback/ws` WebSocket 路由
- [ ] 在 `/api/home-trust/agree` 和 `/api/home-trust/disagree` 添加廣播
- [ ] 測試廣播送達所有連接

### 監控
- [ ] 監控 WebSocket 連接數
- [ ] 監控廣播延遲
- [ ] 告警異常投票

---

## ✨ 最終效果

**用戶體驗：**
1. 點擊「我認同」
2. 立即看到 715（樂觀更新）
3. 其他用戶的設備自動更新到 715（無須手動刷新）
4. 所有設備在 <100ms 內同步

**結果：** 全球用戶同時看到一致的計數，完全實時同步 ✨

---

**版本：** v2.1（全球實時同步精準優化版）  
**目標組件：** `components/AiTrustFeedback.tsx`  
**狀態：** 📋 準備實施
