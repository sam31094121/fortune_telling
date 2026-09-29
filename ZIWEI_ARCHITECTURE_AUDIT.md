# ZIWEI_ARCHITECTURE_AUDIT.md

Status: ZIWEI_PHASE_01_AUDIT_COMPLETE
Scope: AI Ziwei / insight card only
Rule: Phase 01 inventory only. No delete, no UI redesign, no engine rewrite.
Generated: 2026-08-07

## 1. Current Flow Count

### Confirmed Ziwei flows

1. MEMBER visible page flow - CONFIRMED
   - Entry: `/insight`
   - Page: `app/insight/page.tsx`
   - Submit: direct fetch to `/api/insight-analyze`
   - Result saved in daily analysis key: `ziwei`
   - Growth Center update: `markGrowthModuleCompleted('ziwei', ...)`

2. Shared Analysis Task flow - CONFIRMED
   - Entry: `/api/analysis/jobs` with `analysisType: 'insight'`
   - Runner: `lib/analysis-job-runner.ts` -> `runInsightJob()`
   - Engine: same `generateInsightAnalysis()`
   - Risk: not used by `/insight` page and excluded from inline execution in `app/api/analysis/jobs/route.ts`.

3. Legacy isolated calculator - CONFIRMED / DEPRECATED_CANDIDATE
   - File: `lib/ziwei-calculator.ts`
   - Function: `calculateZiweiMainStar()`
   - Current main page usage: NOT_FOUND
   - Risk: can be mistaken as a second Ziwei engine.

Conclusion: There are 2 executable API/data flows and 1 isolated legacy calculator. The core engine is mostly shared, but the API/task entry points are split.

## 2. Member / Professional Entrances

| Item | Evidence | Status | Note |
| --- | --- | --- | --- |
| Member entrance | `app/insight/page.tsx` route `/insight` | KEEP | Main user card. |
| Professional entrance | `viewMode` state inside `ZiweiTwelvePalaceCards` | KEEP / MOVE | Not a separate route; teacher mode is a view inside same page. |
| Mode constants | Not found | NOT_FOUND | No `ZIWEI_USER_MODE = MEMBER` or `ZIWEI_TEACHER_MODE = PROFESSIONAL` yet. |

## 3. Card / Component Inventory

