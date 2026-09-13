'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import TaijiDeepField13 from '@/components/taiji/TaijiDeepField13';

/** Reuses the existing Taiji photon/particle field for one brief, non-interactive gift reveal. */
export default function StarterPackPhotonRitual() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <div className="pointer-events-none absolute inset-0" aria-hidden="true">
    <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 6], fov: 50 }} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}>
      <TaijiDeepField13 active step={13} />
    </Canvas>
  </div>;
}
