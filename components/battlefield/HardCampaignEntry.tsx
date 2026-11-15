'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { CARD_FACE_STATS } from '@/lib/beast-game/card-face-stats';
import { getSkill } from '@/cards/skills';
import { MATCH3_ORB_ELEMENTS, MATCH3_ORB_LABEL, type Match3ModeId } from '@/lib/beast-game/match3';
import { guardianOf } from '@/lib/beast-guardians';
import { GUARDIAN_SHORT } from '@/lib/beast-game/match3/guardian-fusion';
import type { BeastElement } from '@/lib/beast-game/elements';
import { readLegacyCampaignStatus, importLegacyCampaign, readCampaign, selectCampaignHero, saveCampaignTeam, resetGuestCampaign } from '@/lib/beast-game/match3/hard-campaign-store';
import { campaignHeroChoice, campaignAvailableIds, campaignCollection, campaignCardAttack, validateCampaignTeam } from '@/lib/beast-game/match3/hard-campaign';
import { BeastCardFace } from './BeastCardTile';
import Match3Board from './Match3Board';
import CampaignEnhancement from './CampaignEnhancement';
import SharedCultivationPanel from './SharedCultivationPanel';
import { syncSharedCultivation, sharedRequest } from '@/lib/beast-cultivation-client';
import { refreshSharedCampaign, inspectCampaignSave, repairUnreadableCampaign, UNREADABLE_BACKUP_SUFFIX, adoptServerCampaign, rawCampaignSave, type CampaignMismatch } from '@/lib/beast-game/match3/hard-campaign-store';
import CampaignBackup from './CampaignBackup';
import styles from './Match3Board.module.css';
import picker from './Match3TeamPicker.module.css';
import EnhanceAura from './EnhanceAura';
import aura from './EnhanceAura.module.css';

