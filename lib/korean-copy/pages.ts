/** 한국어 표시 전용 사전 — 기타 페이지·공용 컴포넌트. 페이지별 파일은 ./pages/ 폴더에 있습니다. */
import { koBaziCopy } from './pages/bazi';
import { koNameologyCopy } from './pages/nameology';
import { koNumerologyCopy } from './pages/numerology';
import { koZodiacCopy } from './pages/zodiac';
import { koRedLuanHeartbeatCopy } from './pages/red-luan-heartbeat';
import { koTarotCopy } from './pages/tarot';
import { koInsightCopy } from './pages/insight';
import { koMusicCopy } from './pages/music';
import { koStarBeastsCopy } from './pages/star-beasts';
import { koGrowthCenterCopy } from './pages/growth-center';
import { koSharedCopy } from './pages/shared';
import { koBeastGameCopy } from './pages/beast-game';
import { koMiscCopy } from './pages/misc';

export const pagesKoreanCopy: Record<string, string> = {
  ...koBaziCopy,
  ...koNameologyCopy,
  ...koNumerologyCopy,
  ...koZodiacCopy,
  ...koRedLuanHeartbeatCopy,
  ...koTarotCopy,
  ...koInsightCopy,
  ...koMusicCopy,
  ...koStarBeastsCopy,
  ...koGrowthCenterCopy,
  ...koSharedCopy,
  ...koBeastGameCopy,
  ...koMiscCopy,
};
