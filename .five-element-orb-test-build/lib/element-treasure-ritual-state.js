"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELEMENT_TREASURE_RITUAL_MS = void 0;
exports.createSealedElementTreasureRitualState = createSealedElementTreasureRitualState;
exports.ELEMENT_TREASURE_RITUAL_MS = [0, 3000, 6000, 9000, 12000];
/** The deterministic state restored by the shared 「還原封印」 action. */
function createSealedElementTreasureRitualState() {
    return { status: 'sealed', stage: null };
}
