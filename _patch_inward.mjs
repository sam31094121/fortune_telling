import fs from 'fs';
const geoPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/infiniteHollowSquares.ts';
const modelPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/TaijiModel.tsx';
const geo = fs.readFileSync(geoPath, 'utf8');
const exports = [...geo.matchAll(/export function (\w+)/g)].map((m) => m[1]);
const builder = exports.find((n) => n.startsWith('build'));
const assertFn = exports.find((n) => n.startsWith('assertTwelve'));
console.log({ exports, builder, assertFn });

let m = fs.readFileSync(modelPath, 'utf8');
m = m.replace(
  /import \{[^}]*\} from '\.\/infiniteHollowSquares';/,
  `import { ${assertFn}, ${builder} } from './infiniteHollowSquares';`,
);
m = m.replace(
  /id: 'twelveHollowSquares',\s*name: '[^']*'/,
  "id: 'twelveHollowSquares', name: '十二線・往內無限四方形'",
);
m = m.replace(
  /const hollowSegs = useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  `const hollowSegs = useMemo(() => {\n    ${assertFn}();\n    return ${builder}();\n  }, []);`,
);

// Emphasize inward/face colors: core cyan, in gold, face white-gold rings, out dim orange, spin purple
const renderRe =
  /\{on\('twelveHollowSquares'\) \? hollowSegs\.map\(\(seg, i\) => \([\s\S]*?\)\) : null\}/;
const neu = `{on('twelveHollowSquares') ? hollowSegs.map((seg, i) => (
        <Line key={\`hollow-\${seg.dir}-\${seg.kind}-\${seg.edgeId}-\${seg.nest}-\${i}\`} points={[seg.a, seg.b]} color={seg.kind === 'core' ? '#6ef0ff' : seg.dir === 'face' ? '#ffe6a0' : seg.dir === 'in' ? '#ffd06b' : seg.dir === 'out' ? '#ff9f4388' : '#c891fa'} lineWidth={seg.kind === 'core' ? 2.8 : seg.dir === 'face' ? Math.max(0.8, 1.8 - seg.nest * 0.12) : seg.dir === 'in' ? Math.max(1.0, 2.2 - seg.nest * 0.12) : 1.0} transparent opacity={seg.dir === 'out' ? 0.28 : seg.kind === 'spin' ? 0.3 : seg.dir === 'face' ? Math.max(0.35, 0.9 - seg.nest * 0.07) : Math.max(0.4, 0.95 - seg.nest * 0.06)} depthWrite={false} />
      )) : null}`;
if (renderRe.test(m)) {
  m = m.replace(renderRe, neu);
  console.log('render ok');
} else {
  console.log('render miss');
}
fs.writeFileSync(modelPath, m);
console.log('name', m.includes('往內無限四方形'));
