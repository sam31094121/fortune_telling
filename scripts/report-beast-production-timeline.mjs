import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const cards=read('public/skill-battle-archive/index.json').cards;
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const local=iso=>iso?new Date(iso).toLocaleString('sv-SE',{timeZone:'Asia/Taipei',hour12:false}):'';
const rows=[['序號','ID','神獸','版本','狀態','送出台灣時間','回傳台灣時間','該次請求往返秒數（錯誤亦計）','模型審查時間','影片秒數','配額阻擋','候選路徑']];
for(const [n,c] of cards.entries()){
 const j=read(`reports/beast-production/${c.poolId}.json`);
 const dir=j.provider==='gemini-omni-1.1-flash'||j.attempt>1?`.tmp/beast-production/${j.cardId}/attempt-${String(j.attempt).padStart(2,'0')}`:`.tmp/beast-production/${j.cardId}`;
 const review=fs.existsSync(`${dir}/model-review.json`)?read(`${dir}/model-review.json`):null;
 const roundTrip=j.startedAt&&j.providerReturnedAt?((Date.parse(j.providerReturnedAt)-Date.parse(j.startedAt))/1000).toFixed(3):'';
 rows.push([n+1,j.cardId,j.name,j.attempt??0,j.state,local(j.startedAt),local(j.providerReturnedAt),roundTrip,local(review?.at),j.preview?6:'',j.quota?.scope??'',j.preview??'']);
}
fs.writeFileSync('reports/beast-production/timeline.csv','\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n');
console.log('Saved sixty actual production rows; unknown times remain empty.');
