const fs = require('fs');
const quest = fs.readFileSync('components/TodayDirectionQuest.tsx', 'utf8');
console.log(quest.slice(23800, 27200));
