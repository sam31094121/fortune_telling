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
} from './config/battle-config';

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
} from './element-engine/index';

export { tryInject, type InjectRequest, type InjectResult } from './injection-engine/index';

export {
  checkAndApplyTransform,
  type TransformForm,
  type TransformCheckInput,
  type TransformCheckResult,
} from './transformation-engine/index';

export {
  type GuardianBeastId,
  type GuardianBeastMeta,
  type BeastBattleSlot,
  GUARDIAN_BEAST_REGISTRY,
  listGuardianBeasts,
  getGuardianBeast,
  createEmptyBeastSlot,
  applyBeastModifiersStub,
} from './beast-engine/index';

export {
  computeRewards,
  type BattleOutcome,
  type RewardRequest,
  type RewardGrant,
  type RewardResult,
} from './reward-engine/index';

export {
  createBattle,
  step,
  getPhaseOrder,
  type BattleState,
  type BattleAction,
  type BattleCardInstance,
  type BattlePhase,
  type BattleLogEntry,
} from './battle-engine/index';

export {
  ALLY_TEST_CARDS,
  ENEMY_TEST_CARDS,
  getCardDef,
  type TestCardDef,
  type SkillStub,
} from './data/test-cards';
