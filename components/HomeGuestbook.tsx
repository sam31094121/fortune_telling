'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import HomeTranslatedText from '@/components/HomeTranslatedText';
import styles from './HomeGuestbook.module.css';

type Message = {
  id: string;
  body: string;
  timeLabel: string;
  mine: boolean;
  avatar: { symbol: string; label: string; color: string };
};

/**
 * 首頁不記名公開留言板。
 * 前端只負責顯示與送出：驗證、擋個資、限速、時間文字全部由 /api/guestbook 後端算好。
 * 沒有留言就顯示明確的空狀態，不放任何假留言。
 */
export default function HomeGuestbook() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [body, setBody] = useState('');
  const [trap, setTrap] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guestbook', { cache: 'no-store' });
      const data = (await res.json()) as { messages?: Message[]; error?: string };
      if (!res.ok || !data.messages) throw new Error(data.error);
      setMessages(data.messages);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : '暫時無法取得留言');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, website: trap }),
      });
      const data = (await res.json()) as { messages?: Message[]; error?: string };
      if (!res.ok) {
        setFeedback({ kind: 'error', text: data.error ?? '送出失敗，請稍後再試。' });
        return;
      }
      setBody('');
      if (data.messages) setMessages(data.messages);
      setFeedback({ kind: 'ok', text: '已送出，謝謝你的留言。' });
    } catch {
      setFeedback({ kind: 'error', text: '送出失敗，請檢查網路後再試。' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.wrap} aria-label="留言板" data-home-guestbook>
      <div className={styles.card}>
        <h2 className={styles.title}><HomeTranslatedText text="留言板" /></h2>
        <p className={styles.sub}>
          <HomeTranslatedText text="不用登入、不用留名字，同一個網路連線會有自己固定的匿名頭像。留言是公開的，請不要留下電話、Email 或出生年月日。" />
        </p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label htmlFor="guestbook-body" className={styles.srOnly}>留言內容</label>
          <textarea
            id="guestbook-body"
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="寫下你的使用心得（最多 200 字）"
            required
          />
          {/* 蜜罐：真人看不到也跳不進來；機器人會填 */}
          <input
            className={styles.trap}
            type="text"
            name="website"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <button type="submit" className={styles.button} disabled={sending}>
            {sending ? '送出中…' : '送出留言'}
          </button>
          {feedback ? (
            <p className={feedback.kind === 'ok' ? styles.ok : styles.error} role="status">{feedback.text}</p>
          ) : null}
        </form>

        {loadError ? (
          <p className={styles.empty} role="status">{loadError}</p>
        ) : messages === null ? (
          <p className={styles.empty}>讀取中…</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>目前還沒有留言，歡迎留下第一則。</p>
        ) : (
          <ul className={styles.list}>
            {messages.map((m) => (
              <li key={m.id} className={styles.item}>
                <span className={styles.avatar} style={{ background: m.avatar.color }} aria-hidden="true">{m.avatar.symbol}</span>
                <div className={styles.bubble}>
                  <div className={styles.who}>
                    <span className={styles.name}>{m.avatar.label}</span>
                    {m.mine ? <span className={styles.me}>你</span> : null}
                    <span className={styles.time}>{m.timeLabel}</span>
                  </div>
                  <p className={styles.text}>{m.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
