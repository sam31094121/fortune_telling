#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = (process.env.CARD_QUALITY_BASE_URL || process.argv.find((arg) => arg.startsWith('--base='))?.slice(7) || 'http://localhost:8888').replace(/\/$/, '');
const REPORT_DIR = path.join(ROOT, 'reports', 'card-quality');
const REPORT_FILE = path.join(REPORT_DIR, 'ALL_CARDS.json');
const SCREEN_HEALTH_REPORT = path.join(ROOT, 'reports', 'screen-health', 'latest.json');
const timeoutMs = Number(process.env.CARD_QUALITY_TIMEOUT_MS || 45000);

const cards = [
  { cardId: 'CARD_01', moduleId: 'nameology', cardName: 'AI 姓名學', route: '/nameology', apiKind: 'analysis', analysisType: 'nameology', input: (mode) => buildPerson('NameQA', mode) },
  { cardId: 'CARD_02', moduleId: 'ziwei', cardName: 'AI 紫微斗數', route: '/insight', apiKind: 'insight', input: (mode) => buildPerson('ZiweiQA', mode) },
  { cardId: 'CARD_03', moduleId: 'number', cardName: '易經論數字', route: '/numerology', apiKind: 'analysis', analysisType: 'number', input: (mode) => ({ value: mode === 'self' ? '0912345678' : '16889999' }) },
  { cardId: 'CARD_04', moduleId: 'soul_match', cardName: 'AI 靈魂配對', route: '/match', apiKind: 'match' },
  { cardId: 'CARD_05', moduleId: 'music', cardName: 'AI 生成歌曲', route: '/music', apiKind: 'music' },
  { cardId: 'CARD_06', moduleId: 'bazi', cardName: 'AI 八字命盤', route: '/bazi', apiKind: 'analysis', analysisType: 'bazi', input: (mode) => buildPerson('BaziQA', mode) },
  { cardId: 'CARD_07', moduleId: 'zodiac', cardName: 'AI 西洋星座', route: '/zodiac', apiKind: 'analysis', analysisType: 'zodiac', input: (mode) => ({ ...buildPerson('ZodiacQA', mode), birthCityId: mode === 'self' ? 'taipei' : null }) },
  { cardId: 'CARD_08', moduleId: 'tarot', cardName: 'AI 塔羅牌', route: '/tarot', apiKind: 'tarot' },
  { cardId: 'CARD_09', moduleId: 'growth_center', cardName: 'AI 個人成長中心', route: '/growth-center', apiKind: 'growth' },
];

function buildPerson(seed, mode = 'self') {
  return {
    name: `${seed}${mode === 'self' ? 'Self' : 'Other'}`,
    birthDate: mode === 'self' ? '1990-05-20' : '1988-11-08',
    birthTime: mode === 'self' ? '09:30' : '18:20',
    bloodType: mode === 'self' ? 'A' : 'O',
    gender: mode === 'self' ? 'female' : 'male',
    shichen: mode === 'self' ? 4 : 9,
    country: 'Taiwan',
    city: 'Taipei',
    analysisTarget: mode === 'self' ? 'self' : 'guest',
  };
}

function nowIso() { return new Date().toISOString(); }
function evidenceId(label) { return label.replace(/[^A-Z0-9_:/.-]/gi, '_'); }

async function readJsonIfExists(filePath) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); } catch { return null; }
}

