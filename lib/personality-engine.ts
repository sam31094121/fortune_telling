import { DIMENSION_META } from './personality';
import type {
  AnalysisResult,
  DimensionAdjustments,
  DimensionKey,
  DimensionScores,
  PreviewAnalysisResult,
} from './types';

function sortDimensions(scores: DimensionScores) {
  return [...DIMENSION_META].sort((a, b) => scores[b.key] - scores[a.key]);
}

function getLevel(score: number) {
  if (score >= 75) return '高';
  if (score >= 55) return '中';
  return '低';
}

function getTraitPhrase(key: DimensionKey, score: number) {
  const level = getLevel(score);

  const map: Record<DimensionKey, Record<string, string>> = {
    emotion_sensitivity: { 高: '情緒感受細膩', 中: '情緒感知平衡', 低: '情緒邊界清楚' },
    logic: { 高: '理性判斷穩定', 中: '理性與直覺並行', 低: '更依賴直覺感受' },
    social_need: { 高: '需要互動與連結', 中: '社交節奏彈性', 低: '偏好保留個人空間' },
    leadership: { 高: '帶動他人的意識強', 中: '必要時能承擔主導', 低: '更偏好觀察後行動' },
    risk_tendency: { 高: '願意承擔變動', 中: '會衡量再出手', 低: '偏好穩定與可控' },
    execution: { 高: '落地與推進能力強', 中: '執行力穩定', 低: '需要更明確的外部節奏' },
    creativity: { 高: '想像與創造力突出', 中: '兼具實用與創意', 低: '偏好沿既有框架優化' },
    empathy: { 高: '能快速感知他人狀態', 中: '同理與理性兼具', 低: '更重視界線與客觀' },
    control: { 高: '對秩序與掌控有要求', 中: '控制與彈性平衡', 低: '較能接受流動與變化' },
    security_need: { 高: '需要穩定安全感', 中: '安全感需求適中', 低: '對不確定性容忍較高' },
    wealth_motivation: { 高: '對資源成長有驅動力', 中: '看重穩定累積', 低: '金錢不是唯一驅動' },
    attachment: { 高: '感情投入深且黏著', 中: '依附與獨立平衡', 低: '關係中更需要呼吸感' },
  };

  return map[key][level];
}

function summarizeAdjustments(adjustments: DimensionAdjustments, threshold: number) {
  return [...DIMENSION_META]
    .filter((meta) => Math.abs(adjustments[meta.key]) >= threshold)
    .sort((a, b) => Math.abs(adjustments[b.key]) - Math.abs(adjustments[a.key]))
    .slice(0, 3);
}

function describeAdjustment(value: number) {
  if (value >= 10) return '明顯拉高';
  if (value > 0) return '輕微拉高';
  if (value <= -10) return '明顯收斂';
  return '輕微收斂';
}

