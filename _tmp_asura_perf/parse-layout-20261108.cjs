const fs=require('fs'),path=require('path');const D=path.join(__dirname,'traces-20261108');
for(const cpu of [4,6]){
 const f=path.join(D,`open-390-cpu${cpu}-layout.json`); const ev=JSON.parse(fs.readFileSync(f,'utf8')).traceEvents;
 const tn={};for(const e of ev)if(e.ph==='M'&&e.name==='thread_name')tn[e.pid+':'+e.tid]=e.args.name;
 const s=ev.find(e=>e.name==='asura-action-start'),en=ev.filter(e=>e.name==='asura-action-end').pop();
 const pid=s.pid,t0=s.ts,t1=en.ts; const main=+Object.entries(tn).find(([k,v])=>v==='CrRendererMain'&&k.startsWith(pid+':'))[0].split(':')[1];
 const W=ev.filter(e=>e.pid===pid&&e.tid===main&&e.ts>=t0&&e.ts<=t1);
 const ms=x=>+(x/1000).toFixed(1); const rel=e=>ms(e.ts-t0);
 const lts=W.filter(e=>e.ph==='X'&&e.name==='RunTask'&&e.dur>50000).map(e=>({start:rel(e),dur:ms(e.dur),end:e.ts+e.dur,ts:e.ts}));
 const top=(arr,n)=>arr.sort((a,b)=>b.dur-a.dur).slice(0,n);
 const layouts=top(W.filter(e=>e.name==='Layout'&&e.ph==='X'),5);
 const styles=top(W.filter(e=>(e.name==='UpdateLayoutTree'||e.name==='RecalculateStyles')&&e.ph==='X'),5);
 const inv=W.filter(e=>/Invalidat|ScheduleStyle|StyleRecalcInvalidation|LayoutInvalidation|StyleInvalidator/.test(e.name));
 const fmtInv=(lo,hi)=>{const c={};for(const e of inv){if(e.ts<lo||e.ts>hi)continue;const d=e.args?.data||{};const key=[e.name,d.nodeName||'',(d.reason||d.invalidationSet?.[0]?.classes||''),(d.stackTrace?.[0]?.functionName||'')+'@'+(d.stackTrace?.[0]?.url||'').split('/').pop()+':'+(d.stackTrace?.[0]?.lineNumber??'')].join(' | ');c[key]=(c[key]||0)+1}return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12)};
 // categorize time within each long task
 const byName=lt=>{const c={};for(const e of W){if(e.ph!=='X'||e.ts<lt.ts||e.ts>lt.end||e.name==='RunTask')continue;c[e.name]=(c[e.name]||0)+e.dur}return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+':'+ms(v))};
 const sel=ev.filter(e=>e.pid===pid&&e.ts>=t0&&e.ts<=t1&&/SelectorStats/i.test(e.name));
 const selAgg={};for(const e of sel){for(const r of (e.args?.selector_stats?.selector_timings||[])){const k=r.selector;selAgg[k]=selAgg[k]||{us:0,match:0,attempts:0};selAgg[k].us+=r.elapsed||r['elapsed (us)']||0;selAgg[k].match+=r.match_count||0;selAgg[k].attempts+=r.match_attempts||0}}
 const out={cpu,windowMs:ms(t1-t0),longTasks:lts.map(l=>({start:l.start,dur:l.dur,top:byName(l)})),
  layouts:layouts.map(e=>({start:rel(e),dur:ms(e.dur),begin:e.args?.beginData,end:e.args?.endData?{root:e.args.endData.root?.length,layoutRoots:e.args.endData.layoutRoots?.length}:null,inv:fmtInv(e.ts-300000,e.ts)})),
  styles:styles.map(e=>({name:e.name,start:rel(e),dur:ms(e.dur),elementCount:e.args?.elementCount??e.args?.endData?.elementCount??e.args?.beginData,inv:fmtInv(e.ts-300000,e.ts)})),
  invalidationEventNames:[...new Set(inv.map(e=>e.name))],selectorStatsEvents:sel.length,
  topSelectors:Object.entries(selAgg).sort((a,b)=>b[1].us-a[1].us).slice(0,10)};
 fs.writeFileSync(path.join(D,`open-390-cpu${cpu}-layout.analysis.json`),JSON.stringify(out,null,2),'utf8');
 console.log(JSON.stringify(out));
}
