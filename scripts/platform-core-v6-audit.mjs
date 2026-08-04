#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'platform-core-v6');
const JSON_REPORT = path.join(REPORT_DIR, 'latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'latest.md');

const CARD_STATES = [
  'LOCKED',
  'READY',
  'SCANNING',
  'INPUT_TESTING',
  'SUBMIT_TESTING',
  'BACKEND_TESTING',
  'ENGINE_TESTING',
  'RESPONSE_TESTING',
  'MOBILE_TESTING',
  'PERFORMANCE_TESTING',
  'REPAIRING',
  'RETESTING',
  'PASSED',
  'COMPLETED',
];

const CARD_QUEUE = [
  { id: 'CARD_01', module: 'nameology', title: 'AI \u59d3\u540d\u5b78', route: '/nameology', page: 'app/nameology/page.tsx' },
  { id: 'CARD_02', module: 'ziwei', title: 'AI \u7d2b\u5fae\u6597\u6578', route: '/insight', page: 'app/insight/page.tsx' },
  { id: 'CARD_03', module: 'numerology', title: '\u6578\u5b57\u8ad6\u5409\u51f6', route: '/numerology', page: 'app/numerology/page.tsx' },
  { id: 'CARD_04', module: 'soul_match', title: 'AI \u9748\u9b42\u914d\u5c0d', route: '/match', page: 'app/match/page.tsx' },
  { id: 'CARD_05', module: 'music', title: 'AI \u751f\u6210\u6b4c\u66f2', route: '/music', page: 'app/music/page.tsx' },
  { id: 'CARD_06', module: 'bazi', title: '\u516b\u5b57\u547d\u76e4', route: '/bazi', page: 'app/bazi/page.tsx' },
  { id: 'CARD_07', module: 'zodiac', title: '\u897f\u6d0b\u661f\u5ea7', route: '/zodiac', page: 'app/zodiac/page.tsx' },
  { id: 'CARD_08', module: 'tarot', title: 'AI \u5854\u7f85\u724c', route: '/tarot', page: 'app/tarot/page.tsx' },
  { id: 'CARD_09', module: 'growth_center', title: 'AI \u500b\u4eba\u6210\u9577\u4e2d\u5fc3', route: '/growth-center', page: 'app/growth-center/page.tsx' },
];

const CORE_CONTRACTS = [
  { id: 'platform_core', label: 'Platform Core', files: ['lib/platform-stability-layer.ts', 'lib/platform-control-center.ts'] },
  { id: 'taiji_core', label: 'Taiji Core', files: ['lib/taiji-core-engine.ts', 'components/UnifiedTaijiCore.tsx', 'components/taiji/TaijiCoreVisual.tsx'] },
  { id: 'identity_core', label: 'Identity Core', files: ['lib/identity-split-client.ts'] },
  { id: 'analysis_task_core', label: 'Analysis Task Core', files: ['lib/analysis-job-store.ts', 'lib/analysis-job-client.ts', 'lib/analysis-job-runner.ts', 'app/api/analysis/jobs/route.ts', 'app/api/analysis/jobs/[jobId]/route.ts', 'app/api/analysis/results/[resultId]/route.ts'] },
  { id: 'dictionary_core', label: 'Dictionary Core', files: ['lib/nameology-dictionary-loader.ts', 'data/dictionaries/nameology/manifest.json', 'data/dictionaries/nameology/characters.json'] },
  { id: 'integration_layer', label: 'Integration Layer', files: ['lib/ai-integration-layer.ts'] },
  { id: 'growth_center', label: 'Growth Center', files: ['lib/growth-center-engine.ts', 'lib/growth-center-client.ts'] },
  { id: 'shared_form', label: 'Shared Form Boundary', files: ['components/UnifiedBirthForm.tsx', 'components/FriendlyChoiceCard.tsx', 'components/IdentitySplitSelector.tsx'] },
  { id: 'shared_error', label: 'Shared Error Boundary', files: ['app/error.tsx', 'app/global-error.tsx'] },
];

function nowIso() {
  return new Date().toISOString();
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function exists(relPath) {
  return existsSync(path.join(ROOT, relPath));
}

async function fileMtime(relPath) {
  try {
    return (await stat(path.join(ROOT, relPath))).mtime.toISOString();
  } catch {
    return null;
  }
}

async function gitStatus() {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: ROOT, windowsHide: true });
    return stdout.split(String.fromCharCode(10)).map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    return { unavailable: true, reason: error.message, dirtyFiles: [] };
  }
}