export function enrichAnalysis(result: AnalysisResult): AnalysisResult {
  const topBase = sortDimensions(result.base_scores).slice(0, 3);
  const topFinal = sortDimensions(result.final_scores).slice(0, 3);
  const bloodEffects = summarizeAdjustments(result.blood_adjustments, 4);
  const nameEffects = summarizeAdjustments(result.name_adjustments, 6);

  const skeleton_summary =
    result.ai_skeleton_summary?.trim() ||
    `生日先建立了你的人格骨架：${topBase
      .map((item) => getTraitPhrase(item.key, result.base_scores[item.key]))
      .join('、')}。這一層只定義底層輪廓，不急著下最終結論。`;

  const behavior_summary =
    result.ai_behavior_summary?.trim() ||
    (bloodEffects.length
      ? `血型沒有推翻原本骨架，而是補充行為模式：${bloodEffects
          .map(
            (item) =>
              `${item.label}${describeAdjustment(result.blood_adjustments[item.key])}`,
          )
          .join('、')}。`
      : '血型主要扮演微調角色，讓原本的人格骨架在互動與行動節奏上更具體。');

  const individuality_summary =
    result.ai_individuality_summary?.trim() ||
    (nameEffects.length
      ? `姓名作為最後校正器，把個體差異集中放大在${nameEffects
          .map((item) => item.label)
          .join('、')}，讓同樣的骨架呈現出更獨特的個人風格。`
      : '姓名沒有重新改寫你的人格，而是把原有特質個人化，讓整體表現更像你自己。');

  const final_summary =
    result.ai_final_summary?.trim() ||
    `最終融合後，你最鮮明的特質集中在${topFinal
      .map((item) => item.label)
      .join('、')}。整體模型呈現「先有骨架、再被修飾、最後被個性化」的穩定結構，不互相衝突。真正能讓人生走向更順的核心，仍然是以善為本、多行善念、多做善行。`;

  const wealth_motivation_summary = `你的財富動機為${getTraitPhrase(
    'wealth_motivation',
    result.final_scores.wealth_motivation,
  )}，並受到${getTraitPhrase('execution', result.final_scores.execution)}與${getTraitPhrase(
    'security_need',
    result.final_scores.security_need,
  )}影響。`;

  const love_pattern_summary = `你的感情模式偏向${getTraitPhrase(
    'attachment',
    result.final_scores.attachment,
  )}，同時帶有${getTraitPhrase('empathy', result.final_scores.empathy)}的互動傾向。`;

  const blind_spot_summary = `目前最需要留意的是${sortDimensions(result.final_scores)
    .slice(-2)
    .map((item) => item.label)
    .join('與')}較弱時，容易讓你的優勢發揮被卡住。`;

  const life_advantage_summary = `你的人生優勢主要來自${topFinal
    .slice(0, 2)
    .map((item) => item.label)
    .join('與')}，這會成為你最穩定的個人驅動來源。`;

  return {
    ...result,
    skeleton_summary,
    behavior_summary,
    individuality_summary,
    final_summary,
    wealth_motivation_summary,
    love_pattern_summary,
    blind_spot_summary,
    life_advantage_summary,
  };
}

export function enrichPreview(
  base_scores: DimensionScores,
  blood_adjustments: DimensionAdjustments,
  aiSkeletonSummary?: string,
  aiBehaviorSummary?: string,
  aiPreviewSummary?: string,
): PreviewAnalysisResult {
  const preview_scores = Object.fromEntries(
    DIMENSION_META.map((item) => [
      item.key,
      Math.max(0, Math.min(100, Math.round(base_scores[item.key] + blood_adjustments[item.key]))),
    ]),
  ) as DimensionScores;

  const topBase = sortDimensions(base_scores).slice(0, 3);
  const topPreview = sortDimensions(preview_scores).slice(0, 3);
  const bloodEffects = summarizeAdjustments(blood_adjustments, 4);

  const skeleton_summary =
    aiSkeletonSummary?.trim() ||
    `生日先建立了人格骨架：${topBase
      .map((item) => getTraitPhrase(item.key, base_scores[item.key]))
      .join('、')}。這個階段只先定義底層輪廓。`;

  const behavior_summary =
    aiBehaviorSummary?.trim() ||
    (bloodEffects.length
      ? `血型進一步補充了行為模式：${bloodEffects
          .map((item) => `${item.label}${describeAdjustment(blood_adjustments[item.key])}`)
          .join('、')}。`
      : '血型目前只做輕量修飾，讓骨架更接近你在現實中的互動樣子。');

  const preview_summary =
    aiPreviewSummary?.trim() ||
    `天地預分析完成後，你目前最突出的傾向集中在${topPreview
      .map((item) => item.label)
      .join('、')}。這是免費階段的人格輪廓，接下來姓名會解鎖更深的個體差異。`;

  const preview_score = Math.round(
    Object.values(preview_scores).reduce((sum, value) => sum + value, 0) / Object.values(preview_scores).length,
  );

  return {
    preview_score,
    base_scores,
    blood_adjustments,
    preview_scores,
    skeleton_summary,
    behavior_summary,
    preview_summary,
  };
}
