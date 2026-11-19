import 'server-only';
import { balancedSnapshot } from './cultivation-balance';
import { fuseCultivation, replaceCultivationMainTeam, type CultivationState, type CultivationChange, type FusionChoice } from './cultivation';
import { activeFoodChainRule, receiptRule, type FoodChainRule } from './cultivation-rules';

export type CultivationCommand = { type: 'FUSE'; choices: FusionChoice[] } | { type: 'MAIN_TEAM'; ids: string[] };
/** rule：v2 起寫入；沒有這欄的舊收據＝v1，永遠照 v1 重播。 */
export interface CultivationReceipt { operationId: string; command: string; revision: string; changes: CultivationChange[]; rule?: FoodChainRule }
export interface CultivationSnapshot {
  revision: string;
  state: CultivationState;
  pendingBattle: string | null;
  receipts: CultivationReceipt[];
  creditedIds?: string[];
  shards?: import('../beast-collection-ledger').ShardLedger;
  starterPack?: string;
  orbTreasures?: import('./match3/treasures').TreasureBook;
  orbComeback?: import('./match3/comeback').ComebackRecord;
  cardOutcomes?: Record<string,string>;
  exchanges?: Record<string,{kind:string;cardId:string}>;
  orbRun?: {id:string;version:number;seed:number;totalDamage?:number;lastDamage?:number;input:import('./match3/resolve-turn').TurnInput;last?:{version:number;command:string;response:unknown}};
  orbLedger?: { wins:number; rewards:import('./match3/hard-campaign').CampaignReward[]; receipts:import('./match3/hard-campaign').CampaignReward[] };
  hold?: { id: string; kind: 'card' | 'orb'; entries: {id:string;cardId:string}[]; bonuses: Record<string,string>; stakeIds: string[] };
}
/** Storage must atomically compare revision and replace the entire record. */
export interface CultivationRepository {
  read(owner: string): Promise<CultivationSnapshot>;
  compareAndSwap(owner: string, revision: string, next: CultivationSnapshot): Promise<boolean>;
}
/** 舊副本沒有 fed 欄位時，由歷來收據補算被餵張數（星級用；不改寫舊資料）。 */
export function fedCounter(snapshot: Pick<CultivationSnapshot, 'receipts' | 'state'>): (copyId: string) => number {
  const counts = new Map<string, number>();
  for (const receipt of snapshot.receipts ?? []) for (const change of receipt.changes ?? []) counts.set(change.targetId, (counts.get(change.targetId) ?? 0) + 1);
  return id => snapshot.state.cards.find(c => c.id === id)?.fed ?? counts.get(id) ?? 0;
}
/** 預覽與正式合體共用同一套規則（伺服端權威）。 */
export function fuseSnapshot(snapshot: CultivationSnapshot, choices: FusionChoice[], rule: FoodChainRule = activeFoodChainRule()) {
  return { rule, ...fuseCultivation((rule==='v4'?balancedSnapshot(snapshot):snapshot).state, choices, { rule, fedOf: fedCounter(snapshot) }) };
}
/** 依收據上的規則版本重算（審計／測試用）：舊收據沒有 rule 欄＝v1。 */
export function replayCultivationReceipt(before: CultivationSnapshot, receipt: CultivationReceipt) {
  const parsed = JSON.parse(receipt.command);
  if (parsed?.type !== 'FUSE') return null;
  return fuseSnapshot(before, parsed.choices, receiptRule(receipt.rule));
}
function commandKey(command: CultivationCommand): string {
  if (command?.type === 'FUSE' && Array.isArray(command.choices)) return JSON.stringify({ type: command.type, choices: command.choices.map(c => ({ targetId: c?.targetId, materialId: c?.materialId })) });
  if (command?.type === 'MAIN_TEAM' && Array.isArray(command.ids)) return JSON.stringify({ type: command.type, ids: command.ids });
  throw new Error('培養操作無效。');
}
export async function transactCultivation(repository: CultivationRepository, owner: string, operationId: string, expectedRevision: string, command: CultivationCommand) {
  if (!owner || typeof operationId !== 'string' || !operationId.trim() || operationId.length > 200 || !/^(0|[1-9]\d*)$/.test(expectedRevision)) throw new Error('培養操作識別無效。');
  const key = commandKey(command);
  const replay = (snapshot: CultivationSnapshot) => {
    const receipt = snapshot.receipts.find(r => r.operationId === operationId);
    if (!receipt) return null;
    if (receipt.command !== key) throw new Error('重送操作的內容不一致。');
    return { snapshot, receipt, duplicate: true };
  };
  const current = await repository.read(owner);
  const prior = replay(current); if (prior) return prior;
  if (current.revision !== expectedRevision) throw new Error('卡庫已更新，請重新確認材料與主力。');
  if (current.pendingBattle) throw new Error('戰鬥尚未結算，暫不能合體或更換主力。');
  const result = command.type === 'FUSE' ? fuseSnapshot(current, command.choices) : { rule: undefined, state: replaceCultivationMainTeam(current.state, command.ids), changes: [] };
  const revision = (BigInt(current.revision) + 1n).toString();
  const receipt: CultivationReceipt = { operationId, command: key, revision, changes: result.changes, ...(result.rule ? { rule: result.rule } : {}) };
  const next = { ...current, revision, state: result.state, receipts: [...current.receipts, receipt] };
  if (await repository.compareAndSwap(owner, current.revision, next)) return { snapshot: next, receipt, duplicate: false };
  // The other writer may be the identical request whose response was lost.
  const concurrent = replay(await repository.read(owner)); if (concurrent) return concurrent;
  throw new Error('卡庫已更新，這次未扣材料，請重新確認。');
}
