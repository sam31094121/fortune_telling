import { computeMusicProfile } from './music-engine';
import { DIMENSION_META } from './personality';
import { averageScore, clampPercentage } from './trinity-weights';
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
    emotion_sensitivity: { 高: '情緒感知細膩，對氣氛與關係變化非常敏銳', 中: '能感受到情緒波動，也保有自我緩衝', 低: '情緒相對穩定，不容易被外界波動牽動' },
    logic: { 高: '思考偏理性，判斷時重視邏輯與證據', 中: '理性與直覺並用，能彈性看待問題', 低: '更依賴感受與直覺做決策' },
    social_need: { 高: '需要互動與交流，從人際連結中獲得能量', 中: '能獨處也能社交，節奏拿捏較平衡', 低: '偏好保留私人空間，社交選擇較謹慎' },
    leadership: { 高: '容易主動帶方向，面對局勢有掌控欲', 中: '在需要時願意承擔責任與帶頭', 低: '更擅長觀察與配合，不急著站上前線' },
    risk_tendency: { 高: '面對未知較敢嘗試，行動帶有突破性', 中: '會評估風險後再決定是否前進', 低: '偏好穩定節奏，避免不必要的波動' },
    execution: { 高: '落地能力強，想法能快速轉成行動', 中: '執行節奏穩健，能按步完成目標', 低: '需要更明確的動機或推力才容易啟動' },
    creativity: { 高: '想像力活躍，能提出新視角與新做法', 中: '兼具實用與創意，能靈活調整', 低: '偏好成熟方法，較少主動顛覆既有模式' },
    empathy: { 高: '容易感同身受，能接住他人的情緒與需求', 中: '具備理解他人的能力，也能保有界線', 低: '較重視事實與效率，不會先從情緒切入' },
    control: { 高: '重視掌握度，習慣先規劃再行動', 中: '需要一定秩序，但也能接受彈性', 低: '傾向順勢而行，不喜歡過度框住自己' },
    security_need: { 高: '非常重視安全感與可預期性', 中: '需要基本穩定，也接受適度變化', 低: '對不確定性的容忍度較高' },
    wealth_motivation: { 高: '對成果與資源累積有明確動機', 中: '重視實際回報，也在意生活平衡', 低: '較少被外在報酬驅動，更重視感受與意義' },
    attachment: { 高: '感情投入深，建立連結後會很在意關係品質', 中: '能投入感情，也保留自我節奏', 低: '情感表達較克制，需要時間建立依附感' },
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
  if (value >= 10) return '明顯增強';
  if (value > 0) return '溫和增強';
  if (value <= -10) return '明顯收斂';
  return '溫和收斂';
}

export function enrichAnalysis(result: AnalysisResult): AnalysisResult {
  const topBase = sortDimensions(result.base_scores).slice(0, 3);
  const topFinal = sortDimensions(result.final_scores).slice(0, 3);
  const bloodEffects = summarizeAdjustments(result.blood_adjustments, 4);
  const nameEffects = summarizeAdjustments(result.name_adjustments, 6);

  const skeleton_summary =
    result.ai_skeleton_summary?.trim()
    || `生日先建立你的人格骨架，核心特徵落在 ${topBase.map((item) => item.label).join('、')}，整體呈現 ${topBase.map((item) => getTraitPhrase(item.key, result.base_scores[item.key])).join('；')}。`;

  const behavior_summary =
    result.ai_behavior_summary?.trim()
    || (bloodEffects.length
      ? `血型在不推翻生日骨架的前提下，主要補強 ${bloodEffects.map((item) => `${item.label}${describeAdjustment(result.blood_adjustments[item.key])}`).join('、')}，讓你的外在表現更有層次。`
      : '血型這一層提供的是細微修飾，讓原本的人格骨架在行為表現上更穩定。');

  const individuality_summary =
    result.ai_individuality_summary?.trim()
    || (nameEffects.length
      ? `姓名作為最後校正器，把個體差異集中深化在 ${nameEffects.map((item) => item.label).join('、')}，使整體人格輪廓更貼近你獨有的生命節奏。`
      : '姓名主要扮演最後校正器，讓整體人格模型更個人化，但不會推翻前面的天地結論。');

  const final_summary =
    result.ai_final_summary?.trim()
    || `三合一融合後，你最鮮明的特質集中在 ${topFinal.map((item) => item.label).join('、')}。這代表你在人格節奏上兼具天生底色、後天表現與個體差異；若能以善為本、持續修心與行善，這份能量會更穩定地展開。`;

  const wealth_motivation_summary = `你的財富動機呈現 ${getTraitPhrase('wealth_motivation', result.final_scores.wealth_motivation)}，並且會受到 ${getTraitPhrase('execution', result.final_scores.execution)} 與 ${getTraitPhrase('security_need', result.final_scores.security_need)} 的共同影響。`;

  const love_pattern_summary = `你的感情模式偏向 ${getTraitPhrase('attachment', result.final_scores.attachment)}，同時伴隨 ${getTraitPhrase('empathy', result.final_scores.empathy)}，因此在親密關係中會特別在意安全感與互相理解。`;

  const blind_spot_summary = `目前較需要留意的盲點落在 ${sortDimensions(result.final_scores).slice(-2).map((item) => item.label).join('、')}；當壓力升高時，這兩個面向最容易失去平衡。`;

  const life_advantage_summary = `你的人生優勢集中在 ${topFinal.slice(0, 2).map((item) => item.label).join('、')}，只要方向對了，這兩股能量很容易成為你長期發展的主軸。`;

  return {
    ...result,
    resonance_score: clampPercentage(result.resonance_score),
    skeleton_summary,
    behavior_summary,
    individuality_summary,
    final_summary,
    wealth_motivation_summary,
    love_pattern_summary,
    blind_spot_summary,
    life_advantage_summary,
    music_profile: computeMusicProfile(result.final_scores),
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
      clampPercentage(base_scores[item.key] + blood_adjustments[item.key]),
    ]),
  ) as DimensionScores;

  const topBase = sortDimensions(base_scores).slice(0, 3);
  const topPreview = sortDimensions(preview_scores).slice(0, 3);
  const bloodEffects = summarizeAdjustments(blood_adjustments, 4);

  const skeleton_summary =
    aiSkeletonSummary?.trim()
    || `生日先建立人格骨架，目前最明顯的底層特徵是 ${topBase.map((item) => item.label).join('、')}。`;

  const behavior_summary =
    aiBehaviorSummary?.trim()
    || (bloodEffects.length
      ? `血型補強了 ${bloodEffects.map((item) => `${item.label}${describeAdjustment(blood_adjustments[item.key])}`).join('、')}，讓外在互動模式更具辨識度。`
      : '血型目前帶來的是溫和修飾，還不會推翻先天人格骨架。');

  const preview_summary =
    aiPreviewSummary?.trim()
    || `天地預分析已建立完成，目前最突出的能量集中在 ${topPreview.map((item) => item.label).join('、')}；接下來若加入姓名，模型會進一步做個體化校正。`;

  return {
    preview_score: averageScore(Object.values(preview_scores)),
    base_scores,
    blood_adjustments,
    preview_scores,
    skeleton_summary,
    behavior_summary,
    preview_summary,
    music_profile: computeMusicProfile(preview_scores),
  };
}
