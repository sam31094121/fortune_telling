const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
const makeBoard = () => {
  const board=Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>M.MATCH3_ORB_ELEMENTS[(r*2+c)%5]));
  board[6]=Array(7).fill('FIRE');
  return board;
};
const rowPath = n => Array.from({length:n},(_,c)=>({r:6,c}));
const team=[{id:'fire',element:'FIRE',hp:100,attack:50}];

for(const [stored,expected,allowed] of [[5,8,true],[4,7,false]]) {
  const b=makeBoard(), magic=M.emptyMagic(b), path=rowPath(4);
  magic[6][0]=stored;
  assert.equal(M.effectiveDragCount(path,magic),expected);
  const res=M.resolveDrag(b,path,M.seededRng(91),magic,1,true,true,8);
  assert.equal(res.valid,true);assert.equal(res.chainLength,4);assert.equal(res.effectiveLength,expected);
  assert.equal(res.attackAllowed,allowed);
  assert.equal(res.magicSpawn.power,expected);
  assert.equal(res.magic.flat().filter(n=>n>=7).length,1);
  const first=res.steps[0].groups[0];
  assert.equal(first.size,4);assert.equal(first.longest,4);assert.deepEqual(first.runs,[4]);
  assert.equal(first.power,expected,'三普通珠加儲存顆數，不重複加魔法珠本身');
  const hits=M.computeHits(res.steps,team,'EARTH');
  if(allowed) assert.equal(hits[0].amount,M.hitAmount(50,expected,1,'FIRE','EARTH'));
  else assert.ok(hits.every(h=>h.amount===0));
}

// 簡單版保持既有實體格門檻、五珠技能和獎勵數字。
{
  const b=makeBoard(),magic=M.emptyMagic(b);magic[6][0]=5;
  const simple=M.resolveDrag(b,rowPath(4),M.seededRng(91),magic,1,false,false,8);
  assert.equal(simple.valid,true);assert.equal(simple.effectiveLength,8);
  assert.equal(simple.magicSpawn.power,4);assert.equal(simple.skill5,false);
  assert.equal(simple.attackAllowed,false,'簡單版沿用實體格門檻');
  const five=M.resolveDrag(b,rowPath(5),M.seededRng(91),magic,1,false,false,3);
  assert.equal(five.skill5,true);assert.equal(five.magicSpawn.power,5);
}

// 即使有效顆數超過門檻，仍需實際拖過至少三個合法相鄰格。
{
  const b=makeBoard(), magic=M.emptyMagic(b);magic[6][0]=12;
  const res=M.resolveDrag(b,rowPath(2),M.seededRng(8),magic,1,true,true,8);
  assert.equal(res.valid,false);assert.equal(res.reason,'short');assert.equal(res.effectiveLength,13);
  assert.equal(res.attackAllowed,false);assert.equal(res.steps.length,0);assert.deepEqual(res.board,b);
}

// 五珠技按有效顆數；實體五格含數字珠時不再誤觸五珠技。
{
  const b=makeBoard(), magic=M.emptyMagic(b);magic[6][0]=4;
  const res=M.resolveDrag(b,rowPath(5),M.seededRng(9),magic,1,true,true,8);
  assert.equal(res.effectiveLength,8);assert.equal(res.skill5,false);
  const ordinary=M.resolveDrag(b,rowPath(5),M.seededRng(9),M.emptyMagic(b),1,true,true,8);
  assert.equal(ordinary.effectiveLength,5);assert.equal(ordinary.skill5,true);assert.equal(ordinary.attackAllowed,false);
}

// 盾牌保留儲存顆數；清全色只擴充消除範圍，不能以清除總數繞過傷害門檻。
for(const [minimum,allowed] of [[8,true],[12,false]]) {
  const b=makeBoard(),magic=M.emptyMagic(b);magic[6][0]=7;
  const res=M.resolveDrag(b,rowPath(3),M.seededRng(9),magic,1,true,true,minimum);
  assert.equal(res.effectiveLength,9);assert.equal(res.chainLength,3);assert.equal(res.attackAllowed,allowed);
  assert.equal(res.magicSpawn,null);
  assert.equal(res.steps[0].groups[0].size,b.flat().filter(e=>e==='FIRE').length);
  assert.equal(res.magic.flat().filter(n=>n>=7).length,0);
  if(!allowed) assert.ok(M.computeHits(res.steps,team,'EARTH').every(h=>h.amount===0));
}

// 加權數字不放寬路徑規則。
{
  const b=Array.from({length:3},()=>Array(3).fill('FIRE')),magic=M.emptyMagic(b);magic[0][0]=8;
  for(const path of [
    [{r:0,c:0},{r:1,c:1},{r:0,c:1},{r:1,c:0}],
    [{r:0,c:0},{r:0,c:1},{r:0,c:0}],
    [{r:0,c:0},{r:0,c:2},{r:1,c:2}],
  ]) {
    const res=M.resolveDrag(b,path,M.seededRng(1),magic,1,true,true,8);
    assert.equal(res.valid,false);assert.equal(res.attackAllowed,false);assert.deepEqual(res.board,b);
    assert.ok(Number.isFinite(res.effectiveLength));
  }
}
console.log('PASS: weighted stored-orb count, attack gate, seven/eight shield reward, physical path guard and shield no-double-reward');

// Weighted move discovery avoids reshuffling a valid 3 + 5 attack route.
{
 const b=[['FIRE','FIRE','SPACE'],['WATER','FIRE','FIRE']], magic=M.emptyMagic(b);magic[0][0]=5;
 assert.equal(M.hasDragMove(b,false,8),false);
 assert.equal(M.hasDragMove(b,false,8,magic),true);
 const two=[['FIRE','FIRE'],['WATER','EARTH']], m=M.emptyMagic(two);m[0][0]=10;
 assert.equal(M.hasDragMove(two,true,8,m),false);
}
