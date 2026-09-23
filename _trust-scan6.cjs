const fs = require('fs');
const path = require('path');
const root = 'C:/Users/DRAGON/Desktop/命理';
const page = fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
const m = page.match(/import\s+\{\s*TarotEntryCard\s*\}\s+from\s+['\"]([^'\"]+)['\"]/) || page.match(/import\s+TarotEntryCard\s+from\s+['\"]([^'\"]+)['\"]/);
console.log('import', m && m[1]);
const rel = m && m[1];
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('@/')) return path.join(path.dirname(fromFile), spec);
  return path.join(root, spec.replace(/^@\//,''));
}
let p = resolveImport(path.join(root,'app/page.tsx'), rel);
for (const ext of ['','.tsx','.ts','.jsx','/index.tsx']) {
  const cand = p.endsWith('.tsx')||p.endsWith('.ts') ? p : p+ext;
  if (fs.existsSync(cand)) { console.log('found', cand); console.log(fs.readFileSync(cand,'utf8').slice(0,2000)); break; }
}
