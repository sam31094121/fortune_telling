'use client';

import { useEffect, useRef, useState } from 'react';
import type { AsuraConversationIntent, AsuraConversationResponse, AsuraConversationTopic } from '@/lib/ghost-asura-conversation-contract';
import styles from './asura-conversation.module.css';

export type CompletedBirthInput = Record<string, unknown> & {
  birthDate: string;
  birthTime?: string;
  timeUnknown?: boolean;
  gender: 'male' | 'female';
  calendarType: 'solar';
  timezone: 'Asia/Taipei';
};

type Turn = { question: string; result: AsuraConversationResponse };

export default function AsuraConversation({ birthInput }: { birthInput: CompletedBirthInput }) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef(birthInput);
  inputRef.current = birthInput;

  useEffect(() => {
    setHistory([]);
    setError('');
    setBusy(false);
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [birthInput]);

  async function ask(topic: AsuraConversationTopic, intent: AsuraConversationIntent, question: string) {
    if (requestRef.current) return;
    const request = new AbortController();
    const submittedInput = birthInput;
    requestRef.current = request;
    setBusy(true);
    setError('');
    const isCurrent = () => requestRef.current === request && inputRef.current === submittedInput;
    const timeout = setTimeout(() => {
      if (!isCurrent()) return;
      timeoutRef.current = null;
      requestRef.current = null;
      request.abort();
      setBusy(false);
      setError('連線等待過久，請再按一次原本的選項重試。');
    }, 30_000);
    timeoutRef.current = timeout;
    try {
      const response = await fetch('/api/ghost-asura/conversation', {
        method: 'POST', cache: 'no-store', signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthInput: submittedInput, topic, intent }),
      });
      const data = await response.json().catch(() => null);
      if (!isCurrent()) return;
      if (!response.ok) throw new Error('暫時無法取得追問內容，請稍後重試。');
      if (!data || !['READY', 'UNAVAILABLE'].includes(data.status) || data.topic !== topic || data.intent !== intent
        || typeof data.answer !== 'string' || !data.answer.trim() || typeof data.scopeNote !== 'string'
        || !data.step || ![1, 2, 3].includes(data.step.number) || data.step.total !== 3
        || !['結論', '依據', '行動'].includes(data.step.label) || typeof data.step.complete !== 'boolean'
        || !Array.isArray(data.options) || data.options.length === 0 || data.options.some((option: { id?: unknown; label?: unknown }) =>
          !option || typeof option.id !== 'string' || typeof option.label !== 'string'
          || !option.label.trim()
          || !/^(topic:(past|present|future)|intent:(summary|why|action))$/.test(option.id))) {
        throw new Error('追問內容未完整取得，請稍後重試。');
      }
      setHistory((previous) => [...previous, { question, result: data as AsuraConversationResponse }].slice(-6));
    } catch {
      if (isCurrent()) setError('暫時無法取得追問內容，請稍後重試。');
    } finally {
      clearTimeout(timeout);
      if (timeoutRef.current === timeout) timeoutRef.current = null;
      if (isCurrent()) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  const latest = history[history.length - 1]?.result;
  function select(id: string, label: string) {
    if (!latest) return;
    if (id === 'topic:past' || id === 'topic:present' || id === 'topic:future') {
      void ask(id.slice(6) as AsuraConversationTopic, 'summary', label);
    } else if (id === 'intent:summary' || id === 'intent:why' || id === 'intent:action') {
      void ask(latest.topic, id.slice(7) as AsuraConversationIntent, label);
    }
  }

  return (
    <section className={styles.panel} aria-label="阿修羅引導追問" data-asura-conversation>
      <h2>接著看懂這份解讀</h2>
      <p className={styles.note}>依這次解讀選擇追問，僅提供已有內容的引導。</p>
      <ol className={styles.history} aria-label="最近六次追問" aria-live="polite" aria-relevant="additions">
        {history.map((turn, index) => (
          <li key={index}>
            <p className={styles.step} data-asura-conversation-step={turn.result.step.number}>
              {turn.result.step.number} / {turn.result.step.total} · {turn.result.step.label}
            </p>
            <p className={styles.question}>{turn.question}</p>
            <p className={styles.answer} data-asura-conversation-answer>{turn.result.answer}</p>
            {turn.result.scopeNote && <p className={styles.note} data-asura-conversation-scope>{turn.result.scopeNote}</p>}
          </li>
        ))}
      </ol>
      <div aria-live="polite" aria-atomic="true" className={styles.note}>
        {busy ? '正在核對這份解讀…' : latest?.step.complete ? '這一輪引導已完成，可以選擇其他時段。' : ''}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.options} aria-label="選擇追問">
        {!latest ? (
          <button type="button" disabled={busy} onClick={() => void ask('present', 'summary', '看懂現在的解讀')}>看懂現在的解讀</button>
        ) : latest.options.map((option) => (
          <button type="button" key={option.id} disabled={busy} onClick={() => select(option.id, option.label)}>{option.label}</button>
        ))}
      </div>
    </section>
  );
}
