import { redirect } from 'next/navigation';

/** Retired prototype bookmarks always enter the single current orb battle. */
export default function BeastOrbPage() {
  redirect('/beast-game/match3-hard');
}
