const assert = require('node:assert/strict');
require('./helpers/server-only-runtime.cjs');
const path = require('node:path');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
global.window={localStorage:storage,dispatchEvent:()=>{}};
Object.defineProperty(global,'navigator',{value:{locks:{request:async(name,options,fn)=>fn({name})}},configurable:true});
const client=require('../lib/beast-cultivation-client.ts');
const view=(revision,id)=>({revision,cards:[{id,cardId:'beast_a01',bonus:'0'}],collectionCards:[{id,cardId:'beast_a01',source:'DUEL_WIN',at:''}],protectedIds:[],pendingBattle:null,canProtectFive:false,reason:'請先鎖定'});
(async()=>{
 values.set('tdh_beast_collection_v1',JSON.stringify({cards:[],history:[]}));values.set('tdh_beast_wallet_v1','a'.repeat(64));
 let response=view('2','new');global.fetch=async()=>({ok:true,json:async()=>({ok:true,view:response})});
 await client.sharedRequest();response=view('1','old');const late=await client.sharedRequest();assert.equal(late.view.revision,'2');assert.equal(JSON.parse(values.get('tdh_beast_collection_v1')).cards[0].id,'new');
 const original=storage.setItem;storage.setItem=(k,v)=>{if(k==='tdh_beast_collection_v1')throw Error('disk unavailable');original(k,v)};response=view('3','saved-server-side');await assert.rejects(client.sharedRequest());storage.setItem=original;await client.sharedRequest();assert.equal(JSON.parse(values.get('tdh_beast_collection_v1')).cards[0].id,'saved-server-side');
 global.navigator.locks.request=async(name,options,fn)=>{assert.equal(options.ifAvailable,true);return fn(null)};await assert.rejects(client.syncSharedCultivation(),/另一分頁/);
 let locks=0,release;global.navigator.locks.request=async(name,options,fn)=>{locks++;return fn({name});};
 global.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({ok:true,view:view('4','shared-read')})});});
 const first=client.syncSharedCultivation(),second=client.syncSharedCultivation();assert.equal(first,second,'same-page StrictMode reads share the operation');assert.equal(locks,1);release();assert.deepEqual(await first,await second);
 global.fetch=async()=>({ok:true,json:async()=>({ok:true,view:view('5','fresh-read')})});await client.syncSharedCultivation();assert.equal(locks,2,'later reads still refresh');
 console.log('PASS client: late response cannot roll back inventory; local-save failure stays retryable and recovers same server revision; another-tab battle fails promptly instead of waiting indefinitely.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
