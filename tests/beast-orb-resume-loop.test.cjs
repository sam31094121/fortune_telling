// 寶石捷連線「一直重來」回歸（2026-11-25）：高關卡共同卡庫存檔接續後，合法連珠必須被接受；拒絕要帶機器代碼；
// 前端明確拒絕就地還原、不重掛整局。經真正的 orb-turn 路由＋記憶體 CAS 替身（非正式資料庫）。
const assert=require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto'),Module=require('node:module'),resolve=Module._resolveFilename;
Module._resolveFilename=function(n,...r){return resolve.call(this,n.startsWith('@/')?path.join(__dirname,'..',n.slice(2)):n,...r)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
process.env.BEAST_BATTLE_SECRET='resume-loop-test-secret';
const repoModule=require('../lib/beast-game/cultivation-repository.ts');
let rows=new Map();
repoModule.cultivationRepository=()=>({async read(o){const r=rows.get(o);if(!r)throw new Error('共同卡庫暫時無法讀取，未扣材料。');return structuredClone(r)},async compareAndSwap(o,rev,next){if(rows.get(o)?.revision!==rev)return false;rows.set(o,structuredClone(next));return true}});
const {initialSharedOrb}=require('../lib/beast-game/cultivation-orb-state.ts');
const orb=require('../lib/beast-game/cultivation-orb.ts');
const {POST}=require('../app/api/beast-game/orb-turn/route.ts');
const {orbTurnNeedsResync}=require('../lib/beast-game/match3/orb-request.ts');
const {playableCards}=require('../lib/beast-game/registry.ts');
const {CARD_FACE_STATS}=require('../lib/beast-game/card-face-stats.ts');
const {canExtend}=require('../lib/beast-game/match3/drag.ts');
const {availableFoeTarget}=require('../lib/beast-game/match3/enemies.ts');
const {match3Mode}=require('../lib/beast-game/match3/config.ts');
const logged=[];const realError=console.error;console.error=(...a)=>logged.push(a.join(' '));
function legalPath(board,magic,diag){for(let r=0;r<board.length;r++)for(let c=0;c<board[0].length;c++){const p=[{r,c}];for(let s=0;s<4;s++){const a=p.at(-1);let next=null;for(let dr=-1;dr<=1&&!next;dr++)for(let dc=-1;dc<=1&&!next;dc++){const n={r:a.r+dr,c:a.c+dc};if((!dr&&!dc)||n.r<0||n.c<0||n.r>=board.length||n.c>=board[0].length||p.some(q=>q.r===n.r&&q.c===n.c))continue;if(canExtend(board,p,n,diag,magic,true))next=n;}if(!next)break;p.push(next);}if(p.length>=3)return p;}throw new Error('no path');}
function savedHighStage({wins=73,mode='hard45',receipts=0}={}){
 rows=new Map();const key=crypto.randomBytes(32).toString('hex'),owner=crypto.createHash('sha256').update(key).digest('hex');
 const ids=playableCards().filter(c=>CARD_FACE_STATS[c.id]&&c.form==='ADULT').slice(0,5).map(c=>c.id);
 const book={version:1,counts:{SPACE:2,AIR:2,WATER:2,FIRE:2,EARTH:2},receipts:Array.from({length:receipts},(_,i)=>`drop:orb:00000000-aaaa-bbbb-cccc-${String(i).padStart(12,'0')}:${i%60}:${i%5}`)};
 const input=initialSharedOrb({wins,teamIds:ids,shared:{stats:Object.fromEntries(ids.map(i=>[i,{attack:30,baseAttack:30,bonus:0}]))},treasures:book},7,mode);
 const id='orb:'+crypto.randomUUID();
 rows.set(owner,{revision:'0',state:{cards:[],protectedIds:[]},pendingBattle:id,receipts:[],orbRun:{id,version:0,seed:7,input},orbLedger:{wins,rewards:[],receipts:[]},orbTreasures:book});
 return {key,owner,id,mode,wins};
}
// 與 Match3Board release() 相同欄位；shared 戰局不再附本機寶器帳（伺服器只用存檔的 run.input.treasures）。
function clientBody(opened,mode,{sendBook=false}={}){const ri=opened.initial,cfg=match3Mode(mode);return {sharedBattleToken:opened.token,sharedVersion:opened.version,board:ri.board,magic:ri.magic,path:legalPath(ri.board,ri.magic,cfg.diagonal),team:ri.team,foes:ri.foes,mode,wins:ri.wins,target:availableFoeTarget(ri.foes,ri.target??0,ri.wins+1),seed:(ri.seed+ri.move*2654435761)>>>0,move:ri.move,chosen:ri.chosen,rule:ri.rule,attackBoost:ri.attackBoost,treasureGuard:ri.treasureGuard,treasures:sendBook?ri.treasures:undefined,actionId:'client:turn:'+ri.move};}
const post=async(key,body)=>{const r=await POST(new Request('http://localhost/api/beast-game/orb-turn',{method:'POST',headers:{'x-beast-wallet':key,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};};
(async()=>{
 // 1) 舊流程重現：高關卡帳號累積約 2,300 筆寶器收據，附本機寶器帳 → 每一手 413，接續後仍一樣（迴圈根因）。
 for(const mode of ['hard45','hard45b']){
  const s=savedHighStage({mode,receipts:2300});
  for(let i=0;i<3;i++){const opened=await orb.resumeSharedOrb(s.owner,s.id);const r=await post(s.key,clientBody(opened,mode,{sendBook:true}));assert.equal(r.status,413);assert.equal(r.body.code,'ORB_TOO_LARGE');assert.equal(r.body.error,'戰鬥資料過大，請重試。');assert.equal(rows.get(s.owner).orbRun.version,0,'rejected turn not applied');}
  assert(logged.some(l=>l.includes('ORB_TOO_LARGE')),'server logs real reason');
  // 2) 修後：同一份存檔接續 → 連續多手被接受、版本前進、寶器收據保留在伺服器。
  let accepted=0;
  for(let i=0;i<4;i++){const opened=await orb.resumeSharedOrb(s.owner,s.id);if(opened.outcome)break;const r=await post(s.key,clientBody(opened,mode));assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.sharedVersion,opened.version+1);accepted++;if(r.body.outcome)break;}
  assert(accepted>=2,'several legal moves accepted after resume');
  assert(rows.get(s.owner).orbTreasures.receipts.length>=2300,'server receipts kept (anti-replay intact)');
 }
 console.log('PASS high-stage save with ~2300 treasure receipts: old payload 413 every move (loop), fixed payload accepted across resumes, receipts preserved');
 // 3) 舊票證（>12h）與版本落後：接續會換新票證並同步版本，合法一手被接受；舊票證／舊版本本身仍被拒且帶代碼。
 {
  const s=savedHighStage();const opened=await orb.resumeSharedOrb(s.owner,s.id);
  const realNow=Date.now;Date.now=()=>realNow()+13*60*60*1000;
  try{const r=await post(s.key,clientBody(opened,s.mode));assert.equal(r.status,400);assert.equal(r.body.code,'ORB_TICKET_EXPIRED');assert.equal(r.body.error,'暫時無法完成本回合，請重試；尚未套用結果。');
   const fresh=await orb.resumeSharedOrb(s.owner,s.id);const ok=await post(s.key,clientBody(fresh,s.mode));assert.equal(ok.status,200);}
  finally{Date.now=realNow;}
  const now=await orb.resumeSharedOrb(s.owner,s.id);const stale=clientBody(now,s.mode);stale.sharedVersion=now.version+1;
  const r=await post(s.key,stale);assert.equal(r.status,400);assert.equal(r.body.code,'ORB_VERSION_STALE');
  const resumed=await orb.resumeSharedOrb(s.owner,s.id);assert.equal((await post(s.key,clientBody(resumed,s.mode))).status,200);
 }
 // 4) 防作弊不變：關卡數／隊伍與票證不符仍拒絕。
 {
  const s=savedHighStage();const opened=await orb.resumeSharedOrb(s.owner,s.id);
  const b=clientBody(opened,s.mode);b.wins=b.wins+1;const r=await post(s.key,b);assert.equal(r.status,400);assert.equal(r.body.code,'ORB_TICKET_MISMATCH');
  const t=clientBody(opened,s.mode);t.team=[...t.team].reverse();assert.equal((await post(s.key,t)).body.code,'ORB_TICKET_MISMATCH');
  assert.equal(rows.get(s.owner).orbRun.version,0);
 }
 console.log('PASS expired ticket / stale version rejected with machine code then recovered by resume; stage/team mismatch still rejected');
 // 5) 前端分類：明確拒絕（未套用）就地還原；網路／5xx／版本／憑證才重讀存檔。
 const e=(status,orbCode)=>Object.assign(new Error('turn unavailable'),{status,orbCode});
 for(const c of ['ORB_TOO_LARGE','ORB_BAD_BOARD','ORB_BAD_UNITS','ORB_TARGET_UNAVAILABLE'])assert.equal(orbTurnNeedsResync(e(400,c)),false,c);
 assert.equal(orbTurnNeedsResync(e(413)),false);
 for(const c of ['ORB_VERSION_STALE','ORB_REPLAY_MISMATCH','ORB_TICKET_EXPIRED','ORB_RUN_MISSING','ORB_LEDGER_MISMATCH',undefined])assert.equal(orbTurnNeedsResync(e(400,c)),true,String(c));
 assert.equal(orbTurnNeedsResync(e(502,'ORB_BAD_BOARD')),true);assert.equal(orbTurnNeedsResync(new Error('aborted')),true);assert.equal(orbTurnNeedsResync(null),true);
 // 6) 原始碼：shared 不附本機寶器帳、目錄不帶收據、拒絕分流、成功一手歸零重連次數、擋板文案不變。
 const src=fs.readFileSync(path.join(__dirname,'../components/battlefield/Match3Board.tsx'),'utf8');
 assert.equal((src.match(/treasures:init\.sharedBattleToken\?undefined:book/g)||[]).length,2);
 assert(src.includes("book:{...book,receipts:[]}"));
 assert(src.includes('init.sharedBattleToken&&orbTurnNeedsResync(error))onRecover()'));
 assert(src.includes('onTurnAccepted={()=>{recoveryAttempts.current=0;}}'));
 assert(src.includes("showError('戰局尚未恢復，請重新連線接續。')")&&src.includes('if(++recoveryAttempts.current>2)'));
 console.log('PASS client: in-place restore for explicit rejections, resync only when unknown/stale, accepted turn resets recovery gate, unchanged copy');
 console.error=realError;
})().catch(e=>{console.error=realError;console.error(e);process.exit(1);});
