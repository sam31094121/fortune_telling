/**
 * FiveElementAssetManifest｜Asset License Gate（規格 §16）
 * 任何 License Unknown 素材不得進 Production。
 */

export interface LicensedAsset {
  name: string;
  source: string;
  license: string;
  commercialUseAllowed: boolean;
  attributionRequired: boolean;
  version: string;
  localPath: string;
}

/**
 * 本卡片不引入任何外部圖片素材：
 * 星體節點與軌道皆為專案自有之原生 SVG 向量圖形（圓形漸層 + 路徑），
 * 授權歸屬專案本身，可完全追溯、無第三方 License 風險。
 * 禁止：AI 生成星球圖、未授權網路圖片、廉價 PNG。
 */
export const FIVE_ELEMENT_ASSET_MANIFEST: LicensedAsset[] = [
  {
    name: 'five-element-orbit-svg-primitives',
    source: 'project-native (inline SVG primitives: circle/path/gradient)',
    license: 'PROJECT_OWNED',
    commercialUseAllowed: true,
    attributionRequired: false,
    version: '1.0.0',
    localPath: 'components/five-elements/FiveElementOrbitCanvas.tsx',
  },
];