function evaluateCoreContracts() {
  return CORE_CONTRACTS.map((core) => {
    const files = core.files.map((file) => ({ file, exists: exists(file) }));
    return {
      ...core,
      status: files.every((file) => file.exists) ? 'PRESENT' : 'MISSING',
      files,
    };
  });
}

function evaluateCards() {
  return CARD_QUEUE.map((card, index) => ({
    ...card,
    order: index + 1,
    allowedStates: CARD_STATES,
    pageExists: exists(card.page),
    staticStatus: exists(card.page) ? 'READY_FOR_FLOW_TEST' : 'BLOCKED_MISSING_PAGE',
    requiredEvidence: [
      'homepage_entry',
      'form_input',
      'submit_once',
      'api_backend_engine_result',
      'frontend_result_render',
      'mobile_320_360_375_390_412_430',
      'return_home_cleanup',
      'regression_all_previous_cards',
    ],
  }));
}

function evaluatePackageScripts(pkg) {
  const scripts = pkg?.scripts ?? {};
  const required = ['build', 'auto-qa', 'screen:health'];
  return required.map((name) => ({ name, exists: typeof scripts[name] === 'string', command: scripts[name] ?? null }));
}

async function evaluateExistingEvidence() {
  const autoQa = await readJson(path.join(ROOT, 'reports/auto-qa/latest.json'));
  const screenHealth = await readJson(path.join(ROOT, 'reports/screen-health/latest.json'));
  return {
    build: {
      note: 'Build evidence is command output, not persisted by this audit script. Run npm run build after platform changes.',
      status: 'REQUIRES_FRESH_COMMAND_OUTPUT',
    },
    autoQa: {
      reportPath: 'reports/auto-qa/latest.json',
      exists: Boolean(autoQa),
      ok: autoQa?.ok === true,
      completedAt: autoQa?.completedAt ?? null,
      version: autoQa?.version ?? null,
    },
    screenHealth: {
      reportPath: 'reports/screen-health/latest.json',
      exists: Boolean(screenHealth),
      ok: screenHealth?.ok === true,
      completedAt: screenHealth?.completedAt ?? null,
      screenStatus: screenHealth?.summary?.screenStatus ?? null,
      version: screenHealth?.version ?? null,
    },
    mobileE2E: {
      status: 'NOT_EXECUTED_BY_STATIC_AUDIT',
      requiredViewports: [320, 360, 375, 390, 412, 430],
      requiredBrowsers: ['Android Chrome', 'Android WebView', 'iPhone Safari', 'LINE WebView', 'Facebook WebView'],
    },
  };
}

function finalStatus({ coreContracts, cards, packageScripts, evidence, dirtyFiles }) {
  const missingCore = coreContracts.filter((core) => core.status !== 'PRESENT');
  const missingCards = cards.filter((card) => !card.pageExists);
  const missingScripts = packageScripts.filter((script) => !script.exists);

  if (missingCore.length || missingCards.length || missingScripts.length) return 'BLOCKED';
  if (!evidence.autoQa.ok || !evidence.screenHealth.ok || evidence.mobileE2E.status !== 'COMPLETED' || dirtyFiles.length > 0) return 'NOT_COMPLETED';
  return 'COMPLETED_AND_VERIFIED';
}

