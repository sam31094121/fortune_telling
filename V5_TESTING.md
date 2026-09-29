# 天地人 V5.0 系統 - 測試計劃

## 系統架構驗證

### ✅ 核心引擎
- [x] 權重公式：天 35% × 生日模型 + 地 35% × 血型模型 + 人 30% × 姓名模型
- [x] 性別校正層：調整表現方式，不改變本質
- [x] 12 維度人格矩陣：emotion, logic, social, leadership, security, execution, creativity, empathy, risk, control, wealth, attachment

### ✅ 前端流程（三步進度）
1. Step 1 (35%)：生日輸入 → 天之人格啟動
2. Step 2 (70%)：血型輸入 → 地之人格融合 → 免費預分析
3. Step 3 (100%)：姓名 + 性別輸入 → 人之人格完成 → 完整分析

### ✅ 後端模型庫
- [x] birth-model-db.ts：12 星座人格基礎分數
- [x] blood-model-db.ts：4 血型行為調整
- [x] name-model-db.ts：姓名語意調整
- [x] gender-corrector.ts：男性/女性表現方式校正

## 功能測試清單

### API 端點測試
```
[ ] POST /api/preview
    - 輸入：birthday, bloodType
    - 輸出：preview_score, base_scores, blood_adjustments, preview_scores
    - 期望：70% 人格完成度

[ ] POST /api/analyze
    - 輸入：birthday, bloodType, name, gender
    - 輸出：final_scores, gender_adjustments, birth_analysis, blood_analysis, name_analysis, gender_presentation, final_insight, wisdom_conclusion
    - 期望：100% 人格完成度
```

### 前端交互流程測試
```
[ ] 第一步 (35%)
    - 輸入生日
    - 顯示對應星座
    - 自動進入第二步

[ ] 第二步 (70%)
    - 選擇血型
    - 顯示天地預分析
    - 返回修改選項

[ ] 第三步 (100%)
    - 輸入姓名（1-20 字）
    - 選擇性別（男/女）
    - 觸發完整分析
    - 顯示完整人格報告
```

## 數據驗證

### 示例測試用戶
- 生日：1990-06-18（雙子座）
- 血型：O 型
- 姓名：曾威諺
- 性別：male

### 期望結果
- 天分析：基於雙子座的思維模式
- 地分析：基於 O 型的行為特徵
- 人分析：基於「曾威諺」的個體化調整
- 性別校正：基於男性表現方式的微調
- 最終人格：12 維度的完整分數（0-100）

## 注意事項

### 防止矛盾
1. 生日、血型、姓名、性別都不能直接產生最終結論
2. 所有模組只能產生人格參數
3. 最終報告只能根據融合後人格矩陣生成
4. AI 禁止推翻前面的結果
5. AI 只能補充、深化、細化、個人化

### 文字限制
- birth_analysis：100 字內
- blood_analysis：100 字內
- name_analysis：100 字內
- gender_presentation：100 字內
- final_insight：200 字內
- wisdom_conclusion：250 字內
