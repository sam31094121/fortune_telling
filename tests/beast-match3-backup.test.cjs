const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const originalTs = require.extensions['.ts'], originalResolve = Module._resolveFilename;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
Module._resolveFilename = function(id, ...args) { return originalResolve.call(this, id.startsWith('@/') ? path.resolve(__dirname, '..', id.slice(2)) : id, ...args); };
const C = require('../lib/beast-game/match3/hard-campaign.ts');
const B = require('../lib/beast-game/match3/campaign-backup.ts');
const S = require('../lib/beast-game/match3/hard-campaign-store.ts');
const makeStore = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), clear: () => data.clear() }; };
const local = makeStore(), session = makeStore(); global.window = { localStorage: local, sessionStorage: session };
let queue = Promise.resolve();
Object.defineProperty(global, 'navigator', { configurable: true, value: { locks: { request: (_, fn) => { const next = queue.then(fn); queue = next.catch(() => {}); return next; } } } });
const key = 'match3-hard-campaign-self-v1', named = 'match3-hard-progress-self-v1';
(async () => {
  let p = C.chooseCampaignHero(C.newCampaign(), C.campaignGuardianIds()[0]);
  p.teamIds = [p.heroId, ...C.campaignAvailableIds(p).filter(id => id !== p.heroId).slice(0,4)];
  for(let wins=0;wins<4;wins++) p = C.campaignWin(p, 'backup-win-'+wins, wins).profile;
  p = C.enhanceCampaignProfile(p, 'backup-enhancement', C.enhancementOptions(p).youngIds[0], p.heroId).profile;
  const raw = B.encodeCampaignBackup(p);
  assert.deepEqual(B.decodeCampaignBackup(raw), p);
  const preview = B.campaignBackupPreview(raw);
  assert.equal(preview.wins,4); assert.equal(preview.adultCopies,4); assert.equal(preview.consumedYoung,1); assert.equal(preview.enhancedCards,1); assert.equal(preview.youngAvailable,27);
  assert(!S.exportCampaignBackup('self').ok, 'Unsaved migrations cannot be downloaded');
  assert(!S.exportCampaignBackup('guest').ok);
  for(const bad of ['{bad','null','[]','{}', JSON.stringify({...JSON.parse(raw),version:2}),JSON.stringify({...JSON.parse(raw),format:'other-product'}),JSON.stringify({...JSON.parse(raw),profile:{...p,enhancements:{[p.heroId]:999999}}}), '空'.repeat(B.CAMPAIGN_BACKUP_MAX_BYTES)]) {
    assert.throws(()=>B.decodeCampaignBackup(bad)); assert(!(await S.importCampaignBackup('self',bad)).ok); assert.equal(local.getItem(key),null);
  }
  assert(!(await S.importCampaignBackup('guest',raw)).ok); assert.equal(session.getItem('match3-hard-campaign-guest-v1'),null);
  local.setItem(named,'0'); assert(!(await S.importCampaignBackup('self',raw)).ok, 'Even a named zero progress cannot be overwritten'); local.removeItem(named);
  const both=await Promise.all([S.importCampaignBackup('self',raw),S.importCampaignBackup('self',raw)]);
  assert.equal(both.filter(r=>r.ok).length,1,'Cross-tab lock prevents simultaneous overwrites');
  assert.deepEqual(S.readCampaign('self').profile,p); assert(S.exportCampaignBackup('self').ok);
  const preserved=local.getItem(key); assert(!(await S.importCampaignBackup('self',raw)).ok); assert.equal(local.getItem(key),preserved);
  local.clear(); const set=local.setItem; local.setItem=()=>{throw Error('quota')}; assert(!(await S.importCampaignBackup('self',raw)).ok); assert.equal(local.getItem(key),null); local.setItem=set;
  const get=local.getItem;let written=false;local.setItem=(k,v)=>{set(k,v);written=true};local.getItem=k=>written?null:get(k);
  assert(!(await S.importCampaignBackup('self',raw)).ok,'Readback failure must not claim success');local.setItem=set;local.getItem=get;local.clear();
  const locks=navigator.locks;navigator.locks=undefined;assert(!(await S.importCampaignBackup('self',raw)).ok);assert.equal(local.getItem(key),null);navigator.locks=locks;
  console.log('PASS: versioned self backup, complete ledger, corrupt/oversize/guest rejection, no overwrite, lock and readback');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{require.extensions['.ts']=originalTs;Module._resolveFilename=originalResolve});
