'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import BeastRigStage, { type BeastRigGeometry } from './BeastRigStage';
import { rigFor, RIG_CARD_HIDDEN, RIG_IMPACT_MS, RIG_STRIKE_MS, type BeastRig } from '@/lib/beast-game/beast-rig';

export interface Match3Strike { key: number; targetId: string; attackerIds: string[] }
/** Presentation only: consume recorded HP changes; never decide damage or eligibility. */
export function match3RigAttackers(hits: readonly { attackerId?: string | null; amount: number }[], beforeHp: number, afterHp: number): string[] {
  if (!Number.isFinite(beforeHp) || !Number.isFinite(afterHp) || beforeHp <= 0 || afterHp >= beforeHp) return [];
  return [...new Set(hits.filter(h => Number.isFinite(h.amount) && h.amount > 0 && h.attackerId && rigFor(h.attackerId)).map(h => h.attackerId!))];
}
export function Match3TargetArt({ src }: { src: string }) {
  // Real target pixels are shared with the reversible bite/tear renderer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} decoding="async" />;
}
function Strike({ rig, root, strike, tear, onImpact }: { rig: BeastRig; root: RefObject<HTMLElement | null>; strike: Match3Strike | null; tear: boolean; onImpact: (key: number) => void }) {
  const impactCallback = useRef(onImpact); impactCallback.current = onImpact;
  const audioEvent = useRef<{ key: number; primary: boolean; animated: boolean; fired: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const card = useRef<HTMLElement | null>(null);
  const measure = useCallback((): BeastRigGeometry | null => {
    const from = root.current?.querySelector<HTMLElement>('[data-testid="match3-ally"][data-id="' + rig.cardId + '"] [data-rig-source]');
    const to = root.current?.querySelector<HTMLElement>('[data-testid="match3-enemy"][data-id="' + strike?.targetId + '"] [data-rig-target]');
    if (!from || !to) return null;
    card.current = from;
    const rect = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { cx:r.left + r.width / 2, top:r.top, width:r.width, height:r.height }; };
    return { from: rect(from), to: rect(to), arenaWidth: Math.min(root.current!.getBoundingClientRect().width,460), targetArt: tear ? to.querySelector('img') : null };
  }, [root, rig.cardId, strike?.targetId, tear]);
  const restore = useCallback(() => { if (card.current) { card.current.style.opacity = ''; card.current.closest('[data-testid="match3-ally"]')?.removeAttribute('data-rig-active'); } }, []);
  const frame = useCallback((t: number) => {
    const event = audioEvent.current;
    if (event?.primary && event.animated && !event.fired && t >= RIG_IMPACT_MS / RIG_STRIKE_MS && t < 1) {
      event.fired = true; impactCallback.current(event.key);
    }
    if (!card.current) return;
    card.current.style.opacity = t >= RIG_CARD_HIDDEN[0] && t < RIG_CARD_HIDDEN[1] ? '0' : '';
    const holder = card.current.closest('[data-testid="match3-ally"]');
    if (t < 1) holder?.setAttribute('data-rig-active', 'true'); else restore();
  }, [restore]);
  useEffect(() => restore, [restore, strike?.key]);
  // Readiness is sampled once per event: loading late must not replay an old hit.
  const seen = useRef<number | null>(null);
  const [accepted, setAccepted] = useState<number | null>(null);
  useEffect(() => {
    const key = strike?.key ?? null;
    if (seen.current !== key) {
      seen.current = key;
      setAccepted(ready && !reduced ? key : null);
      const primary = tear && !!strike?.attackerIds.includes(rig.cardId);
      audioEvent.current = key === null ? null : { key, primary, animated: ready && !reduced, fired: false };
      if (key !== null && primary && (!ready || reduced)) {
        audioEvent.current!.fired = true;
        impactCallback.current(key);
      }
    } else if (!ready || reduced) setAccepted(null);
    if (!ready || reduced || key === null) restore();
  }, [strike?.key, ready, reduced, restore, tear, rig.cardId]);
  const camera = useCallback(() => null, []);
  return <BeastRigStage rig={rig} playKey={ready && !reduced && accepted === strike?.key && strike?.attackerIds.includes(rig.cardId) ? strike.key : null} onReady={setReady} measureGeometry={measure} cameraElement={camera} onFrame={frame} layerZIndex={51} />;
}
export default function Match3RigAttack({ ids, root, strike, onImpact }: { ids: readonly string[]; root: RefObject<HTMLElement | null>; strike: Match3Strike | null; onImpact?: () => void }) {
  const lastImpact = useRef<number | null>(null);
  const latest = useRef({ strike, onImpact }); latest.current = { strike, onImpact };
  const impact = useCallback((key: number) => {
    if (latest.current.strike?.key !== key || lastImpact.current === key) return;
    lastImpact.current = key; latest.current.onImpact?.();
  }, []);
  return <>{ids.map(id => { const rig = rigFor(id); return rig ? <Strike key={id} rig={rig} root={root} strike={strike} tear={strike?.attackerIds[0] === id} onImpact={impact} /> : null; })}</>;
}
