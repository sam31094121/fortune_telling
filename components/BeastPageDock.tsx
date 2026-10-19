'use client';

import { useEffect } from 'react';

/** In-flow utilities: never cover the cards or a battle's fixed action area. */
export default function BeastPageDock() {
  useEffect(() => {
    window.dispatchEvent(new Event('tdh:install-slots'));
    return () => { queueMicrotask(() => window.dispatchEvent(new Event('tdh:install-slots'))); };
  }, []);
  return <footer data-beast-page-dock className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 px-4 py-5 text-sm text-cyan-100">
    <div data-beast-install-slot />
    <div data-beast-install-panel className="w-full" />
  </footer>;
}
