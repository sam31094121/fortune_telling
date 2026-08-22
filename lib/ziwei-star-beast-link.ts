import starBeastsData from '@/data/star-beasts.json';
import type { FiveElementKey } from '@/lib/five-element-engine';

type StarBeastSeason = 'spring' | 'summer' | 'autumn' | 'winter';

type StarBeast = {
  id: number;
  name: string;
  image: string;
  coreMeaning: string;
  season: StarBeastSeason;
};

type PalaceEvidence = {
  key: string;
  name: string;
  palaceStem: string;
  branch: string;
  majorStars: string[];
};

const BEASTS = starBeastsData.items as StarBeast[];

const STEM_ELEMENT: Record<string, FiveElementKey> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

const PRODUCT_ELEMENT: Record<FiveElementKey, '空' | '風' | '水' | '火' | '地'> = {
  metal: '空',
  wood: '風',
  water: '水',
  fire: '火',
  earth: '地',
};

const SEASON_BY_ELEMENT: Record<Exclude<FiveElementKey, 'earth'>, StarBeastSeason> = {
  wood: 'spring',
  fire: 'summer',
  metal: 'autumn',
  water: 'winter',
};

const SEASON_LABEL: Record<StarBeastSeason, string> = {
  spring: '東方蒼龍',
  summer: '南方朱雀',
  autumn: '西方白虎',
  winter: '北方玄武',
};

const STAR_ELEMENT: Record<string, FiveElementKey> = {
  紫微: 'earth', 天機: 'wood', 太陽: 'fire', 武曲: 'metal', 天同: 'water', 廉貞: 'fire', 天府: 'earth',
  太陰: 'water', 貪狼: 'wood', 巨門: 'water', 天相: 'water', 天梁: 'earth', 七殺: 'metal', 破軍: 'water',
};

// 三方四正的四個宮位以地支三合定位四象：亥卯未東、寅午戌南、巳酉丑西、申子辰北。
const SEASON_BY_BRANCH: Record<string, StarBeastSeason> = {
  亥: 'spring', 卯: 'spring', 未: 'spring',
  寅: 'summer', 午: 'summer', 戌: 'summer',
  巳: 'autumn', 酉: 'autumn', 丑: 'autumn',
  申: 'winter', 子: 'winter', 辰: 'winter',
};

function seasonFor(palace: PalaceEvidence, fallbackElement: FiveElementKey) {
  return SEASON_BY_BRANCH[palace.branch] ?? (fallbackElement === 'earth' ? 'winter' : SEASON_BY_ELEMENT[fallbackElement]);
}

function beastElement(beast: StarBeast): FiveElementKey | null {
  if (beast.name.includes('木')) return 'wood';
  if (beast.name.includes('火')) return 'fire';
  if (beast.name.includes('土')) return 'earth';
  if (beast.name.includes('金')) return 'metal';
  if (beast.name.includes('水')) return 'water';
  return null;
}

/**
 * Product-only bridge: it does not claim that Ziwei traditionally assigns a
 * specific 28-mansion beast. It links the four Ziwei Sanfang Sizheng palaces
 * to the project collection through two inspectable signals:
 * 1) the palace branch's Sanhe direction, and 2) the palace main star element.
 */
export function deriveZiweiStarBeastLink({
  palace,
  bodyPalace,
  crossPalaces = [],
}: {
  palace: PalaceEvidence;
  bodyPalace?: PalaceEvidence | null;
  crossPalaces?: PalaceEvidence[];
}) {
  const stem = palace.palaceStem?.slice(0, 1) ?? '';
  const stemElement = STEM_ELEMENT[stem] ?? 'earth';
  const mainStar = palace.majorStars.find((star) => STAR_ELEMENT[star]);
  const borrowedPalace = mainStar
    ? null
    : crossPalaces.find((candidate) => candidate.majorStars.some((star) => STAR_ELEMENT[star]));
  const borrowedStar = borrowedPalace?.majorStars.find((star) => STAR_ELEMENT[star]);
  const sourceStar = mainStar ?? borrowedStar;
  const sourceElement = sourceStar ? STAR_ELEMENT[sourceStar] : stemElement;
  const season = seasonFor(palace, sourceElement);
  const candidates = BEASTS.filter((beast) => beast.season === season);
  const beast = candidates.find((candidate) => beastElement(candidate) === sourceElement) ?? candidates[0];
  const productElement = PRODUCT_ELEMENT[sourceElement];

  return {
    beast,
    sourceElement,
    productElement,
    season,
    seasonLabel: SEASON_LABEL[season],
    sourceStar: sourceStar ?? null,
    borrowedPalaceName: borrowedPalace?.name ?? null,
    evidence: `${palace.name}${palace.branch}位定位${SEASON_LABEL[season]}・${mainStar
      ? `主星${mainStar}`
      : borrowedStar && borrowedPalace
        ? `空宮借${borrowedPalace.name}${borrowedStar}`
        : '宮干'}對應${productElement}${bodyPalace ? `・身宮落${bodyPalace.name}` : ''}`,
  };
}
