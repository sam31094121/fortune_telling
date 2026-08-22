import starBeastsData from '@/data/star-beasts.json';

type NameologyElement = '木' | '火' | '土' | '金' | '水';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

type StarBeast = {
  id: number;
  name: string;
  image: string;
  coreMeaning: string;
  season: Season;
};

const BEASTS = starBeastsData.items as StarBeast[];
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const DIRECTION_LABEL: Record<Season, string> = {
  spring: '東方蒼龍',
  summer: '南方朱雀',
  autumn: '西方白虎',
  winter: '北方玄武',
};

function elementOfBeast(beast: StarBeast): NameologyElement | null {
  if (beast.name.includes('木')) return '木';
  if (beast.name.includes('火')) return '火';
  if (beast.name.includes('土')) return '土';
  if (beast.name.includes('金')) return '金';
  if (beast.name.includes('水')) return '水';
  return null;
}

/**
 * 姓名學神獸橋接：總格五行先鎖定同元素四宿，再以各字筆畫的順序簽章固定四象位置。
 * 這是可重算的產品呈現規則，不宣稱為傳統姓名學原典。
 */
export function deriveNameologyTotalBeast(totalGrid: { value: number; element: NameologyElement }, characterStrokes: number[]) {
  const candidates = SEASON_ORDER
    .map((season) => BEASTS.find((beast) => beast.season === season && elementOfBeast(beast) === totalGrid.element))
    .filter((beast): beast is StarBeast => Boolean(beast));
  // 總格相同的不同姓名，仍會因每個字的筆畫位置不同而得到不同序位；不使用亂數。
  const strokeSignature = characterStrokes.reduce(
    (sum, strokes, index) => sum + (Math.abs(strokes) * ((index + 1) ** 2)),
    totalGrid.value,
  );
  const index = Math.abs(strokeSignature - 1) % candidates.length;
  const beast = candidates[index] ?? BEASTS[0];

  return {
    beast,
    direction: DIRECTION_LABEL[beast.season],
    evidence: `總格 ${totalGrid.value} 畫先判定${totalGrid.element}行，再以姓名各字筆畫順序定位${DIRECTION_LABEL[beast.season]}的同元素神獸。`,
  };
}