function blockers(report) {
  const items = [];
  for (const core of report.coreContracts) {
    if (core.status !== 'PRESENT') items.push('Missing core files: ' + core.label);
  }
  for (const card of report.cards) {
    if (!card.pageExists) items.push('Missing card page: ' + card.id + ' ' + card.page);
  }
  if (!report.evidence.autoQa.ok) items.push('Full nine-card Auto QA evidence is missing or failing.');
  if (!report.evidence.screenHealth.ok) items.push('Screen health evidence is missing or failing.');
  if (report.evidence.mobileE2E.status !== 'COMPLETED') items.push('Real mobile E2E evidence is not attached to this audit.');
  if (report.git.unavailable) items.push('Git status could not be read by the audit script; run git status separately before claiming completion.');
  if (report.git.dirtyFiles.length > 0) items.push('Working tree has uncommitted or untracked changes; fresh regression evidence must be produced after these changes.');
  return items;
}

function markdown(report) {
  const lines = [];
  lines.push('# Platform Core V6 Audit Report');
  lines.push('');
  lines.push('Final status: ' + report.finalStatus);
  lines.push('Generated at: ' + report.generatedAt);
  lines.push('');
  lines.push('## Blockers');
  for (const item of report.blockers) lines.push('- ' + item);
  if (report.blockers.length === 0) lines.push('- None');
  lines.push('');
  lines.push('## Card Queue');
  for (const card of report.cards) lines.push('- ' + card.id + ' ' + card.title + ' ' + card.route + ': ' + card.staticStatus);
  lines.push('');
  lines.push('## Core Contracts');
  for (const core of report.coreContracts) lines.push('- ' + core.label + ': ' + core.status);
  lines.push('');
  lines.push('## Required Next Actions');
  for (const action of report.nextActions) lines.push('- ' + action);
  lines.push('');
  return lines.join(String.fromCharCode(10));
}

async function main() {
  const pkg = await readJson(path.join(ROOT, 'package.json'));
  const coreContracts = evaluateCoreContracts();
  const cards = evaluateCards();
  const packageScripts = evaluatePackageScripts(pkg);
  const evidence = await evaluateExistingEvidence();
  const git = await gitStatus();
  const dirtyFiles = Array.isArray(git) ? git : git.dirtyFiles;

  const report = {
    version: 'platform-core-v6-audit-v1',
    generatedAt: nowIso(),
    rule: 'No COMPLETED_AND_VERIFIED without project code, fresh build, full tests, mobile evidence, and clean post-test state.',
    coreContracts,
    cards,
    packageScripts,
    evidence,
    git: {
      dirtyFiles,
      unavailable: !Array.isArray(git) && git.unavailable === true,
      unavailableReason: !Array.isArray(git) ? git.reason : null,
    },
    finalStatus: null,
    blockers: [],
    nextActions: [
      'Run npm run build after every Platform Core or card change.',
      'Run npm run screen:health against the active local or deployed site.',
      'Run npm run auto-qa for the full nine-card backend and Integration Layer flow.',
      'Run real mobile or Playwright mobile viewport E2E for 320, 360, 375, 390, 412, 430 widths.',
      'If a shared core is modified while testing CARD_01, retest CARD_01 fully before unlocking CARD_02.',
      'After each completed card, regression test all previously completed cards.',
    ],
  };
  report.finalStatus = finalStatus({ coreContracts, cards, packageScripts, evidence, dirtyFiles });
  report.blockers = blockers(report);

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(JSON_REPORT, JSON.stringify(report, null, 2) + String.fromCharCode(10), 'utf8');
  await writeFile(MD_REPORT, markdown(report), 'utf8');

  console.log(JSON.stringify({ finalStatus: report.finalStatus, blockers: report.blockers, report: JSON_REPORT }, null, 2));
  process.exitCode = report.finalStatus === 'COMPLETED_AND_VERIFIED' ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
