import type { CardQualityReport, QualityTier, Severity } from './types';

const BLOCKING_SEVERITIES: Severity[] = ['BLOCKER', 'CRITICAL'];

export function calculateQualityTier(
  report: Omit<CardQualityReport, 'totalScore' | 'tier' | 'allowNextCard' | 'generatedAt'>,
): Pick<CardQualityReport, 'totalScore' | 'tier' | 'allowNextCard' | 'generatedAt'> {
  const totalScore = report.dimensions.reduce((total, item) => total + item.score, 0);
  const hasBlockingIssue = report.issues.some((issue) => BLOCKING_SEVERITIES.includes(issue.severity));
  const hasMajorIssue = report.issues.some((issue) => issue.severity === 'MAJOR');
  const hasMissingEvidence = report.dimensions.some((item) => item.status === 'NOT_TESTED' || item.status === 'BLOCKED' || item.evidenceIds.length === 0);
  const checks = report.mandatoryChecks;

  let tier: QualityTier = 'UNRATED';

  if (!hasBlockingIssue && checks.fullFlowPassed && checks.backendVerified && totalScore >= 70) {
    tier = 'STANDARD';
  }

  if (tier === 'STANDARD' && totalScore >= 85 && checks.mobilePassed && checks.linePassed && checks.noCriticalIssues) {
    tier = 'REFINED';
  }

  if (tier === 'REFINED' && totalScore >= 95 && !hasMajorIssue && !hasMissingEvidence && checks.regressionPassed) {
    tier = 'SIGNATURE';
  }

  const allowNextCard = tier === 'SIGNATURE' && !hasBlockingIssue && !hasMajorIssue && checks.regressionPassed;

  return {
    totalScore,
    tier,
    allowNextCard,
    generatedAt: new Date().toISOString(),
  };
}