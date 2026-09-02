import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_BASE_URL = process.env.AUTO_QA_BASE_URL || process.env.BASE_URL || 'http://localhost:8888';
const DEFAULT_TIMEOUT_MS = Number(process.env.AUTO_QA_TIMEOUT_MS || 60_000);
const JOB_TIMEOUT_MS = Number(process.env.AUTO_QA_JOB_TIMEOUT_MS || 75_000);
const REPORT_DIR = path.join(process.cwd(), 'reports', 'auto-qa');
const REPORT_FILE = path.join(REPORT_DIR, 'latest.json');
const LOG_FILES = [
  path.join(process.cwd(), 'next-8888.out.log'),
  path.join(process.cwd(), 'next-8888.err.log'),
  path.join(process.cwd(), '.guardian-next.out.log'),
  path.join(process.cwd(), '.guardian-next.err.log'),
];
const RUNTIME_SNAPSHOT_FILES = [
  path.join(process.cwd(), 'data', 'tarot-active-sessions.json'),
  path.join(process.cwd(), 'data', 'tarot-system-stats.json'),
];

const argv = new Map(
  process.argv.slice(2).map((arg) => {
    if (!arg.startsWith('--')) return [arg, true];
    const [key, ...rest] = arg.slice(2).split('=');
    return [key, rest.length ? rest.join('=') : true];
  }),
);

const BASE_URL = String(argv.get('base') || DEFAULT_BASE_URL).replace(/\/$/, '');
const STOP_ON_FAIL = argv.has('continue-on-fail') ? false : process.env.AUTO_QA_STOP_ON_FAIL !== '0';
const SELECTED_MODULES = parseList(argv.get('modules'));
const SELECTED_MODES = parseList(argv.get('modes')) || ['self', 'other'];
const VALID_MODES = new Set(['self', 'other']);

function parseList(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value, max = 1000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...<truncated>' : text;
}

async function readTextIfExists(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function collectLogSnapshot(maxChars = 5000) {
  const entries = [];
  for (const filePath of LOG_FILES) {
    const content = await readTextIfExists(filePath);
    if (!content) continue;
    entries.push({
      file: filePath,
      tail: content.slice(-maxChars),
    });
  }
  return entries;
}

async function snapshotRuntimeFiles() {
  const snapshots = [];
  for (const filePath of RUNTIME_SNAPSHOT_FILES) {
    const content = await readTextIfExists(filePath);
    snapshots.push({ filePath, existed: content !== null, content });
  }
  return snapshots;
}

async function restoreRuntimeFiles(snapshots) {
  for (const snapshot of snapshots) {
    if (snapshot.existed) {
      await writeFile(snapshot.filePath, snapshot.content, 'utf8');
    } else {
      await rm(snapshot.filePath, { force: true });
    }
  }
}

function hasObjectKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  if (Array.isArray(value)) return value.some((item) => hasObjectKey(item, key));
  return Object.values(value).some((item) => hasObjectKey(item, key));
}

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

