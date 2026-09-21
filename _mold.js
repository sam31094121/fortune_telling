const fs = require('fs');
const path = require('path');
const keys = ['立體太極','太極模具','taiji','mold','模具','立體'];
function walk(d, out=[]) {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    if (['node_modules','.git','.next','.claude'].includes(e.name) || String(e.name).startsWith('.next')) continue;
    const p = path.join(d,e.name);
    if (e.isDirectory()) walk(p,out);
    else if (/\.(tsx|ts|css|json|md|svg|webp|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...walk('components'),...walk('app'),...walk('public'),...walk('docs'),...walk('data')].slice(0,5000);
for (const f of files) {
  let s; try { s = fs.readFileSync(f,'utf8'); } catch { continue; }
  if (/立體太極|太極模具|taiji.?mold|TaijiMold|立體.?太極/i.test(s) || /立體太極|太極模具/.test(f)) {
    console.log('HIT', f);
  }
}
// also filename search
for (const f of files) {
  if (/太極|taiji|mold|模具/i.test(f)) console.log('NAME', f);
}
