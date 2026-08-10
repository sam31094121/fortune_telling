import type { IntegratedTheme, IntegrationSignal, SignalDimension, SourceModule } from './integration-types';

function uniqueOrdered<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function classifyTheme(group: IntegrationSignal[], sources: SourceModule[]): IntegratedTheme['classification'] {
  const nonNeutralDirections = uniqueOrdered(group.map((signal) => signal.direction).filter((direction) => direction !== 'NEUTRAL'));
  if (nonNeutralDirections.length > 1) return 'CONFLICT';
  if (sources.length >= 2) return 'CONSENSUS';
  return 'UNIQUE';
}

export function integrateSignals(signals: IntegrationSignal[]): IntegratedTheme[] {
  const grouped = new Map<SignalDimension, IntegrationSignal[]>();

  for (const signal of signals) {
    if (!signal.summary.trim()) continue;
    const current = grouped.get(signal.dimension) ?? [];
    current.push({
      ...signal,
      weight: Math.max(0, signal.weight),
      confidence: clampRatio(signal.confidence),
    });
    grouped.set(signal.dimension, current);
  }

  const themes: IntegratedTheme[] = [];

  for (const [dimension, group] of grouped.entries()) {
    const sources = uniqueOrdered(group.map((signal) => signal.sourceModule));
    const strength = group.reduce((sum, signal) => sum + signal.weight, 0);
    const confidence = strength > 0
      ? group.reduce((sum, signal) => sum + signal.confidence * signal.weight, 0) / strength
      : 0;

    themes.push({
      dimension,
      classification: classifyTheme(group, sources),
      sources,
      strength,
      confidence,
      summaries: uniqueOrdered(group.map((signal) => signal.summary.trim())),
      evidenceRefs: uniqueOrdered(group.flatMap((signal) => signal.evidenceRefs)),
    });
  }

  return themes.sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return b.confidence - a.confidence;
  });
}
