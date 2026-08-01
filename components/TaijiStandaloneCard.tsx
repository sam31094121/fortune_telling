'use client';

import UnifiedTaijiCore from '@/components/UnifiedTaijiCore';

type TaijiStandaloneCardProps = {
  className?: string;
  showLabel?: boolean;
  limitToLiangyi?: boolean;
  showThreeLayerMaterial?: boolean;
};

type TaijiMaterialLayer = {
  layer: string;
  title: string;
  professionalMaterial: string;
  aiInput: string;
  aiOutput: string;
  handoff: string;
};

const TAIJI_THREE_LAYER_MATERIAL: TaijiMaterialLayer[] = [
  {
    layer: '第一層',
    title: '太極本體資料底盤',
    professionalMaterial: '固定太極核心：陰陽雙魚、S 型曲線、圓形邊界與呼吸光場。',
    aiInput: '只讀太極狀態、點擊層級與分合路徑。',
    aiOutput: '輸出本體素材，不做命理解讀。',
    handoff: '交給第二層：太極狀態、陰陽關係、曲線完整性。',
  },
  {
    layer: '第二層',
    title: '兩儀演化解讀層',
    professionalMaterial: '把太極轉成兩儀語義：陽主推進，陰主承接，分合必須同一路徑。',
    aiInput: '只讀第一層，不重畫太極、不改 S 型曲線。',
    aiOutput: '輸出一生二、二生四、四象成八卦的故事。',
    handoff: '交給第三層：陰陽節奏、兩儀方向、演化文字。',
  },
  {
    layer: '第三層',
    title: '八卦與平台交接層',
    professionalMaterial: '整理成平台入口：太極只作精神核心，不覆蓋任何模組。',
    aiInput: '只讀第二層，不改太極、不改卡片、不寫會員資料。',
    aiOutput: '輸出規則：太極是總入口，各卡片仍獨立運算。',
    handoff: '交給各卡片後端與 Integration Layer，太極只提供方向感。',
  },
];

function TaijiThreeLayerMaterialPanel() {
  return (
    <section className="taiji-three-layer-material" aria-label="太極三層專業素材">
      <div className="taiji-three-layer-material__header">
        <p className="taiji-three-layer-material__eyebrow">TAIJI THREE LAYERS</p>
        <h2 className="taiji-three-layer-material__title">太極三層專業素材</h2>
        <p className="taiji-three-layer-material__summary">
          太極只作為首頁精神核心：先定本體，再解兩儀，最後交接平台，不覆蓋任何卡片。
        </p>
      </div>

      <div className="taiji-three-layer-material__grid">
        {TAIJI_THREE_LAYER_MATERIAL.map((item, index) => (
          <article key={item.layer} className="taiji-three-layer-material__layer">
            <div className="taiji-three-layer-material__badge">{index + 1}</div>
            <div className="taiji-three-layer-material__body">
              <p className="taiji-three-layer-material__layer-label">{item.layer}</p>
              <h3 className="taiji-three-layer-material__layer-title">{item.title}</h3>
              <p><strong>專業素材：</strong>{item.professionalMaterial}</p>
              <p><strong>單向流程：</strong>{item.aiInput} {item.handoff}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function TaijiStandaloneCard({
  className = '',
  showLabel = false,
  limitToLiangyi = false,
  showThreeLayerMaterial = false,
}: TaijiStandaloneCardProps) {
  const cardClassName = [
    'taiji-standalone-card taiji-open-stage',
    showThreeLayerMaterial ? 'taiji-standalone-card--with-material' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClassName}>
      <div className="taiji-stage-bagua-field" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`taiji-stage-bagua-field__mark taiji-stage-bagua-field__mark--${index}`} />
        ))}
      </div>
      <UnifiedTaijiCore showLabel={showLabel} limitToLiangyi={limitToLiangyi} />
      {showThreeLayerMaterial && <TaijiThreeLayerMaterialPanel />}
    </div>
  );
}
