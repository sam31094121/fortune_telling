const fs = require('fs');
const quest = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
console.log('size', quest.length);
console.log('VIP', /VIP/.test(quest));
console.log('LINE', /LINE|line\.me|line\.naver/i.test(quest));
console.log('封印', (quest.match(/封印/g) || []).length);
// find reward UI
const markers = ['reward', 'stage', 'area', 'path', '封印', '尚未'];
for (const m of markers) {
  let i = 0, c = 0;
  while ((i = quest.indexOf(m, i)) !== -1 && c < 5) {
    if (c === 0 || m === 'reward') console.log('---', m, 'at', i, JSON.stringify(quest.slice(Math.max(0,i-40), i+80)));
    i += m.length; c++;
  }
}
// Find reward stage render block
const rew = quest.indexOf("stage === 'reward'");
const rew2 = quest.indexOf('stage === "reward"');
console.log('stage reward eqs', rew, rew2);
const idx = rew >= 0 ? rew : rew2;
if (idx >= 0) {
  console.log(quest.slice(idx, idx + 2500));
}
