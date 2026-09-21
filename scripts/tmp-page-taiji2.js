const fs=require('fs');
const page=fs.readFileSync('app/page.tsx','utf8');
// find JSX usage of TaijiStandaloneCard
let idx=0,n=0; while((idx=page.indexOf('<TaijiStandaloneCard',idx))>=0){n++; console.log('jsx@', page.slice(0,idx).split(/\n/).length); console.log(page.slice(idx, idx+280)); idx+=1}
console.log('jsx count',n);
