import {redirect} from 'next/navigation';
/** Existing preview bookmarks now lead to the actual turn-based game. */
export default function Page(){redirect('/beast-game');}
