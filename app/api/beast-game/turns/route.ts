import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { advance, chooseAI, interactiveCatalog, newMatch, profile, type Action, type Difficulty, type Match } from '@/lib/beast-game/interactive';
import { TURNS_START_DEFAULT_DIFFICULTY } from '@/lib/beast-game/iching-skill-archive';
import { battleViewFor } from '@/lib/beast-game/battle-view';
import { openBattleSession, signBattleSession } from '@/lib/beast-game/battle-session';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// Vercel read-only filesystem: fall back to /tmp (ephemeral but writable; fine for free-play sessions)
const root=process.env.BEAST_DATA_DIR??(process.env.VERCEL?'/tmp/beast-turn-accounts':path.join(process.cwd(),'data','beast-turn-accounts'));
const cookie='beast_turn_account';
type Account={owned:string[]; experience:Record<string,number>; match:Match|null; summonDay:string|null; imported:boolean; revision:number; lastRequest:string|null; awardedRevision:number|null; awardedBattles?:string[]};
const catalog=interactiveCatalog();const ids=catalog.map(c=>c.id);
// Idempotent settlement key per battle: the same battle can never award growth twice (reload, replayed ticket, rematch).
const battleKey=(m:Match)=>`${m.seed}:${m.player.team.map(f=>f.cardId).join(',')}:${m.opponent.team.map(f=>f.cardId).join(',')}`;
function awardOnce(a:Account){if(!a.match||a.match.status!=='FINISHED'||a.awardedRevision!==null)return;const key=battleKey(a.match),done=a.awardedBattles??[];
  if(!done.includes(key)){for(const f of a.match.player.team)a.experience[f.cardId]=(a.experience[f.cardId]??0)+1;a.awardedBattles=[...done,key].slice(-200);}
  a.awardedRevision=a.match.revision;}
