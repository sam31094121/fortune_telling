'use client';

/**
 * 鬼魅阿修羅 — 修羅斷語（八字、紫微、易經，同一個修羅口吻）
 * 前端只照印：每一句話都由後端 /api/ghost-asura/three-core-voice 組好；
 * 這裡不運算、不編句、不匯入任何話術表。抓不到或後端回 null 就整段不顯示，絕不擋住主卡。
 */
import { useEffect, useState } from 'react';
import styles from './AsuraVoiceCard.module.css';

interface VoiceLine { label: string; text: string }
interface Voice { contract: string; heading: string; lines: VoiceLine[]; note: string }

export function AsuraVoiceCard({ body }: { body: Record<string, unknown> | null }) {
  const [voice, setVoice] = useState<Voice | null>(null);

  useEffect(() => {
    setVoice(null);
    if (!body) return;
    const controller = new AbortController();
    fetch('/api/ghost-asura/three-core-voice', {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { voice?: Voice | null } | null) => {
        if (controller.signal.aborted) return;
        const next = json?.voice;
        setVoice(next && next.contract === 'asura-three-core-voice/v1' && Array.isArray(next.lines) && next.lines.length > 0 ? next : null);
      })
      .catch(() => { /* 靜默：這一段拿不到就不顯示 */ });
    return () => controller.abort();
  }, [body]);

  if (!voice) return null;
  return (
    <section className={styles.voice} aria-label={voice.heading} data-asura-voice>
      <h3 className={styles.heading}>{voice.heading}</h3>
      <dl className={styles.lines}>
        {voice.lines.map((line) => (
          <div className={styles.line} key={line.label}>
            <dt className={styles.label}>{line.label}</dt>
            <dd className={styles.text}>{line.text}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>{voice.note}</p>
    </section>
  );
}
