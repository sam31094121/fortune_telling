import sharp from 'sharp'; import fs from 'fs'; import crypto from 'crypto';
const T='_tmp_beast_retouch'; const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
async function m(f){const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width,H=info.height,n=W*H;
 let b235=0,b250=0,q=[0,0,0,0],qc=[0,0,0,0],hx=0,hy=0,hc=0,sx=0,sy=0,sw=0; const L=new Float32Array(n);
 for(let i=0;i<n;i++){const r=data[3*i],g=data[3*i+1],bb=data[3*i+2];const l=.2126*r+.7152*g+.0722*bb;L[i]=l;if(l>235)b235++;if(l>250)b250++;
  const x=i%W,y=(i/W)|0;const k=(y<H/2?0:2)+(x<W/2?0:1);q[k]+=l;qc[k]++;
  const mx=Math.max(r,g,bb),mn=Math.min(r,g,bb);if(mx>40&&(mx-mn)/mx>0.25){let h;if(mx===r)h=((g-bb)/(mx-mn))%6;else if(mx===g)h=(bb-r)/(mx-mn)+2;else h=(r-g)/(mx-mn)+4;h*=Math.PI/3;hx+=Math.cos(h);hy+=Math.sin(h);hc++;}}
 const s=[...L].sort((a,b)=>a-b);const thr=s[Math.floor(.98*n)];for(let i=0;i<n;i++)if(L[i]>=thr){sx+=i%W;sy+=(i/W)|0;sw++;}
 const Q=q.map((v,i)=>+(v/qc[i]).toFixed(1));
 // local contrast: max abs diff between 8x8 block means (harshness)
 return {w:W,h:H,bright235:+(b235/n*100).toFixed(2),bright250:+(b250/n*100).toFixed(3),quad_TL_TR_BL_BR:Q,TLminusBR:+(Q[0]-Q[3]).toFixed(1),leftMinusRight:+((Q[0]+Q[2]-Q[1]-Q[3])/2).toFixed(1),topMinusBottom:+((Q[0]+Q[1]-Q[2]-Q[3])/2).toFixed(1),
  hiCentroid:[+(sx/sw/W).toFixed(2),+(sy/sw/H).toFixed(2)],hueDeg:+((Math.atan2(hy,hx)*180/Math.PI+360)%360).toFixed(1),satPx:+(hc/n*100).toFixed(1),p99:+s[Math.floor(.99*n)].toFixed(1),p1:+s[Math.floor(.01*n)].toFixed(1)};}
const out={};
for(const g of ['guardian-baihu']) out[g]=await m(`public/beast-game/front/${g}.v2.webp`);
for(let i=11;i<=20;i++){const c='young-'+i;const o=`${T}/_backup-retouch-20261108/front/${c}.v2.webp`,nw=`public/beast-game/front/${c}.v2.webp`;out[c]={oldSha:sha(fs.readFileSync(o)),newSha:sha(fs.readFileSync(nw)),old:await m(o),new:await m(nw)};}
for(let i=13;i<=22;i++){const c='adult-'+i;const o=`${T}/_backup-retouch-20261108/front/${c}.v2.webp`,nw=`${T}/candidates/${c}.cand.webp`;out[c]={oldSha:sha(fs.readFileSync(o)),newSha:sha(fs.readFileSync(nw)),old:await m(o),new:await m(nw)};}
fs.writeFileSync(`${T}/dual-gate/image-metrics.json`,JSON.stringify(out,null,1));
for(const [k,v] of Object.entries(out)){if(!v.old){console.log(k,JSON.stringify(v));continue;}const a=v.old,b=v.new;console.log(`${k} ${b.w}x${b.h} hue ${a.hueDeg}->${b.hueDeg} satPx ${a.satPx}->${b.satPx} bright235 ${a.bright235}->${b.bright235} b250 ${b.bright250} TL-BR ${a.TLminusBR}->${b.TLminusBR} L-R ${a.leftMinusRight}->${b.leftMinusRight} T-B ${a.topMinusBottom}->${b.topMinusBottom} hiC ${b.hiCentroid} p1/p99 ${b.p1}/${b.p99}`);}
