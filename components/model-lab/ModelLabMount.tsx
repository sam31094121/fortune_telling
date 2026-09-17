'use client';

import dynamic from 'next/dynamic';

const ModelLab = dynamic(() => import('./ModelLab'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100dvh', display: 'grid', placeItems: 'center', background: '#070910', color: '#8592ac' }}>
      正在開啟 3D 工作室…
    </div>
  ),
});

export default function ModelLabMount() {
  return <ModelLab />;
}
