const fs=require('fs');const path=require('path');
function walk(d,a){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(/node_modules|\.next|\.claude|worktrees|\.taiji-level|\.beast|\.bazi|\.ziwei|\.release/.test(p))continue;if(e.isDirectory())walk(p,a);else if(/\.(tsx|ts)$/.test(e.name))a.push(p)}return a}
for(const f of walk('app',[]).concat(walk('components',[]))){
  const t=fs.readFileSync(f,'utf8');
  if(t.includes('TaijiStandaloneCard') && !f.endsWith('TaijiStandaloneCard.tsx')) console.log('USE Standalone', f);
  if(t.includes('UnifiedTaijiCore') && !f.endsWith('UnifiedTaijiCore.tsx')) console.log('USE Unified', f);
  if(t.includes('TaijiWebGL3D') && !f.endsWith('TaijiWebGL3D.tsx')) console.log('USE WebGL', f);
  if(/from ['"]@\/components\/TaijiSystem['"]|from ['"]\.\/TaijiSystem['"]/.test(t)) console.log('USE System', f);
  if(/if\s*\(\s*true\s*\)\s*return\s*null/.test(t) && /taiji|Taiji/.test(f+t.slice(0,200))) console.log('KILL', f);
}
