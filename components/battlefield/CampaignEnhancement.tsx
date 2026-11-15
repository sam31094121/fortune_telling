'use client';
import { useEffect, useRef, useState } from 'react';
import { playableCards } from '@/lib/beast-game/registry';
import { getSkill } from '@/cards/skills';
import { enhancementReceiptDisplay, campaignCardAttack, enhancementUnlocked, enhancementOptions, enhancementUnlockProgress, previewCampaignEnhancement, type HardCampaign } from '@/lib/beast-game/match3/hard-campaign';
import { enhanceCampaign, feedCampaignChain, feedCampaignToCap, readCampaignSnapshot, type CampaignOwner } from '@/lib/beast-game/match3/hard-campaign-store';
import { campaignBattleStats, feedPool, planFeedToCap, previewFeed, readFeedChainState, type FeedToCapPlan } from '@/lib/beast-game/match3/feed-chain';
import { feedChainEnabled } from '@/lib/beast-game/match3/merge-balance';
import { BeastCardFace } from './BeastCardTile';
import styles from './Match3TeamPicker.module.css';

type Preview = { allowed: boolean; reason?: string; baseAttack: number; currentBonus: number; attackBonus: number; afterAttack: number; maxBonus: number; full: boolean; overCap: boolean; remaining: number; kind?: string | null };
/** 開關開啟時，強化數字一律走餵食鏈的同一套規則（previewFeed）；關閉時沿用舊的幼子強化（previewCampaignEnhancement）。 */
function previewFor(profile: HardCampaign, materialRef: string, target: string, chain: boolean): Preview {
  if (!chain) { const pv = previewCampaignEnhancement(profile, materialRef.replace(/^young:/, ''), target); return { ...pv, kind: 'YOUNG_TO_TARGET' }; }
  const pv = previewFeed(profile, materialRef, target, { enabled: true, inBattle: false });
  const baseAttack = campaignBattleStats(profile, [target], true)[0]?.faceAttack ?? 0, cur = pv.before.attack - baseAttack, full = cur >= pv.maxBonus;
  const overCap = pv.reasons.includes('ATTACK_CAP');
  const reason = full ? `已滿（${pv.before.attack}／${baseAttack + pv.maxBonus}），不能再強化` : overCap ? `這張 +${pv.attackBonus} 會超過上限（只差 ${pv.maxBonus - cur} 點），請改選加成較小的材料` : pv.reasonText;
  return { allowed: pv.allowed, reason, baseAttack, currentBonus: Math.min(cur, pv.maxBonus), attackBonus: overCap ? 0 : pv.attackBonus, afterAttack: overCap ? pv.before.attack : pv.after.attack, maxBonus: pv.maxBonus, full, overCap, remaining: Math.max(0, pv.maxBonus - cur), kind: pv.kind };
}
const KIND_TEXT: Record<string, string> = { YOUNG_TO_TARGET: '幼子', ADULT_TO_GUARDIAN: '本體→四大神獸', RESONANCE: '同卡共鳴格' };

