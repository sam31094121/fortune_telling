type BaziPillarKey = 'year' | 'month' | 'day' | 'hour';

type BaziHiddenStemLike = {
  stem: string;
  element: string;
  tenGod: string;
};

type BaziPillarLike = {
  label: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  stemTenGod: string;
  hiddenStems: BaziHiddenStemLike[];
};

type BaziTenGodLike = {
  stem: string;
  branchMain: string;
  hidden: string[];
};

export type BaziDetail = {
  version: 'bazi_detail_v1';
  pillarOrder: Array<{
    key: BaziPillarKey;
    label: string;
    ganzhi: string;
    stemElement: string;
    branchElement: string;
    stemTenGod: string;
    hiddenStems: string[];
    tenGods: string[];
  }>;
  tenGodSummary: Record<string, number>;
  hiddenStemSummary: Record<string, number>;
  elementFlow: Array<{
    from: string;
    to: string;
    relation: 'same' | 'generates' | 'controls' | 'controlled_by' | 'neutral';
    detail: string;
  }>;
  readableSummary: string;
};

const PILLAR_KEYS: BaziPillarKey[] = ['year', 'month', 'day', 'hour'];
const GENERATES: Record<string, string> = {
  '\u6728': '\u706b',
  '\u706b': '\u571f',
  '\u571f': '\u91d1',
  '\u91d1': '\u6c34',
  '\u6c34': '\u6728',
};
const CONTROLS: Record<string, string> = {
  '\u6728': '\u571f',
  '\u571f': '\u6c34',
  '\u6c34': '\u706b',
  '\u706b': '\u91d1',
  '\u91d1': '\u6728',
};

function increment(summary: Record<string, number>, key: string, amount = 1) {
  summary[key] = (summary[key] ?? 0) + amount;
}

function relationBetween(from: string, to: string): BaziDetail['elementFlow'][number]['relation'] {
  if (from === to) return 'same';
  if (GENERATES[from] === to) return 'generates';
  if (CONTROLS[from] === to) return 'controls';
  if (CONTROLS[to] === from) return 'controlled_by';
  return 'neutral';
}

function relationText(from: string, to: string) {
  const relation = relationBetween(from, to);
  const label: Record<typeof relation, string> = {
    same: '\u540c\u6c23',
    generates: '\u76f8\u751f',
    controls: '\u76f8\u5236',
    controlled_by: '\u53d7\u5236',
    neutral: '\u4e2d\u6027',
  };
  return {
    relation,
    detail: from + '\u5230' + to + '\u70ba' + label[relation] + '\u95dc\u4fc2',
  };
}

export function computeDetail(
  pillars: Record<BaziPillarKey, BaziPillarLike>,
  hiddenStems: Record<BaziPillarKey, BaziHiddenStemLike[]>,
  tenGods: Record<BaziPillarKey, BaziTenGodLike>,
): BaziDetail {
  const tenGodSummary: Record<string, number> = {};
  const hiddenStemSummary: Record<string, number> = {};

  const pillarOrder = PILLAR_KEYS.map((key) => {
    const pillar = pillars[key];
    const pillarHiddenStems = hiddenStems[key] ?? pillar.hiddenStems ?? [];
    const pillarTenGods = tenGods[key];

    increment(tenGodSummary, pillar.stemTenGod);
    pillarHiddenStems.forEach((hidden) => {
      increment(hiddenStemSummary, hidden.stem);
      increment(tenGodSummary, hidden.tenGod, 0.5);
    });

    return {
      key,
      label: pillar.label,
      ganzhi: pillar.stem + pillar.branch,
      stemElement: pillar.stemElement,
      branchElement: pillar.branchElement,
      stemTenGod: pillar.stemTenGod,
      hiddenStems: pillarHiddenStems.map((hidden) => hidden.stem + hidden.element + hidden.tenGod),
      tenGods: [pillarTenGods?.stem, pillarTenGods?.branchMain, ...(pillarTenGods?.hidden ?? [])].filter(Boolean),
    };
  });

  const elementFlow = pillarOrder.slice(0, -1).map((item, index) => {
    const next = pillarOrder[index + 1];
    const flow = relationText(item.branchElement, next.branchElement);
    return {
      from: item.label,
      to: next.label,
      relation: flow.relation,
      detail: item.label + item.branchElement + '\u8207' + next.label + next.branchElement + '\uff1a' + flow.detail + '\u3002',
    };
  });

  const readableSummary = '\u516b\u5b57\u660e\u7d30\u5df2\u4f9d\u56db\u67f1\u3001\u85cf\u5e72\u8207\u5341\u795e\u6574\u7406\uff0c\u4f9b\u524d\u7aef\u5448\u73fe\u8207 Integration Layer \u8b80\u53d6\uff1b\u672c\u6a94\u53ea\u505a\u7d50\u69cb\u5316\u6574\u7406\uff0c\u4e0d\u6539\u8b8a\u539f\u516b\u5b57\u6392\u76e4\u7b97\u6cd5\u3002';

  return {
    version: 'bazi_detail_v1',
    pillarOrder,
    tenGodSummary,
    hiddenStemSummary,
    elementFlow,
    readableSummary,
  };
}