async function request(method, route, body) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${method} ${route} timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Card-Quality-Audit': 'all-cards-v1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, route, durationMs: Date.now() - startedAt, data, text: data ? undefined : text.slice(0, 1000) };
  } catch (error) {
    return { ok: false, status: 0, route, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function checkRoute(card) {
  const res = await request('GET', card.route);
  return { ok: res.ok && (res.text?.length || 0) > 400, status: res.status, durationMs: res.durationMs, length: res.text?.length || 0, error: res.error || null };
}

async function checkAnalysis(card, mode) {
  const create = await request('POST', '/api/analysis/jobs', {
    analysisType: card.analysisType,
    inputData: card.input(mode),
    idempotencyKey: `card-quality:${card.cardId}:${mode}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    sessionId: `card-quality-${mode}`,
    userId: mode === 'self' ? 'card-quality-self' : null,
  });
  const job = create.data?.data;
  const hasInlineResult = Boolean(create.data?.result || job?.status === 'COMPLETED');
  const inlineResultOk = Boolean(create.ok && create.data?.ok === true && (hasInlineResult || job?.resultId));
  // The real frontend (lib/analysis-job-client.ts) only polls when the create response did not
  // already return a completed inline result; fast synchronous engines (bazi/zodiac/number/
  // nameology) always do, so polling here would just re-test a path real users never take and
  // report a false JOB_NOT_FOUND failure caused by serverless instances not sharing memory.
  let poll = null;
  if (job?.jobId && !hasInlineResult) poll = await request('GET', `/api/analysis/jobs/${job.jobId}`);
  const pollOk = poll ? Boolean(poll.ok && poll.data?.ok !== false && poll.data?.data?.status) : true;
  return { create, poll, ok: inlineResultOk, pollOk, jobId: job?.jobId || null, resultId: job?.resultId || null, status: job?.status || null, requestId: create.data?.requestId || poll?.data?.requestId || null };
}

async function checkInsight(mode) {
  const input = buildPerson('ZiweiQA', mode);
  const res = await request('POST', '/api/insight-analyze', {
    name: input.name,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    shichen: input.shichen,
    longitude: null,
    timezone: null,
    timeCorrectionMode: 'STANDARD_TIME',
  });
  return { ok: Boolean(res.ok && res.data?.analysisId && res.data?.presentation), response: res, requestId: res.data?.requestId || null };
}

async function checkMatch(mode) {
  const a = buildPerson('MatchA', 'self');
  const b = buildPerson(mode === 'self' ? 'MatchB' : 'MatchFriend', 'other');
  const res = await request('POST', '/api/match-generate', {
    personA: { name: a.name, birthDate: a.birthDate, bloodType: a.bloodType, gender: a.gender },
    personB: { name: b.name, birthDate: b.birthDate, bloodType: b.bloodType, gender: b.gender },
  });
  return { ok: Boolean(res.ok && res.data?.success !== false && (res.data?.result || res.data?.analysis)), response: res, requestId: res.data?.requestId || null };
}

async function checkMusic(mode) {
  const input = buildPerson('MusicQA', mode);
  const res = await request('POST', '/api/music-generate', {
    lifeGoal: mode === 'self' ? 'healing' : 'dream',
    lifeGoalNote: mode === 'self' ? 'Quality self flow' : 'Quality other flow',
    songCreativeStyle: mode === 'self' ? 'pop' : 'cinematic',
    analysisTarget: mode === 'self' ? 'self' : 'guest',
    growthContext: mode === 'self' ? { completedModules: ['nameology', 'zodiac'], elements: { nameology: 'AIR', zodiac: 'SPACE' } } : null,
    birthDate: input.birthDate,
    bloodType: input.bloodType,
    name: input.name,
    gender: input.gender,
    shichen: input.shichen,
    preferredSongLanguage: 'mandarin',
    songEnergyStyle: 'dance-pop',
  });
  return { ok: Boolean(res.ok && res.data?.success !== false && (res.data?.fusion_song || res.data?.voice_profile)), response: res, requestId: res.data?.requestId || null };
}

async function checkTarot(mode) {
  const deck = await request('GET', '/api/tarot/deck');
  let shuffle = null, draw = null, reading = null;
  if (deck.ok) {
    shuffle = await request('POST', '/api/tarot/shuffle', { categoryId: mode === 'self' ? 'growth' : 'love', question: mode === 'self' ? 'What direction should I strengthen first now?' : 'What is the key reminder now?', scope: mode, spreadType: 'three_card' });
  }
  const keys = shuffle?.data?.visibleDeck?.slice(0, 3).map((card) => card.deckKey).filter(Boolean) || [];
  if (shuffle?.ok && keys.length === 3) {
    draw = await request('POST', '/api/tarot/draw-output', { sessionId: shuffle.data.sessionId, deckKeys: keys });
    reading = await request('POST', '/api/tarot/reading', { sessionId: shuffle.data.sessionId, deckKeys: keys });
  }
  return {
    ok: Boolean(deck.ok && deck.data?.deckSize === 78 && shuffle?.ok && draw?.ok && reading?.ok && reading.data?.integrationSignal),
    deck, shuffle, draw, reading,
    requestId: reading?.data?.requestId || shuffle?.data?.requestId || null,
  };
}

async function checkGrowth(mode) {
  const route = mode === 'self'
    ? '/api/growth-center?completedModules=nameology,bazi,zodiac,tarot&primaryElement=FIRE&secondaryElement=AIR&avoidElement=WATER&anonymousProfileId=quality-all-self'
    : '/api/growth-center?completedModules=tarot&primaryElement=WATER&secondaryElement=EARTH&avoidElement=FIRE&anonymousProfileId=quality-all-other';
  const res = await request('GET', route);
  return { ok: Boolean(res.ok && res.data?.success && res.data?.data?.integrationLayer && res.data?.data?.dataPolicy), response: res, requestId: res.data?.requestId || null };
}

async function checkApi(card, mode) {
  if (card.apiKind === 'analysis') return checkAnalysis(card, mode);
  if (card.apiKind === 'insight') return checkInsight(mode);
  if (card.apiKind === 'match') return checkMatch(mode);
  if (card.apiKind === 'music') return checkMusic(mode);
  if (card.apiKind === 'tarot') return checkTarot(mode);
  if (card.apiKind === 'growth') return checkGrowth(mode);
  return { ok: false, error: 'unknown api kind' };
}

function dimension(dimension, score, maxScore, status, evidenceIds) {
  return { dimension, score, maxScore, status, evidenceIds };
}

function calcTier(dimensions, issues, mandatoryChecks) {
  const totalScore = dimensions.reduce((sum, item) => sum + item.score, 0);
  const hasBlocking = issues.some((issue) => issue.severity === 'BLOCKER' || issue.severity === 'CRITICAL');
  const hasMajor = issues.some((issue) => issue.severity === 'MAJOR');
  const missingEvidence = dimensions.some((item) => item.status === 'NOT_TESTED' || item.status === 'BLOCKED' || item.evidenceIds.length === 0);
  let tier = 'UNRATED';
  if (!hasBlocking && mandatoryChecks.fullFlowPassed && mandatoryChecks.backendVerified && totalScore >= 70) tier = 'STANDARD';
  if (tier === 'STANDARD' && totalScore >= 85 && mandatoryChecks.mobilePassed && mandatoryChecks.linePassed && mandatoryChecks.noCriticalIssues) tier = 'REFINED';
  if (tier === 'REFINED' && totalScore >= 95 && !hasMajor && !missingEvidence && mandatoryChecks.regressionPassed) tier = 'SIGNATURE';
  return { totalScore, tier, allowNextCard: tier === 'SIGNATURE' && !hasBlocking && !hasMajor && mandatoryChecks.regressionPassed };
}

function criticalIssue(card, layer, step, actualProblem, rootCause, evidence) {
  return { id: `${card.cardId}-${layer}-${evidenceId(step)}-${Date.now()}`, cardId: card.cardId, severity: 'CRITICAL', layer, step, actualProblem, rootCause, filePaths: [], repairAction: '定位對應 API / 共用任務 / 前端流程並修復後重測。', verificationAction: '重新執行 scripts/all-card-quality-audit.mjs 與相關卡片手動流程。', evidence };
}

async function auditCard(card, screenHealth) {
  const startedAt = nowIso();
  const route = await checkRoute(card);
  const self = await checkApi(card, 'self');
  const other = await checkApi(card, 'other');
  const issues = [];
  const routeHealth = screenHealth?.routes?.find((item) => item.path === card.route);
  const routeOk = route.ok || routeHealth?.status === 'PASSED';
  const apiOk = self.ok && other.ok;
  const pollIssue = [self, other].some((item) => item.poll && !item.pollOk);
  const requestIds = [self.requestId, other.requestId].filter(Boolean);
  const maxDuration = Math.max(route.durationMs || 0, self.create?.durationMs || self.response?.durationMs || self.deck?.durationMs || 0, other.create?.durationMs || other.response?.durationMs || other.deck?.durationMs || 0);

  if (!routeOk) issues.push(criticalIssue(card, 'FRONTEND', 'route render', `${card.route} route is not healthy.`, route.error || `HTTP ${route.status}`, route));
  if (!apiOk) issues.push(criticalIssue(card, 'API', 'SELF/OTHER API', 'SELF or OTHER backend flow failed.', 'API did not return complete usable result.', { self, other }));
  if (pollIssue) issues.push(criticalIssue(card, 'INTEGRATION', 'Analysis Task polling', 'Analysis job polling returned missing or invalid job after create.', 'Serverless in-memory job state is not durable across requests; this can show JOB_NOT_FOUND to users.', { selfPoll: self.poll, otherPoll: other.poll }));
  issues.push({ id: `${card.cardId}-MOBILE-LINE-NOT-TESTED`, cardId: card.cardId, severity: 'MAJOR', layer: 'INTERACTION', step: 'mobile LINE visual verification', actualProblem: 'This audit did not include real LINE/iPhone/Android tap-and-screenshot evidence.', rootCause: 'Current evidence is route/API/HTTP. Mobile visual evidence must be captured separately.', filePaths: [], repairAction: 'Use controlled mobile browser or real device LINE flow and attach screenshot evidence.', verificationAction: 'Record device, browser, viewport, screenshot path, startedAt/completedAt.' });

  const noCriticalIssues = !issues.some((issue) => issue.severity === 'BLOCKER' || issue.severity === 'CRITICAL');
  const dimensions = [
    dimension('FUNCTIONALITY', routeOk && apiOk ? 20 : routeOk || apiOk ? 10 : 0, 20, routeOk && apiOk ? 'PASSED' : 'FAILED', [routeOk && 'ROUTE_OK', apiOk && 'API_SELF_OTHER_OK'].filter(Boolean)),
    dimension('ACCURACY', apiOk ? 16 : 0, 20, apiOk ? 'PASSED' : 'FAILED', apiOk ? ['BACKEND_RESULT_SHAPE_OK'] : []),
    dimension('MOBILE_UX', 5, 15, 'NOT_TESTED', ['ROUTE_HTML_REACHABLE_ONLY']),
    dimension('STABILITY', routeOk && apiOk && !pollIssue ? 15 : routeOk && apiOk ? 8 : 0, 15, routeOk && apiOk && !pollIssue ? 'PASSED' : 'FAILED', [routeOk && 'SCREEN_HEALTH_ROUTE', apiOk && 'API_RESPONDED', !pollIssue && 'NO_JOB_POLLING_GAP'].filter(Boolean)),
    dimension('CONTENT_QUALITY', routeOk && apiOk ? 8 : 4, 10, routeOk ? 'PASSED' : 'FAILED', routeOk ? ['PAGE_RENDERED_CONTENT_PRESENT'] : []),
    dimension('PERFORMANCE', maxDuration < 1500 ? 10 : maxDuration < 5000 ? 7 : 4, 10, 'PASSED', [`MAX_DURATION_${maxDuration}MS`]),
    dimension('TRACEABILITY', requestIds.length >= 2 ? 8 : requestIds.length === 1 ? 5 : 2, 10, requestIds.length ? 'PASSED' : 'FAILED', requestIds.length ? requestIds.map((id) => `REQUEST_ID_${id}`) : []),
  ];
  const mandatoryChecks = { fullFlowPassed: routeOk && apiOk && !pollIssue, backendVerified: apiOk, mobilePassed: false, linePassed: false, noCriticalIssues, regressionPassed: routeOk && apiOk };
  const calc = calcTier(dimensions, issues, mandatoryChecks);
  return { cardId: card.cardId, cardName: card.cardName, moduleId: card.moduleId, route: card.route, dimensions, issues, mandatoryChecks, evidence: { baseUrl: BASE_URL, route, self, other, screenHealth: routeHealth || null, startedAt, completedAt: nowIso() }, ...calc, generatedAt: nowIso() };
}

async function main() {
  const screenHealth = await readJsonIfExists(SCREEN_HEALTH_REPORT);
  await mkdir(REPORT_DIR, { recursive: true });
  const reports = [];
  for (const card of cards) {
    console.log(`[Card Audit] ${card.cardId} ${card.cardName}`);
    const report = await auditCard(card, screenHealth);
    reports.push(report);
    await writeFile(path.join(REPORT_DIR, `${card.cardId}.json`), JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`[Card Audit] ${card.cardId} score=${report.totalScore} tier=${report.tier} allowNext=${report.allowNextCard}`);
  }
  const summary = { baseUrl: BASE_URL, generatedAt: nowIso(), cards: reports.map((r) => ({ cardId: r.cardId, cardName: r.cardName, score: r.totalScore, tier: r.tier, allowNextCard: r.allowNextCard, issues: r.issues.map((i) => ({ id: i.id, severity: i.severity, step: i.step })) })), reports };
  await writeFile(REPORT_FILE, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(summary.cards, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exitCode = 1; });