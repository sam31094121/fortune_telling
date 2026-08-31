import assert from 'node:assert/strict';
import { runRedLuanEngineeringAudit } from '../lib/red-luan-engineering-audit';

const unknownHour = runRedLuanEngineeringAudit({
  birthDate: '1990-05-12', gender: 'female', fromYear: 2026, toYear: 2028,
});
assert.equal(unknownHour.auditVersion, 'RED_LUAN_ENGINEERING_AUDIT_V1');
assert.equal(unknownHour.annualSignals.length, 3);
assert.equal(unknownHour.annualSignals[0].annualBranch, '午');
assert.equal(unknownHour.ziwei.status, 'UNAVAILABLE_BIRTH_TIME_REQUIRED');
assert.equal(unknownHour.iching.status, 'NOT_REQUESTED');
assert.ok(unknownHour.precisionBoundary.includes('月、日、时精度'));

const knownHour = runRedLuanEngineeringAudit({
  birthDate: '1990-05-12', gender: 'male', birthHourBranch: '午', fromYear: 2026, toYear: 2026, includeBirthIChing: true,
});
assert.equal(knownHour.ziwei.status, 'READY');
assert.equal(knownHour.iching.status, 'READY');
assert.equal(knownHour.annualSignals[0].year, 2026);

assert.throws(() => runRedLuanEngineeringAudit({
  birthDate: '1990-05-12', gender: 'male', fromYear: 2030, toYear: 2026,
}), /INVALID_YEAR_RANGE/);

console.log('Red Luan engineering audit passed');
