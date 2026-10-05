# 🔐 管理員後台設定指南

## 📋 概述

管理員後台是一個隱藏的系統，用於：
- 🔍 查看每個命盤的**完整製作過程**（客戶看不見）
- 📚 追蹤使用的**來源和授權信息**
- 🛡️ 記錄**著作權信息**
- ⚖️ 法律追蹤和審計

---

## ⚙️ 環境變數配置

在 `.env.local` 或 `.env.production` 中設定以下變數：

```bash
# ========== 管理員認證 ==========

# 管理員密碼（設定為 630828）
ADMIN_MASTER_PASSWORD=630828

# Session 密鑰（至少 32 個字符的隨機字符串，用於簽署 Session Token）
# 生成方式：openssl rand -hex 32
ADMIN_SESSION_SECRET=your_random_32_char_hex_string_here_change_this_now

# 授權 IP 白名單（只有這些 IP 可以存取管理員後台）
# 格式：IP1,IP2,IP3（逗號分隔，無空格）
# 例如：192.168.1.100,203.0.113.45
ADMIN_AUTHORIZED_IPS=YOUR_IP_ADDRESS_HERE

# ========== 客戶認證（保持不變） ==========
DUAL_CHART_PASSWORD=existing_password
DUAL_CHART_SESSION_SECRET=existing_secret
```

---

## 🔑 生成必要的密鑰

### 1️⃣ 生成 SESSION_SECRET

```bash
# 在終端執行
openssl rand -hex 32

# 輸出例如：
# a3f8c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4
```

將輸出複製到 `ADMIN_SESSION_SECRET`。

### 2️⃣ 查詢你的 IP 地址

訪問以下任一網址查詢：
- https://www.whatismyipaddress.com
- https://ifconfig.me
- 在瀏覽器開發者工具中訪問 `/api/admin/ip-check`

例如：`203.0.113.45`

### 3️⃣ 設定密碼和白名單

```bash
ADMIN_MASTER_PASSWORD=630828
ADMIN_AUTHORIZED_IPS=203.0.113.45
```

---

## 🌐 訪問管理員後台

### 步驟：

1. **確保 IP 授權**
   - 你的 IP 必須在 `ADMIN_AUTHORIZED_IPS` 中
   - 訪問 `http://localhost:8888/api/admin/ip-check` 檢查

2. **訪問登入頁面**
   ```
   http://localhost:8888/admin
   ```

3. **輸入管理員密碼**
   ```
   密碼：630828
   ```

4. **查看日誌**
   - 左側顯示所有命盤記錄
   - 點擊查看完整製作過程
   - 檢視來源、著作權、法律追蹤信息

---

## 🛡️ 安全性

### 三層認證機制

1. **IP 白名單** ✓
   - 只有授權的 IP 可以嘗試登入
   - 即使密碼外洩，其他 IP 也無法存取

2. **管理員密碼** ✓
   - SHA-256 雜湊儲存（不保存明文）
   - 防暴力破解（5 次嘗試後鎖定 15 分鐘）

3. **Session Token** ✓
   - HMAC-SHA256 簽署
   - 過期時間：1 小時
   - HttpOnly + Secure Cookie

### 防護措施

- ❌ **不能**從其他 IP 存取（即使有密碼）
- ❌ **不能**進行跨域請求（Same-Origin 檢查）
- ❌ **不能**用過期 Session
- ❌ **不能**用暴力破解（會被鎖定）

---

## 📊 後端審計日誌

每次客戶排盤時，後端自動記錄：

### 記錄內容

