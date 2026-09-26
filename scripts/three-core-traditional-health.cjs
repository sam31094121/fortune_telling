const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/易經/禁止正式使用清單.json'), 'utf8'));
let failed = false;
for (const item of registry.items) {
  for (const file of item.paths ?? [item.path]) {
    if (!fs.existsSync(path.join(root, file))) {
      console.error(`MISSING_AUDIT_TARGET: ${file}`);
      failed = true;
    }
  }
  if (item.status !== 'RESOLVED') {
    failed = true;
    console.log(`UNRESOLVED: ${item.id} — ${item.reason}`);
    console.log(item.runtimeDisabled ? '目前另有停用條件，不代表算法已修復。' : '仍有運算呼叫，尚未完成正式用途停用。');
  } else if (!Array.isArray(item.resolutionEvidence) || item.resolutionEvidence.length === 0) {
    failed = true;
    console.error(`MISSING_RESOLUTION_EVIDENCE: ${item.id}`);
  }
}
console.log('原典缺陷清單檢查不取代算法、真機或服務可用性驗收。');
process.exitCode = failed ? 1 : 0;
