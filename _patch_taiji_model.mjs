import fs from 'fs';
const modelPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/TaijiModel.tsx';
const geoPath = 'C:/Users/DRAGON/Desktop/\u547d\u7406/components/model-lab/models/taiji/infiniteHollowSquares.ts';
const geo = fs.readFileSync(geoPath, 'utf8');
const exported = [...geo.matchAll(/export function (\w+)/g)].map((m) => m[1]);
console.log('geo exports', exported);
const builder = exported.find((n) => n.startsWith('build')) || 'buildInfiniteHollowSquareSegments';
const assertFn = exported.find((n) => n.startsWith('assertTwelve')) || 'assertTwelveEdges';
let c = fs.readFileSync(modelPath, 'utf8');
c = c.replace(
  /import \{[^}]*\} from '\.\/infiniteHollowSquares';/,
  `import { ${assertFn}, ${builder} } from './infiniteHollowSquares';`,
);
c = c.replace(
  /id: 'twelveHollowSquares',\s*name: '[^']*'/,
  "id: 'twelveHollowSquares', name: '十二線・雙向無限四角空間'",
);
c = c.replace(
  /const hollowSegs = useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  `const hollowSegs = useMemo(() => {\n    ${assertFn}();\n    return ${builder}();\n  }, []);`,
);
const renderRe =
  /\{on\('twelveHollowSquares'\) \? hollowSegs\.map\(\(seg, i\) => \([\s\S]*?\)\) : null\}/;
const neu = `{on('twelveHollowSquares') ? hollowSegs.map((seg, i) => (
        <Line key={\`hollow-\${seg.dir}-\${seg.kind}-\${seg.spin}-\${seg.edgeId}-\${seg.nest}-\${i}\`} points={[seg.a, seg.b]} color={seg.kind === 'core' ? '#55dcff' : seg.dir === 'out' ? '#ff9f43' : seg.kind === 'spin' ? '#c891fa' : '#ffc768'} lineWidth={seg.kind === 'core' ? 2.6 : Math.max(0.9, 2.0 - seg.nest * 0.22)} transparent opacity={seg.kind === 'spin' ? 0.38 : seg.dir === 'out' ? 0.7 : Math.max(0.4, 0.92 - seg.nest * 0.1)} depthWrite={false} />
      )) : null}`;
if (renderRe.test(c)) {
  c = c.replace(renderRe, neu);
  console.log('render updated');
} else {
  console.log('render pattern missing');
}
fs.writeFileSync(modelPath, c);
console.log('name', c.includes('雙向無限四角空間'));
console.log('import', c.split(/\\n/).find((l) => l.includes('infiniteHollowSquares')));
