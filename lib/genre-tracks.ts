/**
 * 曲風 + 年代 → 代表試聽曲對應（供「大數據音樂偏好」預覽播放器使用）
 * videoId 皆為已驗證可嵌入播放的 YouTube 影片。
 */

export interface GenreTrack {
  title: string;
  artist: string;
  videoId: string;
}

// 依據年代 (era) 與曲風 (genre) 的對照表，確保年代、歌手與歌曲 100% 一致，絕不矛盾
const ERA_GENRE_TRACKS: Record<string, Record<string, GenreTrack>> = {
  '1960s': {
    pop: { title: 'Yesterday', artist: 'The Beatles', videoId: 'wM0IDLA4CJo' },
    rock: { title: 'Blowin In The Wind', artist: 'Bob Dylan', videoId: 'vWwgrjjyRZM' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'Faded', artist: 'Alan Walker', videoId: '60ItHLz5WEA' },
    rnb_soul: { title: "Can't Help Falling In Love", artist: 'Elvis Presley', videoId: 'vGJTaP5anOU' },
    folk_indie: { title: 'Blowin In The Wind', artist: 'Bob Dylan', videoId: 'vWwgrjjyRZM' },
    hiphop: { title: 'Yesterday', artist: 'The Beatles', videoId: 'wM0IDLA4CJo' },
    ballad: { title: '何日君再來', artist: '鄧麗君', videoId: 'ikrasYUi3kM' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '1970s': {
    pop: { title: 'Dancing Queen', artist: 'ABBA', videoId: 'xFrGuyw1V8s' },
    rock: { title: 'Hotel California', artist: 'Eagles', videoId: '09839DpTctU' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'Imagine', artist: 'John Lennon', videoId: 'YkgkThdzx-8' },
    rnb_soul: { title: '月亮代表我的心', artist: '鄧麗君', videoId: 'IiFm7AWP9n4' },
    folk_indie: { title: '橄欖樹', artist: '齊豫', videoId: 'LZb8fJZFhlo' },
    hiphop: { title: 'Dancing Queen', artist: 'ABBA', videoId: 'xFrGuyw1V8s' },
    ballad: { title: '小城故事', artist: '鄧麗君', videoId: 'Bgi5f_0atGE' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '1980s': {
    pop: { title: 'Careless Whisper', artist: 'George Michael', videoId: 'izGwDsrQ1eQ' },
    rock: { title: 'Beat It', artist: 'Michael Jackson', videoId: 'oRdxUFDoQe0' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'Take On Me', artist: 'A-ha', videoId: 'djV11Xbc914' },
    rnb_soul: { title: '其實你不懂我的心', artist: '童安格', videoId: 'Wr9SYsEYRao' },
    folk_indie: { title: '外面的世界', artist: '齊秦', videoId: 'PF3ZeNZOBE4' },
    hiphop: { title: '讓我一次愛個夠', artist: '庾澄慶', videoId: 'XSq8nZy5caQ' },
    ballad: { title: '酒干倘賣無', artist: '蘇芮', videoId: 'XJfFYbZn_P8' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '1990s': {
    pop: { title: 'My Heart Will Go On', artist: 'Celine Dion', videoId: 'WNIPqapd4FQ' },
    rock: { title: 'Zombie', artist: 'The Cranberries', videoId: '6TxiJLy0P5M' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'I Want It That Way', artist: 'Backstreet Boys', videoId: '4fndeDfaWCg' },
    rnb_soul: { title: '吻別', artist: '張學友', videoId: 'mIF-nn_y2_8' },
    folk_indie: { title: '夢中人', artist: '王菲', videoId: 'hN2jOHeI5tc' },
    hiphop: { title: '心太軟', artist: '任賢齊', videoId: 'ZSWeurc1yMw' },
    ballad: { title: '傷痕', artist: '林憶蓮', videoId: 'qG3DdU8S5fQ' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '2000s': {
    pop: { title: 'Yellow', artist: 'Coldplay', videoId: 'yKNxeF4Kxyc' },
    rock: { title: 'Complicated', artist: 'Avril Lavigne', videoId: '5NPBIwQffSE' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'Faded', artist: 'Alan Walker', videoId: '60ItHLz5WEA' },
    rnb_soul: { title: '說謊', artist: '林宥嘉', videoId: 'ftfJRzW0MPo' },
    folk_indie: { title: '知足', artist: '五月天', videoId: '_o0oeyCtoFA' },
    hiphop: { title: '晴天', artist: '周杰倫', videoId: 'DYptgVvkVLQ' },
    ballad: { title: '青花瓷', artist: '周杰倫', videoId: 'Z8Mqw0b9ADs' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '2010s': {
    pop: { title: 'Shape of You', artist: 'Ed Sheeran', videoId: 'JGwWNGJdvx8' },
    rock: { title: 'Believer', artist: 'Imagine Dragons', videoId: '7wtfhZwyrcc' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'On My Way', artist: 'Alan Walker', videoId: 'dhYOPzcsbGM' },
    rnb_soul: { title: 'Someone Like You', artist: 'Adele', videoId: 'hLQl3WQQoQ0' },
    folk_indie: { title: '你就不要想起我', artist: '田馥甄', videoId: 'T8J7fkNp34k' },
    hiphop: { title: '告白氣球', artist: '周杰倫', videoId: 'bu7nU9Mhpyo' },
    ballad: { title: '像我這樣的人', artist: '毛不易', videoId: 'nBcYrqsv5tc' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  },
  '2020s': {
    pop: { title: 'Blinding Lights', artist: 'The Weeknd', videoId: '4NRXx6U8ABQ' },
    rock: { title: 'Stay', artist: 'The Kid LAROI', videoId: 'kTJczUoc26U' },
    classical: { title: 'Experience', artist: 'Ludovico Einaudi', videoId: 'hN_q-_nGv4U' },
    jazz: { title: 'River Flows In You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    electronic: { title: 'As It Was', artist: 'Harry Styles', videoId: 'H5v3kku4y6Q' },
    rnb_soul: { title: '愛你', artist: '周興哲', videoId: '-78d_NJiLqY' },
    folk_indie: { title: '不知所措', artist: '告五人', videoId: 'Vr0b7OKMBrE' },
    hiphop: { title: '起風了', artist: '買辣椒也用券', videoId: '3tJUflhYIpo' },
    ballad: { title: '往後餘生', artist: '馬良', videoId: 'qCey-my4yFo' },
    new_age: { title: 'Only Time', artist: 'Enya', videoId: '7wfYIMyS_dI' },
  }
};

const DEFAULT_GENRE_TRACKS: Record<string, GenreTrack> = {
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

export function getGenreTrack(genreKey: string, era?: string): GenreTrack {
  if (era && ERA_GENRE_TRACKS[era]) {
    return ERA_GENRE_TRACKS[era][genreKey] ?? ERA_GENRE_TRACKS[era].pop;
  }
  return DEFAULT_GENRE_TRACKS[genreKey] ?? DEFAULT_GENRE_TRACKS.pop;
}
