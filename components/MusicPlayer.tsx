'use client';

import { useState } from 'react';

export interface Track {
  title: string;
  artist: string;
  videoId: string;
}

interface MusicPlayerProps {
  mandarinTracks?: Track[];
  eraDisplayName?: string;
  genreKey?: string;
  genreName?: string;
  genreEmoji?: string;
  affinityScore?: number;
}


export const GENRE_TRACKS: Record<string, Track[]> = {
  pop: [
    { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8' },
    { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ' },
  ],
  rock: [
    { title: 'Believer', artist: 'Imagine Dragons', videoId: '7wtfhZwyrcc' },
    { title: 'Radioactive', artist: 'Imagine Dragons', videoId: 'ktvTqknDobU' },
  ],
  electronic: [
    { title: 'Faded', artist: 'Alan Walker', videoId: '60ItHLz5WEA' },
    { title: 'On My Way', artist: 'Alan Walker', videoId: 'dhYOPzcsbGM' },
    { title: 'Darkside', artist: 'Alan Walker', videoId: 'M-P4QBt-FWw' },
  ],
  classical: [
    { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
  ],
  folk_indie: [
    { title: 'Thinking Out Loud', artist: 'Ed Sheeran', videoId: 'lp-EO5I60KA' },
    { title: 'The A Team', artist: 'Ed Sheeran', videoId: 'UAWcs5H-qgQ' },
  ],
  ballad: [
    { title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A' },
    { title: 'Someone Like You', artist: 'Adele', videoId: 'hLQl3WQQoQ0' },
  ],
  new_age: [
    { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
    { title: 'Orinoco Flow', artist: 'Enya', videoId: 'LTrk4X9ACtw' },
  ],
};

export default function MusicPlayer({
  mandarinTracks,
  eraDisplayName,
  genreKey,
  genreName,
  genreEmoji,
  affinityScore,
}: MusicPlayerProps) {
  const recommendations = mandarinTracks ?? [];
  const tracks: Track[] = GENRE_TRACKS[genreKey ?? ''] ?? GENRE_TRACKS.pop;

  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const track = tracks[trackIdx];
  if (!track) return null;

  // YouTube requires an adequately sized, visible player. Sound also needs an
  // explicit user gesture in modern browsers, so playback starts from its controls.
  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${track.videoId}` +
    '?controls=1&rel=0&modestbranding=1&playsinline=1';

  function handleNext() {
    setIsPlayerOpen(false);
    setTrackIdx((index) => (index + 1) % tracks.length);
  }

  const headerLabel = `AI 音樂共鳴度 ${affinityScore ?? 0}`;
  const headerSub = genreName ?? '你的人格音樂試聽';
  const emoji = genreEmoji ?? '🎧';

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[color:rgba(109,74,255,0.35)] bg-[color:rgba(109,74,255,0.08)]">
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:rgba(109,74,255,0.25)]">
            <span className="text-xl">{emoji}</span>
            {isPlayerOpen && <span className="absolute inset-0 animate-ping rounded-full bg-[color:rgba(109,74,255,0.4)]" />}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">{headerLabel}</p>
            <p className="font-serif text-base text-[color:var(--text-main)]">{headerSub}</p>
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

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlayerOpen((value) => !value)}
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: isPlayerOpen ? 'rgba(109,74,255,0.6)' : 'rgba(255,255,255,0.2)',
                background: isPlayerOpen ? 'rgba(109,74,255,0.2)' : 'rgba(255,255,255,0.08)',
                color: isPlayerOpen ? 'var(--text-main)' : 'var(--text-sub)',
              }}
            >
              {isPlayerOpen ? '收起播放器' : '開啟聲音'}
            </button>

            {tracks.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                title="下一首"
                className="rounded-full border border-white/15 bg-white/8 px-3 py-2 text-sm text-[color:var(--text-sub)] transition-colors hover:bg-white/15"
              >
                下一首
              </button>
            )}
          </div>
        </div>

        {!isPlayerOpen && (
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
            點一下「開啟聲音」，再按影片中央即可播放你的共鳴歌曲。
          </p>
        )}

        {isPlayerOpen && (
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
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-xs text-[color:var(--sky-violet)] transition hover:text-white"
        >
          在 YouTube 開啟這首歌
        </a>

        {tracks.length > 1 && (
          <div className="mt-4 space-y-1">
            {tracks.map((item, index) => (
              <button
                key={item.videoId}
                type="button"
                onClick={() => {
                  setIsPlayerOpen(false);
                  setTrackIdx(index);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors"
                style={{
                  borderColor: index === trackIdx ? 'rgba(109,74,255,0.5)' : 'rgba(255,255,255,0.06)',
                  background: index === trackIdx ? 'rgba(109,74,255,0.12)' : 'transparent',
                }}
              >
                <span className="text-xs" style={{ color: index === trackIdx ? 'var(--sky-violet)' : 'var(--text-muted)' }}>
                  {index === trackIdx ? '已選擇' : `${index + 1}.`}
                </span>
                <span className="flex-1 truncate text-sm" style={{ color: index === trackIdx ? 'var(--text-main)' : 'var(--text-sub)' }}>
                  {item.title}
                </span>
                <span className="shrink-0 text-xs text-[color:var(--text-muted)]">{item.artist}</span>
              </button>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
              {eraDisplayName ?? '你的年代'}共鳴歌單
            </p>
            <div className="space-y-1">
              {recommendations.map((item, index) => (
                <a
                  key={`${item.title}-${item.artist}`}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} ${item.artist}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/5 px-4 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-white/5"
                >
                  <span className="text-xs text-[color:var(--text-muted)]">{index + 1}.</span>
                  <span className="flex-1 truncate text-sm text-[color:var(--text-sub)]">{item.title}</span>
                  <span className="shrink-0 text-xs text-[color:var(--text-muted)]">{item.artist} ↗</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
