import { runRedLuanEngineeringAudit } from '../lib/red-luan-engineering-audit';

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function usage() {
  console.log(`
紅鸞年度工程稽核（僅本機工程師使用）

用法：
  npm run audit:red-luan -- --birth 1990-05-12 --gender female --from 2026 --to 2030 [--hour 午] [--iching-birth] [--json]

說明：
  - 只列年度紅鸞／天喜／桃花規則命中與本命現位，不預測關係事件。
  - 紫微本命夫妻宮僅在提供 --hour 時核對。
  - 易經生辰起卦只有加上 --iching-birth 且提供 --hour 才會執行。
  - 月、日、時精度未選定可追溯規則，因此刻意不輸出。
`);
}

const birthDate = option('--birth');
const gender = option('--gender');
const from = Number(option('--from'));
const to = Number(option('--to'));
if (!birthDate || (gender !== 'male' && gender !== 'female') || !Number.isInteger(from) || !Number.isInteger(to)) {
  usage();
  process.exitCode = 1;
} else {
  const audit = runRedLuanEngineeringAudit({
    birthDate,
    gender,
    birthHourBranch: option('--hour'),
    fromYear: from,
    toYear: to,
    includeBirthIChing: process.argv.includes('--iching-birth'),
  });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(`\n紅鸞年度工程稽核｜${audit.inputCompleteness}`);
    console.log(`八字規則：${audit.bazi.ruleVersion}`);
    console.log(`命盤現位：${audit.bazi.natalEvidence.length ? audit.bazi.natalEvidence.map((item) => `${item.label}・${item.targetBranch}`).join('、') : '未命中'}`);
    console.log('年度命中：');
    for (const row of audit.annualSignals) {
      const hit = row.annualTriggers.length ? row.annualTriggers.map((item) => `${item.label}・${item.targetBranch}`).join('、') : '無規則命中';
      console.log(`- ${row.year}（${row.annualBranch}年）：${hit}`);
    }
    console.log(`紫微夫妻宮：${audit.ziwei.status}`);
    console.log(`易經補卦：${audit.iching.status}`);
    console.log(`限制：${audit.precisionBoundary}`);
  }
}
