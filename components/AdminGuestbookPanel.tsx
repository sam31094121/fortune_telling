'use client';

import { useCallback, useEffect, useState } from 'react';

type Message = {
  id: string;
  body: string;
  timeLabel: string;
  status: 'visible' | 'removed';
  avatar: { symbol: string; label: string; color: string };
};

/** 後台留言管理：只負責顯示與送出下架／復原指令，判斷與資料全在 /api/admin/guestbook。 */
export default function AdminGuestbookPanel() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/guestbook', { cache: 'no-store' });
      const data = (await res.json()) as { messages?: Message[]; error?: string };
      if (!res.ok || !data.messages) throw new Error(data.error);
      setMessages(data.messages);
      setError('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : '暫時無法取得留言');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: 'remove' | 'restore') => {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = (await res.json()) as { messages?: Message[]; error?: string };
      if (!res.ok || !data.messages) throw new Error(data.error);
      setMessages(data.messages);
      setError('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : '操作失敗');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section data-admin-guestbook>
      <h2>留言板管理</h2>
      {error ? <p role="status">{error}</p> : null}
      {messages === null && !error ? <p>讀取中…</p> : null}
      {messages?.length === 0 ? <p>目前沒有任何留言。</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {messages?.map((m) => (
          <li
            key={m.id}
            style={{ padding: 12, border: '1px solid #8884', borderRadius: 10, opacity: m.status === 'removed' ? 0.55 : 1 }}
          >
            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
              <span aria-hidden="true" style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', textAlign: 'center', borderRadius: '50%', background: m.avatar.color, marginRight: 8 }}>{m.avatar.symbol}</span>
              {m.avatar.label}
            </p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <small>{m.timeLabel}{m.status === 'removed' ? '（已下架）' : ''}</small>
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() => void act(m.id, m.status === 'removed' ? 'restore' : 'remove')}
                style={{ marginLeft: 'auto', minHeight: 40, padding: '0 16px' }}
              >
                {m.status === 'removed' ? '復原' : '下架'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
