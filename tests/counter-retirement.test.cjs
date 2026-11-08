const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');

test('retired feature routes, feedback entry and sound statistics implementation are absent', () => {
  for (const file of ['app/api/visitor/record/route.ts','app/api/ai-suggestion/route.ts','app/api/taiji-sound-preference/route.ts','components/AiSuggestionFeedback.tsx','components/taiji/level-01/Level01SoundPreference.ts','lib/local-visitor-counter.ts','lib/local-ai-suggestion-counter.ts','lib/local-taiji-sound-preference.ts']) assert.equal(fs.existsSync(file), false, file);
  const home = fs.readFileSync('app/page.tsx','utf8');
  assert.equal((home.match(/<FeatureVisitorCounter/g) || []).length, 1);
  assert.match(home, /FeatureVisitorCounter featureKey="home"/);
  assert.doesNotMatch(fs.readFileSync('app/music/MusicClient.tsx','utf8'), /FeatureVisitorCounter/);
  const controller = fs.readFileSync('components/taiji/level-01/Level01MotionController.ts','utf8');
  assert.doesNotMatch(controller, /soundPreference|recordNextStepCompleted/);
  assert.match(controller, /this.audio.playActivationChime\(variant\)/);
  assert.match(controller, /this.audio.playLightningStrike\(strikeOrigin\)/);
});
