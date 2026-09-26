// Read-only: loads dictionary TS modules via jiti and counts entries.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const jiti = require(path.join(root, 'node_modules', 'jiti'))(__filename, { cache: false });
const files = [
  ['en', 'home', 'lib/home-english-copy.ts', 'homeEnglishCopy'],
  ['en', 'form', 'lib/form-english-copy.ts', 'formEnglishCopy'],
  ['en', 'birthday', 'lib/birthday-english-copy.ts', 'birthdayEnglishCopy'],
  ['en', 'result', 'lib/result-english-copy.ts', 'resultEnglishCopy'],
  ['en', 'result-english/tables FIXED_SENTENCE_EN', 'lib/result-english/tables.ts', 'FIXED_SENTENCE_EN'],
  ['ja', 'home', 'lib/home-japanese-copy.ts', 'homeJapaneseCopy'],
  ['ko', 'home', 'lib/korean-copy/home.ts', 'homeKoreanCopy'],
  ['ko', 'form', 'lib/korean-copy/form.ts', 'formKoreanCopy'],
  ['ko', 'birthday', 'lib/korean-copy/birthday.ts', 'birthdayKoreanCopy'],
  ['ko', 'result', 'lib/korean-copy/result.ts', 'resultKoreanCopy'],
  ...['bazi:koBaziCopy','nameology:koNameologyCopy','numerology:koNumerologyCopy','zodiac:koZodiacCopy','red-luan-heartbeat:koRedLuanHeartbeatCopy','tarot:koTarotCopy','insight:koInsightCopy','music:koMusicCopy','star-beasts:koStarBeastsCopy','growth-center:koGrowthCenterCopy','shared:koSharedCopy','beast-game:koBeastGameCopy','misc:koMiscCopy']
    .map(s => { const [p, e] = s.split(':'); return ['ko', 'pages/' + p, `lib/korean-copy/pages/${p}.ts`, e]; }),
];
const han = /[\u3400-\u9fff\uf900-\ufaff]/;
const kana = /[\u3040-\u30ff]/, hangul = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;
const rows = []; const all = {};
for (const [lang, area, file, exp] of files) {
  try {
    const mod = jiti(path.join(root, file));
    const d = mod[exp] || {};
    const keys = Object.keys(d);
    const hanInValueNoLocal = keys.filter(k => { const v = String(d[k]); return han.test(v) && !(lang === 'ko' ? hangul.test(v) : lang === 'ja' ? kana.test(v) : false); }).length;
    const identity = keys.filter(k => d[k] === k).length;
    rows.push({ lang, area, file, entries: keys.length, identical: identity, valueHanNoLocalScript: hanInValueNoLocal });
    (all[lang] ||= new Set()); keys.forEach(k => all[lang].add(k));
  } catch (e) { rows.push({ lang, area, file, error: String(e.message).slice(0, 200) }); }
}
const out = { rows, uniqueKeysPerLang: Object.fromEntries(Object.entries(all).map(([l, s]) => [l, s.size])) };
// overlap: ko keys vs en keys
if (all.ko && all.en) out.koKeysAlsoInEn = [...all.ko].filter(k => all.en.has(k)).length;
if (all.ja && all.en) out.jaKeysAlsoInEn = [...all.ja].filter(k => all.en.has(k)).length;
require('fs').writeFileSync(path.join(__dirname, 'dict-counts.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
