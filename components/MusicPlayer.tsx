'use client';

import { useState } from 'react';

export interface Track {
  title: string;
  artist: string;
  videoId: string;
}

interface MusicPlayerProps {
  track: Track;
  label: string;
  flag?: string;
  reason?: string;
  affinityScore?: number;
  /**
   * 是否使用站內嵌入播放器。
   * 部分歌曲（如多數國語 MV）關閉了嵌入或影片來源不穩，
   * 此時設為 false，改用「歌名 + 歌手」開啟 YouTube 播放，確保一定播得出來。
   */
  embeddable?: boolean;
  /**
   * 受控模式：由父層統一管理「哪一個播放器正在開」，
   * 確保同一時間只有一首歌在播，打開新的就自動關掉舊的（避免兩首同時出聲互相衝突）。
   * 不傳則退回各自獨立的內部狀態。
   */
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

export default function MusicPlayer({
  track,
  label,
  flag,
  reason,
  affinityScore,
  embeddable = true,
  isOpen,
  onToggleOpen,
}: MusicPlayerProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // 受控優先：父層有給 isOpen 就聽父層的，否則用自己的狀態
  const isControlled = isOpen !== undefined;
  const isPlayerOpen = isControlled ? isOpen : internalOpen;
  const setIsPlayerOpen = (next: boolean) => {
    if (isControlled) onToggleOpen?.(next);
    else setInternalOpen(next);
  };

  if (!track) return null;

  // YouTube 需要可見且足夠大的播放器，且現代瀏覽器要求使用者手勢才能發聲，
  // 因此播放從控制列開始。
  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${track.videoId}` +
    '?controls=1&rel=0&modestbranding=1&playsinline=1';

  // 以歌名 + 歌手搜尋，連結永遠有效（不依賴可能失效的 videoId）。
  const youtubeSearchUrl =
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[color:rgba(109,74,255,0.35)] bg-[color:rgba(109,74,255,0.08)]">
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:rgba(109,74,255,0.25)]">
            <span className="text-xl">{flag ?? '🎧'}</span>
            {isPlayerOpen && <span className="absolute inset-0 animate-ping rounded-full bg-[color:rgba(109,74,255,0.4)]" />}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">{label}</p>
            <p className="font-serif text-base text-[color:var(--text-main)]">
              AI 音樂共鳴度 {affinityScore ?? 0}
            </p>
          </div>

          <div className="ml-auto flex items-end gap-[3px]">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`block w-[3px] rounded-full bg-[color:var(--fortune-good)] transition-all ${
                  isPlayerOpen ? 'animate-pulse opacity-100' : 'opacity-30'
                }`}
                style={{ height: isPlayerOpen ? [12, 20, 14, 18][n - 1] : 4, animationDelay: `${n * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[color:var(--text-main)]">{track.title}</p>
            <p className="text-xs text-[color:var(--text-muted)]">{track.artist}</p>
          </div>

          {embeddable ? (
            <button
              type="button"
              onClick={() => setIsPlayerOpen(!isPlayerOpen)}
              className="flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: isPlayerOpen ? 'rgba(109,74,255,0.6)' : 'rgba(255,255,255,0.2)',
                background: isPlayerOpen ? 'rgba(109,74,255,0.2)' : 'rgba(255,255,255,0.08)',
                color: isPlayerOpen ? 'var(--text-main)' : 'var(--text-sub)',
              }}
            >
              {isPlayerOpen ? '收起播放器' : '開啟聲音'}
            </button>
          ) : (
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-sub)',
              }}
            >
              ▶ 用 YouTube 播放
            </a>
          )}
        </div>

        {reason && (
          <div className="mt-3 rounded-[18px] border border-violet-400/15 bg-violet-950/15 px-4 py-3">
            <p className="mb-1 text-xs uppercase tracking-[0.25em] text-violet-300/70">為什麼是這首歌</p>
            <p className="text-sm leading-7 text-[color:var(--text-sub)]">{reason}</p>
          </div>
        )}

        {embeddable && !isPlayerOpen && (
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
            點一下「開啟聲音」，再按影片中央即可播放你的共鳴歌曲。
          </p>
        )}

        {!embeddable && (
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
            點「用 YouTube 播放」會在新分頁開啟並播放這首歌。
          </p>
        )}

        {embeddable && isPlayerOpen && (
          <div className="mt-4">
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black">
              <iframe
                key={track.videoId}
                src={embedUrl}
                title={`${track.title} - ${track.artist}`}
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="aspect-video w-full"
              />
            </div>
            <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
              點影片中央播放；若無法嵌入，可改用 YouTube 開啟。
            </p>
          </div>
        )}

        <a
          href={youtubeSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-xs text-[color:var(--sky-violet)] transition hover:text-white"
        >
          在 YouTube 開啟這首歌
        </a>
      </div>
    </div>
  );
}