export default function CampaignEnhancement({ owner, profile, onSaved }: { owner: CampaignOwner; profile: HardCampaign; onSaved: (profile: HardCampaign) => void }) {
  const chain = feedChainEnabled();
  const [target, setTarget] = useState('');
  const [young, setYoung] = useState('');
  const [chosenCardId, setChosenCardId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<FeedToCapPlan | null>(null);
  const [absorption, setAbsorption] = useState<{ preview: Preview; done: boolean; beforeAttack: number | null; afterAttack: number; attackBonus: number | null } | null>(null);
  const operation = useRef<string | null>(null);
  const snapshot = useRef<string | null>(null);
  const mounted = useRef(true);
  const closeup = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (absorption) closeup.current?.focus({ preventScroll: true });
  }, [absorption]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!absorption || absorption.done) return;
    const timer = window.setTimeout(() => {
      setAbsorption({ ...absorption, done: true }); setBusy(false);
      setMessage(absorption.preview.kind === 'RESONANCE' ? '已放進共鳴格，永久加成已儲存。' : absorption.preview.kind === 'ADULT_TO_GUARDIAN' ? '本體已融入四大神獸，永久加成已儲存。' : '幼子已融入，永久加成已儲存。');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 1800);
    return () => window.clearTimeout(timer);
  }, [absorption]);
  const options = enhancementOptions(profile);
  const pool = playableCards();
  const attackOf = (id: string) => chain ? campaignBattleStats(profile, [id], true)[0] : (() => { const a = campaignCardAttack(profile, id); return { attack: a.attack, faceAttack: a.baseAttack, bonus: a.bonus, cap: Math.floor(a.baseAttack * .5) }; })();
  // 材料清單：開關關閉＝未出戰幼子；開關開啟＝待餵區（只收寶珠闖關結算的獎勵卡）＋幼子，每種卡只列一張並標 ×N。
  const materials: { ref: string; cardId: string; count: number }[] = (() => {
    if (!chain) return options.youngIds.map(id => ({ ref: 'young:' + id, cardId: id, count: 1 }));
    const state = readFeedChainState(profile, true); if (!state.ok) return [];
    const seen = new Map<string, { ref: string; cardId: string; count: number }>();
    for (const u of feedPool(profile, state)) {
      if (u.source !== 'YOUNG' && u.source !== 'REWARD') continue;
      if (u.source === 'YOUNG' && profile.teamIds.includes(u.cardId)) continue;
      const key = u.source + u.cardId, have = seen.get(key);
      if (have) have.count++; else seen.set(key, { ref: u.ref, cardId: u.cardId, count: 1 });
    }
    return [...seen.values()];
  })();
  const material = young;
  const materialCardId = chosenCardId || material.replace(/^young:/, '');
  const preview = absorption?.preview ?? (target && material ? previewFor(profile, material, target, chain) : null);
  const beforeAttack = absorption ? absorption.beforeAttack : (target ? attackOf(target).attack : 0);
  const card = (id: string) => pool.find(c => c.id === id);
  const face = (id: string) => {
    const c = card(id); if (!c) return null;
    const skill = getSkill(c.skills[0]);
    return <span className={styles.face}><BeastCardFace card={{ id: c.id, name: c.name, element: c.element, thumbnail: c.art.thumbnail, skillName: skill?.name, description: skill?.description }} /></span>;
  };
  const status = enhancementUnlockProgress(profile);
  if (!enhancementUnlocked(profile)) return <section className={styles.enhancement} data-testid="enhancement-locked" aria-label="永久強化尚未解鎖">
    <p className={styles.unlockText}>{`再贏 ${status.winsRemaining} 場解鎖永久強化（第五關起）`}</p>
    <div className={styles.unlockBar} role="progressbar" aria-label="永久強化解鎖進度" aria-valuemin={0} aria-valuemax={status.requiredWins} aria-valuenow={status.wins}><span style={{ width: `${Math.round(status.wins / status.requiredWins * 100)}%` }} /></div>
    <p className={styles.unlockSub}>{`${status.wins}／${status.requiredWins} 勝・每贏一場會拿到一張成獸，解鎖後可以把幼子或重複卡吃進主角，變強會直接帶進下一關。`}</p>
  </section>;
  const targetIds = options.targetIds;
  const pickTarget = (id: string) => { setTarget(id); setYoung(''); setPlan(null); operation.current = null; setMessage(''); };
  const choose = (ref: string, cardId: string) => { setYoung(ref); setChosenCardId(cardId); setPlan(null); operation.current = null; snapshot.current = readCampaignSnapshot(owner); setMessage(''); };
  return <section className={styles.enhancement} data-testid="campaign-enhancement" aria-label="永久強化" id="campaign-enhancement">
    <h3 className={styles.enhancementStep}>永久強化</h3>
    {!target && <section aria-label="選擇要強化的神獸">
      <h3 className={styles.enhancementStep}>① 選神獸</h3>
      <div className={styles.enhancementChoices}>{targetIds.map(id => { const a = attackOf(id), full = a.attack >= a.faceAttack + a.cap; return <button type="button" key={id} className={styles.enhancementCard} data-testid="enhance-target" data-id={id} disabled={busy} aria-label={`強化${card(id)?.name}，攻擊 ${a.attack}／上限 ${a.faceAttack + a.cap}`} onClick={() => pickTarget(id)}>{face(id)}<span className={full ? styles.capFull : styles.capLine} data-testid="enhance-target-cap">{full ? `已滿 ${a.attack}／${a.faceAttack + a.cap}` : `攻 ${a.attack}／上限 ${a.faceAttack + a.cap}`}</span></button>; })}</div>
    </section>}
    {target && !material && !plan && <section aria-label="選擇融入的材料">
      <div className={styles.enhancementStepBar}><h3 className={styles.enhancementStep}>② 選材料</h3><button type="button" className={styles.enhancementBack} disabled={busy} onClick={() => { setTarget(''); operation.current = null; setMessage(''); }}>重選神獸</button></div>
      <div className={styles.enhancementChosen}>{face(target)}</div>
      {(() => { const a = attackOf(target), cap = a.faceAttack + a.cap; return <p className={styles.capSummary} data-testid="enhance-cap-summary">{a.attack >= cap ? `已滿（${a.attack}／${cap}）` : `攻擊 ${a.attack}／上限 ${cap}，還能加 ${cap - a.attack} 點`}</p>; })()}
      <button type="button" className={styles.feedAll} data-testid="feed-to-cap" disabled={busy} onClick={() => { const pl = planFeedToCap(profile, target, { enabled: chain }); setPlan(pl); operation.current = null; setMessage(pl.steps.length ? '' : (pl.reason ?? '')); }}>一鍵吃到封頂（先看預覽）</button>
      <div className={styles.enhancementChoices}>{materials.map(m => { const pv = previewFor(profile, m.ref, target, chain); return <button type="button" key={m.ref} className={styles.enhancementCard} data-testid="enhance-material" data-id={m.cardId} data-ref={m.ref} disabled={busy} aria-label={`選擇${card(m.cardId)?.name}作為永久消耗材料${pv.allowed ? `，+${pv.attackBonus}` : `，${pv.reason ?? '目前不能用'}`}`} onClick={() => choose(m.ref, m.cardId)}>{face(m.cardId)}<span className={pv.allowed ? styles.capLine : styles.capBlocked}>{pv.allowed ? `${KIND_TEXT[pv.kind ?? ''] ?? ''} +${pv.attackBonus}` : (pv.reason ?? '目前不能用')}{m.count > 1 ? ` ×${m.count}` : ''}</span></button>; })}</div>
      {materials.length === 0 && <p>目前沒有可消耗的材料。</p>}
    </section>}
    {target && plan && !absorption && <section className={styles.planBox} data-testid="feed-plan" aria-label="一鍵吃到封頂預覽">
      <div className={styles.enhancementStepBar}><h3 className={styles.enhancementStep}>一鍵吃到封頂・預覽</h3><button type="button" className={styles.enhancementBack} disabled={busy} onClick={() => { setPlan(null); setMessage(''); }}>返回</button></div>
      {plan.steps.length ? <>
        <p className={styles.planHeadline} data-testid="feed-plan-summary">{`攻擊 ${plan.before} → `}<strong>{plan.after}</strong>{`（上限 ${plan.capAttack}）`}{plan.full ? '・吃完就封頂' : ''}</p>
        <p data-testid="feed-plan-count">會用掉 <strong>{plan.steps.length}</strong> {` 張（${[plan.usedYoung && `幼子 ${plan.usedYoung}`, plan.usedResonance && `同卡共鳴 ${plan.usedResonance}`, plan.usedAdult && `本體 ${plan.usedAdult}`].filter(Boolean).join('、')}），材料剩 `}<strong>{plan.materialsAfter}</strong> 張。</p>
        <p className={styles.planList}>{plan.steps.map(st => `${card(st.materialCardId)?.name}+${st.attackBonus}`).join('、')}</p>
        <p className={styles.enhancementWarning}>被吃掉的卡會永久消失，無法復原。出戰隊伍、攻擊前五名與開局能量第一的卡不會被拿去吃。</p>
        <button type="button" data-testid="confirm-feed-to-cap" disabled={busy} onClick={async () => {
          operation.current ??= crypto.randomUUID(); setBusy(true); setMessage('');
          const result = await feedCampaignToCap(owner, operation.current, target, plan.steps.map(s => s.materialRef), { enabled: chain });
          if (!mounted.current) return;
          setBusy(false);
          if (!result.ok || !result.profile) { setMessage(result.error || '強化尚未儲存，請重試。'); return; }
          const after = chain ? campaignBattleStats(result.profile, [target], true)[0].attack : campaignCardAttack(result.profile, target).attack;
          onSaved(result.profile); operation.current = null; setPlan(null);
          setMessage(`已吃進 ${plan.steps.length} 張，攻擊 ${plan.before} → ${after}，已儲存。`);
        }}>確認吃進 {plan.steps.length} 張</button>
      </> : <p role="status">{plan.reason}</p>}
    </section>}
    {preview && <div ref={closeup} tabIndex={absorption ? -1 : undefined} className={absorption ? styles.enhancementCloseup : undefined} role={absorption ? "dialog" : undefined} aria-modal={absorption ? true : undefined} aria-label={absorption ? "永久攻擊強化" : undefined} onKeyDown={e => {
      if (!absorption || e.key !== 'Tab') return;
      e.preventDefault();
      const button = e.currentTarget.querySelector<HTMLButtonElement>('button');
      if (button) button.focus(); else e.currentTarget.focus();
    }}>
      <div className={styles.enhancementStepBar}><h3 className={styles.enhancementStep}>③ {absorption ? '融入強化' : '確認融入'}</h3>{!absorption && <button type="button" className={styles.enhancementBack} disabled={busy} onClick={() => { setYoung(''); operation.current = null; setMessage(''); }}>重選材料</button>}</div>
      <div className={styles.enhancementFaces} data-enhancement-animation={absorption ? absorption.done ? 'complete' : 'absorbing' : undefined} aria-busy={busy}>
        <div className={styles.enhancementMaterial}>{face(materialCardId)}<p>永久消耗</p></div><span className={styles.enhancementArrow} aria-label="融入">→</span><div className={styles.enhancementRecipient}>{face(target)}<p>永久強化</p></div>
      </div>
      {/* PLAN-v2 B5：封頂或會超過上限時，不再顯示「111 → 114」，改寫實際狀態。 */}
      {!absorption && (preview.full || preview.overCap)
        ? <p className={styles.enhancementEquation} data-testid="enhance-full" aria-label="強化上限">{preview.full ? <>已滿 <strong>{preview.afterAttack}／{preview.baseAttack + preview.maxBonus}</strong></> : <>攻擊 <strong>{preview.afterAttack}</strong>・只差 {preview.remaining} 點，這張會超過上限</>}</p>
        : <p className={styles.enhancementEquation} data-enhancement-reveal={absorption ? absorption.done ? 'complete' : 'pending' : undefined} aria-label="強化前攻擊、強化後攻擊與本次增加">攻擊 {beforeAttack !== null ? <>{beforeAttack} → </> : null}<strong>{absorption?.afterAttack ?? preview.afterAttack}</strong>{(!absorption || absorption.attackBonus !== null) && <span className={styles.enhancementGain}>本次 ＋{absorption ? absorption.attackBonus : preview.attackBonus}</span>}</p>}
      {!absorption && <details className={styles.enhancementNumbers}><summary>攻擊數值</summary><dl className={styles.enhancementStats} data-testid="enhance-preview"><dt>原始攻擊</dt><dd>{preview.baseAttack}</dd><dt>目前永久加成</dt><dd>+{preview.currentBonus}</dd><dt>本次提升</dt><dd>+{preview.attackBonus}</dd><dt>強化後攻擊</dt><dd>{preview.afterAttack}</dd><dt>強化上限</dt><dd>{preview.baseAttack + preview.maxBonus}</dd></dl></details>}
      {!absorption && <p className={styles.enhancementWarning}>{preview.kind === 'RESONANCE' ? '這張重複卡放進共鳴格後會消失，本體保留。' : '材料融入後會消失，無法復原。'}</p>}
      {!preview.allowed && <p role="status">{preview.reason}</p>}
      {!absorption && <button type="button" data-testid="confirm-enhancement" disabled={busy || !preview.allowed} onClick={async () => {
        operation.current ??= crypto.randomUUID(); setBusy(true); setMessage('');
        const youngId = material.replace(/^young:/, '');
        const result = chain ? await feedCampaignChain(owner, operation.current, material, target, snapshot.current, { enabled: true, inBattle: false }) : await enhanceCampaign(owner, operation.current, youngId, target);
        if (!mounted.current) return;
        if (!result.ok || !result.profile) { setBusy(false); setMessage(result.error || '強化尚未儲存，請重試。'); return; }
        const savedDisplay = chain ? null : enhancementReceiptDisplay(result.profile, operation.current);
        const after = chain ? campaignBattleStats(result.profile, [target], true)[0].attack : campaignCardAttack(result.profile, target).attack;
        setAbsorption({ preview, done: false, beforeAttack: savedDisplay?.beforeAttack ?? beforeAttack, afterAttack: savedDisplay?.afterAttack ?? after, attackBonus: savedDisplay?.attackBonus ?? (after - (beforeAttack ?? after)) }); onSaved(result.profile); operation.current = null;
      }}>確認消耗「{card(materialCardId)?.name}」並永久強化</button>}
      {absorption?.done && <button type="button" data-testid="enhancement-continue" onClick={() => { setAbsorption(null); setYoung(''); setMessage(''); }}>完成</button>}
    </div>}
    {message && <p role="status" data-testid="enhancement-result">{message}</p>}
  </section>;
}
