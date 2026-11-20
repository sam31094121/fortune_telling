'use client';
/**
 * 「四大神獸・點擊直接強化」入口卡：星宿神獸首屏（兩張玩法卡下方）與兩款遊戲的出戰準備畫面共用這一張。
 * 可強化張數只在這支手機已有卡庫識別碼時向伺服端讀（唯讀 GET，不會因為看入口就建立卡庫）；讀不到就不顯示數字。
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sharedWalletHeaders } from '@/lib/beast-cultivation-client';
import { enhanceHref, type EnhanceFrom } from '@/lib/beast-food-chain-client';
import EnhanceIcon from './EnhanceIcon';
import s from './FourBeastsEntryCard.module.css';

const ART = ['qinglong', 'zhuque', 'baihu', 'xuanwu'].map(key => `/beast-game/thumb/guardian-${key}.v2.webp`);

export default function FourBeastsEntryCard({ from, compact = false }: { from?: EnhanceFrom; compact?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const headers = sharedWalletHeaders();
    if (!headers['x-beast-wallet']) return;
    const ctrl = new AbortController();
    fetch('/api/beast-game/four-beasts', { headers, cache: 'no-store', signal: ctrl.signal })
      .then(r => r.json()).then(j => { if (j?.ok && typeof j.view?.enhanceableCount === 'number') setCount(j.view.enhanceableCount); }).catch(() => {});
    return () => ctrl.abort();
  }, []);
  return <Link href={enhanceHref(from)} data-four-beasts-entry className={`${s.card} ${compact ? s.compact : ''}`} aria-label={`四大神獸，點擊直接強化${count !== null ? `，可強化 ${count} 張` : ''}`}>
    <span className={s.art} aria-hidden="true">{ART.map(src => <img key={src} src={src} alt="" draggable={false} />)}</span>
    <span className={s.text}>
      <strong className={s.title}>四大神獸</strong>
      {count !== null && <span className={s.badge} data-entry-count={count} aria-hidden="true"><EnhanceIcon name="cards" />{count}</span>}
    </span>
    <span className={s.cta} aria-hidden="true">點擊直接強化<EnhanceIcon name="tap" className={s.tap} /></span>
  </Link>;
}
