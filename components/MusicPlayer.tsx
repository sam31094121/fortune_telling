'use client';

import { useRef, useState } from 'react';

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

function ytCmd(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
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
    { title: 'Darkside', artist: 'Alan Walker', videoId: 'AOeY-nDp7hI' },
  ],
  classical: [
    { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_jjh0g' },
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
    { title: 'Only Time', artist: 'Enya', videoId: 'BQnS4L7HJME' },
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
  const isMandarinMode = Boolean(mandarinTracks && mandarinTracks.length > 0);
  const tracks: Track[] = isMandarinMode ? mandarinTracks! : (GENRE_TRACKS[genreKey ?? ''] ?? []);

  const [trackIdx, setTrackIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const track = tracks[trackIdx];
  if (!track) return null;

  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${track.videoId}` +
    '?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1';

  function handleToggleMute() {
    const iframe = iframeRef.current;
    if (isMuted) {
      ytCmd(iframe, 'unMute');
      ytCmd(iframe, 'setVolume', [85]);
    } else {
      ytCmd(iframe, 'mute');
    }
    setIsMuted((value) => !value);
  }

  function handleNext() {
    setIsMuted(true);
    setTrackIdx((index) => (index + 1) % tracks.length);
  }

  const headerLabel = isMandarinMode
    ? `${eraDisplayName ?? '華語黃金年代'} 推薦歌單`
    : `AI 音樂共鳴度 ${affinityScore ?? 0}`;

  const headerSub = isMandarinMode ? '系統依人格氣場挑選的陪伴旋律' : (genreName ?? '專屬音樂風格');
  const emoji = isMandarinMode ? '🎵' : (genreEmoji ?? '🎼');

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[color:rgba(109,74,255,0.35)] bg-[color:rgba(109,74,255,0.08)]">
      <iframe
        ref={iframeRef}
        key={track.videoId}
        src={embedUrl}
        title={`${track.title} - ${track.artist}`}
        allow="autoplay; encrypted-media"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:rgba(109,74,255,0.25)]">
            <span className="text-xl">{emoji}</span>
            {!isMuted && <span className="absolute inset-0 animate-ping rounded-full bg-[color:rgba(109,74,255,0.4)]" />}
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
                  isMuted ? 'opacity-30' : 'animate-pulse opacity-100'
                }`}
                style={{ height: isMuted ? 4 : [12, 20, 14, 18][n - 1], animationDelay: `${n * 0.15}s` }}
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
              onClick={handleToggleMute}
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: isMuted ? 'rgba(255,255,255,0.2)' : 'rgba(109,74,255,0.6)',
                background: isMuted ? 'rgba(255,255,255,0.08)' : 'rgba(109,74,255,0.2)',
                color: isMuted ? 'var(--text-sub)' : 'var(--text-main)',
              }}
            >
              {isMuted ? '開啟聲音' : '靜音'}
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

        {isMuted && (
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
            若沒有聲音，請點一下「開啟聲音」，系統會播放你的共鳴歌曲。
          </p>
        )}

        {tracks.length > 1 && (
          <div className="mt-4 space-y-1">
            {tracks.map((item, index) => (
              <button
                key={item.videoId}
                type="button"
                onClick={() => {
                  setIsMuted(true);
                  setTrackIdx(index);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors"
                style={{
                  borderColor: index === trackIdx ? 'rgba(109,74,255,0.5)' : 'rgba(255,255,255,0.06)',
                  background: index === trackIdx ? 'rgba(109,74,255,0.12)' : 'transparent',
                }}
              >
                <span className="text-xs" style={{ color: index === trackIdx ? 'var(--sky-violet)' : 'var(--text-muted)' }}>
                  {index === trackIdx ? '播放中' : `${index + 1}.`}
                </span>
                <span className="flex-1 truncate text-sm" style={{ color: index === trackIdx ? 'var(--text-main)' : 'var(--text-sub)' }}>
                  {item.title}
                </span>
                <span className="shrink-0 text-xs text-[color:var(--text-muted)]">{item.artist}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
