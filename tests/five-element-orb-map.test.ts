import { WUXING_TO_PRODUCT_ORB, getProductOrbFromBrand, getProductOrbFromWuxing } from '../lib/five-element-orb-map';
import { ELEMENT_TREASURE_RITUAL_MS, createSealedElementTreasureRitualState } from '../lib/element-treasure-ritual-state';

const expected = { 木: '風', 火: '火', 土: '地', 金: '空', 水: '水' };
const actual = WUXING_TO_PRODUCT_ORB;
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Wuxing orb map changed: ${JSON.stringify(actual)}`);
for (const [wuxing, orb] of Object.entries(expected)) {
  if (getProductOrbFromWuxing(wuxing) !== orb) throw new Error(`${wuxing} must map to ${orb}`);
}
if (getProductOrbFromBrand('space') !== '空' || getProductOrbFromBrand('air') !== '風') throw new Error('Brand aliases must use the Wuxing source map.');
if (JSON.stringify(ELEMENT_TREASURE_RITUAL_MS) !== JSON.stringify([0, 3000, 6000, 9000, 12000])) throw new Error('Ritual stages must remain 0/3/6/9/12 seconds.');
if (JSON.stringify(createSealedElementTreasureRitualState()) !== JSON.stringify({ status: 'sealed', stage: null })) throw new Error('Reseal must restore the initial sealed state.');
console.log('five-element orb mapping locked');
