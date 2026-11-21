const {spawnSync}=require('node:child_process');
// Also cross an actual late portrait load on the short viewport. The same
// 120-frame / 1px assertion applies; do not wait for images to hide the shift.
const cases=process.env.MATCH3_LAYOUT_IMAGE_DELAY_MS?[{}]:[{}, {MATCH3_LAYOUT_HEIGHT:'650',MATCH3_LAYOUT_IMAGE_DELAY_MS:'1500'}];
for(const extra of cases){
  const result=spawnSync(process.execPath,['tests/beast-match3-refill.e2e.mjs'],{stdio:'inherit',env:{...process.env,...extra,MATCH3_LAYOUT_AUDIT:'1',MATCH3_REPLAY_ONLY:'1'}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