type Owner = 'self' | 'guest';
/** 同一分頁重新整理後自動接回上次的玩家身分（只存在 sessionStorage，關閉分頁即清除）。 */
const LAST_OWNER_KEY = 'm3-campaign-last-owner';
const rememberOwner = (who: Owner | null) => { try { if (who) window.sessionStorage.setItem(LAST_OWNER_KEY, who); else window.sessionStorage.removeItem(LAST_OWNER_KEY); } catch { /* 無法記住只代表要再點一次 */ } };
type Profile = NonNullable<ReturnType<typeof readCampaign>['profile']>;
export default function HardCampaignEntry({ seed, mode }: { seed?: number; mode?: Match3ModeId }) {
  const pool = useMemo(() => playableCards().filter(c => CARD_FACE_STATS[c.id]), []);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<'hero' | 'team' | 'battle'>('hero');
  const [candidate, setCandidate] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [ownedEntries,setOwnedEntries]=useState<Record<string,string>>({});
  const [cultivationOpen,setCultivationOpen]=useState(false);
  const [previousOrb,setPreviousOrb]=useState<string|null>(null);
  const [tab, setTab] = useState<BeastElement | 'ALL'>('ALL');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [unreadable, setUnreadable] = useState<Owner | null>(null);
  const [confirmRepair, setConfirmRepair] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [resumeNotice, setResumeNotice] = useState('');
  const [mismatch, setMismatch] = useState<CampaignMismatch | null>(null);
  const [cardPending, setCardPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [keptLocal, setKeptLocal] = useState(false);
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
  useEffect(() => {
    const becameReady = previousCount.current < 5 && selected.length === 5;
    previousCount.current = selected.length;
    if (phase === 'team' && becameReady) {
      startButton.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [selected.length, phase]);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  useEffect(() => { setLegacyAvailable(readLegacyCampaignStatus().canImport); }, [owner]);
  const face = (id: string) => {
    const c = pool.find(card => card.id === id)!;
    const skill = getSkill(c.skills[0]);
    // 已指定出戰副本就用那一張；沒指定就用這種神獸「最強的一張」照印（數字全是後端給的，這裡只比大小挑代表）。
    const strongest=profile?.shared?.cards.filter(c=>c.cardId===id).sort((x,y)=>{try{const d=BigInt(y.bonus)-BigInt(x.bonus);return d>0n?1:d<0n?-1:0;}catch{return 0;}})[0];
    const owned=profile?.shared?.cards.find(c=>c.id===ownedEntries[id])??strongest;
    const attack = owned ? {bonus:owned.bonus,attack:owned.orbAttack} : profile ? campaignCardAttack(profile, id) : null;
    // 光環只讀既有加成顯示階級，不改數值。
    const enh = owned ? { bonus: Number(owned.bonus), baseAttack: Number(owned.orbAttack) - Number(owned.bonus) } : attack && 'baseAttack' in attack ? { bonus: Number(attack.bonus), baseAttack: attack.baseAttack } : null;
    const enhanced = !!enh && enh.bonus > 0;
    return <span className={picker.face}><span className={aura.host} data-enhanced={enhanced ? 'true' : undefined}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description, attackOverride: attack && String(attack.bonus)!=='0' ? String(attack.attack) : undefined }} />{enhanced && enh && <EnhanceAura bonus={enh.bonus} baseAttack={enh.baseAttack} />}</span>{attack && String(attack.bonus)!=='0' && <b className={picker.permanentBonus} data-fused-badge>已合體 +{attack.bonus}</b>}</span>;
  };
  const load = async (who: Owner, repick = false, reset = false, autoReplay = false) => {
    loadRetry.current = { who, repick, reset };
    setInterrupted(false); setMismatch(null); setCardPending(false); setKeptLocal(false);
    setSaving(true);
    let result:Awaited<ReturnType<typeof refreshSharedCampaign>>;
    try {
      if(who==='self'){
        const shared=await syncSharedCultivation();
        // 重新整理自動接回：中斷的寶珠戰直接放掉暫扣、同隊從這一關重打（與「重打這一關」按鈕同一個動作），並在戰鬥畫面提示原因。
        if(autoReplay&&shared.pendingBattle?.startsWith('orb:')){const pb=shared.pendingBattle;try{await sharedRequest({type:'RELEASE',battleId:pb});}catch{setPreviousOrb(pb);setInterrupted(true);throw new Error('上一場寶珠戰因重新整理中斷，自動重開這一關沒有成功（網路或伺服器暫時沒回應）。你的關卡進度、收藏與永久強化都還在，請按「重打這一關」再試一次。');}}
        else if(shared.pendingBattle){const orb=shared.pendingBattle.startsWith('orb:');setPreviousOrb(orb?shared.pendingBattle:null);setInterrupted(orb);setCardPending(!orb);throw new Error(orb?'上一場寶珠戰在重新整理或離開頁面時中斷了，無法從中途接續。你的關卡進度、收藏與永久強化都還在；按「重打這一關」會用同一隊從這一關開頭重新開始，不扣任何卡。':'神獸卡片戰鬥還有一場沒結算，卡片暫時保留在那一場。請先按下方按鈕回去完成結算，再回來寶珠戰。');}
        result=await refreshSharedCampaign();
      }else result=reset?await resetGuestCampaign():readCampaign(who);
    }catch(e){setSaving(false);setUnreadable(inspectCampaignSave(who).unreadable?who:null);setError(e instanceof Error?e.message:'暫時無法讀取共同卡庫。');return;}
    setSaving(false);
    if (!result.ok || !result.profile) { setMismatch(result.mismatch ?? null); setUnreadable(result.mismatch ? null : inspectCampaignSave(who).unreadable?who:null); setError(result.error || '暫時無法取得闖關進度，請重試。'); return; }
    setNotice(result.notice ?? '');
    rememberOwner(who); setUnreadable(null); setConfirmRepair(false); setInterrupted(false);
    const p = result.profile;
    const willBattle = campaignHeroChoice(p) === 'locked' && !repick && validateCampaignTeam(p, p.teamIds);
    if (!autoReplay && willBattle && result.notice) setResumeNotice(result.notice); else setResumeNotice(autoReplay && willBattle ? (who === 'self' ? '剛才的寶珠戰因重新整理中斷，無法從中途接續；已用同一隊從這一關開頭重新開始。關卡進度、收藏與永久強化都還在，沒有扣卡。' : '剛才的寶珠戰因重新整理中斷，已從這一關重新開始；親友這一輪的進度還在。') : '');
    setOwnedEntries(p.ownedEntries??{});setPreviousOrb(null);
    setOwner(who); setProfile(p); setError(''); setTab('ALL');
    setCandidate(campaignHeroChoice(p) === 'milestone' ? p.heroId : null);
    setSelected(validateCampaignTeam(p, p.teamIds) ? [...p.teamIds] : p.heroId ? [p.heroId] : []);
    setPhase(campaignHeroChoice(p) !== 'locked' ? 'hero' : repick || !validateCampaignTeam(p, p.teamIds) ? 'team' : 'battle');
    setRevision(n => n + 1);
  };
  // 重新整理後：同一分頁記得上次是誰在玩，直接接回，不必再點一次「我自己」。親友進度存在本分頁，不重設。
  const autoResumed = useRef(false);
  useEffect(() => {
    if (autoResumed.current) return; autoResumed.current = true;
    let last: string | null = null; try { last = window.sessionStorage.getItem(LAST_OWNER_KEY); } catch { /* ignore */ }
    if (last === 'self' || last === 'guest') void load(last, false, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const downloadRaw = (raw: string | null | undefined, name: string) => {
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const downloadUnreadable = (who: Owner) => {
    const raw = inspectCampaignSave(who).raw; if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `寶珠存檔-讀不懂的原檔-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const repair = async (who: Owner) => {
    setSaving(true); const r = await repairUnreadableCampaign(who); setSaving(false);
    if (!r.ok) { setError(r.error || '修復尚未完成，原存檔沒有更動，請重試。'); return; }
    setConfirmRepair(false); setUnreadable(null); await load(who, true, false);
  };
  const home = <Link href="/" className={styles.homeLink} data-testid="match3-home">回到首頁</Link>;
  if (!owner || !profile) return <section className={styles.picker} data-testid="match3-player-choice" aria-label="選擇遊玩身分">
    {home}<h1>寶珠戰</h1>
    <div className={picker.playerChoices}>
      <button type="button" data-testid="play-self" disabled={saving} onClick={() => load('self')}><strong>我自己</strong><span>開始或接續自己的闖關進度</span></button>
      <button type="button" data-testid="play-guest" disabled={saving} onClick={() => load('guest', false, true)}><strong>親朋好友</strong><span>從第一關開始，不影響我的進度</span></button>
    </div><CampaignBackup onImported={() => { setError(''); void load('self'); }} />{previousOrb&&<div className={picker.recovery} data-testid="orb-interrupted" role="group" aria-label="上一場寶珠戰已中斷"><button type="button" className={picker.recoveryPrimary} data-testid="orb-replay-stage" data-release-orb disabled={saving} onClick={async()=>{try{setSaving(true);await sharedRequest({type:'RELEASE',battleId:previousOrb});setPreviousOrb(null);setSaving(false);await load('self');}catch(e){setSaving(false);setError(e instanceof Error?e.message:'暫時無法離開原戰鬥，請重試。');}}}>{saving?'正在準備這一關…':'重打這一關（隊伍不變）'}</button><button type="button" className={styles.again} data-testid="orb-release-repick" disabled={saving} onClick={async()=>{try{setSaving(true);await sharedRequest({type:'RELEASE',battleId:previousOrb});setPreviousOrb(null);setSaving(false);await load('self',true);}catch(e){setSaving(false);setError(e instanceof Error?e.message:'暫時無法離開原戰鬥，請重試。');}}}>重新選卡再打</button></div>}{legacyAvailable && <button type="button" className={styles.again} data-testid="resume-legacy" disabled={saving} onClick={async () => {
      setSaving(true); const result = await importLegacyCampaign(); setSaving(false);
      if (!result.ok) { setError(result.error || '舊進度尚未儲存，請重試。'); return; }
      await load('self');
    }}>確認這是我的舊進度，接續闖關</button>}{error && <p role="alert" data-testid="campaign-choice-error" data-interrupted={interrupted ? 'true' : undefined}>{unreadable ? `這個瀏覽器裡的寶珠存檔讀不懂（${error}）。這不是你操作錯誤，原檔還在，沒有被刪除。` : error}</p>}
    {unreadable && <div className={picker.recovery} data-testid="campaign-unreadable" role="group" aria-label="修復寶珠存檔">
      <p className={styles.hint}>修復不會刪除存檔：會先把原檔另存備份（{UNREADABLE_BACKUP_SUFFIX.slice(1)}＋時間戳記備份），再保留還讀得懂的部分（關卡、主角、獎卡、寶器）。{unreadable === 'self' ? '已接通共同卡庫時，勝場與獎卡仍以共同卡庫的紀錄為準。' : '親友進度只存在這個分頁。'}</p>
      <button type="button" className={styles.again} data-testid="download-unreadable" disabled={saving} onClick={() => downloadUnreadable(unreadable)}>先下載原存檔</button>
      {confirmRepair ? <button type="button" className={picker.recoveryPrimary} data-testid="confirm-repair" disabled={saving} onClick={() => void repair(unreadable)}>{saving ? '正在修復…' : '確定修復並重新讀取'}</button> : <button type="button" className={picker.recoveryPrimary} data-testid="repair-save" disabled={saving} onClick={() => setConfirmRepair(true)}>修復存檔</button>}
    </div>}
    {mismatch && <div className={picker.recovery} data-testid="campaign-mismatch" role="group" aria-label="寶珠存檔和共同卡庫紀錄不一樣">
      <p className={styles.hint}>「以伺服器為準」：本機存檔會先存一份時間戳記備份，再改用共同卡庫已確認的第 {mismatch.serverWins} 關繼續。「保留本機備份」：下載這個瀏覽器的存檔檔案，什麼都不改。</p>
      <button type="button" className={picker.recoveryPrimary} data-testid="mismatch-use-server" disabled={saving} onClick={async () => { setSaving(true); const r = await adoptServerCampaign(); setSaving(false); if (!r.ok) { setError(r.error || '還沒切換成功，存檔沒有變更，請重試。'); return; } setMismatch(null); await load('self'); }}>{saving ? '正在切換…' : `以伺服器為準（第 ${mismatch.serverWins} 關）`}</button>
      <button type="button" className={styles.again} data-testid="mismatch-keep-local" disabled={saving} onClick={() => { downloadRaw(rawCampaignSave('self'), '寶珠存檔-本機備份'); setKeptLocal(true); }}>保留本機備份（下載存檔）</button>
      {keptLocal && <p className={styles.hint} role="status" data-testid="mismatch-kept">已下載本機存檔，這個瀏覽器的存檔沒有任何變更。需要時可到「存檔備份」匯入，或聯絡客服協助比對。</p>}
    </div>}
    {cardPending && <Link href="/beast-game/battlefield" className={picker.recoveryPrimary} data-testid="go-card-settle">回神獸卡片戰鬥完成結算</Link>}
    {saving && !error && <p className={styles.hint} role="status" data-testid="campaign-loading">正在讀取你的進度…</p>}<p className={styles.hint}>自己的進度存在共同卡庫，靠這個瀏覽器裡的卡庫識別碼找回；換手機或清除網站資料前，請先到「存檔備份」記下識別碼。</p>
  </section>;
  if (phase === 'battle') return <>
    <Match3Board key={revision} seed={seed} mode={mode} progressOwner={owner} campaignEnabled teamIds={profile.teamIds} onCampaignContinue={() => { setResumeNotice(''); void load(owner); }} onRepick={() => { setResumeNotice(''); void load(owner, true); }} />
    {resumeNotice && <p role="status" className={picker.resumeNotice} data-testid="resume-notice" onAnimationEnd={() => setResumeNotice('')}>{resumeNotice}</p>}
    {error && <div ref={loadAlert} role="alert" tabIndex={-1} className={picker.enhancement} data-testid="campaign-load-error"><p>{error}</p><button type="button" data-testid="retry-campaign-load" disabled={saving} onClick={() => {
      const retry = loadRetry.current; if (retry) void load(retry.who, retry.repick, retry.reset);
    }}>重試讀取我的進度</button></div>}
  </>;
  const choice = campaignHeroChoice(profile);
  const changePlayer = <button type="button" className={styles.again} data-testid="change-player" disabled={saving} onClick={() => { rememberOwner(null); setOwner(null); setProfile(null); setError(''); }}>更換玩家</button>;
  if (phase === 'hero') return <section className={`${styles.picker} ${picker.stickyHost}`} data-testid="match3-hero-choice" aria-label="選擇主角">
    {home}{changePlayer}<h1>{choice === 'milestone' ? '保留或重新選擇主角' : '選擇你的四象主角'}</h1>{notice && <p className={styles.hint} role="status" data-testid="campaign-notice">{notice}</p>}
    <p className={styles.hint}>{choice === 'milestone' ? '通過第八關，可保留原主角或更換一次。確認後主角固定。' : profile.wins >= 8 ? '你的進度已通過第八關；這次選擇即使用唯一的重選機會，確認後主角固定。' : '主角占一個出戰位置。選定後固定，通過第八關可重新選擇一次。'}</p>
    {choice === 'milestone' && <p className={styles.hint}>永久強化留在原卡，不會轉移到新主角；原卡加成仍會保留。</p>}
    <div className={picker.cardGrid}>{pool.filter(c => c.id.startsWith('beast_g_')).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-hero" data-id={c.id} aria-pressed={candidate === c.id} onClick={() => setCandidate(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{candidate === c.id ? `已選 ${c.name}・請按下方確認` : profile.heroId === c.id ? '保留原主角' : `點選 ${c.name}`}</span>
    </button>)}</div>
    {error && <p role="alert">{error}</p>}
    <p className={picker.readyHint} role="status">{candidate ? `已選 ${pool.find(c => c.id === candidate)?.name}，請點下方按鈕確認，再選擇四位夥伴。` : '先點選一張主角卡，再按下方按鈕確認。'}</p>
    <div className={`${styles.pickBar} ${picker.stickyStart}`}><button ref={confirmHeroButton} type="button" className={`${styles.again} ${candidate ? picker.readyStart : ''}`} data-testid="confirm-hero" disabled={!candidate || saving} onClick={async () => {
      if (!candidate) return;
      setSaving(true); const result = await selectCampaignHero(owner, candidate); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '主角尚未儲存，請重試。'); return; }
      setProfile(result.profile); setSelected(validateCampaignTeam(result.profile, result.profile.teamIds) ? [...result.profile.teamIds] : [candidate]); setPhase('team'); setError('');
    }}>{saving ? '正在儲存主角…' : candidate ? `點此確認 ${pool.find(c => c.id === candidate)?.name}，繼續選夥伴 →` : '請先點選一位主角'}</button></div>
  </section>;
  const allowed = campaignAvailableIds(profile);
  const collection = campaignCollection(profile);
  const shown = pool.filter(c => allowed.includes(c.id) && c.id !== profile.heroId && (tab === 'ALL' || c.element === tab));
  // 四象合體提示：與主角同一象的星宿標「白虎宿」，選進隊伍才有機會在戰場上合體（只是標示，不改選卡規則）。
  const heroGuardian = profile.heroId ? guardianOf(profile.heroId) : null;
  const kin = (id: string) => heroGuardian && guardianOf(id)?.key === heroGuardian.key ? `${GUARDIAN_SHORT[heroGuardian.key]}宿・` : '';
  const toggle = (id: string) => { if (id !== profile.heroId && allowed.includes(id)) setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s); };
  return <section className={`${styles.picker} ${picker.stickyHost}`} data-testid="team-picker" aria-label="選擇主角的四位夥伴">
    {home}{changePlayer}<h1 ref={teamHeading} tabIndex={-1}>第二步：點選四位夥伴</h1>{notice && <p className={styles.hint} role="status" data-testid="campaign-notice">{notice}</p>}
    <div className={picker.companionGuide} role="status" aria-live="polite">
      <strong>{selected.length === 5 ? '四位夥伴已選齊！' : `已選 ${Math.max(0, selected.length - 1)}／4 位夥伴，還差 ${5 - selected.length} 位`}</strong>
      <p>{selected.length === 5 ? '請點下方金色「開始作戰」按鈕，帶隊出發。' : '往下滑，點喜歡的卡片加入隊伍。主角已保留，不用再選。'}</p>
      <p>想換夥伴？再點一次已選卡片即可取消。</p>
    </div>
    <p className={styles.hint}>勝利獲得的成獸保存在這裡，也能加入隊伍。</p><h2 className={picker.sectionTitle}>主角與出戰隊伍</h2>
    <div className={picker.selectedRow} data-testid="picked-row" aria-label={`已選 ${selected.length} 張`}>{selected.map(id => <button type="button" key={id} className={picker.selectedCard} disabled={id === profile.heroId} aria-label={id === profile.heroId ? '固定主角' : `移除${pool.find(c => c.id === id)?.name}`} onClick={() => toggle(id)}>
      {face(id)}<span className={picker.remove}>{id === profile.heroId ? '主角・固定' : '移除夥伴'}</span>
    </button>)}</div>
    <div className={styles.pickTabs}>{(['ALL', ...MATCH3_ORB_ELEMENTS] as const).map(e => <button type="button" key={e} aria-pressed={tab === e} onClick={() => setTab(e)}>{e === 'ALL' ? '全部' : MATCH3_ORB_LABEL[e]}</button>)}</div>
    <h2 className={picker.sectionTitle}>已獲成獸</h2>{collection.adults.length === 0 && <p className={styles.hint}>贏得第一場，即可獲得第一張成獸卡。</p>}<div className={picker.cardGrid}>{shown.filter(c => collection.adults.some(a => a.cardId === c.id)).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，攻擊 ${CARD_FACE_STATS[c.id].attack}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState}>{kin(c.id)}已獲 {collection.adults.find(a => a.cardId === c.id)?.count} 張 · {selected.includes(c.id) ? '已選夥伴' : '點選出戰'}</span>
    </button>)}</div>
    {owner === 'self' && <CampaignBackup onImported={() => { void load('self', true); }} />}
    {owner==='self'?<><button type="button" className={styles.again} data-open-shared-cultivation onClick={()=>setCultivationOpen(v=>!v)}>共同神獸卡庫・合體培養</button>{cultivationOpen&&<SharedCultivationPanel onSaved={()=>{void refreshSharedCampaign().then(result=>{if(result.profile){setProfile(result.profile);setOwnedEntries(result.profile.ownedEntries??{});}});}} onDone={()=>setCultivationOpen(false)}/>}</>:<p className={styles.hint}>親友試用牌不會消耗，也不影響自己的收藏。</p>}
    {owner==='self'&&profile.shared&&<section aria-label="選擇實際出戰副本"><h2>出戰副本</h2><p>同一種神獸有多張收藏時，請指定本場使用哪張。免費牌標示為試用。</p>{selected.map(id=>{
      const copies=profile.shared!.cards.filter(c=>c.cardId===id),trial=id===profile.heroId||(pool.find(c=>c.id===id)?.form==='YOUNG'&&!profile.consumedYoungIds?.includes(id));
      return <label key={id} style={{display:'block',margin:'12px 0'}}>{pool.find(c=>c.id===id)?.name}<select data-orb-owned-copy={id} aria-label={`${pool.find(c=>c.id===id)?.name}出戰副本`} value={ownedEntries[id]??''} onChange={e=>setOwnedEntries(old=>({...old,[id]:e.target.value}))} style={{display:'block',minHeight:48,maxWidth:'100%',background:'#0f172a',color:'#fff7ed',border:'1px solid #bca777',borderRadius:8,padding:8}}><option value="" disabled={!trial}>{trial?'免費試用牌':'請選收藏副本'}</option>{copies.map((c,i)=><option key={c.id} value={c.id}>收藏第 {i+1} 份・永久 +{c.bonus}・攻擊 {c.orbAttack}</option>)}</select></label>;
    })}</section>}
    <h2 className={picker.sectionTitle}>幼子夥伴</h2><p className={styles.hint}>尚未消耗的幼子可自由挑選。</p>
    <div className={picker.cardGrid}>{shown.filter(c => collection.youngIds.includes(c.id)).map(c => <button type="button" className={picker.cardChoice} key={c.id} data-testid="pick-card" data-id={c.id} data-el={c.element} aria-label={`${c.name}，攻擊 ${CARD_FACE_STATS[c.id].attack}`} aria-pressed={selected.includes(c.id)} onClick={() => toggle(c.id)}>
      {face(c.id)}<span className={picker.choiceState} data-guardian-kin={kin(c.id) ? heroGuardian?.key : undefined}>{kin(c.id)}{selected.includes(c.id) ? '已選夥伴' : '點選出戰'}</span>
    </button>)}</div>
    {error && <p role="alert">{error}</p>}
    {selected.length === 5 && <p className={picker.readyHint} role="status" data-testid="team-ready-hint">隊伍已就緒，點此開始作戰</p>}
    <div className={`${styles.pickBar} ${picker.stickyStart}`} data-testid="start-bar"><button ref={startButton} type="button" className={`${styles.again} ${selected.length === 5 ? picker.readyStart : ''}`} data-testid="start-battle" disabled={!validateCampaignTeam(profile, selected) || saving} onClick={async () => {
      setSaving(true); const result = await saveCampaignTeam(owner, selected,ownedEntries); setSaving(false);
      if (!result.ok || !result.profile) { setError(result.error || '隊伍尚未儲存，請重試。'); return; }
      setProfile(result.profile); setError(''); setRevision(n => n + 1); setPhase('battle');
    }}>{saving ? '正在儲存隊伍…' : selected.length === 5 ? '點此開始作戰 →' : `請再點選 ${5 - selected.length} 位夥伴`}</button></div>
  </section>;
}
