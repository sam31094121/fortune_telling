import fs from 'fs';
const geoPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/infiniteHollowSquares.ts';
const modelPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/TaijiModel.tsx';
const g = fs.readFileSync(geoPath, 'utf8');
let m = fs.readFileSync(modelPath, 'utf8');
const exports = [...g.matchAll(/export function (\w+)/g)].map((x) => x[1]);
console.log('GEO exports', exports);
console.log('has bidirectional', g.includes("'out'") && g.includes("'in'") && g.includes('projectInfiniteOut'));
console.log('import line', m.split(/\n/).find((l) => l.includes('infiniteHollow')));
console.log('layer line', m.split(/\n/).find((l) => /twelve|Hollow|hollow/.test(l) && /id:/.test(l)));
console.log('on() hollow', m.match(/on\('([^']*[Hh]ollow[^']*)'\)/g));

const builder = exports.find((n) => n.startsWith('build')) || 'buildInfiniteHollowSquareSegments';
const assertFn = exports.find((n) => n.startsWith('assertTwelve')) || 'assertTwelveEdges';

m = m.replace(
  /import \{[^}]*\} from '\.\/infiniteHollowSquares';/,
  `import { ${assertFn}, ${builder} } from './infiniteHollowSquares';`,
);

// Normalize layer id to twelveHollowSquares and keep Chinese name
m = m.replace(
  /\{\s*id:\s*'[^']*[Hh]ollow[^']*'\s*,\s*name:\s*'[^']*'\s*,\s*defaultOn:\s*true\s*\}/,
  "{ id: 'twelveHollowSquares', name: '十二線・雙向無限四角空間', defaultOn: true }",
);

// Fix any on('...') for hollow layer
m = m.replace(/on\('([^']*[Hh]ollow[^']*)'\)/g, "on('twelveHollowSquares')");

// Fix useMemo body — several possible variable names
m = m.replace(
  /const (hollowSegs|hollowSegments) = useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  `const hollowSegs = useMemo(() => {\n    ${assertFn}();\n    return ${builder}();\n  }, []);`,
);

// If still old function names in useMemo without hollowSegs pattern
m = m.replace(/assertTwelveEdges\(\)/g, `${assertFn}()`);
m = m.replace(/buildInfiniteHollowSquareSegments\(\)/g, `${builder}()`);
m = m.replace(/buildInfiniteHollowSquareSegments\(\)/g, `${builder}()`);

// Ensure map uses hollowSegs
m = m.replace(/hollowSegments\.map/g, 'hollowSegs.map');

fs.writeFileSync(modelPath, m);
console.log('--- after ---');
console.log('import', m.split(/\n/).find((l) => l.includes('infiniteHollow')));
console.log('layer', m.split(/\n/).find((l) => /id: 'twelve/.test(l)));
console.log('on', m.match(/on\('twelveHollowSquares'\)/g)?.length);
console.log('builder calls', (m.match(new RegExp(builder + '\\(\\)', 'g')) || []).length);
