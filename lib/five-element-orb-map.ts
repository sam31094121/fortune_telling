/**
 * The only allowed Wuxing-to-product-orb mapping. Calculation layers retain
 * 金、木、水、火、土; UI layers must call these helpers instead of declaring a
 * local map.
 */
export type TraditionalWuxing = '金' | '木' | '水' | '火' | '土';
export type ProductOrbElement = '空' | '風' | '水' | '火' | '地';

export const WUXING_TO_PRODUCT_ORB: Readonly<Record<TraditionalWuxing, ProductOrbElement>> = Object.freeze({
  木: '風',
  火: '火',
  土: '地',
  金: '空',
  水: '水',
});

const BRAND_TO_WUXING: Readonly<Record<'space' | 'air' | 'water' | 'fire' | 'earth', TraditionalWuxing>> = Object.freeze({
  space: '金', air: '木', water: '水', fire: '火', earth: '土',
});

export function getProductOrbFromWuxing(element: TraditionalWuxing | string): ProductOrbElement {
  return WUXING_TO_PRODUCT_ORB[element as TraditionalWuxing] ?? '空';
}

export function getProductOrbFromBrand(element: keyof typeof BRAND_TO_WUXING): ProductOrbElement {
  return getProductOrbFromWuxing(BRAND_TO_WUXING[element]);
}
