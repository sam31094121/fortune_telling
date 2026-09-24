# 雙命盤紙本參考欄位對照

本次照片只用於格子結構與資訊密度，不擷取照片姓名、生辰、數值或品牌。

| 參考項目 | 本版來源 | 處理 |
| --- | --- | --- |
| 紫微十二宮、主星、輔雜星、亮度、四化 | createZiweiCore / iztro | 固定地支外圈，全量展示 |
| 大限、長生、小限年齡、博士/歲前/將前十二神 | 同一 createZiweiAstrolabe 宮位欄位 | 依地支對應，宮底分格；小限使用原 ages，不重算 |
| 中央出生資料、命身主、五行局 | ziwei.raw / birthInput | 保留真实欄位 |
| 中央四柱、藏干、十神、十二運與大運 | 同份 Bazi professionalChart / core | 共用 PillarGrid / LuckGrid，順序時日月年 |
| 八字右側四柱與神煞 | Bazi core / professionalChart | 神煞按 evidence 的柱別映射；同名去重呈現 |
| 五行圓圖 | professionalChart.elementStatistics.percentages | 加權比例，非照片不明分數；不使用寶珠素材 |
| 命身宮、胎元胎息、空亡、起運 | Bazi core | 直接展示原始值 |
| 旺衰、格局、用喜忌 | professionalChart.strengthAnalysis / structurePattern / gods | 標示本系統口徑，非照片流派校正 |
| 15 年流年 | 既有 lunar-typescript 立春年干支 + core.calculateTenGod / HIDDEN_STEM_DICTIONARY | 當年起3組5年，顯示干十神與支主氣十神，虛歲按當年減出生年加一 |
| 合沖刑害破 | core.interactions | 顯示關係及柱位，不憑空畫連線 |
| 流年神煞、照片其他神煞全集 | 現有引擎無對應全集 | 明確標示流年神煞未提供；命局只展示天乙、文昌、桃花、驛馬、華蓋命中 |
| 照片廣告、聯絡欄、血型 | 無必要資料來源 | 不新增、不收集 |

大運與小限的歲數遵循各自原引擎；不修改底層演算法以追照片。年度干支在每年立春換年，表內年度指該年立春後。點陣 PDF 沿用同一 A4 DOM。