| Item | File | Lines / Function | Type | Mark | Reason |
| --- | --- | --- | --- | --- | --- |
| `InsightPage` | `app/insight/page.tsx` | `export default function InsightPage` | Page | KEEP | Main route. |
| `ChoiceCard` | `app/insight/page.tsx` | `ChoiceCard` | Form helper | KEEP | Selection UI only, not analysis. |
| `ZiweiRitualStepsPanel` | `app/insight/page.tsx` | `ZiweiRitualStepsPanel` | Loading/ritual | MERGE | Currently front-end reveal uses timer; should eventually map to real backend states. |
| Hidden result summary card | `app/insight/page.tsx` | hidden block before `ZiweiTwelvePalaceCards` | Summary | DEPRECATED_CANDIDATE | Rendered in code but hidden; likely old summary UI. |
| `ZiweiTwelvePalaceCards` | `app/insight/page.tsx` | `ZiweiTwelvePalaceCards` | DETAIL_CARD shell | KEEP / MOVE | Central card bundle for member/professional switching. |
| General mode 12 flip cards | `app/insight/page.tsx` | inside `ZiweiTwelvePalaceCards` | SUMMARY_CARD x12 | KEEP / MERGE | View summary only; should read presentation bundle. |
| Teacher mode 12 palace cards | `app/insight/page.tsx` | inside `ZiweiTwelvePalaceCards` | PROFESSIONAL_DETAIL_CARD x12 | KEEP / MERGE | View only; should share same analysisId. |
| `ZiweiProfessionalTeacherMode` | `app/insight/page.tsx` | `ZiweiProfessionalTeacherMode` | PROFESSIONAL_DETAIL_CARD | KEEP | Shows major stars, support stars, transformations, full palace table. |
| Teacher star material block | `app/insight/page.tsx` | rendered when `viewMode === 'teacher'` | Professional reference | MOVE | Static materials should move to presentation/service layer. |
| `ZiweiPalaceMemberPanel` | `app/insight/page.tsx` | `ZiweiPalaceMemberPanel` | DETAIL_CARD | KEEP / MERGE | Member selected-palace detail. |
| `ZiweiPalaceStoryPanel` | `app/insight/page.tsx` | `ZiweiPalaceStoryPanel` | PROFESSIONAL_DETAIL_CARD | KEEP / MERGE | Teacher selected-palace detail. |
| `ZiweiSanFangPanel` | `app/insight/page.tsx` | `ZiweiSanFangPanel` | DETAIL_CARD | UNKNOWN | Function exists; not found in current render path. |
| `SanFangSummaryCard` | `app/insight/page.tsx` | `SanFangSummaryCard` | SUMMARY_CARD | UNKNOWN | Function exists; not found in current render path. |
| `AnnualFortunePanel` | `app/insight/page.tsx` | `AnnualFortunePanel` | DETAIL_CARD | UNKNOWN | Function exists; not found in current render path. |
| `ScoreEvidenceCard` | `app/insight/page.tsx` | `ScoreEvidenceCard` | Evidence card | UNKNOWN | Function exists; not found in current render path. |
| `NameologyResultPanel` | `app/insight/page.tsx` | `NameologyResultPanel` | Cross-module panel | MOVE | Nameology material is mixed into Ziwei page. Should be Integration Layer output, not Ziwei UI. |
| `InsightAnalyticalConsole` | `app/insight/page.tsx` | `InsightAnalyticalConsole` | Console/loading | DUPLICATE | Uses front-end timed logs, not real backend state. |
| `FiveElementPriorityCard` | `components/FiveElementPriorityCard.tsx` | imported in insight page | Cross-module card | MOVE | Shared card; should be fed by Integration Layer result. |

Current visible result path after result:
`DailyAnalysisNotice` -> `ZiweiRitualStepsPanel` -> hidden old summary -> `ZiweiTwelvePalaceCards` -> `FiveElementPriorityCard` -> NextStepGuide.

## 4. API Inventory

| API | File | Mark | Evidence | Note |
| --- | --- | --- | --- | --- |
| `/api/insight-analyze` | `app/api/insight-analyze/route.ts` | KEEP | Direct page submit | Main active API. Has in-memory cache and rate limit. |
| `/api/analysis/jobs` with `analysisType: insight` | `app/api/analysis/jobs/route.ts` | DUPLICATE / CRITICAL_DUPLICATION | Registered through `analysis-module-router` | Creates job but insight is not inline; can lose job state in serverless. |
| `/api/analysis/jobs/[jobId]` | `app/api/analysis/jobs/[jobId]/route.ts` | KEEP | Shared polling endpoint | Risk when used for insight due memory-only job store. |
| `/api/analysis/results/[resultId]` | `app/api/analysis/results/[resultId]/route.ts` | KEEP | Shared result endpoint | Depends on in-memory result store. |

## 5. Engine / Service Inventory

| Item | File | Mark | Role |
| --- | --- | --- | --- |
| `generateInsightAnalysis()` | `lib/insight-engine.ts` | KEEP | Main orchestrating Ziwei/AI insight engine. |
| `computeShichenProfile()` | `lib/shichen-engine.ts` | KEEP | Time branch/profile. |
| `calculateZiweiSanFang()` | `lib/ziwei-sanfang-engine.ts` | KEEP | Main deterministic Ziwei chart/sanfang engine. |
| `calculateAnnualFortune()` | `lib/annual-fortune-engine.ts` | KEEP | Annual fortune from Ziwei + Bazi signals. |
| `buildInsightFiveElementResult()` | `lib/five-element-engine.ts` | MOVE | Cross-module five-element result should belong to Integration Layer. |
| `buildNameologyAnalysis()` inside insight | `lib/insight-engine.ts` | MOVE | Nameology is mixed into Ziwei engine. Should be external signal. |
| `getBloodTypePersonalityScores()` inside insight | `lib/insight-engine.ts` | MOVE / CRITICAL | Blood type affects Ziwei statistical analysis and cache key. Not professional Ziwei. |
| `calculateZiweiMainStar()` | `lib/ziwei-calculator.ts` | DEPRECATED_CANDIDATE | Legacy isolated calculator not used in main route. |
| `UnifiedAnalysisOrchestrator` | `lib/unified-analysis/orchestrator.ts` | KEEP / FUTURE | Newly created shared core, not yet wired into Ziwei. |

