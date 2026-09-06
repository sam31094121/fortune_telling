/** A six-second file is playable in a match only after this exact pairing is reviewed. */
export interface ChargeRelease {
  status: 'approved' | 'pending' | 'rejected';
  purpose: 'live-battle' | 'skill-preview';
  playerId: string;
  opponentId: string;
  audioSide: 'player';
  durationMs: number;
  webm: string;
  mp4: string;
  reviewReport: string;
  checks: Record<string, 'pass' | 'fail' | 'unverified' | 'not-applicable'>;
}

export const CHARGE_REVIEW_PARTS = ['identity', 'opponentIdentity', 'head', 'body', 'limbs', 'mouth', 'teethOrBeak', 'eyes', 'clawsOrHooves', 'tail', 'contact', 'reciprocalBite', 'playerVoice', 'continuity', 'mobilePlayback'] as const;

export function releasedChargeFor(
  skill: { enabled?: boolean; durationMs?: number; video?: string; videoMp4?: string; release?: ChargeRelease } | null | undefined,
  playerId: string,
  opponentId: string,
): ChargeRelease | null {
  const release = skill?.release;
  if (!skill?.enabled || skill.durationMs !== 6000 || !release || release.status !== 'approved') return null;
  if (release.purpose !== 'live-battle' || release.playerId !== playerId || release.opponentId !== opponentId || release.audioSide !== 'player' || release.durationMs !== 6000) return null;
  const base = `/skill-battle-archive/cards/${playerId}/clips/`;
  const localFile = (value: string | undefined, extension: string) => typeof value === 'string' && value.startsWith(base) && /^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(value.slice(base.length)) && value.endsWith(extension);
  if (!localFile(release.webm, '.webm') || !localFile(release.mp4, '.mp4') || !localFile(release.reviewReport, '.json')) return null;
  if (skill.video !== release.webm || skill.videoMp4 !== release.mp4) return null;
  if (CHARGE_REVIEW_PARTS.some(part => !['pass', 'not-applicable'].includes(release.checks?.[part]))) return null;
  // Identity, contact, voice and playback can never be classified as anatomically inapplicable.
  if (['identity', 'opponentIdentity', 'contact', 'reciprocalBite', 'playerVoice', 'continuity', 'mobilePlayback'].some(part => release.checks[part] !== 'pass')) return null;
  return release;
}
