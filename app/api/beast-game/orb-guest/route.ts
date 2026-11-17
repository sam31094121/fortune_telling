import { NextResponse } from 'next/server';
import { beginGuestOrb } from '@/lib/beast-game/guest-orb';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    const raw=await request.text();if(raw.length>120000)throw new Error('資料過大');
    const {profile,seed}=JSON.parse(raw);
    return NextResponse.json(beginGuestOrb(profile,seed),{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'暫時無法確認親友戰局，請返回選卡重試。'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
