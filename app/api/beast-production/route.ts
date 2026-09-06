import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Job = {
  cardId: string; name: string; state: string; attempt?: number;
  candidateSha256?: string;
  preview?: string; previewDurationSeconds?: number; history?: Job[];
  startedAt?: string; providerReturnedAt?: string; finishedAt?: string;
  quota?: {scope:string; retryAt:string|null}; contractVersion?: string;
  automaticReview?: { checks?: Record<string, { status: string; evidence?: string }>; refinement?: string };
};
type Row = { cardId: string; attempt: number; completedAt: string; durationSeconds: number };
const json = async (file: string) => JSON.parse(await fs.readFile(file, 'utf8'));
const noStore = { 'Cache-Control': 'no-store' };
const source = (id: string) => {
  const m = /^beast_([ay])(\d{2})$/.exec(id);
  return m ? `/beast-game/spirit/${m[2]}${m[1] === 'y' ? 'y' : ''}.webp` : `/beast-game/spirit/guardian-${id.slice(8)}.webp`;
};
const previewAttempt = (id: string, job: Job | null, row?: Row) => {
  const n = job?.attempt;
  return n && Number.isInteger(n) && n > 0 && job?.automaticReview && job.preview === `reports/beast-production/previews/${id}-attempt-${String(n).padStart(2, '0')}.mp4`
    ? n : row?.attempt;
};

/** Local review only: no generation, approval, or collection writes from this endpoint. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const directory = path.join(process.cwd(), 'reports/beast-production');
  const index = await json(path.join(process.cwd(), 'public/skill-battle-archive/index.json'));
  const ids: string[] = index.cards.map((card: { poolId: string }) => card.poolId);
  let batch;
  try { batch = await json(path.join(directory, 'first-pass.json')); }
  catch { batch = { state: 'not-started', rows: [] }; }
  const rows: Row[] = batch.rows ?? [];
  const query = new URL(request.url).searchParams;
  const video = query.get('video');
  if (video !== null) {
    if (!ids.includes(video)) return new Response(null, { status: 404 });
    const row = rows.find(row => row.cardId === video);
    let job = null;
    try { job = await json(path.join(directory, `${video}.json`)); } catch { /* The completed batch row remains usable. */ }
    const available = previewAttempt(video, job, row);
    const requested = query.get('v');
    const attempt = requested === null ? available : Number(requested);
    const allowed = [available, row?.attempt, ...(job?.history ?? []).filter((previous: Job) => previous.automaticReview).map((previous: Job) => previous.attempt)];
    if (!allowed.includes(attempt)) return new Response(null, { status: 404 });
    if (!attempt || !Number.isInteger(attempt) || attempt < 1) return new Response(null, { status: 404 });
    const file = path.join(directory, 'previews', `${video}-attempt-${String(attempt).padStart(2, '0')}.mp4`);
    let size;
    try { size = (await fs.stat(file)).size; } catch { return new Response(null, { status: 404 }); }
    const range = request.headers.get('range');
    let start = 0, end = size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: range ? 206 : 200, headers: { ...noStore, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) } });
  }
  const cards = await Promise.all(ids.map(async (id, i) => {
    let job: Job;
    try { job = await json(path.join(directory, `${id}.json`)); }
    catch { return { id, position: i + 1, name: id, state: 'awaiting-generation', reference: source(id), video: null }; }
    const row = rows.find(row => row.cardId === id);
    const attempt = previewAttempt(id, job, row);
    const shown = attempt && attempt !== job.attempt ? job.history?.find(previous => previous.attempt === attempt) : job;
    const checks = { ...shown?.automaticReview?.checks };
    let jobRunning=false;
    try {
      const lock=await json(path.join(process.cwd(),'.tmp/beast-production',`${id}.lock`));
      if(Number.isInteger(lock.pid)){process.kill(lock.pid,0);jobRunning=true;}
    }catch { /* A saved job without its live owner is not executing. */ }
    let crossCheck = null;
    if (attempt) {
      try {
        const observed = await json(path.join(directory, 'cross-checks', `${id}-attempt-${String(attempt).padStart(2, '0')}.json`));
        if (observed.candidateSha256 === shown?.candidateSha256) {
          crossCheck = observed.correctionsToModel ?? null;
          Object.assign(checks, observed.checks);
        }
      } catch { /* Only recorded observations are shown. */ }
    }
    return { id, position: i + 1, name: job.name, state: shown?.state ?? job.state, attempt: attempt ?? job.attempt ?? 0, latestAttempt: job.attempt ?? 0, reference: source(id),
      video: attempt ? `/api/beast-production?video=${id}&v=${attempt}` : null,
      seconds: attempt === row?.attempt ? row?.durationSeconds ?? null : shown?.previewDurationSeconds ?? null, startedAt: shown?.startedAt ?? null, returnedAt: shown?.providerReturnedAt ?? null,
      completedAt: attempt === row?.attempt ? row?.completedAt ?? null : null,
      crossCheck,
      quota:job.state==='quota-blocked'?job.quota??null:null,
      running:jobRunning,
      activePhase:job.state==='generating'?'generating':job.state==='candidate-ready'?'reviewing':job.state,
      contractVersion:shown?.contractVersion??'single-bite-legacy',
      mutualBiteReview:checks.reciprocalBite?.status??'unverified',
      failedParts: Object.entries(checks).filter(([, check]) => check.status === 'fail').map(([part, check]) => ({ part, evidence: check.evidence ?? '' })),
    };
  }));
  let running = false;
  if (batch.state === 'running' && Number.isInteger(batch.pid)) { try { process.kill(batch.pid, 0); running = true; } catch { /* Saved status alone is not evidence of a live worker. */ } }
  const active=cards.find(card=>'running' in card&&card.running);
  const blockers=cards.filter(card=>'quota' in card&&card.quota).map(card=>({cardId:card.id,name:card.name,...('quota' in card?card.quota:{})}));
  return Response.json({ startedAt: batch.startedAt ?? null, state: batch.state === 'running' && !running && !active ? 'worker-stopped' : batch.state,
    blockers,
    running:running||Boolean(active), current:active&&'activePhase' in active?{position:active.position,cardId:active.id,phase:active.activePhase}:batch.current ? { position: batch.current.position, cardId: batch.current.cardId, phase: batch.current.phase } : null,
    generated: cards.filter(card => card.video).length, total: ids.length, cards, updatedAt: new Date().toISOString(),
  }, { headers: noStore });
}
