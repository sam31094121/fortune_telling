const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./guest-orb-fixture.cjs');
if (!process.env.BEAST_BATTLE_SECRET && !process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.JWT_SECRET) {
  process.env.BEAST_BATTLE_SECRET = 'test-orb-begin-resume-secret';
}
const campaign = require('../lib/beast-game/match3/hard-campaign.ts');
const repo = require('../lib/beast-game/cultivation-repository.ts');
const treasures = require('../lib/beast-game/match3/treasures.ts');
const games = require('../lib/beast-game/cultivation-games.ts');
const ids = ['beast_g_qinglong', 'beast_a01', 'beast_a02', 'beast_a03', 'beast_a04'];
const cards = ids.map((cardId, i) => ({ id: 'copy:' + i, cardId, bonus: '0' }));
let stored = { revision: '0', state: { cards, protectedIds: cards.map(c => c.id) }, pendingBattle: null, receipts: [], orbTreasures: treasures.emptyTreasureBook(), orbLedger: { wins: 0, rewards: [], receipts: [] } };
repo.cultivationRepository = () => ({
  read: async () => structuredClone(stored),
  compareAndSwap: async (_, rev, next) => { if (stored.revision !== rev) return false; stored = structuredClone(next); return true; }
});
const profile = { ...campaign.chooseCampaignHero(campaign.newCampaign(), 'beast_g_qinglong'), teamIds: ids, ownedEntries: Object.fromEntries(cards.map(c => [c.cardId, c.id])) };

(async () => {
  const orb = require('../lib/beast-game/cultivation-orb.ts');
  const start = await orb.beginSharedOrb('owner-a', profile, 'first-orb', 17, 'hard45');
  assert.equal(start.battleId, 'orb:first-orb');
  assert.equal(stored.pendingBattle, 'orb:first-orb');
  const diverted = await orb.beginSharedOrb('owner-a', profile, 'second-orb', 99, 'hard45');
  assert.equal(diverted.battleId, 'orb:first-orb', 'a new begin during a held orb battle resumes the original fight');
  assert.deepEqual(JSON.parse(JSON.stringify(diverted.initial)), JSON.parse(JSON.stringify(start.initial)));
  assert.equal(stored.pendingBattle, 'orb:first-orb', 'auto-resume must not open a second hold');
  const replay = await orb.beginSharedOrb('owner-a', profile, 'first-orb', 20, 'hard45');
  assert.equal(replay.battleId, 'orb:first-orb');

  await games.releaseCultivationBattle('owner-a', 'orb:first-orb');
  stored.pendingBattle = 'card:held';
  stored.hold = { id: 'card:held', kind: 'card', entries: [], bonuses: {}, stakeIds: [] };
  await assert.rejects(() => orb.beginSharedOrb('owner-a', profile, 'fresh-orb', 17, 'hard45'), /請先接續或離開原戰鬥，再使用共同卡庫/);
  assert.equal(stored.pendingBattle, 'card:held', 'a pending card battle still blocks a new orb begin');

  const src = fs.readFileSync(path.join(__dirname, '../components/battlefield/Match3Board.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../components/battlefield/Match3Board.module.css'), 'utf8');
  assert.match(src, /data-testid="orb-continue-pending"/);
  assert.match(src, /data-testid="orb-leave-pending"/);
  assert.match(src, /data-testid="orb-return-cards"/);
  assert.match(src, /className=\{styles\.again\}/);
  assert.match(css, /\.initErrorActions/);
  console.log('PASS beginSharedOrb auto-resumes a held orb battle; card holds still block; error UI keeps visible action buttons');
})().catch(e => { console.error(e); process.exitCode = 1; });
