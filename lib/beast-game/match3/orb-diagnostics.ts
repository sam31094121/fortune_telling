/** Local bounded operational evidence. Never accepts payloads, URLs, errors or identities. */
export type OrbPhase = 'idle' | 'request' | 'match' | 'clear' | 'fall' | 'battle' | 'ended';
type Event = 'phase' | 'visibility' | 'response' | 'network-error' | 'aborted' | 'slow' | 'leave';
type Entry = { at: number; event: Event; phase: OrbPhase; hidden: boolean; busy: boolean; ms?: number; status?: number };
const KEY = 'orb-diagnostics-v1';
const events: Entry[] = [];
let phase: OrbPhase = 'idle', busy = false, fault = false;
export function recordOrbDiagnostic(event: Event, ms?: number, status?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: Entry = { at: Date.now(), event, phase, hidden: document.hidden, busy };
    if (Number.isFinite(ms)) entry.ms = Math.max(0, Math.round(ms!));
    if (Number.isFinite(status)) entry.status = status;
    events.push(entry); if (events.length > 100) events.shift();
    const failed = event === 'slow' || event === 'network-error' || event === 'aborted' || (status ?? 0) >= 400;
    if (failed) fault = true;
    // Persist only fault evidence and subsequent recovery; storage failure must never affect play.
    if (fault && (failed || event === 'visibility' || event === 'leave' || (event === 'phase' && !busy))) {
      sessionStorage.setItem(KEY, JSON.stringify({ version: 1, events }));
    }
  } catch { /* diagnostics are best effort */ }
}
export function setOrbDiagnosticPhase(next: OrbPhase, blocked: boolean): void {
  phase = next; busy = blocked; recordOrbDiagnostic('phase');
}
export function readOrbDiagnostics(): readonly Entry[] { return events.map(e => ({ ...e })); }