## 6. Store / Schema / Data

| Item | File | Mark | Note |
| --- | --- | --- | --- |
| Daily result store | `lib/daily-analysis-limit.ts` via `readDailyAnalysis('ziwei')` | KEEP | Browser storage; not unique backend analysisId. |
| Growth Center update | `lib/growth-center-client.ts` via `markGrowthModuleCompleted('ziwei', ...)` | KEEP / MOVE | Should eventually read Integration Layer result. |
| Analysis job store | `lib/analysis-job-store.ts` | KEEP | In-memory job/result store. Risk for serverless insight polling. |
| `InsightAnalysisResponse` | `lib/insight-engine.ts` | MERGE | Large mixed schema; no root `analysisId`. |
| `ZiweiPresentationBundle` | Not found | NOT_FOUND | Required by Phase 01 instruction but not implemented. |
| `ZiweiPresentationService` | Not found | NOT_FOUND | Required by Phase 01 instruction but not implemented. |
| `ZiweiSemanticCore` | Not found | NOT_FOUND | Required by Phase 01 instruction but not implemented. |

## 7. Data Flow Diagram

```mermaid
flowchart TD
  A[Member opens /insight] --> B[app/insight/page.tsx form]
  B --> C[/api/insight-analyze]
  C --> D[generateInsightAnalysis]
  D --> E[computeShichenProfile]
  D --> F[calculateZiweiSanFang]
  D --> G[calculateAnnualFortune]
  D --> H[buildNameologyAnalysis]
  D --> I[getBloodTypePersonalityScores]
  D --> J[Gemini AI prompt]
  D --> K[InsightAnalysisResponse]
  K --> L[DailyAnalysis local store]
  K --> M[Growth Center local completion]
  K --> N[ZiweiTwelvePalaceCards]
  N --> O[MEMBER general 12 flip summary cards]
  N --> P[PROFESSIONAL teacher mode cards]

  Q[QA/shared caller /api/analysis/jobs analysisType=insight] --> R[analysis-job-store memory job]
  R --> S[runInsightJob]
  S --> D
  R --> T[/api/analysis/jobs/[jobId] polling]
  R --> U[/api/analysis/results/[resultId]]
```

## 8. Current Answers Required By Phase 01

### 目前共有幾套紫微流程
CONFIRMED: 2 executable flows.
- Direct page API: `/insight` -> `/api/insight-analyze` -> `generateInsightAnalysis`.
- Shared Analysis Task API: `/api/analysis/jobs` -> `runInsightJob` -> `generateInsightAnalysis`.
Plus 1 isolated legacy calculator: `lib/ziwei-calculator.ts`.

### 會員版入口
CONFIRMED: `/insight`, `app/insight/page.tsx`.

### 老師版入口
CONFIRMED: no separate route. It is a `viewMode` toggle inside `ZiweiTwelvePalaceCards`.

### 大卡數量
CONFIRMED by code inventory: at least 4 detail/professional surfaces currently present.
- `ZiweiTwelvePalaceCards`
- `ZiweiProfessionalTeacherMode`
- `ZiweiPalaceMemberPanel`
- `ZiweiPalaceStoryPanel`
Additional defined but not confirmed in render path: `ZiweiSanFangPanel`, `AnnualFortunePanel`.

