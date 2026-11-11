// 寶珠闖關存檔「逐位元組」對照劇本：同一組操作，依序記錄每一次寫入 localStorage／sessionStorage 的原始字串。
// 黃金檔（tests/fixtures/match3-feed-chain/campaign-writes-4391425b.json）是用 4391425b 原始程式跑這支劇本產生的；
// 功能開關 NEXT_PUBLIC_M3_FEED_CHAIN 關閉時，新程式跑同一劇本必須逐字相同。
const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');

function installTsLoader(root) {
  require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id, ...args); };
}

async function runScenario(root) {
  installTsLoader(root);
  const C = require(path.join(root, 'lib/beast-game/match3/hard-campaign.ts'));
  const S = require(path.join(root, 'lib/beast-game/match3/hard-campaign-store.ts'));
  const B = require(path.join(root, 'lib/beast-game/match3/campaign-backup.ts'));
  const writes = [];
  const makeStore = (name) => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { writes.push([name, k, String(v)]); m.set(k, String(v)); }, removeItem: k => m.delete(k), data: m }; };
  const local = makeStore('local'), session = makeStore('session');
  global.window = { localStorage: local, sessionStorage: session };
  let queue = Promise.resolve();
  Object.defineProperty(global, 'navigator', { configurable: true, value: { locks: { request: (_k, fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; } } } });
  const outputs = [];
  const note = (label, value) => outputs.push([label, JSON.stringify(value)]);
  const heroes = C.campaignGuardianIds();
  for (const owner of ['self', 'guest']) {
    note(owner + ':hero', await S.selectCampaignHero(owner, heroes[0]));
    const p = S.readCampaign(owner).profile;
    const ids = [p.heroId, ...C.campaignAvailableIds(p).filter(id => id !== p.heroId).slice(0, 4)];
    note(owner + ':team', await S.saveCampaignTeam(owner, ids));
    for (let i = 0; i < 9; i++) note(owner + ':win' + i, await S.settleWin(owner, owner + '-win-' + i, i));
    note(owner + ':dupWin', await S.settleWin(owner, owner + '-win-3', 3));
    const q = S.readCampaign(owner).profile;
    note(owner + ':milestone', await S.selectCampaignHero(owner, heroes[1]));
    const opt = C.enhancementOptions(S.readCampaign(owner).profile);
    note(owner + ':enh1', await S.enhanceCampaign(owner, owner + '-enh-1', opt.youngIds[0], S.readCampaign(owner).profile.heroId));
    note(owner + ':enh2', await S.enhanceCampaign(owner, owner + '-enh-2', opt.youngIds[1], q.rewards[0].cardId));
    note(owner + ':enhDup', await S.enhanceCampaign(owner, owner + '-enh-1', opt.youngIds[0], S.readCampaign(owner).profile.heroId));
    note(owner + ':read', S.readCampaign(owner));
  }
  note('backup', B.encodeCampaignBackup(S.readCampaign('self').profile, '2026-11-11T09:00:00.000Z'));
  note('preview', B.campaignBackupPreview(B.encodeCampaignBackup(S.readCampaign('self').profile, '2026-11-11T09:00:00.000Z')));
  note('resetGuest', await S.resetGuestCampaign());
  const finalLocal = Object.fromEntries(local.data), finalSession = Object.fromEntries(session.data);
  return { writes, outputs, finalLocal, finalSession };
}
module.exports = { runScenario };
if (require.main === module) {
  const root = path.resolve(process.argv[2] ?? path.join(__dirname, '..', '..'));
  runScenario(root).then(r => process.stdout.write(JSON.stringify(r, null, 1) + '\n')).catch(e => { console.error(e); process.exitCode = 1; });
}
