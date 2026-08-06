#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = (process.env.CARD_QUALITY_BASE_URL || process.env.BASE_URL || 'http://localhost:8888').replace(/\/$/, '');
const REPORT_DIR = path.join(ROOT, 'reports', 'card-quality');
const CARD_09_REPORT = path.join(REPORT_DIR, 'CARD_09.json');
const AUTO_QA_REPORT = path.join(ROOT, 'reports', 'auto-qa', 'latest.json');
const SCREEN_HEALTH_REPORT = path.join(ROOT, 'reports', 'screen-health', 'latest.json');

const BLOCKING_SEVERITIES = new Set(['BLOCKER', 'CRITICAL']);

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchJson(route) {
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}${route}`, { headers: { 'Cache-Control': 'no-cache', 'X-Card-Quality-Audit': 'CARD_09' } });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { ok: response.ok, status: response.status, durationMs: Date.now() - startedAt, data, text };
}

function calculate(report) {
  const totalScore = report.dimensions.reduce((sum, item) => sum + item.score, 0);
  const hasBlockingIssue = report.issues.some((issue) => BLOCKING_SEVERITIES.has(issue.severity));
  const hasMajorIssue = report.issues.some((issue) => issue.severity === 'MAJOR');
  const hasMissingEvidence = report.dimensions.some((item) => item.status === 'NOT_TESTED' || item.status === 'BLOCKED' || item.evidenceIds.length === 0);
  const checks = report.mandatoryChecks;
  let tier = 'UNRATED';
  if (!hasBlockingIssue && checks.fullFlowPassed && checks.backendVerified && totalScore >= 70) tier = 'STANDARD';
  if (tier === 'STANDARD' && totalScore >= 85 && checks.mobilePassed && checks.linePassed && checks.noCriticalIssues) tier = 'REFINED';
  if (tier === 'REFINED' && totalScore >= 95 && !hasMajorIssue && !hasMissingEvidence && checks.regressionPassed) tier = 'SIGNATURE';
  return {
    totalScore,
    tier,
    allowNextCard: tier === 'SIGNATURE' && !hasBlockingIssue && !hasMajorIssue && checks.regressionPassed,
    generatedAt: new Date().toISOString(),
  };
}

function status(score, max, tested = true) {
  if (!tested) return 'NOT_TESTED';
  return score > 0 ? 'PASSED' : 'FAILED';
}

async function main() {
  const autoQa = await readJsonIfExists(AUTO_QA_REPORT);
  const screenHealth = await readJsonIfExists(SCREEN_HEALTH_REPORT);
  const apiSelf = await fetchJson('/api/growth-center?completedModules=nameology,bazi,zodiac,tarot&primaryElement=FIRE&secondaryElement=AIR&avoidElement=WATER&anonymousProfileId=card09-quality-self');
  const apiOther = await fetchJson('/api/growth-center?completedModules=tarot&primaryElement=WATER&secondaryElement=EARTH&avoidElement=FIRE&anonymousProfileId=card09-quality-other');

  const growthQa = autoQa?.modules?.find((module) => module.id === 'growth_center');
  const qaChecks = growthQa?.checks || [];
  const allQaPassed = Boolean(growthQa && qaChecks.length >= 4 && qaChecks.every((check) => check.status === 'passed'));
  const screenRoute = screenHealth?.routes?.find((route) => route.path === '/growth-center');
  const routeHealthy = screenRoute?.status === 'PASSED';
  const backendVerified = Boolean(apiSelf.ok && apiOther.ok && apiSelf.data?.success && apiOther.data?.success && apiSelf.data?.data?.integrationLayer && apiOther.data?.data?.dataPolicy);
  const contentComplete = Boolean(apiSelf.data?.data?.coreV2?.firstScreen?.headline && apiSelf.data?.data?.weeklyTask?.task && apiSelf.data?.data?.followUp?.quickReplies?.length);
  const hasRequestId = Boolean(apiSelf.data?.requestId && apiOther.data?.requestId);
  const performanceGood = Math.max(apiSelf.durationMs, apiOther.durationMs, screenRoute?.durationMs || 0) < 1500;

  const dimensions = [
    { dimension: 'FUNCTIONALITY', score: allQaPassed ? 20 : 0, maxScore: 20, status: status(allQaPassed ? 20 : 0, 20), evidenceIds: allQaPassed ? ['AUTO_QA_CARD09_FULL_FLOW'] : [] },
    { dimension: 'ACCURACY', score: backendVerified ? 18 : 0, maxScore: 20, status: status(backendVerified ? 18 : 0, 20), evidenceIds: backendVerified ? ['API_SELF_OTHER_INTEGRATION_LAYER'] : [] },
    { dimension: 'MOBILE_UX', score: 5, maxScore: 15, status: 'NOT_TESTED', evidenceIds: ['ROUTE_HTML_REACHABLE_ONLY'] },
    { dimension: 'STABILITY', score: routeHealthy && backendVerified ? 15 : 0, maxScore: 15, status: status(routeHealthy && backendVerified ? 15 : 0, 15), evidenceIds: routeHealthy && backendVerified ? ['SCREEN_HEALTH_CARD09', 'API_NO_STORE_OK'] : [] },
    { dimension: 'CONTENT_QUALITY', score: contentComplete ? 8 : 0, maxScore: 10, status: status(contentComplete ? 8 : 0, 10), evidenceIds: contentComplete ? ['CORE_V2_FIRST_SCREEN_WEEKLY_TASK_FOLLOWUP'] : [] },
    { dimension: 'PERFORMANCE', score: performanceGood ? 9 : 4, maxScore: 10, status: status(performanceGood ? 9 : 4, 10), evidenceIds: ['API_ROUTE_DURATION_MS'] },
    { dimension: 'TRACEABILITY', score: hasRequestId && allQaPassed ? 8 : 3, maxScore: 10, status: status(hasRequestId && allQaPassed ? 8 : 3, 10), evidenceIds: hasRequestId ? ['REQUEST_ID_PRESENT'] : [] },
  ];

  const issues = [];
  if (!allQaPassed) {
    issues.push({
      id: 'CARD09-FULL-FLOW-NOT-PASSED', cardId: 'CARD_09', severity: 'CRITICAL', layer: 'INTEGRATION', step: 'full flow',
      actualProblem: 'CARD_09 full flow does not have passing auto-qa evidence.',
      rootCause: 'Missing or failed reports/auto-qa/latest.json growth_center evidence.',
      filePaths: ['scripts/auto-qa.mjs', 'reports/auto-qa/latest.json'],
      repairAction: 'Run and fix growth_center auto QA until SELF and OTHER pass.',
      verificationAction: 'node scripts/auto-qa.mjs --modules=growth_center --modes=self,other',
    });
  }
  if (!routeHealthy) {
    issues.push({
      id: 'CARD09-ROUTE-UNHEALTHY', cardId: 'CARD_09', severity: 'CRITICAL', layer: 'FRONTEND', step: 'route health',
      actualProblem: '/growth-center route does not have healthy screen evidence.',
      rootCause: 'Missing or failed screen-health route status.',
      filePaths: ['app/growth-center/page.tsx', 'reports/screen-health/latest.json'],
      repairAction: 'Repair route render or server health and rerun screen-health.',
      verificationAction: 'node scripts/screen-health-monitor.mjs --no-repair',
    });
  }
  issues.push({
    id: 'CARD09-MOBILE-LINE-EVIDENCE-MISSING', cardId: 'CARD_09', severity: 'MAJOR', layer: 'INTERACTION', step: 'mobile LINE verification',
    actualProblem: 'CARD_09 has no real LINE mobile visual interaction evidence in this run.',
    rootCause: 'Current environment verified HTTP/API, but did not produce an actual LINE/iPhone/Android screenshot or tap trace.',
    filePaths: ['app/growth-center/page.tsx', 'reports/card-quality/CARD_09.json'],
    repairAction: 'Run real mobile or controlled browser viewport flow and attach screenshot/tap evidence.',
    verificationAction: 'Record device, browser, viewport, screenshot, and completedAt in quality evidence.',
  });
  issues.push({
    id: 'CARD09-TRACEABILITY-NO-SCREENSHOT', cardId: 'CARD_09', severity: 'MAJOR', layer: 'FRONTEND', step: 'visual evidence',
    actualProblem: 'The report has requestId and API evidence, but lacks a screenshot evidence artifact.',
    rootCause: 'The existing QA scripts are HTTP/API-oriented and do not capture mobile visual state.',
    filePaths: ['scripts/auto-qa.mjs', 'scripts/card-quality-audit.mjs'],
    repairAction: 'Add a visual capture step when browser automation is available.',
    verificationAction: 'Attach screenshot path and viewport metadata to report evidence.',
  });

  const noCriticalIssues = !issues.some((issue) => issue.severity === 'BLOCKER' || issue.severity === 'CRITICAL');
  const reportBase = {
    cardId: 'CARD_09',
    cardName: 'AI 個人成長中心',
    dimensions,
    issues,
    mandatoryChecks: {
      fullFlowPassed: allQaPassed,
      backendVerified,
      mobilePassed: false,
      linePassed: false,
      noCriticalIssues,
      regressionPassed: Boolean(routeHealthy && allQaPassed),
    },
    evidence: {
      baseUrl: BASE_URL,
      autoQaReport: AUTO_QA_REPORT,
      screenHealthReport: SCREEN_HEALTH_REPORT,
      apiSelf: { status: apiSelf.status, durationMs: apiSelf.durationMs, requestId: apiSelf.data?.requestId || null, generationVersion: apiSelf.data?.data?.generationVersion || null },
      apiOther: { status: apiOther.status, durationMs: apiOther.durationMs, requestId: apiOther.data?.requestId || null, generationVersion: apiOther.data?.data?.generationVersion || null },
      screenRoute: screenRoute ? { status: screenRoute.status, httpStatus: screenRoute.httpStatus, durationMs: screenRoute.durationMs, htmlLength: screenRoute.htmlLength } : null,
    },
  };

  const calculated = calculate(reportBase);
  const report = { ...reportBase, ...calculated };
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(CARD_09_REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ report: CARD_09_REPORT, cardId: report.cardId, totalScore: report.totalScore, tier: report.tier, allowNextCard: report.allowNextCard, issues: report.issues.map((issue) => issue.id) }, null, 2));
  process.exitCode = report.mandatoryChecks.fullFlowPassed && report.mandatoryChecks.backendVerified ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});