### 小卡數量
CONFIRMED by code: 12 member flip cards in general mode. Also one hidden old summary block exists but is not visible.

### 共用後端
CONFIRMED: both API flows call `generateInsightAnalysis()`.

### 重複後端
CONFIRMED: `/api/insight-analyze` and `/api/analysis/jobs` are two backend entry points for insight. Marked `CRITICAL_DUPLICATION` because result lifecycle differs.

### 共用 API
PARTIAL: shared task API exists, but current page does not use it.

### 重複 API
CONFIRMED: direct insight API and shared job API both can execute insight.

### 共用 Engine
CONFIRMED: `generateInsightAnalysis()` -> `calculateZiweiSanFang()` is the main path.

### 重複 Engine
PARTIAL / DEPRECATED_CANDIDATE: `lib/ziwei-calculator.ts` exports `calculateZiweiMainStar()` but no current usage found.

### 資料是否來自同一 analysisId
CONFIRMED problem: no root `analysisId` exists in `InsightAnalysisResponse`. Direct API returns raw result; Analysis Task creates `jobId/resultId`, but member/professional/small/big card views do not reference a single `ZIWEI-ANALYSIS-UUID`.

## 9. Most Serious Five Problems

1. CRITICAL_DUPLICATION: Two API flows for insight
   - Files: `app/api/insight-analyze/route.ts`, `app/api/analysis/jobs/route.ts`, `lib/analysis-job-runner.ts`
   - Impact: mobile/production polling can see job/result mismatch.

2. CRITICAL: No single root `analysisId`
   - Files: `lib/insight-engine.ts`, `app/insight/page.tsx`, `lib/analysis-job-store.ts`
   - Impact: summary/detail/member/professional cannot prove they read the same result.

3. CRITICAL: Blood type and nameology are mixed inside Ziwei engine
   - Files: `lib/insight-engine.ts`, `app/insight/page.tsx`, `app/api/insight-analyze/route.ts`
   - Impact: professional Ziwei and cross-module personality material are not separated.

4. MAJOR: Presentation logic is inside `app/insight/page.tsx`
   - Files: `app/insight/page.tsx`
   - Impact: member summary, teacher detail, tarot bridge, static star materials, annual lenses and story copy are mixed in one page instead of a `ZiweiPresentationService`.

5. MAJOR: Ritual/loading flow is front-end timer based
   - Files: `app/insight/page.tsx`
   - Impact: status can appear as completed by timer rather than backend state; violates real PASS rule.

## 10. Can Merge Safely Later

- Merge direct `/api/insight-analyze` and shared `analysis/jobs` into one official lifecycle.
- Move member/teacher presentation shaping into `ZiweiPresentationService`.
- Add root `analysisId` to `InsightAnalysisResponse` or a new `ZiweiAnalysisResult`.
- Move nameology/blood/five-element material to Integration Layer, not professional Ziwei chart.
- Mark `lib/ziwei-calculator.ts` as legacy after confirming no hidden import.

## 11. Cannot Touch In Phase 01

- Do not delete teacher mode.
- Do not delete member mode.
- Do not delete 12 flip cards.
- Do not delete `ziwei-calculator.ts` yet.
- Do not rewrite `calculateZiweiSanFang()`.
- Do not change API behavior until user approves Phase 02.

## 12. Recommended Phase 02 Direction

1. Create constants:
   - `ZIWEI_USER_MODE = 'MEMBER'`
   - `ZIWEI_TEACHER_MODE = 'PROFESSIONAL'`
   - `SUMMARY_CARD`, `DETAIL_CARD`, `PROFESSIONAL_DETAIL_CARD`

2. Create `ZiweiAnalysisResult` with root `analysisId`.

3. Create `ZiweiPresentationService` returning:
   - `memberSummary`
   - `memberDetail`
   - `professionalDetail`

4. Create `ZiweiSemanticCore` so canonical meanings are generated once.

5. Choose one official API path and route all views to the same result lifecycle.

STOP: Phase 01 inventory complete. Await user approval before Phase 02 implementation.
