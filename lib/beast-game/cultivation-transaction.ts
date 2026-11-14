import 'server-only';
import { fuseCultivation, replaceCultivationMainTeam, type CultivationState, type CultivationChange, type FusionChoice } from './cultivation';

export type CultivationCommand = { type: 'FUSE'; choices: FusionChoice[] } | { type: 'MAIN_TEAM'; ids: string[] };
export interface CultivationReceipt { operationId: string; command: string; revision: string; changes: CultivationChange[] }
export interface CultivationSnapshot {
  revision: string;
  state: CultivationState;
  pendingBattle: string | null;
  receipts: CultivationReceipt[];
  creditedIds?: string[];
  orbLedger?: { wins:number; rewards:import('./match3/hard-campaign').CampaignReward[]; receipts:import('./match3/hard-campaign').CampaignReward[] };
  hold?: { id: string; kind: 'card' | 'orb'; entries: {id:string;cardId:string}[]; bonuses: Record<string,string>; stakeIds: string[] };
}
/** Storage must atomically compare revision and replace the entire record. */
export interface CultivationRepository {
  read(owner: string): Promise<CultivationSnapshot>;
  compareAndSwap(owner: string, revision: string, next: CultivationSnapshot): Promise<boolean>;
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
  const result = command.type === 'FUSE' ? fuseCultivation(current.state, command.choices) : { state: replaceCultivationMainTeam(current.state, command.ids), changes: [] };
  const revision = (BigInt(current.revision) + 1n).toString();
  const receipt: CultivationReceipt = { operationId, command: key, revision, changes: result.changes };
  const next = { ...current, revision, state: result.state, receipts: [...current.receipts, receipt] };
  if (await repository.compareAndSwap(owner, current.revision, next)) return { snapshot: next, receipt, duplicate: false };
  // The other writer may be the identical request whose response was lost.
  const concurrent = replay(await repository.read(owner)); if (concurrent) return concurrent;
  throw new Error('卡庫已更新，這次未扣材料，請重新確認。');
}
