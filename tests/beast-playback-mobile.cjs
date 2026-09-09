const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  let data,requests=0;
  page.on('response',async r=>{if(r.url().endsWith('/api/beast-game/turns')){const body=await r.json();if(body.ok)data=body;}});
  page.on('request',r=>{if(r.url().endsWith('/api/beast-game/turns')&&r.method()==='POST'&&r.postDataJSON().type==='ACTION')requests++;});
  await page.goto('http://localhost:8888/beast-game');
  await page.getByRole('button',{name:'確認陣容',exact:true}).waitFor();
  for(const id of ['beast_a01','beast_a02','beast_a03'])await page.getByRole('button',{name:new RegExp('^'+data.cards.find(c=>c.id===id).name+'，')}).tap();
  await page.getByRole('button',{name:'確認陣容',exact:true}).tap();
  await page.getByRole('button',{name:'開始對戰・輕鬆自動',exact:true}).tap();
  await page.getByText('技能就緒・等你決定',{exact:true}).waitFor();
  await page.getByRole('button',{name:'暫停自動',exact:true}).tap();
  const play=async(button,expected)=>{
    await page.locator('[data-playback="ready"]').waitFor();
    const before=requests;
    const response=page.waitForResponse(r=>r.url().endsWith('/api/beast-game/turns')&&r.request().method()==='POST');
    await button.evaluate(node=>{for(let i=0;i<8;i++)node.click();});
    data=await(await response).json();
    await page.locator('[data-playback="acting"]').waitFor();
    assert.equal(requests,before+1,'Eight immediate clicks send one action');
    assert.equal(await page.locator('[data-fighter="player"] [data-action]').getAttribute('data-action'),expected);
    assert.equal(await page.locator('[aria-label="本回合指令"] button:not(:disabled)').count(),0,'Controls remain locked during the presentation');
    if(expected==='SKILL')assert.match(await page.locator('[data-fighter="player"] [data-action] button').evaluate(n=>getComputedStyle(n).animationName),/skillCharge/);
    if(expected==='SWITCH')assert.match(await page.locator('[data-fighter="player"] [data-action] button').evaluate(n=>getComputedStyle(n).animationName),/reserveEnter/);
    await page.screenshot({path:`reports/beast-relaxed/playback-${expected}.png`});
    await page.locator('[data-playback="ready"]').waitFor();
    assert.equal(requests,before+1,'The lock never queues unwanted extra actions');
  };
  await play(page.getByRole('button',{name:/^技能/}),'SKILL');
  await page.getByRole('button',{name:/^換卡/}).tap();
  const beforeRound=data.account.match.round;
  await play(page.getByRole('button',{name:'換上 亢金龍',exact:true}),'SWITCH');
  assert.equal(data.account.match.round,beforeRound+1);
  await play(page.getByRole('button',{name:/^普通攻擊/}),'ATTACK');
  console.log('PASS: mobile skill, voluntary switch and attack have distinct real animations; burst clicks submit once and no queued actions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
