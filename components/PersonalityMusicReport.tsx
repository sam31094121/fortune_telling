'use client';

import MusicPlayer from './MusicPlayer';

interface PersonalityMatrix {
  emotion: number; logic: number; social: number; leadership: number;
  security: number; creativity: number; risk: number; attachment: number;
}

interface MusicParameters {
  bpm: number; key: string; genre: string; mood: string[];
  vocal_style: string; instrument: string[]; lyric_theme: string[];
}

interface MusicReport {
  music_narrative: string; song_title_suggestion: string;
  lyric_opening: string; music_message: string; wisdom_note: string;
}

interface OceanProfile {
  openness: number; conscientiousness: number; extraversion: number;
  agreeableness: number; neuroticism: number;
}

interface Meta {
  zodiac: string; era: string; eraDisplayName?: string;
  wuxing?: string; wuxingColor?: string;
  chineseZodiac?: string; heavenlyStem?: string;
  archetype?: string; archetypeSymbol?: string; archetypeEn?: string;
  archetypeDescription?: string; archetypeMusicPersona?: string;
  archetypeShadow?: string; archetypeCoreWound?: string;
  archetypeCoreGift?: string; archetypeLifeLesson?: string;
  archetypeShadowIntegration?: string;
  archetypeSecondary?: string; archetypeSecondarySymbol?: string;
  ocean?: OceanProfile;
}

interface MandarinTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface PersonalityMusicReportProps {
  personalityMatrix: PersonalityMatrix;
  musicParameters: MusicParameters;
  musicReport: MusicReport;
  meta: Meta;
  mandarinTracks?: MandarinTrack[];
  name: string;
  onReset: () => void;
}

const GENRE_TO_PLAYER_KEY: Record<string, string> = {
  cinematic_pop: 'ballad', acoustic_pop: 'folk_indie', indie_folk: 'folk_indie',
  alternative_rock: 'rock', electronic_pop: 'electronic',
  experimental_electronic: 'electronic', avant_garde: 'new_age',
  ambient_electronic: 'new_age', psychedelic_rock: 'rock', classical_ambient: 'classical',
};

const GENRE_NAMES: Record<string, string> = {
  cinematic_pop: '電影感流行', acoustic_pop: '原聲流行', indie_folk: '獨立民謠',
  alternative_rock: '另類搖滾', electronic_pop: '電子流行',
  experimental_electronic: '實驗電子', avant_garde: '前衛音樂',
  ambient_electronic: '氛圍電子', psychedelic_rock: '迷幻搖滾', classical_ambient: '古典環境音',
};

const GENRE_EMOJI: Record<string, string> = {
  cinematic_pop: '🎬', acoustic_pop: '🎸', indie_folk: '🌿', alternative_rock: '⚡',
  electronic_pop: '🎛️', experimental_electronic: '🔮', avant_garde: '🌀',
  ambient_electronic: '🌌', psychedelic_rock: '🎆', classical_ambient: '🎻',
};

// 把 0-100 分映射成靈魂詩詞（不顯示數字）
const MATRIX_POETIC: { key: keyof PersonalityMatrix; label: string; low: string; mid: string; high: string }[] = [
  { key: 'emotion',    label: '情感深度', low: '靜水流深', mid: '波光粼粼', high: '海潮洶湧' },
  { key: 'creativity', label: '創意能量', low: '春芽初綻', mid: '夏木成蔭', high: '星辰爆發' },
  { key: 'social',     label: '社交共鳴', low: '獨行月下', mid: '庭院清談', high: '萬人同頻' },
  { key: 'leadership', label: '引領磁場', low: '自在隨緣', mid: '引路人行', high: '山嶽為令' },
  { key: 'logic',      label: '洞察結構', low: '直覺先行', mid: '陰陽相生', high: '萬象歸一' },
  { key: 'security',   label: '根系穩定', low: '雲遊四海', mid: '松竹共生', high: '磐石千秋' },
  { key: 'risk',       label: '躍遷勇氣', low: '步步為營', mid: '破浪前行', high: '無懼天涯' },
  { key: 'attachment', label: '情緣深度', low: '淡然如風', mid: '緣起緣滅', high: '萬古長情' },
];

