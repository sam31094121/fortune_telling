/**
 * 真太陽時搬入守門（2026-09-16 業主批准）
 *
 * @ziweijs/core 已從 npm 下架（registry 與 tarball 皆 HTTP 404）；lib/true-solar-time.ts 依 MIT 逐字搬入。
 * 下列 40 筆期望值是搬入前用 @ziweijs/core 0.3.0 原套件實算的毫秒值，
 * 搬入後必須逐筆完全相同，並確認專案不再依賴已下架套件、曆法套件改為直接相依。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { calculateTrueSolarTime } from '../lib/true-solar-time.ts';

const CASES = [
  {"input":"1974-07-01T19:30:00.000Z","longitude":121.5654,"tz":8,"expected":141939154248},
  {"input":"1974-07-01T19:30:00.000Z","longitude":120.6736,"tz":8,"expected":141938940216},
  {"input":"1974-07-01T19:30:00.000Z","longitude":120.3014,"tz":8,"expected":141938850888},
  {"input":"1974-07-01T19:30:00.000Z","longitude":114.1694,"tz":8,"expected":141937379208},
  {"input":"1974-07-01T19:30:00.000Z","longitude":116.4074,"tz":8,"expected":141937916328},
  {"input":"1979-09-01T20:15:00.000Z","longitude":114.1694,"tz":8,"expected":305063501728},
  {"input":"1979-09-01T20:15:00.000Z","longitude":116.4074,"tz":8,"expected":305064038848},
  {"input":"1979-09-01T20:15:00.000Z","longitude":101.6869,"tz":8,"expected":305060505928},
  {"input":"1979-09-01T20:15:00.000Z","longitude":139.6917,"tz":8,"expected":305069627080},
  {"input":"1979-09-01T20:15:00.000Z","longitude":73.5,"tz":8,"expected":305053741072},
  {"input":"1985-01-01T15:10:00.000Z","longitude":139.6917,"tz":8,"expected":473444725872},
  {"input":"1985-01-01T15:10:00.000Z","longitude":73.5,"tz":8,"expected":473428839864},
  {"input":"1985-01-01T15:10:00.000Z","longitude":135,"tz":8,"expected":473443599864},
  {"input":"1985-01-01T15:10:00.000Z","longitude":105,"tz":8,"expected":473436399864},
  {"input":"1985-01-01T15:10:00.000Z","longitude":121.5654,"tz":8,"expected":473440375560},
  {"input":"1990-05-20T04:00:00.000Z","longitude":105,"tz":8,"expected":643172625856},
  {"input":"1990-05-20T04:00:00.000Z","longitude":121.5654,"tz":8,"expected":643176601552},
  {"input":"1990-05-20T04:00:00.000Z","longitude":120.6736,"tz":8,"expected":643176387520},
  {"input":"1990-05-20T04:00:00.000Z","longitude":120.3014,"tz":8,"expected":643176298192},
  {"input":"1990-05-20T04:00:00.000Z","longitude":114.1694,"tz":8,"expected":643174826512},
  {"input":"2000-02-28T16:05:00.000Z","longitude":120.3014,"tz":8,"expected":951753198208},
  {"input":"2000-02-28T16:05:00.000Z","longitude":114.1694,"tz":8,"expected":951751726528},
  {"input":"2000-02-28T16:05:00.000Z","longitude":116.4074,"tz":8,"expected":951752263648},
  {"input":"2000-02-28T16:05:00.000Z","longitude":101.6869,"tz":8,"expected":951748730728},
  {"input":"2000-02-28T16:05:00.000Z","longitude":139.6917,"tz":8,"expected":951757851880},
  {"input":"1968-12-31T13:45:00.000Z","longitude":101.6869,"tz":8,"expected":-31577493703},
  {"input":"1968-12-31T13:45:00.000Z","longitude":139.6917,"tz":8,"expected":-31568372551},
  {"input":"1968-12-31T13:45:00.000Z","longitude":73.5,"tz":8,"expected":-31584258559},
  {"input":"1968-12-31T13:45:00.000Z","longitude":135,"tz":8,"expected":-31569498559},
  {"input":"1968-12-31T13:45:00.000Z","longitude":105,"tz":8,"expected":-31576698559},
  {"input":"2024-11-02T22:59:59.000Z","longitude":135,"tz":8,"expected":1730592978643},
  {"input":"2024-11-02T22:59:59.000Z","longitude":105,"tz":8,"expected":1730585778643},
  {"input":"2024-11-02T22:59:59.000Z","longitude":121.5654,"tz":8,"expected":1730589754339},
  {"input":"2024-11-02T22:59:59.000Z","longitude":120.6736,"tz":8,"expected":1730589540307},
  {"input":"2024-11-02T22:59:59.000Z","longitude":120.3014,"tz":8,"expected":1730589450979},
  {"input":"1995-07-15T02:30:00.000Z","longitude":120.6736,"tz":8,"expected":805775211704},
  {"input":"1995-07-15T02:30:00.000Z","longitude":120.3014,"tz":8,"expected":805775122376},
  {"input":"1995-07-15T02:30:00.000Z","longitude":114.1694,"tz":8,"expected":805773650696},
  {"input":"1995-07-15T02:30:00.000Z","longitude":116.4074,"tz":8,"expected":805774187816},
  {"input":"1995-07-15T02:30:00.000Z","longitude":101.6869,"tz":8,"expected":805770654896},
];

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS: ${name}`); };

check(`${CASES.length} 筆與 @ziweijs/core 0.3.0 原套件逐毫秒相同`, () => {
  for (const c of CASES) {
    const actual = calculateTrueSolarTime(new Date(c.input), c.longitude, c.tz).getTime();
    assert.equal(actual, c.expected, `${c.input} 經度 ${c.longitude} 與原套件不同`);
  }
});

check('台北 1974-07-02 03:30 真太陽時修正落在合理範圍（經度 +6.26 分、7 月初均時差約 -4 分）', () => {
  const clock = new Date('1974-07-02T03:30:00+08:00');
  const minutes = (calculateTrueSolarTime(clock, 121.5654, 8).getTime() - clock.getTime()) / 60000;
  assert.ok(minutes > 0 && minutes < 5, `實際 ${minutes.toFixed(2)} 分鐘`);
});

check('專案不再依賴已下架的 @ziweijs/core；曆法套件改為直接相依', () => {
  const tracked = execSync('git ls-files lib app components', { encoding: 'utf8' }).split('\n').filter((f) => /\.(ts|tsx|js|mjs)$/.test(f));
  // 只擋真正的匯入；搬入檔保留原套件名稱與 MIT 聲明屬必要出處，不算相依。
  const importsPackage = /(from\s+['"]@ziweijs\/core['"]|require\(\s*['"]@ziweijs\/core['"]\s*\)|import\(\s*['"]@ziweijs\/core['"]\s*\))/;
  const offenders = tracked.filter((f) => fs.existsSync(f) && importsPackage.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, [], `仍匯入已下架套件：${offenders.join('、')}`);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(!pkg.dependencies?.['@ziweijs/core'] && !pkg.devDependencies?.['@ziweijs/core'], 'package.json 不得再列 @ziweijs/core');
  const external = (fs.readFileSync('next.config.mjs', 'utf8').match(/serverExternalPackages:s*[[^]]*]/) ?? [''])[0];
  assert.ok(!external.includes('@ziweijs/core'), 'next.config.mjs 的 serverExternalPackages 不得再列 @ziweijs/core');
  // 八字四柱（lunar-typescript）與農曆顯示（tyme4ts）不得只靠別的套件間接帶進來。
  for (const name of ['lunar-typescript', 'tyme4ts']) assert.ok(pkg.dependencies?.[name], `${name} 必須是直接相依`);
});

console.log(`true solar time — PASS ${passed}`);
