// Regression (2026-10-19): one battle awards growth exactly once.
// Replaying an old in-progress ticket after a rematch used to restore the finished battle,
// award +1 growth again and overwrite the live rematch. Real route + real engine, memory-only storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const engine = require('../.beast-game-build/lib/beast-game/interactive.js');
let stored = null;
const virtualFs = {
  mkdir: async () => {}, stat: async () => { throw Object.assign(new Error(), {code:'ENOENT'}); }, rm: async () => {},
  readFile: async () => { if(stored === null) throw Object.assign(new Error(), {code:'ENOENT'}); return stored; },
  writeFile: async (_, value) => { stored = value; }, rename: async () => {},
};
const sandbox = {exports:{}, process, console, URL, require(name) {
  if(name === 'node:fs/promises') return virtualFs;
  if(name === 'next/server') return {NextResponse:{json:(data,options={})=>({data,status:options.status??200,cookies:{set(){}}})}};
  if(name.startsWith('@/lib/beast-game/')) return require(path.resolve('.beast-game-build',name.slice(2)+'.js'));
  return require(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/beast-game/turns/route.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},
}).outputText,sandbox);
const headers={cookie:'beast_turn_account=33333333-3333-4333-8333-333333333333',origin:'http://127.0.0.1','content-type':'application/json'};
const get=()=>sandbox.exports.GET(new Request('http://127.0.0.1/api/beast-game/turns',{headers}));
const post=body=>sandbox.exports.POST(new Request('http://127.0.0.1/api/beast-game/turns',{method:'POST',headers,body:JSON.stringify(body)}));
(async()=>{
  for(const difficulty of ['NORMAL','HARD']){
    stored=null;
    let response=await get();
    const lineup=engine.interactiveCatalog().slice(0,3).map(c=>c.id);
    response=await post({type:'START',lineup,revision:response.data.account.revision,requestId:`start-${difficulty}`,difficulty});
    assert.equal(response.data.account.match.status,'PLAYING');
    let lastBody;
    for(let i=0;i<200&&response.data.account.match.status==='PLAYING';i++){
      lastBody={type:'ACTION',action:engine.chooseAI(response.data.account.match,'player'),revision:response.data.account.revision,requestId:`${difficulty}-move-${i}`,ticket:response.data.ticket};
      response=await post(lastBody);
      assert.equal(response.status,200);
    }
    assert.equal(response.data.account.match.status,'FINISHED');
    for(const id of lineup)assert.equal(response.data.account.experience[id],1,'first finish awards once');
    // Mid-session reload (GET) changes nothing.
    await get(); for(const id of lineup)assert.equal(JSON.parse(stored).experience[id],1);
    // Rematch, then replay the finished battle's last in-progress ticket.
    response=await post({type:'START',lineup,revision:response.data.account.revision,requestId:`rematch-${difficulty}`,difficulty});
    const live=response.data.account.match;
    for(let k=0;k<3;k++){
      await post({...lastBody,revision:JSON.parse(stored).revision,requestId:`replay-${difficulty}-${k}`});
      const account=JSON.parse(stored);
      for(const id of lineup)assert.equal(account.experience[id],1,`replayed ticket must not award again (${difficulty})`);
      assert.equal(account.match.seed,live.seed,`replayed ticket must not overwrite the live rematch (${difficulty})`);
    }
  }
  console.log('PASS turns award-once: NORMAL+HARD finish, reload, rematch, 3x replayed old ticket -> growth stays +1, live rematch kept');
})().catch(error=>{console.error(error);process.exitCode=1;});
