/**
 * 首頁信任統計 — 計數顯示組件
 *
 * 功能：
 * - 顯示認同、不認同、瀏覽三個計數
 * - Optimistic UI：點擊立即 +1
 * - 防連續點擊
 * - 三端同步
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { HomeTrustCounters } from '@/lib/home-trust/counters/counters.types';

interface HomeTrustCountersProps {
  onFeedback?: (vote: 'agree' | 'disagree') => void;
}

export default function HomeTrustCounters({
  onFeedback,
}: HomeTrustCountersProps) {
  const [counters, setCounters] = useState<HomeTrustCounters>({
    agreeCount: 0,
    disagreeCount: 0,
    viewCount: 0,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [agreeLoading, setAgreeLoading] = useState(false);
  const [disagreeLoading, setDisagreeLoading] = useState(false);

  // 初始化：讀取計數
  useEffect(() => {
    fetchCounters();
  }, []);

  /**
   * 取得目前計數
   */
  async function fetchCounters() {
    try {
      setLoading(true);
      const response = await fetch('/api/home-trust', { cache: 'no-store' });
      const data = await response.json();

      if (data.success && data.counters) {
        setCounters(data.counters);
      }
    } catch (error) {
      console.error('Failed to fetch counters:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 認同 +1
   */
  async function handleAgree() {
    // Optimistic UI：立即顯示
    setCounters(prev => ({
      ...prev,
      agreeCount: prev.agreeCount + 1,
    }));

    setAgreeLoading(true);

    try {
      const response = await fetch('/api/home-trust/agree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setCounters(data.counters);
        onFeedback?.('agree');
      } else {
        // 失敗時倒退（重新整理)
        await fetchCounters();
      }
    } catch (error) {
      console.error('Agree increment failed:', error);
      // 失敗時重新整理
      await fetchCounters();
    } finally {
      setAgreeLoading(false);
    }
  }

  /**
   * 不認同 +1
   */
  async function handleDisagree() {
    // Optimistic UI：立即顯示
    setCounters(prev => ({
      ...prev,
      disagreeCount: prev.disagreeCount + 1,
    }));

    setDisagreeLoading(true);

    try {
      const response = await fetch('/api/home-trust/disagree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setCounters(data.counters);
        onFeedback?.('disagree');
      } else {
        // 失敗時倒退
        await fetchCounters();
      }
    } catch (error) {
      console.error('Disagree increment failed:', error);
      // 失敗時重新整理
      await fetchCounters();
    } finally {
      setDisagreeLoading(false);
    }
  }

  /**
   * 瀏覽計數追蹤
   */
  useEffect(() => {
    // 頁面載入時自動 +1
    trackView();
  }, []);

  async function trackView() {
    try {
      const response = await fetch('/api/home-trust/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setCounters(data.counters);
      }
    } catch (error) {
      console.error('View tracking failed:', error);
    }
  }

  return (
    <div className="home-trust-counters">
      <style jsx>{`
        .home-trust-counters {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .counter-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 100px;
        }

        .counter-button:hover {
          border-color: #999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .counter-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .counter-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .counter-label {
          font-size: 12px;
          color: #999;
        }

        .views-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 6px;
          flex: 1;
          min-width: 100px;
        }

        @media (max-width: 768px) {
          .home-trust-counters {
            flex-direction: column;
          }

          .counter-button,
          .views-count {
            width: 100%;
          }
        }
      `}</style>

      {/* 認同按鈕 */}
      <button
        className="counter-button"
        onClick={handleAgree}
        disabled={agreeLoading}
        aria-label="我認同"
      >
        <span className="counter-value">{counters.agreeCount}</span>
        <span className="counter-label">👍 我認同</span>
      </button>

      {/* 不認同按鈕 */}
      <button
        className="counter-button"
        onClick={handleDisagree}
        disabled={disagreeLoading}
        aria-label="我不認同"
      >
        <span className="counter-value">{counters.disagreeCount}</span>
        <span className="counter-label">👎 我不認同</span>
      </button>

      {/* 瀏覽計數（唯讀） */}
      <div className="views-count">
        <span className="counter-value">{counters.viewCount}</span>
        <span className="counter-label">📖 累計瀏覽次數</span>
      </div>
    </div>
  );
}
