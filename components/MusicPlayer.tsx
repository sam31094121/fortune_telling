'use client';

import { useRef, useState } from 'react';

interface Track {
  title: string;
  artist: string;
  videoId: string;
}

interface MusicPlayerProps {
  genreKey: string;
  genreName: string;
  genreEmoji: string;
  affinityScore: number;
}

// YouTube postMessage command helper
function ytCmd(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

// Curated tracks per genre — autoplay when personality profile loads
export const GENRE_TRACKS: Record<string, Track[]> = {
  pop: [
    { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8' },
    { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ' },
    { title: 'Bad Guy', artist: 'Billie Eilish', videoId: 'DyDfgMOUjCI' },
  ],
  rock: [
    { title: 'Believer', artist: 'Imagine Dragons', videoId: '7wtfhZwyrcc' },
    { title: 'Radioactive', artist: 'Imagine Dragons', videoId: 'ktvTqknDobU' },
    { title: 'Enemy', artist: 'Imagine Dragons', videoId: 'D9G1VOjN_84' },
  ],
  electronic: [
    { title: 'Faded', artist: 'Alan Walker', videoId: '60ItHLz5WEA' },
    { title: 'On My Way', artist: 'Alan Walker', videoId: 'dhYOPzcsbGM' },
    { title: 'Darkside', artist: 'Alan Walker', videoId: 'AOeY-nDp7hI' },
  ],
  classical: [
    { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_jjh0g' },
    { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    { title: 'Clair de Lune', artist: 'Debussy', videoId: 'CvFH_6DNRCY' },
  ],
  jazz: [
    { title: 'Come Away With Me', artist: 'Norah Jones', videoId: 'D7bNMOGFCkQ' },
    { title: 'What A Wonderful World', artist: 'Louis Armstrong', videoId: 'CWzrABouyeE' },
    { title: 'Fly Me To The Moon', artist: 'Frank Sinatra', videoId: 'ZEcqHA7dbwM' },
  ],
  rnb_soul: [
    { title: 'Just The Way You Are', artist: 'Bruno Mars', videoId: 'LjhCEhWiKXk' },
    { title: 'Treasure', artist: 'Bruno Mars', videoId: 'ay5GKJ0jXks' },
    { title: 'Leave The Door Open', artist: 'Bruno Mars', videoId: 'fVO9oSRmLpw' },
  ],
  folk_indie: [
    { title: 'Thinking Out Loud', artist: 'Ed Sheeran', videoId: 'lp-EO5I60KA' },
    { title: 'The A Team', artist: 'Ed Sheeran', videoId: 'UAWcs5H-qgQ' },
    { title: 'Castle on the Hill', artist: 'Ed Sheeran', videoId: 'K0ibBPhiaG0' },
  ],
  hiphop: [
    { title: 'Lose Yourself', artist: 'Eminem', videoId: '_Yhyp-_hX2s' },
    { title: "God's Plan", artist: 'Drake', videoId: 'xpVfcZ0ZcFM' },
    { title: 'HUMBLE.', artist: 'Kendrick Lamar', videoId: 'tvTRZJ-4EyI' },
  ],
  ballad: [
    { title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A' },
    { title: 'Someone Like You', artist: 'Adele', videoId: 'hLQl3WQQoQ0' },
    { title: 'Rolling in the Deep', artist: 'Adele', videoId: 'rYEDA3JcQqw' },
  ],
  new_age: [
    { title: 'Only Time', artist: 'Enya', videoId: 'BQnS4L7HJME' },
    { title: 'Orinoco Flow', artist: 'Enya', videoId: 'LTrk4X9ACtw' },
    { title: 'May It Be', artist: 'Enya', videoId: 'aPkYfCWgLnQ' },
  ],
};

export default function MusicPlayer({ genreKey, genreName, genreEmoji, affinityScore }: MusicPlayerProps) {
  const tracks = GENRE_TRACKS[genreKey] ?? [];
  const [trackIdx, setTrackIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const track = tracks[trackIdx];
  if (!track) return null;

  // mute=1 satisfies browser autoplay policy; user can unmute via button
  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${track.videoId}` +
    `?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;

  function handleToggleMute() {
    const iframe = iframeRef.current;
    if (isMuted) {
      ytCmd(iframe, 'unMute');
      ytCmd(iframe, 'setVolume', [85]);
    } else {
      ytCmd(iframe, 'mute');
    }
    setIsMuted((m) => !m);
  }

  function handleNext() {
    setIsMuted(true); // reset for new track
    setTrackIdx((i) => (i + 1) % tracks.length);
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[color:rgba(109,74,255,0.35)] bg-[color:rgba(109,74,255,0.08)]">
      {/* YouTube iframe — invisible, auto-plays in background */}
      <iframe
        ref={iframeRef}
        key={track.videoId}
        src={embedUrl}
        title={`${track.title} - ${track.artist}`}
        allow="autoplay; encrypted-media"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Player UI */}
      <div className="p-5">
        {/* Header row */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:rgba(109,74,255,0.25)]">
            <span className="text-xl">{genreEmoji}</span>
            {/* Pulsing ring when playing */}
            {!isMuted && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[color:rgba(109,74,255,0.4)]" />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
              AI 音樂共鳴 · 親和力 {affinityScore} 分
            </p>
            <p className="font-serif text-base text-[color:var(--text-main)]">{genreName}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {/* Playing indicator bars */}
            <div className="flex items-end gap-[3px]">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`block w-[3px] rounded-full bg-[color:var(--fortune-good)] transition-all ${
                    isMuted ? 'h-1 opacity-40' : `h-${n % 2 === 0 ? 4 : 3} animate-pulse opacity-100`
                  }`}
                  style={{ height: isMuted ? 4 : [12, 20, 14, 18][n - 1], animationDelay: `${n * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Now playing info + controls */}
        <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[color:var(--text-main)]">{track.title}</p>
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
              {isMuted ? '🔇 開聲音' : '🔊 靜音'}
            </button>
            {tracks.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                title="下一首"
                className="rounded-full border border-white/15 bg-white/8 px-3 py-2 text-sm text-[color:var(--text-sub)] transition-colors hover:bg-white/15"
              >
                ⏭
              </button>
            )}
          </div>
        </div>

        {/* Muted hint */}
        {isMuted && (
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
            ▶ 音樂自動播放中（靜音） — 點擊「開聲音」聆聽你的人格共鳴樂曲
          </p>
        )}

        {/* Track list */}
        {tracks.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tracks.map((t, i) => (
              <button
                key={t.videoId}
                type="button"
                onClick={() => { setIsMuted(true); setTrackIdx(i); }}
                className="rounded-full border px-3 py-1 text-xs transition-colors"
                style={{
                  borderColor: i === trackIdx ? 'rgba(109,74,255,0.5)' : 'rgba(255,255,255,0.1)',
                  background: i === trackIdx ? 'rgba(109,74,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: i === trackIdx ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
