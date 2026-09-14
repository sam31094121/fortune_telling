/**
 * 合體演出計畫：必須來自真實 Registry，數量 4～8，決定性。
 */
import assert from 'node:assert/strict';
import {
  createFusionSession,
  setFusionPair,
  gainOrbs,
  gainRage,
  beginFusionRitual,
} from '../.beast-game-build/lib/beast-game/fusion-session.js';
import {
  planFusionPresentation,
  audioCuesFromPlan,
  shouldShowRageStage,
  ritualAudioTimeline,
} from '../.beast-game-build/lib/beast-game/fusion-presentation.js';
import { battleAssets } from '../.beast-game-build/lib/beast-game/battle-assets.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

const base = () => {
  let s = createFusionSession();
  s = setFusionPair(
    s,
    { id: 'beast_a01', name: '角木蛟', element: 'SPACE' },
    { id: 'beast_a02', name: '亢金龍', element: 'WATER' },
  );
  s = gainOrbs(s, 5);
  s = gainRage(s, 100);
  return beginFusionRitual(s, true);
};

check('儀式後可產出 4～8 個真實素材計畫', () => {
  const session = base();
  const plan = planFusionPresentation(session, { mobile: false, reducedMotion: false });
  assert.ok(plan);
  assert.ok(plan.assets.length >= 4 && plan.assets.length <= 8);
  for (const asset of plan.assets) {
    assert.ok(battleAssets().some((row) => row.assetId === asset.assetId));
  }
});

check('同場次兩次計畫一致', () => {
  const session = base();
  const a = planFusionPresentation(session, { mobile: true, reducedMotion: false });
  const b = planFusionPresentation(session, { mobile: true, reducedMotion: false });
  assert.deepEqual(
    a.assets.map((x) => x.assetId),
    b.assets.map((x) => x.assetId),
  );
});

check('音效線索皆為媒體音檔路徑', () => {
  const plan = planFusionPresentation(base(), { mobile: true, reducedMotion: true });
  for (const cue of audioCuesFromPlan(plan)) {
    assert.equal(cue.kind, 'MEDIA');
    assert.ok(cue.path.startsWith('/'));
  }
});

check('高階合體應開啟暴怒舞台旗標', () => {
  const plan = planFusionPresentation(base(), { mobile: false, reducedMotion: false });
  assert.equal(shouldShowRageStage(plan), true);
});

check('Ritual 音效節拍依階段遞增且不超過舞台時長', () => {
  const plan = planFusionPresentation(base(), { mobile: false, reducedMotion: false });
  const beats = ritualAudioTimeline(plan);
  assert.ok(beats.length >= 1);
  for (let i = 1; i < beats.length; i++) {
    assert.ok(beats[i].at >= beats[i - 1].at);
  }
  assert.ok(beats.every((b) => b.at >= 0 && b.at < plan.stageMs));
});

console.log(`\nFusionPresentation 測試 PASS ${passed}`);
