const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const sharp=require('sharp');
const metadata=new Map();
const imageMeta=file=>{if(!metadata.has(file))metadata.set(file,sharp(file).metadata());return metadata.get(file);};
function load(file,requireModule=require){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:m,exports:m.exports,require:requireModule});return m.exports;}
const rig=load('lib/beast-game/beast-rig.ts');
const stage=load('components/battlefield/BeastRigStage.tsx',id=>id==='@/lib/beast-game/beast-rig'?rig:require(id));
const centered={arenaWidth:390,from:{cx:195,top:743.5,width:70,height:98},to:{cx:195,top:253.5,width:96,height:134}};
// Isolated actual five-slot hard-board DOM measurement, 390×844, 2026-10-31.
const edge={arenaWidth:366,from:{cx:343.796875,top:623.53125,width:60.40625,height:84.375},to:{cx:343.796875,top:75,width:60.40625,height:60.40625}};
assert.equal(stage.orientRigGeometry(centered,390).mirror,false,'accepted centered framing unchanged');
assert.equal(stage.orientRigGeometry(edge,390).mirror,true,'near-vertical right column puts body toward center');
assert.equal(stage.orientRigGeometry({...edge,from:{...edge.from,cx:200}},390).mirror,true,'cross-column forward orientation preserved');
assert.equal(stage.orientRigGeometry({...edge,to:{...edge.to,cx:200}},390).mirror,false,'leftward cross-column orientation preserved');
const fixed=stage.orientRigGeometry(edge,390);
for(let ms=0;ms<=1500;ms++)assert.equal(stage.placeRig(fixed,rig.strikeFrame(ms/1500,rig.RIG_STYLES.baihu)).mirror,true,'orientation cannot flip mid-strike');
assert.equal(stage.shardOutsideReadabilityZones(0,0,4,[{x:0,y:0,radius:8}]),false);
assert.equal(stage.shardOutsideReadabilityZones(30,0,4,[{x:0,y:0,radius:8}]),true);
(async()=>{
  let protectedShards=0,visibleShards=0;
  for(const creature of Object.values(rig.BEAST_RIGS))for(const ms of [750,950,1120,1250]){
    const t=ms/1500,f=rig.strikeFrame(t,creature.style),spec=creature.frames.find(s=>s.id===f.layers[0].frame);
    const file='public'+rig.rigFrameUrl(creature,spec.id),meta=await imageMeta(file),aspect=meta.width/meta.height;
    const p=stage.placeRig(fixed,f,creature.style.size),aligned=stage.alignRigContact(p,f,spec,aspect,t,fixed,creature),dh=p.unit*spec.norm,sgn=p.mirror?-1:1,angle=p.rotation*sgn,pose=rig.livingPose(t,creature.style);
    const world=(u,v)=>{const d=rig.meshDisplace(u,v,aspect,spec.anchors,pose,t,creature.style);const x=((u-.5)*dh*aspect+d[0]*dh)*sgn,y=((v-.92)*dh+d[1]*dh)*f.squash;return[aligned.x+x*Math.cos(angle)-y*Math.sin(angle),aligned.y+x*Math.sin(angle)+y*Math.cos(angle)];};
    if(ms>=1120){const mouth=world(...spec.contact),pull=stage.rigContactPull(p,t,fixed.to.width);assert(Math.abs(mouth[0]-fixed.to.cx-pull[0])<1e-6);assert(Math.abs(mouth[1]-fixed.to.top-fixed.to.height*.55-pull[1])<1e-6);}
    // Native alpha samples screen actual artwork, not transparent image corners.
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let y=0;y<info.height;y+=4)for(let x=0;x<info.width;x+=4){if(data[(y*info.width+x)*4+3]<16)continue;const [wx,wy]=world((x+.5)/info.width,(y+.5)/info.height);minX=Math.min(minX,wx);maxX=Math.max(maxX,wx);minY=Math.min(minY,wy);maxY=Math.max(maxY,wy);}
    assert(minX>=2&&maxX<=388,`${creature.dir} ${ms}ms opaque body must fit with small mesh/shake margin: ${minX}..${maxX}`);
    assert(minY>=2&&maxY<=842,`${creature.dir} ${ms}ms opaque body must not clip viewport top/bottom: ${minY}..${maxY}`);
    if(ms===1250){
      const zones=stage.rigReadabilityZones(p,f,spec,aspect,t,fixed,creature),rend=rig.rendFrame(t,creature.style),width=fixed.to.width;
      assert.equal(zones.length,2);
      for(let i=0;i<14;i++){const a=i*2.399+.4,dist=width*(.15+(i%5)*.12)*rend.shards,size=Math.max(3,width*(.03+(i%3)*.015))*(1-rend.shards*.5),x=fixed.to.cx+Math.cos(a)*dist,y=fixed.to.top+fixed.to.height*.55+Math.sin(a)*dist-rend.shards*width*.1;
        if(stage.shardOutsideReadabilityZones(x,y,size,zones))visibleShards++;else protectedShards++;
      }
    }
  }
  // Right-facing same-column motion is the mirrored forward route, not a backward slide.
  for(const creature of Object.values(rig.BEAST_RIGS)){
    let previous=null;
    for(let ms=596;ms<=(creature.dir==='qinglong'?1120:900);ms++){
      const t=ms/1500,f=rig.strikeFrame(t,creature.style),spec=creature.frames.find(s=>s.id===f.layers[0].frame);
      const meta=await imageMeta('public'+rig.rigFrameUrl(creature,spec.id)),aspect=meta.width/meta.height;
      const p=stage.placeRig(fixed,f,creature.style.size),a=stage.alignRigContact(p,f,spec,aspect,t,fixed,creature),dh=p.unit*spec.norm,angle=-p.rotation;
      const [u,v]=spec.contact,d=rig.meshDisplace(u,v,aspect,spec.anchors,rig.livingPose(t,creature.style),t,creature.style);
      const x=-((u-.5)*dh*aspect+d[0]*dh),y=((v-.92)*dh+d[1]*dh)*f.squash;
      const point=[a.x+x*Math.cos(angle)-y*Math.sin(angle),a.y+x*Math.sin(angle)+y*Math.cos(angle)];
      if(previous){const dx=point[0]-previous[0],dy=point[1]-previous[1];assert(dx>=-1e-7);assert(dx*Math.cos(angle)+dy*Math.sin(angle)>=-1e-7,`${creature.dir} right-column head must keep moving forward at ${ms}`);if(creature.dir==='qinglong'&&ms>=870)assert(dy<=1e-7,`dragon must not jump downward after the high approach at ${ms}`);}
      previous=point;
    }
  }
  assert(protectedShards>0,'some former face-obscuring shards are removed');assert(visibleShards>0,'tearing shards remain outside the small protected zones');
  console.log('PASS guardian stable right-column facing, unchanged contact, sampled artwork bounds and mouth/head shard protection');
})().catch(error=>{console.error(error);process.exitCode=1;});
