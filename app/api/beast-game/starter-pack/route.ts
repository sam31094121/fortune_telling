import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
export const runtime='nodejs';
const modules=new Set(['number','ziwei','bazi','nameology','zodiac','soul_match','music','tarot','battlefield','stake-duel']);
/** Uses the application's existing client completion records; no account login is provided. */
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==req.headers.get('host'))return NextResponse.json({ok:false,error:'來源不符'},{status:403});
  const {completed}=await req.json();if(!modules.has(completed))return NextResponse.json({ok:false,error:'請先完成任一項遊戲。'},{status:400});
  if(process.env.VERCEL&&!process.env.BEAST_DATA_DIR)return NextResponse.json({ok:false,error:'獎勵保存服務尚未配置，請稍後重試。'},{status:503});
  const root=path.join(process.env.BEAST_DATA_DIR??path.join(process.cwd(),'data','beast-turn-accounts'),'starter-packs');
  await mkdir(root,{recursive:true});
  // The existing anonymous profile survives concurrent first requests from this browser.
  const profileId=req.headers.get('x-growth-profile');
  if(!profileId||!/^anon_[a-z0-9_]{6,100}$/.test(profileId))return NextResponse.json({ok:false,error:'請允許此瀏覽器保存遊戲進度。'},{status:400});
  const file=path.join(root,profileId+'.json');
  const record={receipt:randomUUID(),completed,at:new Date().toISOString()};
  try{await writeFile(file,JSON.stringify(record),{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
  const saved=JSON.parse(await readFile(file,'utf8'));
  return NextResponse.json({ok:true,receipt:saved.receipt,count:28});
 }catch{return NextResponse.json({ok:false,error:'獎勵尚未保存，請重試。'},{status:503});}
}
