'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Component, useEffect, useState, type ReactNode } from 'react';

const ModelLab = dynamic(() => import('./ModelLab'), {
  ssr: false,
  loading: () => (
    <div role="status" style={{ height: '100dvh', display: 'grid', placeItems: 'center', background: '#070910', color: '#8592ac' }}>
      正在開啟 3D 工作室…
    </div>
  ),
});

/*
  2026-10-17 QA：沒有 WebGL（瀏覽器關閉硬體加速、舊機、企業政策）時，
  原本舞台是一片黑、只剩方向鍵，頁面還丟出未捕捉的 "Error creating WebGL context."。
  先探測 WebGL（用完立刻釋放 context），不支援就給中文說明，不載入 3D 程式碼；
  執行中倒掉（context 建不起來、chunk 載入失敗）由錯誤邊界接住，同樣給說明。
  只處理退路，不改任何模型、幾何或渲染設定。
*/
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* 釋放失敗不影響判定 */ }
    return Boolean(gl);
  } catch {
    return false;
  }
}

function NoWebGLNotice({ reason }: { reason: 'unsupported' | 'crashed' }) {
  return (
    <div role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#070910', color: '#c9d2e6', padding: '24px' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', lineHeight: 1.8 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#f3e6b8', marginBottom: 8 }}>立體太極模型暫時無法顯示</p>
        <p style={{ fontSize: 15 }}>
          {reason === 'unsupported'
            ? '這台裝置或瀏覽器目前沒有開啟 3D 繪圖（WebGL）。請改用新版 Chrome 或 Safari，或在瀏覽器設定開啟「硬體加速」後重新整理。'
            : '3D 畫面這次沒有順利開啟，可能是裝置記憶體暫時不足。請關閉其他分頁後重新整理一次。'}
        </p>
        <p style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 18px', borderRadius: 12, border: '1px solid #8592ac', background: 'transparent', color: '#f3e6b8', fontWeight: 700 }}>重新整理</button>
          <Link href="/" prefetch={false} onNavigate={(event) => { event.preventDefault(); window.location.assign('/'); }} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: 12, border: '1px solid #8592ac', color: '#c9d2e6', fontWeight: 700 }}>返回首頁</Link>
        </p>
      </div>
    </div>
  );
}

class ModelLabBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() { return this.state.crashed ? <NoWebGLNotice reason="crashed" /> : this.props.children; }
}

export default function ModelLabMount() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => { setWebgl(hasWebGL()); }, []);
  if (webgl === null) {
    return (
      <div role="status" style={{ height: '100dvh', display: 'grid', placeItems: 'center', background: '#070910', color: '#8592ac' }}>
        正在開啟 3D 工作室…
      </div>
    );
  }
  if (!webgl) return <NoWebGLNotice reason="unsupported" />;
  return <ModelLabBoundary><ModelLab /></ModelLabBoundary>;
}
