const fs = require('fs');
const p = process.argv[2];
let s = fs.readFileSync(p, 'utf8');
const before = [...s.matchAll(/key: '(opening|sandbox|tactics|closing)', heading: '[^']+', body: '([^']*)'/g)].map((m) => m[1] + '::' + m[2]);

const old = `  const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  const at = (i: number, focus: AsuraDecreeAnchor['focus']): AsuraDecreeAnchor => {
    const seg = timeline.segments[i];
    const r = parseAgeLabel(seg.ageLabel);
    const ageRange = r ? \`\${r[0]}–\${r[1]}\` : seg.ageLabel;
    const mark: AsuraDecreeAnchor['mark'] = seg.tense === '過去' ? '走過' : seg.tense === '未來' ? '下一段' : focus === 'action' ? '現在就做' : '現在';
    const label =
      mark === '走過' ? \`你 \${ageRange} 歲・走過的路\`
      : mark === '下一段' ? \`你 \${r ? r[0] : ageRange} 歲起・下一段\`
      : age !== null ? \`你今年 \${age} 歲・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : \`你 \${ageRange} 歲・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`;
`;

const neu = `  const age = viewer && typeof viewer.age === 'number' ? viewer.age : null;
  const nominal = viewer && typeof viewer.nominalAge === 'number' ? viewer.nominalAge : null;
  const at = (i: number, focus: AsuraDecreeAnchor['focus']): AsuraDecreeAnchor => {
    const seg = timeline.segments[i];
    const r = parseAgeLabel(seg.ageLabel);
    const ageRange = r ? \`\${r[0]}–\${r[1]}\` : seg.ageLabel;
    const mark: AsuraDecreeAnchor['mark'] = seg.tense === '過去' ? '走過' : seg.tense === '未來' ? '下一段' : focus === 'action' ? '現在就做' : '現在';
    const label =
      mark === '走過' ? \`你虛歲 \${ageRange}・走過的路\`
      : mark === '下一段' ? \`你虛歲 \${r ? r[0] : ageRange} 起・下一段\`
      : nominal !== null ? \`你今年虛歲 \${nominal}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : age !== null ? \`你今年實歲 \${age}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`
      : \`你虛歲 \${ageRange}・\${mark === '現在就做' ? '現在就做' : '就在這段'}\`;
`;

if (!s.includes(old)) {
  console.error('old block missing');
  const i = s.indexOf("mark === '走過'");
  console.log(JSON.stringify(s.slice(i - 80, i + 350)));
  process.exit(1);
}
s = s.replace(old, neu);
const after = [...s.matchAll(/key: '(opening|sandbox|tactics|closing)', heading: '[^']+', body: '([^']*)'/g)].map((m) => m[1] + '::' + m[2]);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  console.error('decree changed');
  process.exit(1);
}
fs.writeFileSync(p, s);
console.log('OK');
