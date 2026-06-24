/**
 * 曲風 → 代表試聽曲對應（供首頁「大數據音樂偏好」預覽播放器使用）
 * videoId 皆為已驗證可嵌入播放的 YouTube 影片。
 */

export interface GenreTrack {
  title: string;
  artist: string;
  videoId: string;
}

const GENRE_TRACKS: Record<string, GenreTrack> = {
  pop: { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8' },
  rock: { title: 'Believer', artist: 'Imagine Dragons', videoId: '7wtfhZwyrcc' },
  electronic: { title: 'Faded', artist: 'Alan Walker', videoId: '60ItHLz5WEA' },
  classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
  jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
  rnb_soul: { title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A' },
  folk_indie: { title: 'Thinking Out Loud', artist: 'Ed Sheeran', videoId: 'lp-EO5I60KA' },
  hiphop: { title: 'On My Way', artist: 'Alan Walker', videoId: 'dhYOPzcsbGM' },
  ballad: { title: 'Someone Like You', artist: 'Adele', videoId: 'hLQl3WQQoQ0' },
  new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
};

export function getGenreTrack(genreKey: string): GenreTrack {
  return GENRE_TRACKS[genreKey] ?? GENRE_TRACKS.pop;
}
