'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, type Match3ModeId } from '@/lib/beast-game/match3';
import type { BeastElement } from '@/lib/beast-game/elements';
import { readLegacyCampaignStatus, importLegacyCampaign, readCampaign, selectCampaignHero, saveCampaignTeam, resetGuestCampaign } from '@/lib/beast-game/match3/hard-campaign-store';
import { campaignHeroChoice, campaignAvailableIds, campaignCollection, validateCampaignTeam } from '@/lib/beast-game/match3/hard-campaign';
import { campaignBattleStats } from '@/lib/beast-game/match3/feed-chain';
import { battleResumeEnabled } from '@/lib/beast-game/match3/battle-resume';
import { hasPendingBattle } from '@/lib/beast-game/match3/battle-snapshot-store';
import { BeastCardFace } from './BeastCardTile';
import Match3Board from './Match3Board';
import CampaignEnhancement from './CampaignEnhancement';
import CampaignBackup from './CampaignBackup';
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
  const startButton = useRef<HTMLButtonElement>(null);
  const confirmHeroButton = useRef<HTMLButtonElement>(null);
  const teamHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase === 'hero' && candidate) {
      confirmHeroButton.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    if (phase === 'team') {
      teamHeading.current?.focus({ preventScroll: true });
      teamHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [phase, candidate]);
  const previousCount = useRef(0);
  const loadRetry = useRef<{ who: Owner; repick: boolean; reset: boolean } | null>(null);
  const loadAlert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === 'battle' && error) {
      loadAlert.current?.focus({ preventScroll: true });
      loadAlert.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [phase, error]);
  // AUDIT-2 H9：開戰列改成固定在畫面底部（sticky），選滿五張時不再自動捲到頁尾（原本會直接越過強化區約 6,000px）。
  useEffect(() => { previousCount.current = selected.length; }, [selected.length]);
  // AUDIT-2 H9：已獲成獸／幼子清單預設只列前幾張（已選的一定列出），其餘按「顯示全部」再展開，縮短手機頁長。
  const [showAllAdults, setShowAllAdults] = useState(false);
  const [showAllYoung, setShowAllYoung] = useState(false);
  // PLAN-v2 B4：從勝利畫面「去強化」回來時，直接捲到強化區。
  const [focusEnhance, setFocusEnhance] = useState(false);
  useEffect(() => {
    if (!focusEnhance || phase !== 'team') return;
    const el = document.getElementById('campaign-enhancement') ?? document.querySelector<HTMLElement>('[data-testid="enhancement-locked"]');
    el?.scrollIntoView({ block: 'start', behavior: 'instant' });
    setFocusEnhance(false);
  }, [focusEnhance, phase, profile]);
  // PLAN-v2 B8：從收藏頁帶 ?owner=self 進來時，省掉「我自己」那一下（仍可按「更換玩家」）。
  const autoOwner = useRef(false);
  useEffect(() => {
    if (autoOwner.current) return; autoOwner.current = true;
    if (new URLSearchParams(window.location.search).get('owner') === 'self') void load('self');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  useEffect(() => { setLegacyAvailable(readLegacyCampaignStatus().canImport); }, [owner]);
  const face = (id: string) => {
    const c = pool.find(card => card.id === id)!;
    const skill = getSkill(c.skills[0]);
    // PLAN-v2 B2：卡上方直接標「攻 X ▲N」（出戰實際用的數字，與戰鬥同一來源）。
    const attack = profile ? campaignBattleStats(profile, [id])[0] : null;
    return <span className={picker.face}>{attack && attack.bonus > 0 && <span className={picker.permanentBonusTop} data-testid="card-boost">{`攻 ${attack.attack} `}<b>▲{attack.bonus}</b>{`（卡面 ${attack.faceAttack}）`}</span>}<BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} />{attack && attack.bonus > 0 && <span className={picker.permanentBonus}>永久 +{attack.bonus} · 攻擊 {attack.attack}</span>}</span>;
  };
  const load = async (who: Owner, repick = false, reset = false) => {
    loadRetry.current = { who, repick, reset };
    setSaving(true);
    const result = reset ? await resetGuestCampaign() : readCampaign(who);
    setSaving(false);
    if (!result.ok || !result.profile) { setError(result.error || '暫時無法取得闖關進度，請重試。'); return; }
    const p = result.profile;
    setOwner(who); setProfile(p); setError(''); setTab('ALL');
    setCandidate(campaignHeroChoice(p) === 'milestone' ? p.heroId : null);
    setSelected(validateCampaignTeam(p, p.teamIds) ? [...p.teamIds] : p.heroId ? [p.heroId] : []);
    // PLAN-v2 A6：有未完成的闖關戰局就直接回戰場接回（不能先換隊、也不能開新局）；接回或作廢由 Match3Board 與伺服端紀錄決定。
    const pending = battleResumeEnabled() && hasPendingBattle(who);
    setPhase(pending ? 'battle' : campaignHeroChoice(p) !== 'locked' ? 'hero' : repick || !validateCampaignTeam(p, p.teamIds) ? 'team' : 'battle');
    setRevision(n => n + 1);
  };
  const home = <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>;
  if (!owner || !profile) return <section className={styles.picker} data-testid="match3-player-choice" aria-label="選擇遊玩身分">
    {home}<h1>寶珠戰</h1>
    <div className={picker.playerChoices}>
      <button type="button" data-testid="play-self" disabled={saving} onClick={() => load('self')}><strong>我自己</strong><span>開始或接續自己的闖關進度</span></button>
      <button type="button" data-testid="play-guest" disabled={saving} onClick={() => load('guest', false, !(battleResumeEnabled() && hasPendingBattle('guest')))}><strong>親朋好友</strong><span>從第一關開始，不影響我的進度</span></button>
    </div>{legacyAvailable && <button type="button" className={styles.again} data-testid="resume-legacy" disabled={saving} onClick={async () => {
      setSaving(true); const result = await importLegacyCampaign(); setSaving(false);
      if (!result.ok) { setError(result.error || '舊進度尚未儲存，請重試。'); return; }
      await load('self');
    }}>確認這是我的舊進度，接續闖關</button>}{error && <p role="alert">{error}</p>}<p className={styles.hint}>自己的進度保存在這個瀏覽器。</p>
  </section>;
  if (phase === 'battle') return <>
    <Match3Board key={revision} seed={seed} mode={mode} progressOwner={owner} campaignEnabled teamIds={profile.teamIds} onCampaignContinue={() => load(owner)} onRepick={() => load(owner, true)} onEnhance={() => { setFocusEnhance(true); void load(owner, true); }} />
    {error && <div ref={loadAlert} role="alert" tabIndex={-1} className={picker.enhancement} data-testid="campaign-load-error"><p>{error}</p><button type="button" data-testid="retry-campaign-load" disabled={saving} onClick={() => {
      const retry = loadRetry.current; if (retry) void load(retry.who, retry.repick, retry.reset);
    }}>重試讀取我的進度</button></div>}
  </>;
  const choice = campaignHeroChoice(profile);
  const changePlayer = <button type="button" className={styles.again} data-testid="change-player" disabled={saving} onClick={() => { setOwner(null); setProfile(null); setError(''); }}>更換玩家</button>;
  if (phase === 'hero') return <section className={styles.picker} data-testid="match3-hero-choice" aria-label="選擇主角">
    {home}{changePlayer}<h1>{choice === 'milestone' ? '保留或重新選擇主角' : '選擇你的四象主角'}</h1>
    <p className={styles.hint}>{choice === 'milestone' ? '通過第八關，可保留原主角或更換一次。確認後主角固定。' : profile.wins >= 8 ? '你的進度已通過第八關；這次選擇即使用唯一的重選機會，確認後主角固定。' : '主角占一個出戰位置。選定後固定，通過第八關可重新選擇一次。'}</p>
    {choice === 'milestone' && <p className={styles.hint}>永久強化留在原卡，不會轉移到新主角；原卡加成仍會保留。</p>}
    <div className={picker.cardGrid}>{pool.filter(c => c.id.startsWith('beast_g_')).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-hero" data-id={c.id} aria-pressed={candidate === c.id} onClick={() => setCandidate(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{candidate === c.id ? `已選 ${c.name}・請按下方確認` : profile.heroId === c.id ? '保留原主角' : `點選 ${c.name}`}</span>
    </button>)}</div>
    {error && <p role="alert">{error}</p>}
    <p className={picker.readyHint} role="status">{candidate ? `已選 ${pool.find(c => c.id === candidate)?.name}，請點下方按鈕確認，再選擇四位夥伴。` : '先點選一張主角卡，再按下方按鈕確認。'}</p>
    <div className={styles.pickBar}><button ref={confirmHeroButton} type="button" className={`${styles.again} ${candidate ? picker.readyStart : ''}`} data-testid="confirm-hero" disabled={!candidate || saving} onClick={async () => {
      if (!candidate) return;
      setSaving(true); const result = await selectCampaignHero(owner, candidate); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '主角尚未儲存，請重試。'); return; }
      setProfile(result.profile); setSelected(validateCampaignTeam(result.profile, result.profile.teamIds) ? [...result.profile.teamIds] : [candidate]); setPhase('team'); setError('');
    }}>{saving ? '正在儲存主角…' : candidate ? `點此確認 ${pool.find(c => c.id === candidate)?.name}，繼續選夥伴 →` : '請先點選一位主角'}</button></div>
  </section>;
  const allowed = campaignAvailableIds(profile);
  const collection = campaignCollection(profile);
  const shown = pool.filter(c => allowed.includes(c.id) && c.id !== profile.heroId && (tab === 'ALL' || c.element === tab));
  const LIST_PREVIEW = 6;
  const preview = <T extends { id: string }>(list: T[], all: boolean) => all ? list : list.filter((c, i) => i < LIST_PREVIEW || selected.includes(c.id));
  const moreButton = (total: number, all: boolean, set: (v: boolean) => void, label: string, testid: string) => total > LIST_PREVIEW && <button type="button" className={`${styles.again} ${picker.moreToggle}`} data-testid={testid} aria-expanded={all} onClick={() => set(!all)}>{all ? `收起${label}` : `顯示全部 ${total} 張${label}`}</button>;
  const battleAttack = (id: string) => campaignBattleStats(profile, [id])[0]?.attack ?? CARD_FACE_STATS[id].attack;
  const adultCards = shown.filter(c => collection.adults.some(a => a.cardId === c.id));
  const youngCards = shown.filter(c => collection.youngIds.includes(c.id));
  const toggle = (id: string) => { if (id !== profile.heroId && allowed.includes(id)) setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s); };
  // PLAN-v2 B8：一鍵推薦四位夥伴（先補齊不同屬性、同屬性取出戰攻擊高者），把四下點選縮成一下；玩家仍可再點卡調整。
  const recommend = () => {
    if (!profile.heroId) return;
    const hero = pool.find(c => c.id === profile.heroId);
    const candidates = allowed.filter(id => id !== profile.heroId).map(id => ({ id, el: pool.find(c => c.id === id)?.element, atk: campaignBattleStats(profile, [id])[0]?.attack ?? 0 })).sort((a, b) => b.atk - a.atk || (a.id < b.id ? -1 : 1));
    const picked: string[] = [], used = new Set([hero?.element]);
    for (const c of candidates) if (picked.length < 4 && !used.has(c.el)) { picked.push(c.id); used.add(c.el); }
    for (const c of candidates) if (picked.length < 4 && !picked.includes(c.id)) picked.push(c.id);
    setSelected([profile.heroId, ...picked]);
  };
  return <section className={styles.picker} data-testid="team-picker" aria-label="選擇主角的四位夥伴">
    {home}{changePlayer}<h1 ref={teamHeading} tabIndex={-1}>第二步：點選四位夥伴</h1>
    <div className={picker.companionGuide} role="status" aria-live="polite">
      <strong>{selected.length === 5 ? '四位夥伴已選齊！' : `已選 ${Math.max(0, selected.length - 1)}／4 位夥伴，還差 ${5 - selected.length} 位`}</strong>
      <p>{selected.length === 5 ? '請點畫面底部金色「點此開始作戰 →」按鈕，帶隊出發。' : '往下滑，點喜歡的卡片加入隊伍。主角已保留，不用再選。'}</p>
      <p>想換夥伴？再點一次已選卡片即可取消。</p>
    </div>
    <p className={styles.hint}>勝利獲得的成獸保存在這裡，也能加入隊伍。</p><h2 className={picker.sectionTitle}>主角與出戰隊伍</h2>
    <div className={picker.selectedRow} data-testid="picked-row" aria-label={`已選 ${selected.length} 張`}>{selected.map(id => <button type="button" key={id} className={picker.selectedCard} disabled={id === profile.heroId} aria-label={id === profile.heroId ? '固定主角' : `移除${pool.find(c => c.id === id)?.name}`} onClick={() => toggle(id)}>
      {face(id)}<span className={picker.remove}>{id === profile.heroId ? '主角・固定' : '移除夥伴'}</span>
    </button>)}</div>
    {selected.length < 5 && <button type="button" className={`${styles.again} ${picker.quickTeam}`} data-testid="recommend-team" disabled={saving} onClick={recommend}>一鍵推薦四位夥伴</button>}
    <CampaignEnhancement owner={owner} profile={profile} onSaved={updated => { setProfile(updated); setSelected(ids => ids.filter(id => campaignAvailableIds(updated).includes(id))); }} />
    <div className={styles.pickTabs}>{(['ALL', ...MATCH3_ORB_ELEMENTS] as const).map(e => <button type="button" key={e} aria-pressed={tab === e} onClick={() => setTab(e)}>{e === 'ALL' ? '全部' : MATCH3_ORB_LABEL[e]}</button>)}</div>
    <h2 className={picker.sectionTitle}>已獲成獸</h2>{collection.adults.length === 0 && <p className={styles.hint}>贏得第一場，即可獲得第一張成獸卡。</p>}<div className={picker.cardGrid}>{preview(adultCards, showAllAdults).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，出戰攻擊 ${battleAttack(c.id)}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{`已獲 ${collection.adults.find(a => a.cardId === c.id)?.count ?? 0} 張 · ${selected.includes(c.id) ? '已選夥伴' : '點選出戰'}`}</span>
    </button>)}</div>
    {moreButton(adultCards.length, showAllAdults, setShowAllAdults, '成獸', 'show-all-adults')}
    {owner === 'self' && <CampaignBackup onImported={() => { void load('self', true); }} />}
    <h2 className={picker.sectionTitle}>幼子夥伴</h2><p className={styles.hint}>尚未消耗的幼子可自由挑選。</p>
    <div className={picker.cardGrid}>{preview(youngCards, showAllYoung).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，出戰攻擊 ${battleAttack(c.id)}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{selected.includes(c.id) ? '已選夥伴' : '點選出戰'}</span>
    </button>)}</div>
    {moreButton(youngCards.length, showAllYoung, setShowAllYoung, '幼子', 'show-all-young')}
    {error && <p role="alert">{error}</p>}
    {selected.length === 5 && <p className={picker.readyHint} role="status" data-testid="team-ready-hint">隊伍已就緒，點此開始作戰</p>}
    <div className={picker.startDock} data-testid="start-bar"><div className={`${styles.pickBar} ${picker.startDockInner}`}><button ref={startButton} type="button" className={`${styles.again} ${selected.length === 5 ? picker.readyStart : ''}`} data-testid="start-battle" disabled={!validateCampaignTeam(profile, selected) || saving} onClick={async () => {
      setSaving(true); const result = await saveCampaignTeam(owner, selected); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '隊伍尚未儲存，請重試。'); return; }
      setProfile(result.profile); setError(''); setRevision(n => n + 1); setPhase('battle');
    }}>{saving ? '正在儲存隊伍…' : selected.length === 5 ? '點此開始作戰 →' : `請再點選 ${5 - selected.length} 位夥伴`}</button></div></div>
  </section>;
}
