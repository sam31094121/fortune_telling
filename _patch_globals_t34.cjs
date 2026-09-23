const fs = require('fs');
const globals = fs.readFileSync('app/globals.css', 'utf8');
if (!globals.includes('home-trust-receipt')) {
  const snippet = `

/* 第三／四段：首屏信任收據＋太極輔助（手機優先） */
.home-trust-receipt {
  position: relative;
  z-index: 2;
}

.home-taiji-aux {
  opacity: 0.92;
  transform: scale(0.92);
  transform-origin: center top;
}

@media (min-width: 640px) {
  .home-taiji-aux {
    opacity: 1;
    transform: none;
  }
}
`;
  fs.writeFileSync('app/globals.css', globals + snippet);
  console.log('GLOBALS_APPENDED');
} else {
  console.log('GLOBALS_ALREADY');
}

// quietButton used on Link — ensure it can be anchor-like
const qcss = fs.readFileSync('components/TodayDirectionQuest.module.css', 'utf8');
const qi = qcss.indexOf('.quietButton');
console.log('quietButton css', qi >= 0 ? qcss.slice(qi, qi + 280) : 'MISSING');

// check local server
const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano | findstr :8888', { encoding: 'utf8' });
  console.log('PORT8888\n', out.slice(0, 300));
} catch (e) {
  console.log('PORT8888 none');
}
