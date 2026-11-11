'use client';
import { useState } from 'react';
import { BeastCardFace } from '@/components/battlefield/BeastCardTile';
import { FeedCardStack, FeedCountBadge, FeedStateIcon, MansionGroupHeader, type FeedState, type Mansion } from '@/components/battlefield/feed-chain/FeedChainVisual';
import { playableCards } from '@/lib/beast-game/registry';
import { getSkill } from '@/cards/skills';
import m3 from '@/components/battlefield/Match3Board.module.css';
import picker from '@/components/battlefield/Match3TeamPicker.module.css';

const SAMPLES: { id?: string; state: FeedState; available: number }[] = [
  { state: 'available', available: 3 }, { state: 'available', available: 2 }, { state: 'available', available: 1 },
  { state: 'locked', available: 1 }, { state: 'locked', available: 4 },
  { state: 'used-orb', available: 0 }, { state: 'used-beast', available: 0 }, { state: 'available', available: 12 },
];
const MANSIONS: Mansion[] = ['qinglong', 'xuanwu', 'baihu', 'zhuque'];

export default function Preview() {
  const cards = playableCards().filter(c => !c.id.startsWith('beast_g_'));
  const pick = (i: number) => cards[(i * 7 + 3) % cards.length];
  const face = (c: ReturnType<typeof pick>) => { const skill = getSkill(c.skills[0]); return <span className={picker.face}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} /></span>; };
  const [open, setOpen] = useState<Record<Mansion, boolean>>({ qinglong: false, xuanwu: true, baihu: false, zhuque: false });
  return <section className={m3.picker} data-testid="fc-preview">
    <h1>合體鏈視覺 P0（內部預覽，假資料）</h1>
    <h2 className={picker.sectionTitle}>疊卡與狀態（寶珠選隊頁卡格）</h2>
    <div className={picker.cardGrid} data-testid="fc-grid">{SAMPLES.map((s, i) => { const c = pick(i); return <button type="button" key={i} className={picker.cardChoice} data-testid="fc-card" data-state={s.state} data-available={s.available}>
      <FeedCardStack available={s.available} state={s.state}>{face(c)}</FeedCardStack>
    </button>; })}</div>
    <h2 className={picker.sectionTitle}>選中狀態底色</h2>
    <div className={picker.cardGrid}>{(['locked', 'available'] as const).map((st, i) => <button type="button" key={st} className={picker.cardChoice} aria-pressed="true" data-testid="fc-card-pressed"><FeedCardStack available={3 - i} state={st}>{face(pick(i + 9))}</FeedCardStack></button>)}</div>
    <h2 className={picker.sectionTitle}>四象收合組</h2>
    <div style={{ display: 'grid', gap: 8 }} data-testid="fc-groups">{MANSIONS.map((m, i) => <MansionGroupHeader key={m} mansion={m} available={[5, 0, 3, 12][i]} expanded={open[m]} controlsId={`fc-g-${m}`} onToggle={() => setOpen(o => ({ ...o, [m]: !o[m] }))} />)}</div>
    <h2 className={picker.sectionTitle}>分頁上的可用張數／行內圖示</h2>
    <div className={m3.pickTabs} data-testid="fc-tabs">{['全部', '火', '水'].map((t, i) => <button type="button" key={t} aria-pressed={i === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t}<FeedCountBadge count={[17, 4, 0][i]} /></button>)}</div>
    <p data-testid="fc-inline" style={{ display: 'flex', gap: 10, alignItems: 'center' }}><FeedStateIcon state="locked" /><FeedStateIcon state="used-orb" /><FeedStateIcon state="used-beast" /><FeedCountBadge count={3} times /></p>
    <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4" data-testid="fc-shelf">
      <h2 className="text-lg font-black text-amber-100">神獸收藏底（DuelCollectionShelf 同色）</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{(['available', 'used-orb', 'locked'] as const).map((st, i) => <li key={st}><FeedCardStack available={[2, 0, 1][i]} state={st}>{face(pick(i + 20))}</FeedCardStack></li>)}</ul>
    </div>
  </section>;
}
