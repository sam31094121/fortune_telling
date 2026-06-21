import type { MatchResult } from '@/lib/compatibility-engine';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function sanitizeZones(result: MatchResult): MatchResult['zones'] {
  const conflict = unique(result.zones.conflict).slice(0, 4);
  const grinding = unique(result.zones.grinding.filter((item) => !conflict.includes(item))).slice(0, 4);
  const resonance = unique(
    result.zones.resonance.filter((item) => !conflict.includes(item) && !grinding.includes(item)),
  ).slice(0, 4);
  const complement = unique(
    result.zones.complement.filter(
      (item) => !conflict.includes(item) && !grinding.includes(item) && !resonance.includes(item),
    ),
  ).slice(0, 4);

  return { resonance, complement, grinding, conflict };
}

export function buildStableSummary(scores: {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
}) {
  const { match_score, resonance, communication, stability, conflict_risk } = scores;

  if (match_score >= 82 && conflict_risk <= 35) {
    return '整體配對穩定度高，雙方在共鳴與相處節奏上有明顯優勢，只要持續保持真誠溝通，這段關係會越走越順。';
  }

  if (match_score >= 72) {
    if (communication < 60) {
      return '整體配對基礎不錯，但溝通節奏仍需要磨合。只要放慢情緒反應、把話說清楚，關係就能維持穩定並逐步加深。';
    }

    if (stability < 60) {
      return '雙方有一定吸引力與互補性，但安全感與生活節奏仍需協調。先把日常規則談清楚，會比只靠感覺更穩。';
    }

    return '這組配對有不錯的共鳴基礎，互補性也足夠。若能持續照顧彼此的感受與節奏，關係會往穩定方向發展。';
  }

  if (match_score >= 60) {
    if (conflict_risk >= 60) {
      return '這段關係不是沒有可能，而是特別需要耐心。吸引力存在，但衝突點也明顯，越早建立界線與溝通方式，越能減少摩擦。';
    }

    return '整體屬於中段配對，彼此之間有可發展空間，但需要更多理解與調整。若願意慢慢磨合，仍有機會走向穩定。';
  }

  if (conflict_risk >= 70) {
    return '目前這組配對的衝突敏感度偏高，互動時容易因節奏不同而累積壓力。若要走得長久，務必要先建立清楚的溝通規則。';
  }

  return '這組配對目前的磨合壓力較大，彼此看待事情的方式差異明顯。若想繼續靠近，建議先從理解與尊重彼此節奏開始。';
}

export function stabilizeMatchResult(result: MatchResult): MatchResult {
  const resonance = clamp(result.resonance);
  const communication = clamp(result.communication);
  const stability = clamp(result.stability);
  const conflict_risk = clamp(result.conflict_risk);

  const stableScore = clamp(
    resonance * 0.32 +
      communication * 0.28 +
      stability * 0.24 +
      (100 - conflict_risk) * 0.16,
  );

  const summary = buildStableSummary({
    match_score: stableScore,
    resonance,
    communication,
    stability,
    conflict_risk,
  });

  return {
    ...result,
    match_score: stableScore,
    resonance,
    communication,
    stability,
    conflict_risk,
    zones: sanitizeZones(result),
    summary,
  };
}

export function isConsistentAiSummary(summary: string, result: MatchResult) {
  const text = summary.trim();
  if (!text) return false;
  if (text.length > 140) return false;

  const optimisticWords = ['非常穩定', '幾乎沒有衝突', '天作之合', '完全契合', '高度完美'];
  const warningWords = ['衝突明顯', '磨合壓力', '需要耐心', '需要調整', '節奏不同'];

  if (result.conflict_risk >= 60 && optimisticWords.some((word) => text.includes(word))) {
    return false;
  }

  if (result.match_score >= 75 && result.conflict_risk <= 40 && warningWords.filter((word) => text.includes(word)).length >= 3) {
    return false;
  }

  return true;
}
