'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

export default function LandingPageClient() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  useEffect(() => {
    // 設定 iframe 高度為視口高度
    if (iframeRef.current) {
      iframeRef.current.style.height = `${window.innerHeight}px`;
    }

    // 監聽視窗大小變化
    const handleResize = () => {
      if (iframeRef.current) {
        iframeRef.current.style.height = `${window.innerHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 監聽來自 iframe 的導航訊息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CTA_CLICKED') {
        router.push('/ghost-asura');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className={styles.container}>
      {/* 預告片嵌入 */}
      <iframe
        ref={iframeRef}
        src="/ghost-asura-teaser.html"
        className={styles.teaser}
        frameBorder="0"
        scrolling="no"
        title="鬼魅阿修羅 - 喚醒儀式預告片"
      />

      {/* 下方延伸區域（可選：品牌故事 / 常見問題 / 推薦閱讀）*/}
      <section className={styles.extension}>
        <div className={styles.extensionContent}>
          <h2>準備好了嗎？</h2>
          <p>探索你的命運，喚醒內在的阿修羅力量。</p>
          <button
            className={styles.cta}
            onClick={() => router.push('/ghost-asura')}
            aria-label="進入鬼魅阿修羅體驗"
          >
            開始體驗
          </button>
        </div>
      </section>
    </div>
  );
}
