const {spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,['tests/beast-match3-refill.e2e.mjs'],{stdio:'inherit',env:{...process.env,MATCH3_LAYOUT_AUDIT:'1',MATCH3_REPLAY_ONLY:'1'}});
if(result.error)throw result.error;process.exit(result.status??1);
