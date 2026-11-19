'use client';
/**
 * 四大神獸強化頁（入口在星宿神獸卡片頁兩張玩法卡下方）。
 * 2026-11-16 整合（使用者 00:35 授權，以神獸戰鬥食物鏈為準）：
 * - 強化流程不另做一套：直接用神獸戰鬥同一個純圖示面板（SharedCultivationPanel iconOnly），四大神獸排最前；
 *   要強化的卡在上、可吃的卡在下、✓ 吃卡／✕ 還原、五顆星與 +X% 全部照印伺服端數字。
 * - 頂列只留圖示與數字：↩ 回星宿神獸、🍴 可強化張數（可吃的材料；🃏 在卡上代表下一星還差幾張，不混用）、⚔／● 兩種贏卡來源張數（GET /api/beast-game/four-beasts，伺服端算好）。
 * - 畫面零文字（標題、「強化」、「先鎖定五隻主力」、錯誤段落、「重新讀取」全部改成圖示）；說明只留給讀屏的 aria-label。
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { sharedWalletHeaders, SHARED_UPDATED } from '@/lib/beast-cultivation-client';
import type { FourBeastsView } from '@/lib/beast-game/four-beasts-view';
import SharedCultivationPanel from './SharedCultivationPanel';
import s from './FourBeastsEnhance.module.css';

export default function FourBeastsEnhance() {
  const [view, setView] = useState<FourBeastsView | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedGuardian,setSelectedGuardian]=useState('');
  const [selectionRequest,setSelectionRequest]=useState(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/beast-game/four-beasts', { headers: sharedWalletHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error);
      setView(j.view); setFailed(false);
    } catch { setFailed(true); }
  }, []);
  // 等面板同步完共同卡庫（新玩家此時才建立卡庫識別）再讀；之後每次卡庫更新（吃卡、同步）重讀一次，數字一律以伺服端為準。
  useEffect(() => { let t = 0; const again = () => { window.clearTimeout(t); t = window.setTimeout(() => void load(), 250); }; window.addEventListener(SHARED_UPDATED, again); return () => { window.clearTimeout(t); window.removeEventListener(SHARED_UPDATED, again); }; }, [load]);
  return <main className={s.page} data-four-beasts>
    <header className={s.top}>
      <Link href="/star-beasts" className={s.back} aria-label="回到星宿神獸卡片"><span aria-hidden="true">↩</span></Link>
      <span className={s.thumbs}>{['qinglong', 'zhuque', 'baihu', 'xuanwu'].map(k => <button key={k} type="button" data-select-guardian={k} aria-label={`選擇${({qinglong:"青龍",zhuque:"朱雀",baihu:"白虎",xuanwu:"玄武"})[k as "qinglong"]}強化`} aria-pressed={selectedGuardian===`beast_g_${k}`} onClick={()=>{setSelectedGuardian(`beast_g_${k}`);setSelectionRequest(n=>n+1);}}><img src={`/beast-game/thumb/guardian-${k}.v2.webp`} alt="" draggable={false} /></button>)}</span>
      {failed
        ? <button type="button" className={s.count} onClick={() => void load()} aria-label="重新讀取可強化張數"><span aria-hidden="true">↻</span></button>
        : <p className={s.count} data-enhanceable-count={view?.enhanceableCount ?? ''} aria-label={view ? `可強化 ${view.enhanceableCount} 張；神獸戰鬥贏得 ${view.sources.duel} 張；寶石捷連線贏得 ${view.sources.orb} 張` : '讀取中'}>
          <span aria-hidden="true">🍴</span><strong aria-hidden="true">{view ? view.enhanceableCount : '⏳'}</strong>
          {view && view.sources.duel > 0 && <span className={s.src} data-source="duel" aria-hidden="true">⚔{view.sources.duel}</span>}
          {view && view.sources.orb > 0 && <span className={s.src} data-source="orb" aria-hidden="true">●{view.sources.orb}</span>}
        </p>}
    </header>
    <div className={s.body}><SharedCultivationPanel iconOnly focus="GUARDIAN" preferredTargetCardId={selectedGuardian} selectionRequest={selectionRequest} /></div>
  </main>;
}
