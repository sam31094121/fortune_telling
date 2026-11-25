'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const GhostAsuraHomeEntry = dynamic(() => import('@/components/GhostAsuraHomeEntry'), {
  ssr: false,
});

/** 不改受保護的 GhostAsuraHomeEntry：只從外層延後掛載，避免預渲染 HTML 預載玄武大圖。 */
export default function GhostAsuraHomeEntryLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const load = () => setShow(true);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        load();
        io.disconnect();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    const box = el.getBoundingClientRect();
    if (box.bottom > -200 && box.top < (window.innerHeight || 0) + 200) {
      load();
      io.disconnect();
    }
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="order-3 w-full" style={show ? undefined : { minHeight: 240 }}>
      {show ? <GhostAsuraHomeEntry /> : <div aria-hidden="true" style={{ minHeight: 240 }} />}
    </div>
  );
}
