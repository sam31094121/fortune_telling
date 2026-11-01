import { redirect } from 'next/navigation';

/** The former public HTML cannot reopen the archived 35-orb engine. */
export default function RetiredOrbHtmlPage() {
  redirect('/beast-game/match3-hard');
}
