import { NextResponse } from 'next/server';
import { beginGuestOrb } from '@/lib/beast-game/guest-orb';
import { withDevChain17 } from '@/lib/beast-game/match3/dev-chain';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    const raw=await request.text();if(raw.length>120000)throw new Error('資料過大');
    const {profile,seed,devChain}=JSON.parse(raw);
    // 開發捷徑：只在開發環境、且明確帶 devChain=17 才換盤面；正式環境一律忽略。
    const tweak=process.env.NODE_ENV==='development'&&devChain===17?withDevChain17:undefined;
    return NextResponse.json(beginGuestOrb(profile,seed,tweak),{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'暫時無法確認親友戰局，請返回選卡重試。'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
