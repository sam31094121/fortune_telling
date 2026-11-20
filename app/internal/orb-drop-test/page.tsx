'use client';
/** 內部測試頁：直接放 17 顆盾牌寶珠落下，檢查釘子與碰撞。只預覽，不存檔、不發獎。 */
import { useMemo, useState } from 'react';
import OrbDropAnimation from '@/components/battlefield/OrbDropAnimation';
import { dropCatches, simulateOrbDrops } from '@/lib/beast-game/match3/orb-drop';

export default function OrbDropTest() {
  const [run, setRun] = useState(0), [count, setCount] = useState(17), [done, setDone] = useState(false);
  const team = useMemo(() => [0, 1, 2, 3, 4].map(i => ({ id: `t${i}`, hp: 10 })), []);
  const catches = useMemo(() => dropCatches(team), [team]);
  const drops = useMemo(() => simulateOrbDrops({ count, element: 'FIRE', seed: 1000 + run, launchX: 500, catches, sources: Array.from({ length: count }, (_, i) => ({ r: 0, c: 0, element: 'FIRE' as const, x: [500, 300, 700, 100, 900][i % 5] })) }), [count, run, catches]);
  return <main style={{ minHeight: '100vh', background: '#10182e', color: '#fff', padding: 16 }}>
    <h1 style={{ fontSize: 20 }}>落珠測試頁（{count} 顆寶珠）</h1>
    <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
      <button type="button" data-testid="replay" onClick={() => { setDone(false); setRun(r => r + 1); }} style={{ minHeight: 44, padding: '0 16px' }}>再放一次</button>
      <button type="button" onClick={() => { setDone(false); setCount(c => (c === 17 ? 50 : c === 50 ? 256 : 17)); setRun(r => r + 1); }} style={{ minHeight: 44, padding: '0 16px' }}>切換 17／50／256 顆</button>
      <span data-testid="status">{done ? '落完了' : '落珠中…'}</span>
    </div>
    <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto' }}>
      <div data-testid="match3-board" style={{ height: 40 }} />
      <div style={{ height: 520 }} />
      <div style={{ display: 'flex', gap: 0 }}>
        {team.map((u, i) => <div key={u.id} data-testid="match3-ally" data-hp={u.hp} style={{ flex: 1, height: 90, margin: '0 4%', background: '#2a3a5a', borderRadius: 8, textAlign: 'center' }}>{i + 1}</div>)}
      </div>
      <OrbDropAnimation key={run + ':' + count} drops={drops} catches={catches} onSound={() => {}} onDone={() => setDone(true)} />
    </div>
  </main>;
}
