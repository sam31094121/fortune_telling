// 八字後端獨立審查（業主 2026-11-26）：不拿引擎自己的輸出當答案，
// 日柱用儒略日、月干五虎遁、時干五鼠遁（晚子時日柱不換日、時干依次日）、十神、藏干、十二運、空亡、胎元、胎息、大運序列、流年干支都用獨立算法重算，
// 隨機 400 組生日（1925–2024、男女、全時辰）逐項比對引擎。年柱與月支的節氣界取曆法套件（已由香港天文台表證實，見來源登記）。
import { Solar } from 'lunar-typescript';
import { calculateDualChart } from '../lib/dual-chart';
const S = '甲乙丙丁戊己庚辛壬癸', B = '子丑寅卯辰巳午未申酉戌亥';
const EL: Record<string, string> = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' };
const GEN: Record<string,string> = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' }, CTL: Record<string,string> = { 木:'土', 土:'水', 水:'火', 火:'金', 金:'木' };
const yy = (s: string) => S.indexOf(s) % 2;
const god = (x: string, d: string) => { const ex = EL[x], ed = EL[d], same = yy(x) === yy(d);
  if (ex === ed) return same ? '比肩' : '劫財'; if (GEN[ex] === ed) return same ? '偏印' : '正印'; if (GEN[ed] === ex) return same ? '食神' : '傷官'; if (CTL[ed] === ex) return same ? '偏財' : '正財'; return same ? '七殺' : '正官'; };