function getPoeticWord(score: number, opts: { low: string; mid: string; high: string }) {
  if (score >= 75) return opts.high;
  if (score >= 50) return opts.mid;
  return opts.low;
}

export default function PersonalityMusicReport({
  personalityMatrix, musicParameters, musicReport, meta, mandarinTracks, name, onReset,
}: PersonalityMusicReportProps) {
  const playerGenreKey = GENRE_TO_PLAYER_KEY[musicParameters.genre] || 'ballad';
  const genreName = GENRE_NAMES[musicParameters.genre] || musicParameters.genre;
  const genreEmoji = GENRE_EMOJI[musicParameters.genre] || '🎵';

  return (
    <div className="space-y-6">

      {/* ─── 歌名 + 命運宣言 ──────────────────────────── */}
      <div className="fortune-card overflow-hidden">
        {/* 命理印記列 - 純視覺標籤，無數字 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-6 py-4 sm:px-8">
          {meta.wuxing && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold tracking-widest"
              style={{
                background: `${meta.wuxingColor}18`,
                color: meta.wuxingColor,
                border: `1px solid ${meta.wuxingColor}35`,
              }}
            >
              {meta.heavenlyStem} · {meta.wuxing}
            </span>
          )}
          {meta.chineseZodiac && (
            <span className="rounded-full border border-amber-400/25 bg-amber-950/20 px-3 py-1 text-xs font-semibold tracking-widest text-amber-300">
              {meta.chineseZodiac}年
            </span>
          )}
          {meta.archetype && (
            <span className="rounded-full border border-violet-400/25 bg-violet-950/20 px-3 py-1 text-xs tracking-widest text-violet-200">
              {meta.archetypeSymbol} {meta.archetype}
            </span>
          )}
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs tracking-widest text-[color:var(--text-muted)]">
            {meta.zodiac}
          </span>
        </div>

        <div className="px-6 py-8 sm:px-8">
          <p className="text-xs uppercase tracking-[0.4em] text-violet-300/70">天地人 · 專屬靈魂樂章</p>
          <h2
            className="mt-3 font-serif leading-tight text-[color:var(--text-main)]"
            style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)' }}
          >
            「{musicReport.song_title_suggestion}」
          </h2>
          <p
            className="mt-3 font-serif text-base italic leading-8 sm:text-lg"
            style={{ color: meta.wuxingColor ?? 'var(--earth-gold)' }}
          >
            {musicReport.lyric_opening}
          </p>
          <p className="mt-5 text-sm leading-9 text-[color:var(--text-sub)]">
            {musicReport.music_narrative}
          </p>
        </div>
      </div>

      {/* ─── 音樂播放器（國語歌曲優先）─────────────────── */}
      <MusicPlayer
        mandarinTracks={mandarinTracks}
        eraDisplayName={meta.eraDisplayName ?? meta.era}
        genreKey={playerGenreKey}
        genreName={genreName}
        genreEmoji={genreEmoji}
        affinityScore={Math.round((personalityMatrix.creativity + personalityMatrix.emotion) / 2)}
      />

      {/* ─── 命理層：五行 + 天干 + 生肖 圖騰 ─────────── */}
      {meta.wuxing && (
        <div className="fortune-card earth-card overflow-hidden">
          <div
            className="h-0.5 w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${meta.wuxingColor}, transparent)` }}
          />
          <div className="px-6 py-8 sm:px-8">
            <p className="mb-7 text-xs uppercase tracking-[0.4em] text-amber-300/70">命理層 · 天干五行生肖</p>
            <div className="grid gap-5 sm:grid-cols-3">

              {/* 五行 */}
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    background: `${meta.wuxingColor}18`,
                    color: meta.wuxingColor,
                    border: `1px solid ${meta.wuxingColor}40`,
                    boxShadow: `0 0 24px ${meta.wuxingColor}20`,
                  }}
                >
                  {meta.wuxing}
                </div>
                <p className="text-xs tracking-[0.2em] text-[color:var(--text-muted)]">五行之屬</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-main)]">
                  {meta.wuxing === '木' ? '生長 · 仁善' :
                   meta.wuxing === '火' ? '光明 · 熱忱' :
                   meta.wuxing === '土' ? '厚德 · 穩定' :
                   meta.wuxing === '金' ? '精準 · 義氣' : '智慧 · 流動'}
                </p>
              </div>

              {/* 天干 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/25 bg-amber-950/20 text-2xl font-bold text-amber-200">
                  {meta.heavenlyStem}
                </div>
                <p className="text-xs tracking-[0.2em] text-[color:var(--text-muted)]">天干印記</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-main)]">
                  {['甲','乙'].includes(meta.heavenlyStem ?? '') ? '陽木 · 棟樑之材' :
                   ['丙','丁'].includes(meta.heavenlyStem ?? '') ? '光火 · 明照萬物' :
                   ['戊','己'].includes(meta.heavenlyStem ?? '') ? '大地 · 承載萬生' :
                   ['庚','辛'].includes(meta.heavenlyStem ?? '') ? '金氣 · 革新淬鍊' : '天水 · 智慧深流'}
                </p>
              </div>

              {/* 生肖 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/15 bg-amber-950/10 text-3xl">
                  {meta.chineseZodiac === '鼠' ? '🐭' : meta.chineseZodiac === '牛' ? '🐮' :
                   meta.chineseZodiac === '虎' ? '🐯' : meta.chineseZodiac === '兔' ? '🐰' :
                   meta.chineseZodiac === '龍' ? '🐲' : meta.chineseZodiac === '蛇' ? '🐍' :
                   meta.chineseZodiac === '馬' ? '🐴' : meta.chineseZodiac === '羊' ? '🐑' :
                   meta.chineseZodiac === '猴' ? '🐵' : meta.chineseZodiac === '雞' ? '🐓' :
                   meta.chineseZodiac === '狗' ? '🐕' : '🐷'}
                </div>
                <p className="text-xs tracking-[0.2em] text-[color:var(--text-muted)]">生肖靈性</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-main)]">
                  {meta.chineseZodiac === '龍' || meta.chineseZodiac === '虎' ? '王者氣象' :
                   meta.chineseZodiac === '兔' || meta.chineseZodiac === '羊' ? '溫柔藝魂' :
                   meta.chineseZodiac === '鼠' || meta.chineseZodiac === '猴' ? '靈動智慧' :
                   meta.chineseZodiac === '蛇' ? '神秘洞見' :
                   meta.chineseZodiac === '馬' ? '自由奔放' :
                   meta.chineseZodiac === '牛' || meta.chineseZodiac === '狗' ? '忠誠承載' :
                   meta.chineseZodiac === '雞' ? '極致完美' : '純善豐盛'}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── 心理學層：榮格靈魂原型（儀式感）────────── */}
      {meta.archetype && (
        <div className="fortune-card sky-card overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="px-6 py-8 sm:px-8">
            <p className="mb-7 text-xs uppercase tracking-[0.4em] text-violet-300/70">心理學層 · 榮格靈魂原型</p>

            {/* 主原型：儀式中心呈現 */}
            <div className="mb-7 text-center">
              <div
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border text-4xl"
                style={{
                  borderColor: 'rgba(167,139,250,0.3)',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.2)',
                }}
              >
                {meta.archetypeSymbol}
              </div>
              <p className="text-xs tracking-[0.3em] text-[color:var(--text-muted)]">你的靈魂原型</p>
              <h3 className="mt-2 font-serif text-3xl text-[color:var(--text-main)]">{meta.archetype}</h3>
              <p className="mt-1 text-xs tracking-widest text-violet-300/50">{meta.archetypeEn}</p>
              <p className="mx-auto mt-5 max-w-sm text-sm leading-8 text-[color:var(--text-sub)]">
                {meta.archetypeDescription}
              </p>
            </div>

            {/* 三欄洞察：天賦 / 課題 / 音樂靈魂 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-400/15 bg-amber-950/10 p-5 text-center">
                <p className="text-xs tracking-widest text-amber-300/70">核心天賦</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-main)]">{meta.archetypeCoreGift}</p>
              </div>
              <div className="rounded-2xl border border-violet-400/15 bg-violet-950/10 p-5 text-center">
                <p className="text-xs tracking-widest text-violet-300/70">此生課題</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-main)]">{meta.archetypeLifeLesson}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-5 text-center">
                <p className="text-xs tracking-widest text-[color:var(--text-muted)]">音樂靈魂</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{meta.archetypeMusicPersona}</p>
              </div>
            </div>

            {/* 光影整合指引 */}
            {meta.archetypeShadowIntegration && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
                <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">✦ 光影整合 · 內在指引</p>
                <p className="text-sm italic leading-8 text-[color:var(--text-sub)]">
                  {meta.archetypeShadowIntegration}
                </p>
              </div>
            )}

            {/* 輔助原型 */}
            {meta.archetypeSecondary && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-5 py-3">
                <span className="text-xl">{meta.archetypeSecondarySymbol}</span>
                <div>
                  <p className="text-xs tracking-widest text-[color:var(--text-muted)]">輔助原型</p>
                  <p className="text-sm font-semibold text-[color:var(--text-main)]">{meta.archetypeSecondary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 靈魂頻率圖譜（詩詞化，無原始分數）──────── */}
      <div className="fortune-card px-6 py-7 sm:px-8">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">靈魂頻率圖譜</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MATRIX_POETIC.map(({ key, label, low, mid, high }) => {
            const score = personalityMatrix[key];
            const word = getPoeticWord(score, { low, mid, high });
            const isHigh = score >= 75;
            const isMid = score >= 50;
            const barColor = isHigh
              ? 'linear-gradient(90deg, var(--sky-violet), #c084fc)'
              : isMid
              ? 'linear-gradient(90deg, var(--human-cyan), #67e8f9)'
              : 'linear-gradient(90deg, var(--earth-gold), #fcd34d)';

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs tracking-widest text-[color:var(--text-muted)]">{label}</span>
                  <span className="text-xs font-semibold text-[color:var(--text-sub)]">{word}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 音頻參數（BPM 保留，其餘詩意化）────────── */}
      <div className="fortune-card px-6 py-7 sm:px-8">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">靈魂音頻參數</p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">節拍</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--text-main)]">{musicParameters.bpm}</p>
            <p className="text-xs text-[color:var(--text-muted)]">BPM</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">音調</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--text-main)]">{musicParameters.key}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">風格</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--text-main)]">{genreEmoji} {genreName}</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: '靈魂氛圍', items: musicParameters.mood, color: 'violet' as const },
            { label: '音色織體', items: musicParameters.instrument, color: 'amber' as const },
            { label: '歌詞靈魂', items: musicParameters.lyric_theme, color: 'pink' as const },
          ].map(({ label, items, color }) => (
            <div key={label}>
              <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">{label}</p>
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <span
                    key={item}
                    className={`rounded-full border px-3 py-1 text-xs border-${color}-400/20 bg-${color}-950/15 text-${color}-200`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 這首歌想對你說 ───────────────────────────── */}
      <div className="sky-card fortune-card px-6 py-7 sm:px-8">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-violet-300/70">這首歌想對你說</p>
        <p className="text-sm leading-9 text-[color:var(--text-main)]">{musicReport.music_message}</p>
      </div>

      {/* ─── 善念結語 ─────────────────────────────────── */}
      <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
        <div className="mb-7 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">天地善念 · 命運智慧</p>
          <p className="mx-auto mt-5 max-w-md font-serif text-sm leading-9 text-[color:var(--text-main)]">
            {musicReport.wisdom_note}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
            匯出靈魂音樂報告
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            重新解讀
          </button>
        </div>
      </div>

    </div>
  );
}
