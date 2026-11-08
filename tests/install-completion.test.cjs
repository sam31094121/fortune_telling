const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function setup(standalone=false,pathname='/') {
 const state=[],effects=[],events=new Map();let cursor=0,mount=true;
 const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}]},useRef(v){const i=cursor++;return state[i]??(state[i]={current:v})},useCallback:f=>f,useEffect(f){if(mount)effects.push(f)}};
 const window={navigator:{userAgent:'Mozilla/5.0 Windows Chrome/131.0',maxTouchPoints:0},location:{search:'',href:'http://localhost/',origin:'http://localhost'},innerWidth:1200,localStorage:{getItem:()=>null,removeItem(){}},matchMedia:()=>({matches:standalone}),addEventListener:(k,f)=>events.set(k,f),removeEventListener(){},requestAnimationFrame:()=>1,setInterval:()=>1,clearInterval(){},cancelAnimationFrame(){}};
 const document={querySelector:()=>null,addEventListener(){},removeEventListener(){},visibilityState:'visible'};
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('components/InstallShield080.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{window,document,URLSearchParams,module:mod,exports:mod.exports,require(name){if(name==='react')return react;if(name==='react-dom')return {createPortal:x=>x};if(name==='next/navigation')return {usePathname:()=>pathname};if(name.startsWith('@/'))return require('../.install-shield-test-build/install-shield.js');return require(name)}});
 const render=()=>{cursor=0;let tree=mod.exports.default();if(typeof tree?.type==='function')tree=tree.type(tree.props);if(mount){mount=false;effects.forEach(f=>f());return render()}return tree};
 return {render,events};
}
function nodes(tree) {if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)]}
function text(tree){if(typeof tree==='string')return tree;if(!tree||typeof tree!=='object')return '';if(Array.isArray(tree))return tree.map(text).join('');return text(tree.props?.children)}
test('every card route excludes install UI and its event listeners',()=>{
 const routes=fs.readdirSync('app',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>'/'+x.name);
 for(const pathname of [...routes,'/beast-game/match3','/star-beasts/detail']){
  const r=setup(false,pathname);assert.equal(r.render(),null,pathname);assert.equal(r.events.size,0,pathname);
 }
});
test('standalone launch confirms the saved entry',()=>{const r=setup(true);assert.match(text(r.render()),/已存到桌面/);assert.match(text(r.render()),/歡迎回來/)});
test('acceptance waits for appinstalled; completion remains visible',async()=>{const r=setup();r.render();r.events.get('beforeinstallprompt')({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});let tree=r.render();await nodes(tree).find(n=>n.props?.['aria-label']==='儲存本站到主畫面').props.onClick();tree=r.render();assert.match(text(tree),/已送出安裝要求/);assert.doesNotMatch(text(tree),/✓ 已存到桌面/);r.events.get('appinstalled')();assert.match(text(r.render()),/✓ 已存到桌面/)});
test('dismissal provides retry instructions without claiming success',async()=>{const r=setup();r.render();r.events.get('beforeinstallprompt')({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});await nodes(r.render()).find(n=>n.props?.['aria-label']==='儲存本站到主畫面').props.onClick();assert.match(text(r.render()),/這次還沒有儲存/);assert.doesNotMatch(text(r.render()),/✓ 已存到桌面/)});
