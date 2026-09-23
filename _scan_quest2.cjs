const fs = require('fs');
const quest = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
// Find JSX reward render - look for stage === 'reward' in return
let i = 0;
const hits = [];
while ((i = quest.indexOf("stage === 'reward'", i)) !== -1) {
  hits.push(i);
  i += 1;
}
console.log('hits', hits);
// Also look for rewardReleased or rewardOpening in JSX
for (const key of ['rewardReleased', 'rewardOpening', 'WIND_RITUAL', '封印', 'routeHref', 'line.me', 'LINE']) {
  let j = 0, n = 0;
  while ((j = quest.indexOf(key, j)) !== -1 && n < 8) {
    console.log(key, j, JSON.stringify(quest.slice(j, j+100)).slice(0,120));
    j += key.length; n++;
  }
}
// Dump from first substantial reward UI - search for "今日定向" or "寶珠" in JSX area
const keys2 = ['寶珠', '今天的定向', '尚未解鎖', '封印中', '收下', '繼續', '回首頁'];
for (const key of keys2) {
  const p = quest.indexOf(key);
  if (p >= 0) console.log('KEY', key, p, JSON.stringify(quest.slice(p-60, p+140)));
}
