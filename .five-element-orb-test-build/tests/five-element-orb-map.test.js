"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const five_element_orb_map_1 = require("../lib/five-element-orb-map");
const element_treasure_ritual_state_1 = require("../lib/element-treasure-ritual-state");
const expected = { 木: '風', 火: '火', 土: '地', 金: '空', 水: '水' };
const actual = five_element_orb_map_1.WUXING_TO_PRODUCT_ORB;
if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`Wuxing orb map changed: ${JSON.stringify(actual)}`);
for (const [wuxing, orb] of Object.entries(expected)) {
    if ((0, five_element_orb_map_1.getProductOrbFromWuxing)(wuxing) !== orb)
        throw new Error(`${wuxing} must map to ${orb}`);
}
if ((0, five_element_orb_map_1.getProductOrbFromBrand)('space') !== '空' || (0, five_element_orb_map_1.getProductOrbFromBrand)('air') !== '風')
    throw new Error('Brand aliases must use the Wuxing source map.');
if (JSON.stringify(element_treasure_ritual_state_1.ELEMENT_TREASURE_RITUAL_MS) !== JSON.stringify([0, 3000, 6000, 9000, 12000]))
    throw new Error('Ritual stages must remain 0/3/6/9/12 seconds.');
if (JSON.stringify((0, element_treasure_ritual_state_1.createSealedElementTreasureRitualState)()) !== JSON.stringify({ status: 'sealed', stage: null }))
    throw new Error('Reseal must restore the initial sealed state.');
console.log('five-element orb mapping locked');
