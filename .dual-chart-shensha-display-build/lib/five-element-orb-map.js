"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WUXING_TO_PRODUCT_ORB = void 0;
exports.getProductOrbFromWuxing = getProductOrbFromWuxing;
exports.getProductOrbFromBrand = getProductOrbFromBrand;
exports.WUXING_TO_PRODUCT_ORB = Object.freeze({
    木: '風',
    火: '火',
    土: '地',
    金: '空',
    水: '水',
});
const BRAND_TO_WUXING = Object.freeze({
    space: '金', air: '木', water: '水', fire: '火', earth: '土',
});
function getProductOrbFromWuxing(element) {
    return exports.WUXING_TO_PRODUCT_ORB[element] ?? '空';
}
function getProductOrbFromBrand(element) {
    return getProductOrbFromWuxing(BRAND_TO_WUXING[element]);
}
