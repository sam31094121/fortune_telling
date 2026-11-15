import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cultivationRepository } from '@/lib/beast-game/cultivation-repository';
import { prepareCultivationMigration } from '@/lib/beast-game/cultivation-migration';
import { transactCultivation, type CultivationCommand } from '@/lib/beast-game/cultivation-transaction';
import { cultivationView } from '@/lib/beast-game/cultivation-view';
import { fuseCultivation } from '@/lib/beast-game/cultivation';
import { importExistingGrants, releaseCultivationBattle, creditSharedShards, exchangeSharedShards, legacyGrowthCollection } from '@/lib/beast-game/cultivation-games';
import { migrateCollection } from '@/lib/beast-collection-ledger';
import { sharedOrbProfile, beginSharedOrb } from '@/lib/beast-game/cultivation-orb';
import { parseCampaign } from '@/lib/beast-game/match3/hard-campaign';

export const runtime = 'nodejs';
// 共同卡庫資料庫在東京（Supabase ap-northeast-1）；函式預設在美東，每次資料庫來回多耗數百毫秒，改放東京。
export const preferredRegion = 'hnd1';
const headers = { 'Cache-Control': 'no-store' };
function ownerOf(request: Request): string {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== (request.headers.get('host') ?? new URL(request.url).host)) throw new Error('來源不符。');
  const capability = request.headers.get('x-beast-wallet');
  if (!capability || !/^[a-f0-9]{64}$/.test(capability)) throw new Error('共同卡庫識別無效，請保留原存檔。');
  return createHash('sha256').update(capability).digest('hex');
}
function failure(error: unknown) {
  const message = error instanceof Error && /[\u3400-\u9fff]/.test(error.message) ? error.message : '共同卡庫暫時無法取得，請重試同一次操作。';
  return NextResponse.json({ ok: false, error: message }, { status: 400, headers });
}
export async function GET(request: Request) {
  try { return NextResponse.json({ ok: true, view: cultivationView(await cultivationRepository().read(ownerOf(request))) }, { headers }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const owner = ownerOf(request), raw = await request.text();
    if (raw.length > 2_000_000) throw new Error('卡庫資料過大，請保留存檔。');
    const body = JSON.parse(raw), repository = cultivationRepository();
    if (body?.type === 'IMPORT') {
      if (!(body.orbProfile === null || typeof body.orbProfile === 'string')) throw new Error('寶珠存檔格式無效。');
      const migration = prepareCultivationMigration(legacyGrowthCollection(body.collection,body.growth), body.orbProfile);
      const orb=body.orbProfile?parseCampaign(body.orbProfile):null;
      const old=migrateCollection(body.collection);
      const snapshot = await repository.create(owner, { revision: '0', state: migration.state, pendingBattle: null, receipts: [], shards:old.shards,starterPack:old.starterPack,orbTreasures:orb?.treasures,creditedIds:[...migration.state.cards.map(c=>'copy:'+c.id),...Object.keys(old.shards?.receipts??{}).map(id=>'shards:'+id),...(old.granted??[]).map(id=>'copy:growth:'+id)],orbLedger:orb?{wins:orb.wins,rewards:orb.rewards,receipts:orb.receipts}:{wins:0,rewards:[],receipts:[]} });
      return NextResponse.json({ ok: true, view: cultivationView(snapshot) }, { headers });
    }
    if(body?.type==='ORB_PROFILE')return NextResponse.json({ok:true,profile:await sharedOrbProfile(owner,body.profile)},{headers});
    if(body?.type==='ORB_BEGIN')return NextResponse.json({ok:true,...await beginSharedOrb(owner,body.profile,body.operationId,body.seed,body.mode)},{headers});
    if(body?.type==='LOCAL_GRANTS')return NextResponse.json({ok:true,view:cultivationView(await importExistingGrants(owner,body.collection,body.growth))},{headers});
    if(body?.type==='SHARD_CREDIT')return NextResponse.json({ok:true,view:cultivationView(await creditSharedShards(owner,body.proof))},{headers});
    if(body?.type==='SHARD_EXCHANGE'){const snapshot=await exchangeSharedShards(owner,body.kind,body.operationId);return NextResponse.json({ok:true,view:cultivationView(snapshot),cardId:snapshot.exchanges![body.operationId].cardId},{headers});}
    if(body?.type==='RELEASE')return NextResponse.json({ok:true,view:cultivationView(await releaseCultivationBattle(owner,body.battleId))},{headers});
    if (body?.type === 'PREVIEW') {
      const snapshot = await repository.read(owner);
      if (snapshot.revision !== body.revision) throw new Error('卡庫已更新，請重新選擇。');
      if (snapshot.pendingBattle) throw new Error('戰鬥尚未結算，暫不能合體。');
      const preview = fuseCultivation(snapshot.state, body.choices);
      return NextResponse.json({ ok: true, changes: preview.changes }, { headers });
    }
    if (body?.type !== 'FUSE' && body?.type !== 'MAIN_TEAM') throw new Error('共同卡庫操作無效。');
    const command: CultivationCommand = body.type === 'FUSE' ? { type: 'FUSE', choices: body.choices } : { type: 'MAIN_TEAM', ids: body.ids };
    const result = await transactCultivation(repository, owner, body.operationId, body.revision, command);
    return NextResponse.json({ ok: true, view: cultivationView(result.snapshot), receipt: result.receipt, duplicate: result.duplicate }, { headers });
  } catch (error) { return failure(error); }
}
