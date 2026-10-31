'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, type Match3ModeId } from '@/lib/beast-game/match3';
import type { BeastElement } from '@/lib/beast-game/elements';
import { readLegacyCampaignStatus, importLegacyCampaign, readCampaign, selectCampaignHero, saveCampaignTeam, resetGuestCampaign } from '@/lib/beast-game/match3/hard-campaign-store';
import { campaignHeroChoice, campaignAvailableIds, campaignCollection, campaignCardAttack, validateCampaignTeam } from '@/lib/beast-game/match3/hard-campaign';
import { BeastCardFace } from './BeastCardTile';
import Match3Board from './Match3Board';
import CampaignEnhancement from './CampaignEnhancement';
import styles from './Match3Board.module.css';
import picker from './Match3TeamPicker.module.css';

type Owner = 'self' | 'guest';
type Profile = NonNullable<ReturnType<typeof readCampaign>['profile']>;
export default function HardCampaignEntry({ seed, mode }: { seed?: number; mode?: Match3ModeId }) {
  const pool = useMemo(() => playableCards().filter(c => CARD_FACE_STATS[c.id]), []);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<'hero' | 'team' | 'battle'>('hero');
  const [candidate, setCandidate] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<BeastElement | 'ALL'>('ALL');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  useEffect(() => { setLegacyAvailable(readLegacyCampaignStatus().canImport); }, [owner]);
  const face = (id: string) => {
    const c = pool.find(card => card.id === id)!;
    const skill = getSkill(c.skills[0]);
    const attack = profile ? campaignCardAttack(profile, id) : null;
    return <span className={picker.face}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} />{attack && attack.bonus > 0 && <span className={picker.permanentBonus}>永久 +{attack.bonus} · 攻擊 {attack.attack}</span>}</span>;
  };
  const load = async (who: Owner, repick = false, reset = false) => {
    setSaving(true);
    const result = reset ? await resetGuestCampaign() : readCampaign(who);
    setSaving(false);
    if (!result.ok || !result.profile) { setError(result.error || '暫時無法取得闖關進度，請重試。'); return; }
    const p = result.profile;
    setOwner(who); setProfile(p); setError(''); setTab('ALL');
    setCandidate(campaignHeroChoice(p) === 'milestone' ? p.heroId : null);
    setSelected(validateCampaignTeam(p, p.teamIds) ? [...p.teamIds] : p.heroId ? [p.heroId] : []);
    setPhase(campaignHeroChoice(p) !== 'locked' ? 'hero' : repick || !validateCampaignTeam(p, p.teamIds) ? 'team' : 'battle');
    setRevision(n => n + 1);
  };
  const home = <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>;
  if (!owner || !profile) return <section className={styles.picker} data-testid="match3-player-choice" aria-label="選擇遊玩身分">
    {home}<h1>寶珠戰</h1>
    <div className={picker.playerChoices}>
      <button type="button" data-testid="play-self" disabled={saving} onClick={() => load('self')}><strong>我自己</strong><span>開始或接續自己的闖關進度</span></button>
      <button type="button" data-testid="play-guest" disabled={saving} onClick={() => load('guest', false, true)}><strong>親朋好友</strong><span>從第一關開始，不影響我的進度</span></button>
    </div>{legacyAvailable && <button type="button" className={styles.again} data-testid="resume-legacy" disabled={saving} onClick={async () => {
      setSaving(true); const result = await importLegacyCampaign(); setSaving(false);
      if (!result.ok) { setError(result.error || '舊進度尚未儲存，請重試。'); return; }
      await load('self');
    }}>確認這是我的舊進度，接續闖關</button>}{error && <p role="alert">{error}</p>}<p className={styles.hint}>自己的進度保存在這個瀏覽器。</p>
  </section>;
  if (phase === 'battle') return <Match3Board key={revision} seed={seed} mode={mode} progressOwner={owner} campaignEnabled teamIds={profile.teamIds} onCampaignContinue={() => load(owner)} onRepick={() => load(owner, true)} />;
  const choice = campaignHeroChoice(profile);
  const changePlayer = <button type="button" className={styles.again} data-testid="change-player" disabled={saving} onClick={() => { setOwner(null); setProfile(null); setError(''); }}>更換玩家</button>;
  if (phase === 'hero') return <section className={styles.picker} data-testid="match3-hero-choice" aria-label="選擇主角">
    {home}{changePlayer}<h1>{choice === 'milestone' ? '保留或重新選擇主角' : '選擇你的四象主角'}</h1>
    <p className={styles.hint}>{choice === 'milestone' ? '通過第八關，可保留原主角或更換一次。確認後主角固定。' : profile.wins >= 8 ? '你的進度已通過第八關；這次選擇即使用唯一的重選機會，確認後主角固定。' : '主角占一個出戰位置。選定後固定，通過第八關可重新選擇一次。'}</p>
    {choice === 'milestone' && <p className={styles.hint}>永久強化留在原卡，不會轉移到新主角；原卡加成仍會保留。</p>}
    <div className={picker.cardGrid}>{pool.filter(c => c.id.startsWith('beast_g_')).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-hero" data-id={c.id} aria-pressed={candidate === c.id} onClick={() => setCandidate(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{profile.heroId === c.id ? '保留原主角' : c.name}</span>
    </button>)}</div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.pickBar}><button type="button" className={styles.again} data-testid="confirm-hero" disabled={!candidate || saving} onClick={async () => {
      if (!candidate) return;
      setSaving(true); const result = await selectCampaignHero(owner, candidate); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '主角尚未儲存，請重試。'); return; }
      setProfile(result.profile); setSelected(validateCampaignTeam(result.profile, result.profile.teamIds) ? [...result.profile.teamIds] : [candidate]); setPhase('team'); setError('');
    }}>確認主角</button></div>
  </section>;
  const allowed = campaignAvailableIds(profile);
  const collection = campaignCollection(profile);
  const shown = pool.filter(c => allowed.includes(c.id) && c.id !== profile.heroId && (tab === 'ALL' || c.element === tab));
  const toggle = (id: string) => { if (id !== profile.heroId && allowed.includes(id)) setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s); };
  return <section className={styles.picker} data-testid="team-picker" aria-label="選擇主角的四位夥伴">
    {home}{changePlayer}<h1>我的卡片</h1><p className={styles.hint}>主角已固定，接著選 4 張夥伴。勝利獲得的成獸保存在這裡，也能加入隊伍。</p><h2 className={picker.sectionTitle}>主角與出戰隊伍</h2>
    <div className={picker.selectedRow} data-testid="picked-row" aria-label={`已選 ${selected.length} 張`}>{selected.map(id => <button type="button" key={id} className={picker.selectedCard} disabled={id === profile.heroId} aria-label={id === profile.heroId ? '固定主角' : `移除${pool.find(c => c.id === id)?.name}`} onClick={() => toggle(id)}>
      {face(id)}<span className={picker.remove}>{id === profile.heroId ? '主角・固定' : '移除夥伴'}</span>
    </button>)}</div>
    <div className={styles.pickTabs}>{(['ALL', ...MATCH3_ORB_ELEMENTS] as const).map(e => <button type="button" key={e} aria-pressed={tab === e} onClick={() => setTab(e)}>{e === 'ALL' ? '全部' : MATCH3_ORB_LABEL[e]}</button>)}</div>
    <h2 className={picker.sectionTitle}>已獲成獸</h2>{collection.adults.length === 0 && <p className={styles.hint}>贏得第一場，即可獲得第一張成獸卡。</p>}<div className={picker.cardGrid}>{shown.filter(c => collection.adults.some(a => a.cardId === c.id)).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，攻擊 ${CARD_FACE_STATS[c.id].attack}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>已獲 {collection.adults.find(a => a.cardId === c.id)?.count} 張 · {selected.includes(c.id) ? '已選夥伴' : '點選出戰'}</span>
    </button>)}</div>
    <CampaignEnhancement owner={owner} profile={profile} onSaved={updated => { setProfile(updated); setSelected(ids => ids.filter(id => campaignAvailableIds(updated).includes(id))); }} />
    <h2 className={picker.sectionTitle}>幼子夥伴</h2><p className={styles.hint}>尚未消耗的幼子可自由挑選。</p>
    <div className={picker.cardGrid}>{shown.filter(c => collection.youngIds.includes(c.id)).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，攻擊 ${CARD_FACE_STATS[c.id].attack}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{selected.includes(c.id) ? '已選夥伴' : '點選出戰'}</span>
    </button>)}</div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.pickBar}><button type="button" className={styles.again} data-testid="start-battle" disabled={!validateCampaignTeam(profile, selected) || saving} onClick={async () => {
      setSaving(true); const result = await saveCampaignTeam(owner, selected); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '隊伍尚未儲存，請重試。'); return; }
      setProfile(result.profile); setError(''); setRevision(n => n + 1); setPhase('battle');
    }}>開戰（{selected.length}/5）</button></div>
  </section>;
}
