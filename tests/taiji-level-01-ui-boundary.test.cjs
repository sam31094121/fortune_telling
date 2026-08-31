const fs = require('fs');
const overlay = fs.readFileSync('components/taiji/level-01/Level01Taiji.tsx', 'utf8');
const styles = fs.readFileSync('components/taiji/level-01/level01.module.css', 'utf8');
if (!overlay.includes('LEVEL_01 UI SCOPE LOCK')) throw new Error('level 01 scope lock comment is required');
if (!overlay.includes('aria-label="水平儀"')) throw new Error('level 01 must expose the single level indicator');
if (overlay.includes('啟動太極') || styles.includes('.compassMark') || styles.includes('.startButton')) throw new Error('old compass/start control must not return');
if (!styles.includes('left: 50%') || !styles.includes("content: '水平儀'")) throw new Error('indicator must remain bottom-centred and labelled');
console.log('Taiji Level 01 UI boundary passed');
