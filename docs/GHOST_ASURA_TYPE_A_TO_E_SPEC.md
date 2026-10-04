# 鬼魅阿修羅 TYPE_A 至 TYPE_E 分型規格與開發者實作手冊
模組標識：`GHOST_ASURA_STRATEGY_CLASSIFIER_SPEC_V1`  
落地檔案：`lib/asura/ghost-asura-strategy-classifier.ts`  
測試套件：`tests/ghost-asura-strategy-classifier.test.cjs`

---

## 一、人格與行為輸入結構 (Input Profiles)

所有分型運算均基於以下兩組 0 ~ 100 之正規化數值欄位：

```typescript
// 深層人格結構（底層傾向與恐懼）
export interface ClientPersonalityCore {
  identityStability: number;     // 自我認同穩定度
  independence: number;          // 獨立行事偏向
  controlNeed: number;           // 掌控欲望與安全感來源
  responsibilityDrive: number;   // 責任承擔動力
  achievementDrive: number;      // 成就追求驅力
  emotionalSensitivity: number;  // 情緒敏銳感知度
  emotionalSuppression: number;  // 情緒壓抑與冷面傾向
  trustThreshold: number;        // 信任門檻（越高越難信任他人）
  defensiveStrength: number;     // 心理防衛機制強度
  dominance: number;             // 主導欲與氣場壓迫感
  adaptability: number;          // 環境應變調適力
  riskTolerance: number;         // 風險承受度
  uncertaintyTolerance: number;  // 面對未知與不確定性的耐受力
  socialNeed: number;            // 社交歸屬需求
  recognitionNeed: number;       // 被看見與被認同需求
  boundaryStrength: number;      // 個人心理邊界剛性
}

// 外顯行為風格（日常與受壓作風）
export interface ClientBehaviorProfile {
  decisionSpeed: number;         // 拍板定局速度
  speechSpeed: number;           // 說話反應速度
  actionBias: number;            // 先行動再思考傾向
  analysisBias: number;          // 先收集推演再決策傾向
  stubbornness: number;          // 嘴硬、死不認輸程度
  impulsiveness: number;         // 衝動度、耐不住等待
  patience: number;              // 耐力與等待時機容忍度
  directness: number;            // 直言不諱、坦率衝撞程度
  conflictTolerance: number;     // 面對人際衝突的承受力
  helpSeeking: number;           // 主動對外求助意願
  selfReliance: number;          // 凡事靠自己橫推偏向
  socialFlexibility: number;     // 社交靈活手腕
}
```

---

## 二、TYPE_A 至 TYPE_E 核心分型規格表

| 分型類型 | 名稱與心理定位 | 核心觸發指標與權重公式 | 禁用策略 (Forbidden) | 切入開場句 |
| :--- | :--- | :--- | :--- | :--- |
| **TYPE_A** | **強勢／直接型**<br>*(The Dominant Commander)* | `dominance * 0.35`<br>`+ directness * 0.30`<br>`+ controlNeed * 0.20`<br>`+ decisionSpeed * 0.15` | • 禁止長篇前言與客套<br>• 禁止溫吞曖昧的建議<br>• 禁止道德說教 | `先講答案。廢話免了。` |
| **TYPE_B** | **敏感／防衛型**<br>*(The Defensive Sentinel)* | `defensiveStrength * 0.30`<br>`+ trustThreshold * 0.25`<br>`+ emotionalSensitivity * 0.20`<br>`+ emotionalSuppression * 0.15`<br>`+ (100 - helpSeeking) * 0.10` | • 禁止公開踩踏人格尊嚴<br>• 禁止貼上弱者或可憐標籤<br>• 禁止未建安全感強拆外殼 | `先別急著反駁。我講的是你的反應，不是在否定你。` |
| **TYPE_C** | **過度分析型**<br>*(The Over-Analyzing Deliberator)* | `analysisBias * 0.40`<br>`+ (100 - decisionSpeed) * 0.25`<br>`+ (100 - uncertaintyTolerance) * 0.20`<br>`+ controlNeed * 0.15` | • 禁止補充額外細節與數據<br>• 禁止提供更多模糊選項<br>• 禁止陪同推演辯駁 | `資料早就夠了。你缺的不是資訊，是決定。` |
| **TYPE_D** | **衝動／好鬥型**<br>*(The Impulsive Vanguard)* | `impulsiveness * 0.35`<br>`+ actionBias * 0.30`<br>`+ (100 - patience) * 0.20`<br>`+ riskTolerance * 0.15` | • 禁止溫和理性勸導（無效）<br>• 禁止起鬨煽動冒進<br>• 禁止空洞大道理 | `手先收回來。局都沒看全，你又準備第一個當靶。` |
| **TYPE_E** | **嘴硬／傲嬌型**<br>*(The Stubborn Deflector)* | `stubbornness * 0.40`<br>`+ emotionalSuppression * 0.30`<br>`+ (100 - directness) * 0.15`<br>`+ recognitionNeed * 0.15` | • 禁止糾結口頭字面辯駁<br>• 禁止逼問「你心裡到底怎麼想」<br>• 禁止公開嘲諷示弱 | `嘴巴可以繼續說沒事。但你的選擇已經替你回答了。` |

---

## 三、各型態專屬話術庫（100% 符號聲律規範）