| 項目 | 說明 | 客戶可見 |
|------|------|--------|
| 八字四柱 | 年月日時干支 | ❌ 隱藏 |
| 紫微宮位 | 十二宮星象 | ❌ 隱藏 |
| 神煞使用 | 所有匹配的神煞 | ❌ 隱藏 |
| 易經卦象 | 起卦結果 | ❌ 隱藏 |
| **來源授權** | 參考古籍、框架 | ❌ 隱藏 |
| **著作權信息** | 引擎所有者、授權方式 | ❌ 隱藏 |
| 計算步驟 | 每步耗時、中間結果 | ❌ 隱藏 |
| 請求 IP | 客戶 IP 地址 | ❌ 隱藏 |
| 響應雜湊 | 完整性驗證 SHA256 | ❌ 隱藏 |

### 用途

- **法律追蹤** — 若有糾紛，可溯源到具體 IP 和時間
- **著作權保護** — 證明使用了自創演算法
- **審計** — 檢查製作流程正確性

---

## 🚀 部署到生產環境

### Vercel 設定

1. 在 Vercel Dashboard 中設定環境變數：
   ```
   ADMIN_MASTER_PASSWORD=630628
   ADMIN_SESSION_SECRET=<生成的密鑰>
   ADMIN_AUTHORIZED_IPS=<你的 IP>
   ```

2. 部署後訪問：
   ```
   https://your-domain.vercel.app/admin
   ```

### 自架設環境

1. 將 `.env` 變數添加到伺服器配置
2. 重啟應用
3. 訪問 `/admin`

---

## ⚠️ 重要提醒

1. **妥善保管 SESSION_SECRET**
   - 不要提交到 Git（已在 .gitignore 中）
   - 每次部署環境保持一致

2. **定期更換密碼**
   - 若懷疑洩露，立即修改 `ADMIN_MASTER_PASSWORD`
   - 已有的 Session 會立即失效

3. **監控 IP**
   - 若發現異常登入嘗試，檢查 `/api/admin/ip-check`
   - 立即更新 `ADMIN_AUTHORIZED_IPS`

4. **客戶永遠看不見**
   - 任何製作細節、來源信息、著作權聲明
   - 前端 API 永遠隱藏
   - 只有你的管理員後台可見

---

## 📝 範例

### 環境變數完整範例

```bash
# .env.local

# 客戶認證
DUAL_CHART_PASSWORD=your_client_password
DUAL_CHART_SESSION_SECRET=your_existing_session_secret_min_32_chars

# 管理員認證
ADMIN_MASTER_PASSWORD=630828
ADMIN_SESSION_SECRET=a3f8c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4a7c2d1e5b9f4
ADMIN_AUTHORIZED_IPS=203.0.113.45

# 若需要多個 IP
# ADMIN_AUTHORIZED_IPS=203.0.113.45,192.168.1.100,10.0.0.50
```

---

## 🔍 除錯

### 檢查 IP 授權

```bash
curl http://localhost:8888/api/admin/ip-check
# 返回：
# {
#   "authorized": true,
#   "clientIP": "127.0.0.1"
# }
```

### 檢查密碼配置

登入失敗時，檢查：
1. `ADMIN_MASTER_PASSWORD` 是否正確設定
2. `ADMIN_SESSION_SECRET` 長度是否 ≥ 32 字符
3. `ADMIN_AUTHORIZED_IPS` 是否包含你的 IP

---

## ✅ 完成清單

- [ ] 生成 `ADMIN_SESSION_SECRET`（openssl rand -hex 32）
- [ ] 查詢你的 IP 地址
- [ ] 設定 `.env.local`:
  - [ ] `ADMIN_MASTER_PASSWORD=630628`
  - [ ] `ADMIN_SESSION_SECRET=<生成的密鑰>`
  - [ ] `ADMIN_AUTHORIZED_IPS=<你的IP>`
- [ ] 重啟開發伺服器（`npm run dev`）
- [ ] 訪問 `http://localhost:8888/api/admin/ip-check` 驗證 IP
- [ ] 訪問 `http://localhost:8888/admin` 登入
- [ ] 查看日誌確認運作正常

---

**🎉 設定完成！客戶永遠看不見製作細節。**
