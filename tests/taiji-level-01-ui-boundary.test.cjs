const fs = require('fs');
const overlay = fs.readFileSync('components/taiji/level-01/Level01Taiji.tsx', 'utf8');
const styles = fs.readFileSync('components/taiji/level-01/level01.module.css', 'utf8');
if (!overlay.includes('LEVEL_01 UI SCOPE LOCK')) throw new Error('level 01 scope lock comment is required');
if (!overlay.includes('aria-label="太極平衡控制"')) throw new Error('level 01 must expose the compact balance control');
if (overlay.includes('啟動太極') || styles.includes('.compassMark') || styles.includes('.startButton')) throw new Error('old compass/start control must not return');
if (styles.includes('水平儀')) throw new Error('visible level label must remain absent');
if (!styles.includes('left: 50%') || !styles.includes('.balanceBubble')) throw new Error('bubble control must remain bottom-centred');
console.log('Taiji Level 01 UI boundary passed');