本話術庫所有句子均經過 `lintAsuraVoice` 嚴格檢測：**零發問、零驚嘆號、零求認同助詞、零因果解釋、每分句長度 $\le 16$ 字**。

### 1. TYPE_A 強勢／直接型
* **開場破題**：`先講答案。廢話免了。`
* **當面罵醒**：`你以為在帶隊突圍。其實只是享受全員看你拍板。`
* **過去卡（解形成）**：`幾次關鍵轉折。你明明想等。等到最後，主導權沒了。你骨子裡學會自己先橫推。`
* **現在卡（解當下盲點）**：`別人還在開會找共識。你心裡已散會抄傢伙。這不是果斷，是你急於定局。`
* **未來卡（解選擇分支）**：`大局交給敢扛的人。想通吃全場，彈藥遲早耗盡。門由著它自己關。`
* **阿修羅黑色幽默**：`開會看秒錶。嫌全世界太慢。最後累垮的，始終是你。`

### 2. TYPE_B 敏感／防衛型
* **開場破題**：`先別急著反駁。我講的是你的反應，不是在否定你。`
* **當面罵醒**：`你看起來雷厲風行。底下藏著一件事。你怕把背後交給別人。`
* **過去卡（解形成）**：`有些暗路攔你的不出聲。你摔過之後。警報器調在最高檔位。一有風吹草動，就想拔刀。`
* **現在卡（解當下盲點）**：`環境早就變安全了。你的刀還架在身前。防衛過度。身邊的人，很難走進你的陣地。`
* **未來卡（解選擇分支）**：`看清形成原因。手裡的刀，該放就得放。卸下重甲，路才走得遠。`
* **阿修羅黑色幽默**：`以為這是天生傲骨。以前摔怕了之後。乾脆自己先把地基拆掉。`

### 3. TYPE_C 過度分析型
* **開場破題**：`資料早就夠了。你缺的不是資訊，是決定。`
* **當面罵醒**：`你不是在找最佳解。你是在等出事不用負責的藉口。`
* **過去卡（解形成）**：`幾次關鍵變數。你用推演代替出手。算得再細。時間早已溜走。`
* **現在卡（解當下盲點）**：`想找百分之百不失控的選項。先認清一件事。這局裡沒有這種東西。動中才有答案。`
* **未來卡（解選擇分支）**：`這一段要學做選擇題。看清哪一扇門有天下。其餘的，連看都別看。`
* **阿修羅黑色幽默**：`別人開會看簡報。你開會做字典。算到最後一兵一卒。戰場早就換地方了。`

### 4. TYPE_D 衝動／好鬥型
* **開場破題**：`手先收回來。局都沒看全，你又準備第一個當靶。`
* **當面罵醒**：`你現在最不缺的是膽。事情還沒看完。你又準備第一個出去擋子彈。`
* **過去卡（解形成）**：`過去一路全靠蠻勁硬撐。看到門就想踹開。久了，刻進骨子裡成了慣性。`
* **現在卡（解當下盲點）**：`執行力全開不是壞事。局勢還沒走完。你已先把退路炸掉。今年，先讓別人把話講完。`
* **未來卡（解選擇分支）**：`下一刀由你先出。但刀要落在要處，不能落空。看準靶心再出鞘，不等被激。`
* **阿修羅黑色幽默**：`別人開車踩煞車。你開車拔煞車。衝得比誰都快。撞牆也是最響的。`

### 5. TYPE_E 嘴硬／傲嬌型
* **開場破題**：`嘴巴可以繼續說沒事。但你的選擇已經替你回答了。`
* **當面罵醒**：`嘴上一直說隨便。每個選項，你都在半夜反覆翻盤。`
* **過去卡（解形成）**：`以前吃虧不願說。習慣用冷臉當盔甲。寧可咬碎牙。也不在人前示弱。`
* **現在卡（解當下盲點）**：`你不是不在乎。你怕別人拿這個當把柄。死不認錯，自己憋成內傷。`
* **未來卡（解選擇分支）**：`承認艱難不叫認輸。心裡有數，手裡有刃。不必逢人解釋。`
* **阿修羅黑色幽默**：`嘴巴硬得像岩石。心裡翻了八百遍。表面雲淡風輕。背後靴子早磨穿。`

---

## 四、演算法實作骨架 (Algorithm Reference)

```typescript
export function classifyCommunicationStrategy(
  core: ClientPersonalityCore,
  behavior: ClientBehaviorProfile
): StrategyDefinition {
  const scores = calculateStrategyScores(core, behavior);

  // 排序選出最高評分型態；若分值相同，優先序為：D > A > B > C > E (防暴走優先)
  const priorityOrder: CommunicationType[] = ['TYPE_D', 'TYPE_A', 'TYPE_B', 'TYPE_C', 'TYPE_E'];
  const dominantType = priorityOrder.reduce((best, cur) => 
    scores[cur] > scores[best] ? cur : best
  , 'TYPE_E');

  return {
    type: dominantType,
    label: STRATEGY_META[dominantType].label,
    name: STRATEGY_META[dominantType].name,
    primaryCutIn: STRATEGY_META[dominantType].cutIn,
    forbiddenRules: STRATEGY_META[dominantType].rules,
    forbiddenPhrases: STRATEGY_META[dominantType].phrases,
    scores,
    activeScore: scores[dominantType],
  };
}
```
