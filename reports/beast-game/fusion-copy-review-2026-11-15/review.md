# 合體面板兩區版驗收

2026-11-16，本輪限 SharedCultivationPanel.tsx、其專用 CSS 與 FoodChainFeedback.tsx 的 concise 顯示；保留 iconOnly 行為與後端公式、交易保護。沿用卡面原圖，無新增 AI 素材、filter 或動畫。

主畫面先選目標；選定後上方僅一張大卡，下方只有未鎖定的對應材料。卡面外不重複名稱或卡下資訊。數字集中確認區；說明與主力管理獨立顯示。確認成功保留目標，材料清空，必須再次選材及確認。

隔離測試：390×844，真實後端、合成 9 張收藏。取消及預覽不修改收藏；連續兩次確認分別 +3，寶石攻擊 56→59→62、神獸戰鬥 46→49→52，收藏 9→7，五張鎖定 ID 不變。更換目標、說明往返、主力管理通過，頁面錯誤 0，測試帳戶清除成功。result.json 記錄 passed=true / cleaned=true。不是使用者原右側頁面實測。

- 修改前：[卡面](before/selection.png)、[預覽](before/preview.png)
- 新版：[兩區](two-zone/selection.png)、[預覽確認](two-zone/preview-entry-6.png)、[第二次成功](two-zone/saved.png)
- [交易證據](two-zone/result.json)

此測試沿用現行 v2，不代表公式授權爭議已解決。既有合併未完成、來源門檻及慢裝置效能限制仍在；未提交或推送，未重跑全站 build/健康掃描。
