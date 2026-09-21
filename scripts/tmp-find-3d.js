const fs=require('fs');const path=require('path');
function walk(d,a){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(/node_modules|\.next|\.claude|worktrees/.test(p))continue;if(e.isDirectory())walk(p,a);else if(/\.(tsx|ts|jsx|js)$/.test(e.name))a.push(p)}return a}
for(const f of walk('app',[]).concat(walk('components',[]))){
  const t=fs.readFileSync(f,'utf8');
  if(t.includes('href="/3D"')||t.includes("href='/3D'")||t.includes('立體太極模型工作室')||t.includes('/3D')){
    if(/href=.*3D|立體太極模型工作室/.test(t)) console.log(f);
  }
}