const HID: Record<string,string> = { 子:'癸',丑:'己癸辛',寅:'甲丙戊',卯:'乙',辰:'戊乙癸',巳:'丙庚戊',午:'丁己',未:'己丁乙',申:'庚壬戊',酉:'辛',戌:'戊辛丁',亥:'壬甲' };
const LS: Record<string,number> = { 甲:11,乙:6,丙:2,丁:9,戊:2,己:9,庚:5,辛:0,壬:8,癸:3 };
const STG = ['長生','沐浴','冠帶','臨官','帝旺','衰','病','死','墓','絕','胎','養'];
const jdn = (y: number, m: number, d: number) => { const a = Math.floor((14 - m) / 12), yy2 = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy2 + Math.floor(yy2 / 4) - Math.floor(yy2 / 100) + Math.floor(yy2 / 400) - 32045; };
const dayIdx = (y: number, m: number, d: number) => (((jdn(y, m, d) - jdn(2000, 1, 7)) % 60) + 60) % 60; // 2000-01-07 甲子
const gz = (i: number) => S[i % 10] + B[i % 12];
let seed = 20261126; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const fails: string[] = []; const cnt: Record<string, number> = {};
const bad = (k: string, m: string) => { cnt[k] = (cnt[k] ?? 0) + 1; if (fails.length < 25) fails.push(`[${k}] ${m}`); };
const N = 400; let n = 0;
for (let i = 0; i < N; i++) {
  const y = 1925 + Math.floor(rnd() * 100), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28), h = Math.floor(rnd() * 24);
  const g = rnd() < 0.5 ? 'male' : 'female'; const date = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, time = `${String(h).padStart(2,'0')}:${String(Math.floor(rnd()*60)).padStart(2,'0')}`;
  const tag = `${date} ${time} ${g}`;
  let r: any; try { r = calculateDualChart({ birthDate: date, birthTime: time, gender: g, calendarType: 'solar', timezone: 'Asia/Taipei' }); } catch (e: any) { bad('exception', `${tag} ${e.message}`); continue; } n++;
  const P = r.core.pillars; const pc = r.bazi.professionalChart;
  const lun = Solar.fromYmdHms(y, m, d, h, Number(time.slice(3)), 0).getLunar();
  const yearGz = lun.getYearInGanZhiExact(), monthGz = lun.getMonthInGanZhiExact();
  // 1 年柱（立春界）、月柱支（節氣界）取曆法套件；月干五虎遁、日柱儒略日、時干五鼠遁獨立算
  if (P.year.ganZhi !== yearGz) bad('年柱', `${tag} 引擎 ${P.year.ganZhi} 套件 ${yearGz}`);
  const ys = S.indexOf(yearGz[0]); const tigerStart = [2, 4, 6, 8, 0][ys % 5]; const mb = B.indexOf(monthGz[1]);
  const monthStem = S[(tigerStart + ((mb - 2 + 12) % 12)) % 10]; if (P.month.ganZhi !== monthStem + B[mb]) bad('月柱', `${tag} 引擎 ${P.month.ganZhi} 獨立 ${monthStem}${B[mb]}`);
  const di = dayIdx(y, m, d); const dayGz = gz(di); if (P.day.ganZhi !== dayGz) bad('日柱', `${tag} 引擎 ${P.day.ganZhi} 儒略日 ${dayGz}`);
  const hb = Math.floor((h + 1) / 2) % 12; const dStem = (h === 23 ? di + 1 : di) % 10; /* 晚子時：日柱不換日，時干依次日日干起（通行晚子時法） */
  // 晚子時（23:xx）：引擎規則「晚子時不換日」——時干用當日日干
  const hourStem = S[([0, 2, 4, 6, 8][dStem % 5] + hb) % 10]; if (P.hour.ganZhi !== hourStem + B[hb]) bad('時柱', `${tag} 引擎 ${P.hour.ganZhi} 五鼠遁 ${hourStem}${B[hb]}`);
  const D = dayGz[0];
  // 2 十神（天干）、藏干與十神
  for (const k of ['year','month','hour'] as const) { const exp = god(P[k].ganZhi[0], D); if (pc.tenGods[k].stem !== exp) bad('天干十神', `${tag} ${k} 引擎 ${pc.tenGods[k].stem} 獨立 ${exp}`); }
  for (const k of ['year','month','day','hour'] as const) {
    const br = P[k].ganZhi[1]; const hs = P[k].hiddenStems.map((x: any) => x.stem).join('');
    if (hs !== HID[br]) bad('藏干', `${tag} ${k}${br} 引擎 ${hs} 標準 ${HID[br]}`);
    const ge = P[k].hiddenStems.map((x: any) => x.tenGod).join(','), gx = [...HID[br]].map((s) => god(s, D)).join(',');
    if (ge !== gx) bad('藏干十神', `${tag} ${k} 引擎 ${ge} 獨立 ${gx}`);
    // 3 十二運（陽順陰逆）
    const start = LS[D], dir = yy(D) === 0 ? 1 : -1; const idx = (((B.indexOf(br) - start) * dir) % 12 + 12) % 12; const exp = STG[idx];
    if (pc.twelveStages[k] !== exp) bad('十二運', `${tag} ${k}${br} 引擎 ${pc.twelveStages[k]} 獨立 ${exp}`);
  }
  // 4 空亡（旬）
  const xun = (gzs: string) => { const idx2 = (() => { for (let q = 0; q < 60; q++) if (gz(q) === gzs) return q; return -1; })(); const startB = ((idx2 - (idx2 % 10)) % 12 + 12) % 12; return B[(startB + 10) % 12] + B[(startB + 11) % 12]; };
  if (r.core.kongWang.yearXunKong !== xun(P.year.ganZhi)) bad('年空', `${tag} 引擎 ${r.core.kongWang.yearXunKong} 獨立 ${xun(P.year.ganZhi)}`);
  if (r.core.kongWang.dayXunKong !== xun(P.day.ganZhi)) bad('日空', `${tag} 引擎 ${r.core.kongWang.dayXunKong} 獨立 ${xun(P.day.ganZhi)}`);
  // 5 胎元（月干進一、月支進三）、胎息（日干五合＋日支六合）
  const ty = S[(S.indexOf(P.month.ganZhi[0]) + 1) % 10] + B[(B.indexOf(P.month.ganZhi[1]) + 3) % 12]; if (r.core.taiYuan !== ty) bad('胎元', `${tag} 引擎 ${r.core.taiYuan} 獨立 ${ty}`);
  const STEM_HE = { 甲:'己',乙:'庚',丙:'辛',丁:'壬',戊:'癸',己:'甲',庚:'乙',辛:'丙',壬:'丁',癸:'戊' } as any; const BR_HE = { 子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午' } as any;
  const tx = STEM_HE[P.day.ganZhi[0]] + BR_HE[P.day.ganZhi[1]]; if (r.core.taiXi !== tx) bad('胎息', `${tag} 引擎 ${r.core.taiXi} 獨立 ${tx}`);
  // 6 大運方向與序列（陽男陰女順，其餘逆）
  const fwd = (yy(P.year.ganZhi[0]) === 0) === (g === 'male'); const mi = (() => { for (let q = 0; q < 60; q++) if (gz(q) === P.month.ganZhi) return q; return -1; })();
  r.bazi.luckCycles.forEach((c: any, k: number) => { const exp = gz(((mi + (fwd ? 1 : -1) * (k + 1)) % 60 + 60) % 60); if (c.pillar !== exp) bad('大運', `${tag} 第${k + 1}步 引擎 ${c.pillar} 獨立 ${exp}`); });
  if (r.core.daYunMeta.direction !== (fwd ? 'FORWARD' : 'BACKWARD')) bad('大運方向', `${tag} 引擎 ${r.core.daYunMeta.direction}`);
  // 7 流年干支與十神
  for (const a of r.annual) { const egz = gz(((a.year - 4) % 60 + 60) % 60); if (a.ganzhi !== egz) bad('流年干支', `${tag} ${a.year} 引擎 ${a.ganzhi} 獨立 ${egz}`); if (a.stemGod !== god(egz[0], D)) bad('流年天干十神', `${tag} ${a.year}`); if (a.branchGod !== god(HID[egz[1]][0], D)) bad('流年地支十神', `${tag} ${a.year}`); }
}
console.log(JSON.stringify({ charts: n, failureKinds: cnt }));
if (Object.keys(cnt).length) { fails.forEach((f) => console.error(f)); process.exit(1); }
fails.forEach((f) => console.log(f));
