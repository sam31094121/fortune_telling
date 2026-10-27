const assert = require('node:assert/strict');
const { load } = require('../fixtures/ghost-asura-nature/load.cjs');
const { goldWordingViewFor } = load('lib/ghost-asura-gold-wording.ts');

/** Oct 24's additive public contract. Validate the exact backend-derived value,
 * not a blanket exception for any text placed under this field. */
function validateGoldWording(actual, birth) {
  assert(actual && typeof actual === 'object', 'goldWording must be present');
  assert.deepEqual(Object.keys(actual), ['label', 'text', 'basis'], 'goldWording public fields');
  const expected = goldWordingViewFor({ ...birth, timezone: 'Asia/Taipei' }, birth.timeUnknown === true);
  assert.deepEqual(actual, expected, 'goldWording must match the frozen backend contract for this customer');
  return expected;
}

function scanGoldWording(actual, birth, scan) {
  validateGoldWording(actual, birth);
  // The Oct 24 contract explicitly requires the approved credibility basis.
  // It is checked above for exact content, rather than treated as dramatic prose.
  // The existing HOUR_KNOWN / HOUR_UNKNOWN library uses 時辰 for input status.
  // Only this exact backend-verified field follows that Oct 24 vocabulary;
  // other fields, new jargon and any injected suffix still fail.
  const text = actual.text.replaceAll('時辰', '');
  return [...scan('goldWording.label', actual.label), ...scan('goldWording.text', text)];
}
module.exports = { validateGoldWording, scanGoldWording };