class AutoQaFailure extends Error {
  constructor(moduleId, moduleTitle, step, api, cause) {
    super(`${moduleTitle} / ${step}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'AutoQaFailure';
    this.moduleId = moduleId;
    this.moduleTitle = moduleTitle;
    this.step = step;
    this.api = api;
    this.cause = cause;
  }
}

async function withTimeout(task, ms, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} timeout after ${ms}ms`)), ms);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function http(method, route, body, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  const url = route.startsWith('http') ? route : `${BASE_URL}${route}`;
  return withTimeout(async (signal) => {
    const response = await fetch(url, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Auto-QA': 'tiandiren-platform-auto-qa-v1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    const result = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
      route,
      method,
      durationMs: Date.now() - started,
      data,
      text: data ? undefined : text,
    };
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`);
      error.detail = { route, status: response.status, body: data ?? truncate(text) };
      throw error;
    }
    return result;
  }, timeoutMs, `${method} ${route}`);
}

async function getPage(route) {
  return http('GET', route, undefined, { timeoutMs: 25_000 });
}

async function postJson(route, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return http('POST', route, body, { timeoutMs });
}

async function checkPageRoute(module) {
  const page = await getPage(module.href);
  assert(page.status === 200, 'page route is not reachable', { status: page.status });
  const html = page.text || '';
  assert(html.length > 400, 'page HTML is too small; render may be broken', { length: html.length });
  return { status: page.status, durationMs: page.durationMs, length: html.length };
}

async function checkReturnHome(module) {
  const home = await getPage('/');
  assert(home.status === 200, 'home route is not reachable after module flow', { module: module.id, status: home.status });
  const html = home.text || '';
  assert(html.length > 800, 'home HTML is too small after module flow', { module: module.id, length: html.length });
  const markers = module.homeMarkers || [module.href, module.title];
  assert(markers.some((marker) => html.includes(marker)), 'home entry marker missing after return', { module: module.id, markers });
  return { status: home.status, durationMs: home.durationMs, length: html.length };
}

async function runAnalysisJob(analysisType, inputData, mode, validator) {
  const create = await postJson('/api/analysis/jobs', {
    analysisType,
    inputData,
    idempotencyKey: `autoqa:${analysisType}:${mode}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    sessionId: `autoqa-${mode}`,
    userId: mode === 'self' ? 'autoqa-self-user' : null,
  }, 20_000);

  const job = create.data?.data;
  assert(create.data?.ok === true && job?.jobId, 'analysis job was not created', create.data);

  const started = Date.now();
  let latest = job;
  while (Date.now() - started < JOB_TIMEOUT_MS) {
    const current = await getPage(`/api/analysis/jobs/${latest.jobId}`);
    latest = current.data?.data;
    assert(latest?.status, 'analysis job polling returned invalid status', current.data);

    if (latest.status === 'COMPLETED') {
      assert(latest.resultId, 'completed analysis job is missing resultId', latest);
      const result = await getPage(`/api/analysis/results/${latest.resultId}`);
      assert(result.data?.ok === true, 'analysis result API failed', result.data);
      if (validator) validator(result.data.data, latest);
      return {
        jobId: latest.jobId,
        resultId: latest.resultId,
        status: latest.status,
        progressStage: latest.progressStage,
        durationMs: Date.now() - started,
        result: result.data.data,
      };
    }

    if (['FAILED', 'TIMEOUT', 'CANCELLED'].includes(latest.status)) {
      throw new Error(`analysis job failed: ${latest.errorCode || latest.status} ${latest.errorMessage || latest.message || ''}`.trim());
    }

    await sleep(750);
  }

  throw new Error(`analysis job exceeded ${JOB_TIMEOUT_MS}ms`);
}

