'use client';

/**
 * 神獸戰鬥動畫預覽（品質驗收用，不在任何導覽裡）。
 *
 * - 滑桿：逐格檢視出擊動畫的每一個時刻（0～100%），並列出該時刻疊了哪些關鍵幀。
 * - 與新版卡面對照：左邊是原始卡面圖（唯一美術母版），右邊是這個時刻的動畫畫面，
 *   逐項檢查毛色、條紋、鬃毛、眼睛、牙齒是否與原卡一致。
 * - 動畫舞台是整個畫面層級：精靈從下方的「出戰卡」跳出去，跑向上方的「對手卡」。
 */

import { useEffect, useState } from 'react';
import BeastRigStage from '@/components/battlefield/BeastRigStage';
import { BAIHU_RIG, QINGLONG_RIG, ZHUQUE_RIG, XUANWU_RIG, RIG_PHASES, RIG_STRIKE_MS, strikeFrame } from '@/lib/beast-game/beast-rig';

export default function RigPreviewPage() {
  const [t, setT] = useState(0.62);
  const [playKey, setPlayKey] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  // ?beast=qinglong 切到青龍（預設白虎）；網址參數只決定看哪一隻，不影響任何結果
  const [beast, setBeast] = useState<'baihu' | 'qinglong' | 'zhuque' | 'xuanwu'>('baihu');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const selected = q.get('beast');
    if (selected === 'qinglong' || selected === 'zhuque' || selected === 'xuanwu') setBeast(selected);
    const ms = Number(q.get('ms')); // ?ms=1135 直接停在出擊後第 1135 毫秒（截圖驗收用）
    if (Number.isFinite(ms) && q.has('ms')) setT(Math.min(1, Math.max(0, ms / RIG_STRIKE_MS)));
  }, []);
  const rig = { baihu: BAIHU_RIG, qinglong: QINGLONG_RIG, zhuque: ZHUQUE_RIG, xuanwu: XUANWU_RIG }[beast];
  const name = { baihu: '白虎', qinglong: '青龍', zhuque: '朱雀', xuanwu: '玄武' }[beast];
  const phase = (Object.entries(RIG_PHASES).find(([, [a, b]]) => t >= a && t < b)?.[0]) ?? 'settle';
  const layers = strikeFrame(t, rig.style).layers.map((l) => `${l.frame} ${Math.round(l.alpha * 100)}%`).join('、');

  return (
    <main style={{ padding: 12, color: '#e7eef9', background: '#050b18', minHeight: '100dvh' }}>
      <h1 style={{ fontSize: 16, fontWeight: 800 }}>{name}戰鬥動畫預覽</h1>
      <p data-rig-phase style={{ fontSize: 13 }}>階段：{phase}・{Math.round(t * RIG_STRIKE_MS)} ms／{RIG_STRIKE_MS} ms・關鍵幀{ready ? '已載入' : '載入中'}</p>
      <p data-rig-layers style={{ fontSize: 12, color: '#9db4d3' }}>疊合：{layers}</p>
      <input data-rig-slider type="range" min={0} max={1000} value={Math.round(t * 1000)} onChange={e => { setPlayKey(null); setT(Number(e.target.value) / 1000); }} style={{ width: '100%' }} />
      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <button type="button" onClick={() => setPlayKey(Date.now())} style={{ minHeight: 44, padding: '0 14px', border: '1px solid #7dd3fc', borderRadius: 8 }}>播放一次</button>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
        <details style={{ width: 'min(100%, 420px)' }}><summary style={{ minHeight: 36 }}>查看美術母版</summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/beast-game/front/guardian-${beast}.v2.webp`} alt="新版卡面（美術母版）" style={{ width: 'min(100%, 420px)', borderRadius: 8, border: '1px solid #526386' }} />
        </details>
        <div style={{ position: 'relative', width: 'min(100%, 420px)', height: 'max(220px, calc(100dvh - 220px))', border: '1px solid #526386', borderRadius: 12, background: 'linear-gradient(#10203a, #1c2b24)' }}>
          <div data-fighter="opponent" style={{ position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)' }}>
            <div data-art-slot="opponent" style={{ width: 'clamp(58px, 15dvh, 96px)', height: 'clamp(80px, 21dvh, 134px)', border: '2px solid #b45309', borderRadius: 8, background: '#3b2a1a', display: 'grid', placeItems: 'center', fontSize: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/beast-game/front/guardian-baihu.v2.webp" alt="對手卡面" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div data-dock-card={rig.cardId} data-active="true" style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span data-card-thumbnail style={{ display: 'block', width: 'clamp(48px, 12dvh, 70px)', height: 'clamp(66px, 17dvh, 98px)' }}><img src={`/beast-game/thumb/guardian-${beast}.v2-480.webp`} alt={`${name}出戰卡`} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '2px solid #fde68a', borderRadius: 6 }} /></span>
          </div>
        </div>
      </div>
      <BeastRigStage key={beast} rig={rig} playKey={playKey} onReady={setReady} onFrame={setT} seek={playKey === null ? t : null} />
    </main>
  );
}
