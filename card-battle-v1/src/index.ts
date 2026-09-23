/**
 * card-battle-v1 公開匯出
 */

export {
  createBattleConfig,
  PLACEHOLDER_TEST_CONFIG,
  type BattleConfig,
  type CardStats,
  type InjectConfig,
  type TransformConfig,
  type EnergyConfig,
  type TeamConfig,
  type TurnConfig,
} from './config/battle-config.js';

export {
  type PlayerElement,
  isPlayerElement,
  allPlayerElements,
  toPlayerLabel,
  fromWuxing,
  toWuxingInternal,
  getCounteredElement,
  isCounter,
  getGeneratedElement,
  assertNoForbiddenChars,
  assertPlayerFacingStrings,
} from './element-engine/index.js';

export { tryInject, type InjectRequest, type InjectResult } from './injection-engine/index.js';

export {
  checkAndApplyTransform,
  type TransformForm,
  type TransformCheckInput,
  type TransformCheckResult,
} from './transformation-engine/index.js';

export {
  type GuardianBeastId,
  type GuardianBeastMeta,
  type BeastBattleSlot,
  GUARDIAN_BEAST_REGISTRY,
  listGuardianBeasts,
  getGuardianBeast,
  createEmptyBeastSlot,
  applyBeastModifiersStub,
} from './beast-engine/index.js';

export {
  computeRewards,
  type BattleOutcome,
  type RewardRequest,
  type RewardGrant,
  type RewardResult,
} from './reward-engine/index.js';

export {
  createBattle,
  step,
  getPhaseOrder,
  type BattleState,
  type BattleAction,
  type BattleCardInstance,
  type BattlePhase,
  type BattleLogEntry,
} from './battle-engine/index.js';

export {
  ALLY_TEST_CARDS,
  ENEMY_TEST_CARDS,
  getCardDef,
  type TestCardDef,
  type SkillStub,
} from './data/test-cards.js';
