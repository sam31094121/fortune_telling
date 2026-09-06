import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { advance, interactiveCatalog, newMatch, profile, type Action, type Match } from '@/lib/beast-game/interactive';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const root=process.env.BEAST_DATA_DIR??path.join(process.cwd(),'data','beast-turn-accounts');
const cookie='beast_turn_account';
type Account={owned:string[]; experience:Record<string,number>; match:Match|null; summonDay:string|null; imported:boolean; revision:number; lastRequest:string|null; awardedRevision:number|null};
const catalog=interactiveCatalog();const ids=catalog.map(c=>c.id);
const pick=(count:number)=>{const pool=[...ids],out:string[]=[];while(out.length<count)out.push(pool.splice(randomInt(pool.length),1)[0]);return out;};
function accountId(req:Request){const raw=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);return raw&&/^[a-f0-9-]{36}$/.test(raw)?raw:null;}
async function transact(req:Request, mutate?:(a:Account)=>void){
  if(process.env.VERCEL&&!process.env.BEAST_DATA_DIR)return NextResponse.json({ok:false,error:'新版收藏儲存尚未配置，請稍後再試。'},{status:503});
  const id=accountId(req)??randomUUID();await mkdir(root,{recursive:true});const file=path.join(root,id+'.json'),lock=file+'.lock';
  try{await mkdir(lock);}catch{return NextResponse.json({ok:false,error:'資料正在保存，請稍後重試。'},{status:409});}
  try{
    let a:Account;
    try{a=JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;a={owned:pick(3),experience:{},match:null,summonDay:null,imported:false,revision:0,lastRequest:null,awardedRevision:null};}
    mutate?.(a);
    const temp=file+'.tmp';await writeFile(temp,JSON.stringify(a));await rename(temp,file);
    const res=NextResponse.json({ok:true,account:a,cards:catalog,rules:{energyStart:2,energyCap:6,energyPerRound:1,maxRounds:80,summonProbability:'每張 1/60',storage:'此伺服器與目前瀏覽器識別；尚未連接登入帳號。'}},{headers:{'Cache-Control':'no-store'}});
    res.cookies.set(cookie,id,{httpOnly:true,sameSite:'strict',secure:new URL(req.url).protocol==='https:',path:'/',maxAge:31536000});return res;
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'無法保存，請稍後重試。'},{status:400});}
  finally{await rm(lock,{recursive:true,force:true});}
}
export async function GET(req:Request){return transact(req);}
export async function POST(req:Request){
  const origin=req.headers.get('origin');
  if(origin){let valid=false;try{valid=new URL(origin).host===(req.headers.get('host')??new URL(req.url).host);}catch{/* malformed origin */}
    if(!valid)return NextResponse.json({ok:false,error:'來源不符。'},{status:403});}
  let b:{type:string;revision:number;requestId:string;lineup?:string[];action?:Action;cardId?:string;legacyIds?:string[]};
  try{b=await req.json();}catch{return NextResponse.json({ok:false,error:'資料格式無效。'},{status:400});}
  if(!b||typeof b.requestId!=='string'||b.requestId.length>80||!Number.isInteger(b.revision))return NextResponse.json({ok:false,error:'請重新載入遊戲。'},{status:400});
  return transact(req,a=>{
    if(a.lastRequest===b.requestId)return;
    if(a.revision!==b.revision)throw new Error('另一個操作已更新戰局，請重新載入後再試。');
    switch(b.type){
      case 'IMPORT':
        if(a.imported)throw new Error('舊收藏已匯入。');
        if(!Array.isArray(b.legacyIds)||b.legacyIds.length>60||b.legacyIds.some(id=>!ids.includes(id)))throw new Error('舊收藏資料無效。');
        a.owned=[...new Set([...a.owned,...b.legacyIds])];a.imported=true;break;
      case 'START':
        if(a.match?.status==='PLAYING')throw new Error('請先完成目前戰鬥，或選擇離開戰鬥。');
        if(!Array.isArray(b.lineup)||b.lineup.some(id=>!a.owned.includes(id)))throw new Error('只能使用已收藏神獸。');
        a.match=newMatch(b.lineup,pick(3),randomInt(2147483647));a.awardedRevision=null;break;
      case 'ACTION':
        if(!a.match||!b.action)throw new Error('請先組隊開戰。');
        a.match=advance(a.match,b.action);
        if(a.match.status==='FINISHED'&&a.awardedRevision===null){for(const f of a.match.player.team)a.experience[f.cardId]=(a.experience[f.cardId]??0)+1;a.awardedRevision=a.match.revision;}
        break;
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
