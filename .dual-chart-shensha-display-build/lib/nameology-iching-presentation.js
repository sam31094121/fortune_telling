"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentNameologyIChing = presentNameologyIChing;
function presentNameologyIChing(gua, hasHour) {
    return {
        hexagramName: gua.hexagramName, kingWen: gua.kingWen, glyph: gua.glyph,
        upper: gua.upper, lower: gua.lower, changingLine: gua.changingLine,
        essence: gua.essence, advice: gua.advice,
        method: hasHour ? 'birth-date-hour' : 'name-date-symbolic',
        ruleVersion: 'nameology-iching-v1',
    };
}
