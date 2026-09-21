const fs=require('fs');
const html=require('child_process').execSync('curl -sS -m 20 http://localhost:8888/3D',{encoding:'utf8',maxBuffer:5e6});
for (const n of ['立體太極','WebGL','canvas','error','工作室','three','Taiji','建模','對位']) {
  console.log(n, (html.match(new RegExp(n,'gi'))||[]).length);
}
console.log('title', (html.match(/<title>[^<]+/)||[''])[0]);
console.log('len', html.length);
