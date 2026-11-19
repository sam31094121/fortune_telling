# 寶石捷連線抖動修復與本體比例

2026-11-19。限遊戲顯示、對應測試及技能記錄；沒有改動傷害、掉珠、獎勵或客戶資料。

右側連續畫面觀察到捲軸顯隱與整個盤面橫向位移。初步手機／桌面八種高度靜止抽樣未重現，不能因此認定無故障。加入強制捲軸顯隱檢查後，650px 高度可重現 7.5 CSS px 橫移。只固定 html gutter 仍失敗；body 與戰場外框的 overflow-x:hidden 會形成另一垂直捲動容器。修復限 hard45 活躍戰局：html 預留穩定捲軸空間，body 與戰場改為橫向 clip／垂直 visible，保留原本完全放得下才鎖捲動的行為。

八種高度各 120 幀與捲軸切換皆零位移。兩組 390px 大卡接珠、寶物增加、左右入口、手動寶珠攻擊及恢復連線通過。建置通過（原有警告保留）。全站掃描仍在收尾，最終結果另記。

本體卡放大限放寬兩側預留寬度；仍依實際剩餘高度及圖像比例限制，保留盤面與操作入口。未把右側客戶當前戰局用作測試資料，未清空或代打。

失敗證據保留於 shake-after、shake-after-body、shake-final、shake-diagnostic；通過證據於 shake-verified 與 shake-dock-regression。測試不能保證所有裝置永無抖動。

最終全站健康檢查 65/67 通過；僅 BAZI_SOURCE_REGISTRY_COMPLETE 與 DUAL_CHART_SHENSHA_DISPLAY 兩項既有、業主已暫緩的失敗。新 BEAST_ORB_LAYOUT_STABILITY 及完整 BEAST_ORB_REPLAY 通過，無 flaky。按既有明確豁免提交，不偽稱全站全通過。
