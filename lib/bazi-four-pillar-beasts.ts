import starBeastsData from '@/data/star-beasts.json';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type SourceElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

type Beast = {
  id: number;
  name: string;
  image: string;
  coreMeaning: string;
  season: Season;
};

export type BaziPillarBeastInput = {
  key: 'year' | 'month' | 'day' | 'hour';
  label: string;
  stem: string;
  branch: string;
};

const BEASTS = starBeastsData.items as Beast[];

const STEM_ELEMENT: Record<string, SourceElement> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};

const SEASON_BY_BRANCH: Record<string, Season> = {
  亥: 'spring', 卯: 'spring', 未: 'spring',
  寅: 'summer', 午: 'summer', 戌: 'summer',
  巳: 'autumn', 酉: 'autumn', 丑: 'autumn',
  申: 'winter', 子: 'winter', 辰: 'winter',
};

const SEASON_LABEL: Record<Season, string> = {
  spring: '東方蒼龍', summer: '南方朱雀', autumn: '西方白虎', winter: '北方玄武',
};

const PRODUCT_ELEMENT: Record<SourceElement, '空' | '風' | '水' | '火' | '地'> = {
  metal: '空', wood: '風', water: '水', fire: '火', earth: '地',
};

function beastElement(beast: Beast): SourceElement | null {
  if (beast.name.includes('木')) return 'wood';
  if (beast.name.includes('火')) return 'fire';
  if (beast.name.includes('土')) return 'earth';
  if (beast.name.includes('金')) return 'metal';
  if (beast.name.includes('水')) return 'water';
  return null;
}

/**
 * Product collection bridge, not a claim of a traditional Bazi doctrine:
 * branch chooses one of four directions; the pillar's stem element chooses
 * the matching beast within that direction.  It only reads verified pillars.
 */
export function deriveBaziPillarBeast(pillar: BaziPillarBeastInput) {
  const sourceElement = STEM_ELEMENT[pillar.stem] ?? 'earth';
  const season = SEASON_BY_BRANCH[pillar.branch] ?? 'winter';
  const candidates = BEASTS.filter((beast) => beast.season === season);
  const beast = candidates.find((candidate) => beastElement(candidate) === sourceElement) ?? candidates[0];

  return {
    beast,
    productElement: PRODUCT_ELEMENT[sourceElement],
    direction: SEASON_LABEL[season],
    evidence: `${pillar.label}依地支定位${SEASON_LABEL[season]}，再依天干五行對應${PRODUCT_ELEMENT[sourceElement]}元素神獸`,
  };
}
