'use client';

/**
 * 神獸戰鬥動畫預覽（品質驗收用，不在任何導覽裡）。
 *
 * - 滑桿：逐格檢視出擊動畫的每一個時刻（0～100%），並列出該時刻疊了哪些關鍵幀。
 * - 與新版卡面對照：左邊是原始卡面圖（唯一美術母版），右邊是這個時刻的動畫畫面，
 *   逐項檢查毛色、條紋、鬃毛、眼睛、牙齒是否與原卡一致。
 */

import { useRef, useState } from 'react';
import BeastRigStage from '@/components/battlefield/BeastRigStage';
import { BAIHU_RIG, RIG_PHASES, RIG_STRIKE_MS, strikeFrame } from '@/lib/beast-game/beast-rig';

export default function RigPreviewPage() {
  const arena = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0.62);
  const [playKey, setPlayKey] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const phase = (Object.entries(RIG_PHASES).find(([, [a, b]]) => t >= a && t < b)?.[0]) ?? 'settle';
  const layers = strikeFrame(t).layers.map((l) => `${l.frame} ${Math.round(l.alpha * 100)}%`).join('、');

  return (
    <main style={{ padding: 12, color: '#e7eef9', background: '#050b18', minHeight: '100dvh' }}>
      <h1 style={{ fontSize: 16, fontWeight: 800 }}>白虎戰鬥動畫預覽</h1>
      <p data-rig-phase style={{ fontSize: 13 }}>階段：{phase}・{Math.round(t * RIG_STRIKE_MS)} ms／{RIG_STRIKE_MS} ms・關鍵幀{ready ? '已載入' : '載入中'}</p>
      <p data-rig-layers style={{ fontSize: 12, color: '#9db4d3' }}>疊合：{layers}</p>
      <input data-rig-slider type="range" min={0} max={1000} value={Math.round(t * 1000)} onChange={e => { setPlayKey(null); setT(Number(e.target.value) / 1000); }} style={{ width: '100%' }} />
      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <button type="button" onClick={() => setPlayKey(Date.now())} style={{ minHeight: 44, padding: '0 14px', border: '1px solid #7dd3fc', borderRadius: 8 }}>播放一次</button>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/beast-game/front/guardian-baihu.v2.webp" alt="新版卡面（美術母版）" style={{ width: 'min(100%, 420px)', borderRadius: 8, border: '1px solid #526386' }} />
        <div ref={arena} style={{ position: 'relative', width: 'min(100%, 420px)', height: 560, border: '1px solid #526386', borderRadius: 12, background: 'linear-gradient(#10203a, #1c2b24)', overflow: 'hidden' }}>
          <div data-fighter="opponent" style={{ position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)' }}>
            <div data-art-slot="opponent" style={{ width: 96, height: 134, border: '2px solid #b45309', borderRadius: 8, background: '#3b2a1a', display: 'grid', placeItems: 'center', fontSize: 12 }}>對手</div>
          </div>
          <div data-fighter="player" style={{ position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-art-slot="player" src="/beast-game/thumb/guardian-baihu.v2-480.webp" alt="白虎卡片" style={{ width: 130, height: 182, objectFit: 'cover', border: '2px solid #fde68a', borderRadius: 8, display: 'block' }} />
          </div>
          <BeastRigStage rig={BAIHU_RIG} playKey={playKey} arenaRef={arena} onReady={setReady} seek={playKey === null ? t : null} />
        </div>
      </div>
    </main>
  );
}
