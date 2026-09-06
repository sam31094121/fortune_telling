'use client';
import {useEffect, useState} from 'react';

/** Presentation metadata is separate from the server's authoritative skill effects. */
export default function BeastDuelArchive({cardId, skillName, description}: {
  cardId: string; skillName: string; description: string;
}) {
  const [entry, setEntry] = useState<{id: string; names: string[]} | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setEntry(null); setFailed(false);
    const timeout = setTimeout(() => controller.abort(), 5000);
    async function load() {
      try {
        const res = await fetch(`/skill-battle-archive/cards/${encodeURIComponent(cardId)}/skills.json`, {signal: controller.signal});
        if (!res.ok) throw new Error('Archive unavailable');
        const data = await res.json();
        if (data.poolId !== cardId || !Array.isArray(data.skills)) throw new Error('Wrong card archive');
        const names = data.skills.filter((s: {enabled?: boolean; name?: unknown; skillId?: string}) => s?.enabled === true && typeof s.name === 'string' && ['skill_charge', 'skill_hit', 'skill_ready_battle'].includes(s.skillId ?? '')).map((s: {name: string}) => s.name);
        if (!controller.signal.aborted) setEntry({id: cardId, names});
      } catch {
        if (!disposed) setFailed(true);
      } finally { clearTimeout(timeout); }
    }
    let disposed = false;
    void load();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [cardId]);
  return <details><summary>神獸技能檔案</summary>
    <p>{skillName}：{description}</p>
    {entry?.id === cardId ? <p>演出技能：{entry.names.join('、') || '尚未登錄'}。影片依素材驗收狀態提供。</p> : <p>{failed ? '演出資料暫時無法讀取，仍可正常使用戰鬥技能。' : '正在讀取這隻神獸的技能檔案…'}</p>}
  </details>;
}