const pick=(count:number)=>{const pool=[...ids],out:string[]=[];while(out.length<count)out.push(pool.splice(randomInt(pool.length),1)[0]);return out;};
function accountId(req:Request){const raw=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);return raw&&/^[a-f0-9-]{36}$/.test(raw)?raw:null;}
async function transact(req:Request, mutate?:(a:Account)=>void){
  const id=accountId(req)??randomUUID();await mkdir(root,{recursive:true});const file=path.join(root,id+'.json'),lock=file+'.lock';
  // Clear stale lock: if lock is older than 10s the previous function was likely killed before cleanup.
  try{const s=await stat(lock);if(Date.now()-s.mtimeMs>10000)await rm(lock,{recursive:true,force:true});}catch{/* no lock yet */}
  try{await mkdir(lock);}catch{return NextResponse.json({ok:false,error:'資料正在保存，請稍後重試。'},{status:409});}
  try{
    let a:Account;let created=false;
    try{a=JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;created=true;a={owned:pick(3),experience:{},match:null,summonDay:null,imported:false,revision:0,lastRequest:null,awardedRevision:null};}
    mutate?.(a);
    // Navigation must not rewrite an existing customer's battle record.
    if(created||mutate){const temp=file+'.tmp';await writeFile(temp,JSON.stringify(a));await rename(temp,file);}
    const ticket=a.match?signBattleSession({v:1,match:a.match,stakeCardId:null,stakeCount:0,issuedAt:Date.now()}):null;
    const res=NextResponse.json({ok:true,account:a,ticket,view:a.match?battleViewFor(a.match):null,cards:catalog,rules:{energyStart:2,energyCap:6,energyPerRound:1,maxRounds:80,summonProbability:'每張 1/60',storage:'此伺服器與目前瀏覽器識別；尚未連接登入帳號。'}},{headers:{'Cache-Control':'no-store'}});
    res.cookies.set(cookie,id,{httpOnly:true,sameSite:'strict',secure:new URL(req.url).protocol==='https:',path:'/',maxAge:31536000});return res;
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'無法保存，請稍後重試。'},{status:400});}
  finally{await rm(lock,{recursive:true,force:true});}
}
export async function GET(req:Request){return transact(req);}
export async function POST(req:Request){
  const origin=req.headers.get('origin');
  if(origin){let valid=false;try{valid=new URL(origin).host===(req.headers.get('host')??new URL(req.url).host);}catch{/* malformed origin */}
    if(!valid)return NextResponse.json({ok:false,error:'來源不符。'},{status:403});}
  let b:{type:string;revision:number;requestId:string;lineup?:string[];action?:Action;cardId?:string;legacyIds?:string[];autoFinish?:boolean;difficulty?:Difficulty;ticket?:string};
  try{b=await req.json();}catch{return NextResponse.json({ok:false,error:'資料格式無效。'},{status:400});}
  if(!b||typeof b.requestId!=='string'||b.requestId.length>80||!Number.isInteger(b.revision))return NextResponse.json({ok:false,error:'請重新載入遊戲。'},{status:400});
  return transact(req,a=>{
    /*
      手動多回合的穩定性（2026-10-17，業主要求開戰預設手動）：
      Vercel 每台機器的暫存區各一份，連續出招可能打到沒有這場存檔的機器。
      每次回應都附一張後端簽名的戰局票；出招時帶回來，若這台機器的存檔缺少或落後，就用驗過章的票接續。
      簽名擋得住竄改血量與勝負；擋不住拿舊票悔棋（免費練習戰，沒有押注，可接受）。
    */
    if(b.type==='ACTION'||b.type==='AUTO_STEP'||b.type==='AUTO_FINISH'){
      const restored=openBattleSession(b.ticket);
      if(restored&&restored.stakeCardId===null&&restored.stakeCount===0&&restored.match.status==='PLAYING'&&!(a.awardedBattles??[]).includes(battleKey(restored.match))&&(!a.match||a.match.revision<restored.match.revision)){
        a.match=restored.match;a.revision=b.revision;a.awardedRevision=null;a.lastRequest=null;
      }
    }
    if(a.lastRequest===b.requestId)return;
    if(a.revision!==b.revision)throw new Error('另一個操作已更新戰局，請重新載入後再試。');
    switch(b.type){
      case 'IMPORT':
        if(a.imported)throw new Error('舊收藏已匯入。');
        if(!Array.isArray(b.legacyIds)||b.legacyIds.length>60||b.legacyIds.some(id=>!ids.includes(id)))throw new Error('舊收藏資料無效。');
        a.owned=[...new Set([...a.owned,...b.legacyIds])];a.imported=true;break;
      case 'START':
        if(a.match?.status==='PLAYING')throw new Error('請先完成目前戰鬥，或選擇離開戰鬥。');
        /*
          出戰不限收藏——業主定調「把個人成長中心的鎖打開，讓客戶無限暢玩」。

          原本只能派已收藏的神獸，而卡片靠一天一次召喚累積，
          要湊齊六十張得花好幾週。新客戶開局只有三張，
          等於「想玩就先等」——那是把體驗鎖在收集進度後面。

          現在任何一張正式牌庫裡的神獸都能上場。
          **收藏沒有因此變成沒意義**：它仍然是押注的來源、
          仍然是完成使命後領獎的去處。改的是「能不能玩」，
          不是「擁有什麼」——暢玩與收藏是兩件事。
        */
        if(!Array.isArray(b.lineup)||b.lineup.length!==3||new Set(b.lineup).size!==3)throw new Error('請選三張不重複的神獸。');
        if(b.lineup.some(id=>!ids.includes(id)))throw new Error('這張神獸不在正式牌庫裡。');
        const allowed:Difficulty[]=['EASY','NORMAL','HARD'];
        const difficulty:Difficulty=allowed.includes(b.difficulty as Difficulty)?(b.difficulty as Difficulty):TURNS_START_DEFAULT_DIFFICULTY;
        a.match=newMatch(b.lineup,pick(3),randomInt(2147483647),{difficulty});a.awardedRevision=null;break;
      case 'ACTION':
        if(!a.match||!b.action)throw new Error('請先組隊開戰。');
        a.match=advance(a.match,b.action);
        awardOnce(a);
        break;
      case 'AUTO_STEP':
        // 自動連擊的下一招由後端依基礎規則決定（業主定調：前端只負責顯示）。
        if(!a.match||a.match.status!=='PLAYING')throw new Error('請先組隊開戰。');
        a.match=advance(a.match,chooseAI(a.match,'player'));
        awardOnce(a);
        break;
      case 'AUTO_FINISH':{
        // One-shot resolve for automatic play — avoids multi-turn /tmp races on multi-instance hosts (Vercel).
        if(!a.match||a.match.status!=='PLAYING')throw new Error('請先組隊開戰。');
        for(let i=0;i<200&&a.match.status==='PLAYING';i++)a.match=advance(a.match,chooseAI(a.match,'player'));
        if(a.match.status!=='FINISHED')throw new Error('自動對戰未完成，請改手動或再試一次。');
        awardOnce(a);
        break;}
      case 'LEAVE':a.match=null;break;
      case 'SUMMON':{
        const day=new Date().toISOString().slice(0,10);if(a.summonDay===day)throw new Error('今天已完成免費召喚，請明天再來。');
        const id=pick(1)[0];a.owned=[...new Set([...a.owned,id])];a.experience[id]=(a.experience[id]??0)+1;a.summonDay=day;break;}
      case 'EVOLVE':{
        const id=b.cardId??'',next=ids.includes(id)?profile(id).evolution:null;
        if(!next||!a.owned.includes(id)||(a.experience[id]??0)<3)throw new Error('幼子需要 3 點成長才能覺醒。');
        if(a.owned.includes(next))throw new Error('已收藏對應成獸，幼子仍可繼續出戰。');
        a.owned.push(next);break;}
      default:throw new Error('未知操作。');
    }
    a.revision++;a.lastRequest=b.requestId;
  });
}
