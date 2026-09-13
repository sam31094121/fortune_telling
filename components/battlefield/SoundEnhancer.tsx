'use client';

import { memo, useEffect, useRef } from 'react';
import type { Match } from '@/lib/beast-game/interactive';

interface SoundEnhancerProps {
  match: Match;
  streak: number;
  isNewRecord: boolean;
}

const SoundEnhancer = memo(function SoundEnhancer({ match, streak, isNewRecord }: SoundEnhancerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (match.status !== 'FINISHED' || match.winner !== 'player') return;

    // 創建音效播放
    const playStreakSound = async () => {
      try {
        // 根據連勝等級播放不同的音效
        if (isNewRecord) {
          // 傳奇音效：低音轟鳴 + 電擊
          const audio = new Audio('/audio/beast/legendary-streak.ogg');
          audio.volume = 0.6;
          await audio.play().catch(() => {});
        } else if (streak >= 6) {
          // 史詩音效：重鼓 + 金屬音
          const audio = new Audio('/audio/beast/epic-streak.ogg');
          audio.volume = 0.5;
          await audio.play().catch(() => {});
        } else if (streak >= 3) {
          // 罕見音效：歡呼
          const audio = new Audio('/audio/beast/rare-streak.ogg');
          audio.volume = 0.4;
          await audio.play().catch(() => {});
        }
      } catch {
        // 靜默失敗（音效文件不存在時）
      }
    };

    // 延遲播放，配合動畫時序（1秒後）
    const timer = setTimeout(() => {
      playStreakSound();
    }, 1000);

    return () => clearTimeout(timer);
  }, [match.status, match.winner, streak, isNewRecord]);

  return null;
});

export default SoundEnhancer;
