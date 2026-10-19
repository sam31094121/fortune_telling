const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file) {
 const box={exports:{},require:name=>name.endsWith('.css')?new Proxy({},{get:(_,k)=>k}):require(name)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,box);
 return box.exports;
}
const {PresentGuide}=load('features/ghost-asura/components/PresentGuide.tsx');
const {buildReadingGuidance}=load('lib/server/asura-reading-guidance.ts');
const column=(key,tense,age,seals)=>({key,heading:key,life:{tenseLabel:tense,ageText:age},seals});
const columns=[column('year','過去','約 1–16 歲',[{id:'a',name:'甲印'}]),column('hour','現在','約 49 歲以後',[{id:'b',name:'乙印'}])];
const render=(guidance,key='pillars')=>renderToStaticMarkup(React.createElement(PresentGuide,{display:{columns,sections:[{key,guidance,items:[{id:'a',label:'甲印'}]}]},sectionKey:key}));
const current=buildReadingGuidance(columns,['a','missing'],true);
assert.equal(current.stage.key,'hour');
assert.equal(current.related.length,1);
assert(render(current).includes('乙印 · 查看'));
assert(render(current).includes('甲印 · 約 1–16 歲'));
const future=buildReadingGuidance(columns,['a'],false);
assert.equal(future.stage,undefined);
assert(render(future,'verdict').includes('「未來」解說提到的印記'));
assert(!render(future,'verdict').includes('約 1–16 歲'));
assert(render(future,'verdict').includes('甲印</button>'));
assert(!render(future,'verdict').includes('先看你目前的年齡階段'));
for(const ids of [[],['missing'],['甲印']]) assert.equal(render(buildReadingGuidance(columns,ids,false),'verdict'),'');
assert.equal(render(undefined),''); // Frontend must not infer links from items or names.
const repeated=buildReadingGuidance([...columns,column('month','過去','約 17–32 歲',[{id:'a',name:'甲印'}])],['a','a'],false);
assert.equal(repeated.related.length,2);
assert.equal(new Set(repeated.related.map(x=>x.columnKey)).size,2);
assert.equal(buildReadingGuidance(columns.map(c=>({...c,life:undefined})),['a'],true).stage,undefined);
const renamed=buildReadingGuidance([column('year','過去','約 1–16 歲',[{id:'a',name:'新稱號'}])],['a'],false);
assert(render(renamed,'verdict').includes('新稱號'));
assert.equal(JSON.stringify(buildReadingGuidance([...columns].reverse(),['a'],false).related),JSON.stringify(future.related));
console.log('PASS: backend-only guidance, actual IDs, missing references/targets, future without invented age, cross-column matches, renamed cards, legacy payload');
