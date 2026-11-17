// Offline test signer only. No test bypass is exposed by the HTTP service.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
if(fs.existsSync(path.join(root,'.env.local')))process.loadEnvFile(path.join(root,'.env.local'));
require('./helpers/server-only-runtime.cjs');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,...args)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const guest=require('../lib/beast-game/guest-orb.ts'),campaign=require('../lib/beast-game/match3/hard-campaign.ts');
function signedFixture(input,id='authority-fixture'){
 const profile={...campaign.chooseCampaignHero(campaign.newCampaign(input.wins),'beast_g_baihu'),teamIds:['beast_g_baihu',...require('../lib/beast-game/registry.ts').playableCards().filter(c=>c.form==='YOUNG').slice(0,4).map(c=>c.id)]};
 return {...input,guestBattleToken:guest.sealGuestOrb({kind:'battle',id,version:0,seed:input.seed,input,profile})};
}
module.exports={...guest,signedFixture};
