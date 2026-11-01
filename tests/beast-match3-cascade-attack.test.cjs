const assert=require('node:assert/strict');
const M=require('../.beast-game-build/lib/beast-game/match3');
const team=M.MATCH3_ORB_ELEMENTS.map((element,i)=>({id:`actor-${i}`,element,hp:100,attack:20}));
// Actual seeded core resolution: initial three misses stage-eight threshold;
// an existing scored cascade later reaches nine and must automatically attack.
const b=M.generateDragBoard(M.seededRng(27),8,7,true,8);
const result=M.resolveDrag(b,[{r:0,c:0},{r:0,c:1},{r:1,c:2}],M.seededRng(1027),M.emptyMagic(b),50,true,true,8);
assert.equal(result.attackAllowed,false);
assert(M.computeHits([result.steps[0]],team,'SPACE').every(h=>h.amount===0));
assert(result.steps.some(s=>s.chain>1&&s.groups.some(g=>g.size>=8&&g.attackAllowed)));
assert(M.computeHits(result.steps,team,'SPACE').some(h=>h.chain>1&&h.amount>0));
// Initial eight cannot grant attack permission to subsequent short cascades.
const eight=M.generateDragBoard(M.seededRng(2),8,7,true,8);
eight.forEach(row=>row[0]='FIRE');
const full=M.resolveDrag(eight,eight.map((_,r)=>({r,c:0})),M.seededRng(1002),M.emptyMagic(eight),50,true,true,8);
assert.equal(full.attackAllowed,true);
const short=full.steps.flatMap(s=>s.groups.filter(g=>g.size===3&&g.power<8).map(g=>({...s,groups:[g]})));
assert(short.length>0);
assert(M.computeHits(short,team,'SPACE').every(h=>h.amount===0));
// A single visual cascade may contain both eligible and ineligible groups.
const mixed={chain:2,boardAfter:b,attackAllowed:true,groups:[
 {element:'FIRE',cells:[],size:8,longest:8,runs:[8],power:8,attackAllowed:true},
 {element:'WATER',cells:[],size:3,longest:3,runs:[3],power:3,attackAllowed:false}
]};
const hits=M.computeHits([mixed],team,'SPACE');
assert(hits.find(h=>h.element==='FIRE').amount>0);
assert.equal(hits.find(h=>h.element==='WATER').amount,0);
assert(M.computeHits([{...mixed,chain:0,groups:[],attackAllowed:false}],team,'SPACE').length===0);
console.log('PASS per-group cascade attacks: short initial then automatic qualifying cascade, long initial cannot boost short follow-up, mixed eligibility, display shuffle excluded');
