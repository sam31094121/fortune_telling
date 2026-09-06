import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mp4Seconds } from './check-beast-clips.mjs';
import { referenceFor } from './beast-six-second-production.mjs';

const require = createRequire(import.meta.url);
const { releasedChargeFor, CHARGE_REVIEW_PARTS } = require('../.beast-game-build/lib/beast-charge-release.js');
const root = process.cwd();
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const local = url => path.join(root, 'public', url);
const ffmpeg = process.env.FFMPEG ?? path.join(root, '.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const index = read('public/skill-battle-archive/index.json');
if (index.cards.length !== 60 || new Set(index.cards.map(c => c.poolId)).size !== 60) throw new Error('Expected sixty unique cards');
const rows = [];
for (const { poolId: id } of index.cards) {
  const file = `public/skill-battle-archive/cards/${id}/skills.json`;
  try {
    const card = read(file);
    const charge = card.skills?.find(s => s.skillId === 'skill_charge');
    const standalone = read(`public/skill-battle-archive/cards/${id}/skill_charge.json`);
    if (charge?.durationMs !== 6000 || standalone.durationMs !== 6000 || index.skillCatalog.skills.find(s => s.id === 'skill_charge')?.durationMs !== 6000) throw new Error('Six-second recipe is inconsistent between index and card files');
    if (JSON.stringify(charge.production) !== JSON.stringify(standalone.production)) throw new Error('Production links differ between card files');
    if (charge?.release?.status !== 'approved') {
      rows.push({ cardId: id, state: 'PENDING', reason: 'No approved release; runtime blocks this video', declaredVideo: Boolean(charge?.video) });
      continue;
    }
    const release = releasedChargeFor(charge, id, charge.release.opponentId);
    if (!release) throw new Error('Release metadata does not satisfy player, opponent, six seconds and checks');
    const report = read(local(release.reviewReport));
    if (report.status !== 'approved' || report.playerId !== id || report.opponentId !== release.opponentId || !report.reviewedAt || !report.reviewer) throw new Error('Review report is not approved for these actors');
    for (const part of CHARGE_REVIEW_PARTS) {
      if (report.checks?.[part]?.status !== release.checks[part] || !report.checks[part].evidence) throw new Error(`Review evidence missing or inconsistent: ${part}`);
    }
    const m = /^beast_([ay])(\d{2})$/.exec(id);
    const reference = m ? `public/beast-game/spirit/${m[2]}${m[1] === 'y' ? 'y' : ''}.webp` : `public/beast-game/spirit/guardian-${id.slice(8)}.webp`;
    for (const [key, p] of [['mp4', local(release.mp4)], ['webm', local(release.webm)], ['reference', reference], ['opponentReference', referenceFor(release.opponentId)]]) {
      if (!report.hashes?.[key] || report.hashes[key] !== hash(p)) throw new Error(`Reviewed ${key} was replaced or changed`);
    }
    if (Math.abs(mp4Seconds(local(release.mp4)) - 6) > 0.05) throw new Error('MP4 duration must be six seconds');
    if (!fs.existsSync(ffmpeg)) throw new Error('FFMPEG required for actual decode verification');
    for (const url of [release.mp4, release.webm]) {
      execFileSync(ffmpeg, ['-v', 'error', '-xerror', '-i', local(url), '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], { windowsHide: true, stdio: 'pipe', timeout: 30000 });
      const pcm = execFileSync(ffmpeg, ['-v', 'error', '-i', local(url), '-vn', '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { windowsHide: true, maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
      if (Math.abs(pcm.length / 96000 - 6) > 0.1) throw new Error('Audio duration inconsistent with six-second clip');
    }
    const kb = (fs.statSync(local(release.mp4)).size + fs.statSync(local(release.webm)).size) / 1024;
    if (kb > 2400) throw new Error('Mobile file budget exceeded');
    rows.push({ cardId: id, state: 'APPROVED', opponentId: release.opponentId, kb: Math.round(kb) });
  } catch (error) { rows.push({ cardId: id, state: 'FAIL', reason: error.message }); }
}
const summary = { approved: rows.filter(r => r.state === 'APPROVED').length, pending: rows.filter(r => r.state === 'PENDING').length, failed: rows.filter(r => r.state === 'FAIL').length };
fs.mkdirSync('reports/beast-production', { recursive: true });
fs.writeFileSync('reports/beast-production/release-summary.json', JSON.stringify({ at: new Date().toISOString(), ...summary, rows }, null, 2) + '\n');
console.log(`Approved ${summary.approved}/60; pending ${summary.pending}; invalid releases ${summary.failed}. Approval is limited to each recorded opponent.`);
if (summary.failed || (process.argv.includes('--require-all') && summary.approved !== 60)) process.exitCode = 1;
