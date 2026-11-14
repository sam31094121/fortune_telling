import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateCultivationState } from './cultivation';
import type { CultivationRepository, CultivationSnapshot } from './cultivation-transaction';

/** Service-role only. Owner is a server-derived capability hash, never a customer name. */
export class SupabaseCultivationRepository implements CultivationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async read(owner: string): Promise<CultivationSnapshot> {
    const { data, error } = await this.client.from('beast_cultivation_accounts').select('revision,snapshot').eq('owner_hash', owner).single();
    if (error || !data || data.revision !== data.snapshot?.revision) throw new Error('共同卡庫暫時無法讀取，未扣材料。');
    validateCultivationState(data.snapshot.state);
    return data.snapshot as CultivationSnapshot;
  }

  async create(owner: string, initial: CultivationSnapshot): Promise<CultivationSnapshot> {
    validateCultivationState(initial.state);
    if (initial.revision !== '0' || initial.receipts.length || initial.pendingBattle !== null) throw new Error('共同卡庫初始化資料無效。');
    const { error } = await this.client.from('beast_cultivation_accounts').insert({ owner_hash: owner, revision: '0', snapshot: initial });
    // A concurrent bootstrap must read the winner, never overwrite its account.
    if (error && error.code !== '23505') throw new Error('共同卡庫尚未保存，請保留原存檔。');
    return this.read(owner);
  }

  async compareAndSwap(owner: string, revision: string, next: CultivationSnapshot): Promise<boolean> {
    validateCultivationState(next.state);
    if (next.revision !== (BigInt(revision) + 1n).toString()) throw new Error('卡庫版本無效。');
    const { data, error } = await this.client.from('beast_cultivation_accounts')
      .update({ revision: next.revision, snapshot: next })
      .eq('owner_hash', owner).eq('revision', revision).select('revision');
    if (error) throw new Error('卡庫保存尚未確認，請重試同一次操作。');
    return data?.length === 1;
  }
}

export function cultivationRepository(): SupabaseCultivationRepository {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('共同卡庫服務尚未就緒，未扣材料。');
  return new SupabaseCultivationRepository(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
