'use client';
import { useEffect, useState } from 'react';
import { ElementTreasureOrb } from '@/components/bazi/customer/ElementTreasureOrb';
import type { ProductElement } from '@/components/bazi/customer/elementOrbPalette';
import { ELEMENT_TREASURE_RITUAL_MS } from '@/lib/element-treasure-ritual-state';
const elements: ProductElement[] = ['空', '風', '水', '火', '地'];
export default function OrbReview() {
  const [element, setElement] = useState<ProductElement>('風');
  const [state, setState] = useState('sealed');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (state !== 'opening') return;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.min(12, Math.floor((Date.now() - start) / 1000))), 100);
    const finish = setTimeout(() => setState('released'), ELEMENT_TREASURE_RITUAL_MS[4]);
    return () => { clearInterval(timer); clearTimeout(finish); };
  }, [state]);
  return <main className="orb-review">
    <style>{`
      .orb-review { min-height:100vh;background:#10182e;color:#f0f5ff;padding:24px 20px 60px;text-align:center; }
      .orb-review h1 {font-size:22px;margin:16px 0;} .orb-review p {line-height:1.6;}
      .orb-review .hero {position:relative;width:106px;height:106px;margin:72px auto 65px;}
      .orb-review .comparisons {display:flex;justify-content:center;gap:22px;margin:54px auto;}
      .orb-review .small {position:relative;width:44px;height:44px;} .orb-review .small b {position:absolute;top:62px;left:0;right:0;}
      .orb-review button,.orb-review select {background:#243754;color:#fff;border:1px solid #99bdd2;border-radius:12px;padding:12px;margin:6px;min-height:44px;}
      .orb-review button:disabled {opacity:.6;} .orb-review a {color:#bdeeff;} .orb-review .status {min-height:28px;}
    `}</style>
    <a href="/">返回首頁</a><h1>寶珠・封印與解封體驗</h1>
    <p>此處只預覽外觀，不儲存進度、不發放獎勵。</p>
    <label>主珠元素 <select aria-label="主珠元素" value={element} disabled={state === 'opening'} onChange={e => {setElement(e.target.value as ProductElement);setState('sealed');setSeconds(0);}}>{elements.map(e => <option key={e}>{e}</option>)}</select></label>
    <div className="hero"><ElementTreasureOrb key={element} element={element} released={state !== 'sealed'} burning={state === 'opening'} /></div>
    <p className="status" role="status">{state === 'sealed' ? '封印中 · 五色能量收於符內' : state === 'opening' ? `符咒化灰 · ${seconds} / 12 秒` : '已解封 · 光圈展開，能量釋放'}</p>
    <button disabled={state !== 'sealed'} onClick={() => {setSeconds(0);setState('opening');}}>開始十二秒解封</button>
    <button disabled={state === 'opening'} onClick={() => {setState('sealed');setSeconds(0);}}>重新封印</button>
    <div className="comparisons" aria-label="四顆比較珠，維持封印">{elements.filter(e => e !== element).map(e => <div className="small" key={e}><ElementTreasureOrb element={e} released={false} burning={false} preview /><b>{e}</b></div>)}</div>
  </main>;
}