function buildPerson(seed, mode = 'self') {
  const suffix = mode === 'self' ? 'Self' : 'Other';
  return {
    name: `${seed}${suffix}`,
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

function validateCommonJobResult(expectedMode, expectedModuleId) {
  return (result, job) => {
    assert(job.moduleId === expectedModuleId, 'Module Router points to the wrong module', { expectedModuleId, actualModuleId: job.moduleId });
    assert(result && typeof result === 'object', 'result is not an object', result);
    assert(result.mode === expectedMode || result.moduleId === expectedModuleId, 'result is missing expected mode/module marker', { expectedMode, expectedModuleId, resultMode: result.mode, resultModuleId: result.moduleId });
    assert(hasObjectKey(result, 'fiveElement'), 'Integration Layer fiveElement output is missing', result);
  };
}

function validateOkResult(data, label) {
  assert(data && typeof data === 'object', `${label} response is not an object`, data);
  assert(data.ok !== false && data.success !== false, `${label} response failed`, data);
}

async function checkNameology(mode) {
  return runAnalysisJob('nameology', buildPerson('NameQA', mode), mode, validateCommonJobResult('nameology', 'NAMEOLOGY'));
}

async function checkZiwei(mode) {
  return runAnalysisJob('insight', buildPerson('ZiweiQA', mode), mode, validateCommonJobResult('insight', 'ZIWEI'));
}

async function checkNumber(mode) {
  const value = mode === 'self' ? '0912345678' : '16889999';
  return runAnalysisJob('number', { value }, mode, validateCommonJobResult('phone', 'NUMBER'));
}

async function checkMatch(mode) {
  const personA = buildPerson('MatchA', 'self');
  const personB = buildPerson(mode === 'self' ? 'MatchB' : 'MatchFriend', 'other');
  const response = await postJson('/api/match-generate', {
    personA: { name: personA.name, birthDate: personA.birthDate, bloodType: personA.bloodType, gender: personA.gender },
    personB: { name: personB.name, birthDate: personB.birthDate, bloodType: personB.bloodType, gender: personB.gender },
  }, 45_000);
  validateOkResult(response.data, 'match');
  assert(typeof response.data?.result?.match_score === 'number', 'match result score is missing', response.data);
  assert(hasObjectKey(response.data, 'fiveElementMatch'), 'match fiveElementMatch output is missing', response.data);
  return { durationMs: response.durationMs, result: response.data };
}

async function checkMusic(mode) {
  const input = buildPerson('MusicQA', mode);
  const response = await postJson('/api/music-generate', {
    lifeGoal: mode === 'self' ? 'healing' : 'dream',
    lifeGoalNote: mode === 'self' ? 'Auto QA self flow' : 'Auto QA other flow',
    songCreativeStyle: mode === 'self' ? 'pop' : 'cinematic',
    analysisTarget: mode === 'self' ? 'self' : 'guest',
    growthContext: mode === 'self'
      ? { completedModules: ['nameology', 'zodiac'], elements: { nameology: 'AIR', zodiac: 'SPACE' } }
      : null,
    birthDate: input.birthDate,
    bloodType: input.bloodType,
    name: input.name,
    gender: input.gender,
    shichen: input.shichen,
    preferredSongLanguage: 'mandarin',
    songEnergyStyle: 'dance-pop',
  }, 70_000);
  validateOkResult(response.data, 'music');
  assert(response.data?.voice_profile?.workflowStatus === 'AI_VOICE_READY', 'music workflow did not reach AI voice ready state', response.data?.voice_profile);
  assert(response.data?.voice_profile?.recorded === false, 'music workflow must not require user recording', response.data?.voice_profile);
  assert(response.data?.life_song_context?.targetMode === (mode === 'self' ? 'self' : 'guest'), 'music self/other split is wrong', response.data?.life_song_context);
  assert(hasObjectKey(response.data, 'fiveElement'), 'music fiveElement output is missing', response.data);
  assert(response.data?.fusion_song, 'music fusion_song is missing', response.data);
  return { durationMs: response.durationMs, result: response.data };
}

async function checkBazi(mode) {
  return runAnalysisJob('bazi', buildPerson('BaziQA', mode), mode, validateCommonJobResult('bazi', 'BAZI'));
}

async function checkZodiac(mode) {
  const input = buildPerson('ZodiacQA', mode);
  input.birthCityId = mode === 'self' ? 'taipei' : null;
  return runAnalysisJob('zodiac', input, mode, validateCommonJobResult('zodiac', 'ZODIAC'));
}

async function checkTarot(mode) {
  const deck = await getPage('/api/tarot/deck');
  validateOkResult(deck.data, 'tarot deck');
  assert(deck.data?.deckSize === 78, 'tarot deck must contain 78 cards', { deckSize: deck.data?.deckSize });
  assert(deck.data?.deckIntegrity?.complete === true, 'tarot deck integrity failed', deck.data?.deckIntegrity);

  const scope = mode === 'self' ? 'self' : 'other';
  const shuffle = await postJson('/api/tarot/shuffle', {
    categoryId: mode === 'self' ? 'growth' : 'love',
    question: mode === 'self' ? 'What direction should I strengthen first now?' : 'What is the key reminder for this relationship now?',
    scope,
    spreadType: 'three_card',
  }, 30_000);
  validateOkResult(shuffle.data, 'tarot shuffle');
  assert(shuffle.data?.deckSize === 78, 'tarot shuffle did not use all 78 cards', shuffle.data);
  assert(Array.isArray(shuffle.data?.visibleDeck) && shuffle.data.visibleDeck.length >= 12, 'tarot spread did not expose at least 12 card backs', shuffle.data);
  assert(shuffle.data?.requiredDrawCount === 3, 'tarot three-card spread draw count is wrong', shuffle.data);

  const selectedDeckKeys = shuffle.data.visibleDeck.slice(0, 3).map((card) => card.deckKey);
  assert(selectedDeckKeys.every(Boolean), 'tarot visible cards are missing deckKey', shuffle.data.visibleDeck.slice(0, 3));

  const draw = await postJson('/api/tarot/draw-output', { sessionId: shuffle.data.sessionId, deckKeys: selectedDeckKeys }, 30_000);
  validateOkResult(draw.data, 'tarot draw');
  assert(Array.isArray(draw.data?.drawResults) && draw.data.drawResults.length === 3, 'tarot draw result is not three cards', draw.data);
  assert(draw.data.drawResults.every((card) => card.orientation === 'upright' || card.orientation === 'reversed'), 'tarot orientation is missing', draw.data.drawResults);

  const reading = await postJson('/api/tarot/reading', { sessionId: shuffle.data.sessionId, deckKeys: selectedDeckKeys }, 30_000);
  validateOkResult(reading.data, 'tarot reading');
  assert(reading.data?.reading?.scope === scope, 'tarot self/other scope is wrong', reading.data?.reading);
  assert(Array.isArray(reading.data?.cards) && reading.data.cards.length === 3, 'tarot reading cards are missing', reading.data);
  assert(reading.data?.interpretation, 'tarot interpretation is missing', reading.data);
  assert(reading.data?.integrationSignal, 'tarot Integration Layer signal is missing', reading.data);

  const writePolicy = reading.data?.crossCheck?.writePolicy;
  if (mode === 'other') assert(writePolicy === 'single_use_only', 'tarot other mode must not write to member profile', reading.data?.crossCheck);
  if (mode === 'self') assert(writePolicy === 'growth_center_update', 'tarot self mode must emit growth center update policy', reading.data?.crossCheck);

  return {
    durationMs: deck.durationMs + shuffle.durationMs + draw.durationMs + reading.durationMs,
    result: {
      deckSize: deck.data.deckSize,
      sessionId: shuffle.data.sessionId,
      selectedDeckKeys,
      orientations: draw.data.drawResults.map((card) => card.orientation),
      scope: reading.data.reading.scope,
      writePolicy,
    },
  };
}

async function checkGrowthCenter(mode) {
  const params = mode === 'self'
    ? 'completedModules=nameology,bazi,zodiac,tarot&primaryElement=FIRE&secondaryElement=AIR&avoidElement=WATER&anonymousProfileId=autoqa-growth-self'
    : 'completedModules=tarot&primaryElement=WATER&secondaryElement=EARTH&avoidElement=FIRE&anonymousProfileId=autoqa-growth-other';
  const response = await getPage(`/api/growth-center?${params}`);
  validateOkResult(response.data, 'growth center');
  const data = response.data?.data;
  assert(data && typeof data === 'object', 'growth center data is missing', response.data);
  assert(data.fiveElement, 'growth center fiveElement output is missing', data);
  assert(data.copywritingStyle?.version, 'growth center copywriting style snapshot is missing', data.copywritingStyle);
  assert(data.integrationLayer, 'growth center Integration Layer handoff is missing', data);
  assert(data.dataPolicy, 'growth center data policy is missing', data);
  assert(data.coreV2 || data.progress || data.weeklyReport, 'growth center core/progress output is missing', data);

  return {
    durationMs: response.durationMs,
    result: {
      moduleId: 'GROWTH_CENTER',
      mode: 'growth_center',
      fiveElement: data.fiveElement,
      copywritingStyleVersion: data.copywritingStyle.version,
      hasIntegrationLayer: Boolean(data.integrationLayer),
      hasDataPolicy: Boolean(data.dataPolicy),
      generationVersion: data.generationVersion,
    },
  };
}
const MODULES = [
  { id: 'nameology', title: 'AI Nameology', href: '/nameology', api: '/api/analysis/jobs', homeMarkers: ['/nameology', '姓名學'], check: checkNameology },
  { id: 'ziwei', title: 'AI Ziwei', href: '/insight', api: '/api/analysis/jobs', homeMarkers: ['/insight', '紫微'], check: checkZiwei },
  { id: 'number', title: 'Number Fortune', href: '/numerology', api: '/api/analysis/jobs', homeMarkers: ['/numerology', 'number-modal', 'Number Fortune', '易經論數字'], check: checkNumber },
  { id: 'soul_match', title: 'AI Soul Match', href: '/match', api: '/api/match-generate', homeMarkers: ['/match', '靈魂配對'], check: checkMatch },
  { id: 'music', title: 'AI Life Song', href: '/music', api: '/api/music-generate', homeMarkers: ['/music', '生命歌曲', '生成一首歌'], check: checkMusic },
  { id: 'bazi', title: 'AI Bazi Chart', href: '/bazi', api: '/api/analysis/jobs', homeMarkers: ['/bazi', '八字'], check: checkBazi },
  { id: 'zodiac', title: 'AI Western Zodiac', href: '/zodiac', api: '/api/analysis/jobs', homeMarkers: ['/zodiac', '西洋星座'], check: checkZodiac },
  { id: 'tarot', title: 'AI Tarot', href: '/tarot', api: '/api/tarot/reading', homeMarkers: ['/tarot', 'AI 塔羅牌'], check: checkTarot },
  { id: 'growth_center', title: 'AI Growth Center', href: '/growth-center', api: '/api/growth-center', homeMarkers: ['/growth-center', 'AI 個人成長中心'], check: checkGrowthCenter },
];

function selectedModules() {
  const modules = SELECTED_MODULES ? MODULES.filter((module) => SELECTED_MODULES.includes(module.id)) : MODULES;
  const missing = SELECTED_MODULES?.filter((id) => !MODULES.some((module) => module.id === id)) || [];
  assert(missing.length === 0, `unknown module: ${missing.join(', ')}`, { validModules: MODULES.map((module) => module.id) });
  return modules;
}

function selectedModes() {
  const invalid = SELECTED_MODES.filter((mode) => !VALID_MODES.has(mode));
  assert(invalid.length === 0, `unknown mode: ${invalid.join(', ')}`, { validModes: Array.from(VALID_MODES) });
  return SELECTED_MODES;
}

async function addCheck(report, moduleReport, step, api, task) {
  const started = Date.now();
  try {
    const detail = await task();
    const check = {
      step,
      status: 'passed',
      api: api || null,
      durationMs: detail?.durationMs ?? Date.now() - started,
      detail: summarizeDetail(detail),
    };
    moduleReport.checks.push(check);
    console.log(`[Auto QA] PASS ${moduleReport.title} / ${step} (${check.durationMs}ms)`);
    return detail;
  } catch (cause) {
    const check = {
      step,
      status: 'failed',
      api: api || null,
      durationMs: Date.now() - started,
      error: cause instanceof Error ? cause.message : String(cause),
      detail: cause?.detail ?? undefined,
      logs: await collectLogSnapshot(),
    };
    moduleReport.checks.push(check);
    report.summary.failed += 1;
    console.error(`[Auto QA] FAIL ${moduleReport.title} / ${step}`);
    console.error(truncate(check.detail || check.error, 1400));
    throw new AutoQaFailure(moduleReport.id, moduleReport.title, step, api, cause);
  }
}

function summarizeDetail(detail) {
  if (!detail) return undefined;
  if (detail.result) {
    const result = detail.result;
    return {
      status: detail.status,
      jobId: detail.jobId,
      resultId: detail.resultId,
      progressStage: detail.progressStage,
      moduleId: result.moduleId,
      mode: result.mode,
      hasFiveElement: hasObjectKey(result, 'fiveElement') || hasObjectKey(result, 'fiveElementMatch') || hasObjectKey(result, 'integrationSignal'),
      tarotScope: result.scope,
      tarotWritePolicy: result.writePolicy,
      voiceWorkflowStatus: result.voice_profile?.workflowStatus,
      matchScore: result.result?.match_score,
      deckSize: result.deckSize,
      selectedDeckKeys: result.selectedDeckKeys,
    };
  }
  return detail;
}

async function checkHomepage(modules) {
  const home = await getPage('/');
  assert(home.status === 200, 'home route is not reachable', { status: home.status });
  const html = home.text || '';
  assert(html.length > 800, 'home HTML is too small; render may be broken', { length: html.length });
  const missingEntrances = modules
    .filter((module) => {
      const markers = module.homeMarkers || [module.href, module.title];
      return !markers.some((marker) => typeof marker === 'string' && html.includes(marker));
    })
    .map((module) => ({ id: module.id, href: module.href, markers: module.homeMarkers || [module.href, module.title] }));
  assert(missingEntrances.length === 0, 'home is missing module entry markers', { missingEntrances });
  return { status: home.status, durationMs: home.durationMs, checkedEntrances: modules.map((module) => ({ id: module.id, href: module.href })) };
}

async function run() {
  const modules = selectedModules();
  const modes = selectedModes();
  const runtimeSnapshots = await snapshotRuntimeFiles();
  const report = {
    ok: false,
    version: 'tiandiren-auto-qa-v1.2',
    baseUrl: BASE_URL,
    stopOnFail: STOP_ON_FAIL,
    startedAt: nowIso(),
    completedAt: null,
    summary: {
      modules: modules.length,
      modes,
      passed: 0,
      failed: 0,
      stoppedAt: null,
    },
    homepage: null,
    modules: [],
    runtimeRestored: false,
  };

  console.log(`[Auto QA] Start ${BASE_URL}`);
  console.log(`[Auto QA] Modules: ${modules.map((module) => module.id).join(', ')}`);
  console.log(`[Auto QA] Modes: ${modes.join(', ')}`);

  try {
    report.homepage = await checkHomepage(modules);
    console.log(`[Auto QA] PASS Home / ${modules.length} module entry markers (${report.homepage.durationMs}ms)`);

    for (const qaModule of modules) {
      const moduleReport = {
        id: qaModule.id,
        title: qaModule.title,
        href: qaModule.href,
        api: qaModule.api,
        checks: [],
      };
      report.modules.push(moduleReport);

      await addCheck(report, moduleReport, 'enter module page', qaModule.href, () => checkPageRoute(qaModule));

      for (const mode of modes) {
        const modeLabel = mode === 'self' ? 'SELF' : 'OTHER';
        await addCheck(report, moduleReport, `${modeLabel}: submit data, API, backend, result, integration`, qaModule.api, () => qaModule.check(mode));
      }

      await addCheck(report, moduleReport, 'return home after module flow', '/', () => checkReturnHome(qaModule));

      const failed = moduleReport.checks.some((check) => check.status === 'failed');
      if (!failed) report.summary.passed += 1;
      console.log(`[Auto QA] DONE ${qaModule.title}`);
    }

    report.ok = report.summary.failed === 0;
    return report;
  } catch (error) {
    if (error instanceof AutoQaFailure) {
      report.summary.stoppedAt = {
        moduleId: error.moduleId,
        moduleTitle: error.moduleTitle,
        step: error.step,
        api: error.api,
        error: error.message,
        detail: error.cause?.detail,
        logs: await collectLogSnapshot(),
      };
      if (!STOP_ON_FAIL) return report;
    }
    throw error;
  } finally {
    await restoreRuntimeFiles(runtimeSnapshots);
    report.runtimeRestored = true;
    report.completedAt = nowIso();
    await mkdir(REPORT_DIR, { recursive: true });
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`[Auto QA] Report: ${REPORT_FILE}`);
  }
}

run()
  .then((report) => {
    if (report.ok) {
      console.log(`[Auto QA] PASS full platform QA complete: ${report.summary.passed}/${report.summary.modules} modules`);
      process.exitCode = 0;
    } else {
      console.error('[Auto QA] FAIL platform QA did not pass');
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error('[Auto QA] ABORT', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });