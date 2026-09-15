const fs=require("fs");const path=require("path");
const needles=["已更新戰局","重試領卡","尚未入庫","conflict","revision","claim","ingest","reward","stale","version"];
const out=[];
function walk(d){
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    const p=path.join(d,e.name);
    if(/node_modules|\.next|\.beast-game-build|\.bazi|\.ziwei|\.taiji|\.red-|\.number|\.numerology|\.three-|\.five-|\.release/.test(p)) continue;
    if(e.isDirectory()) walk(p);
    else if(/\.(ts|tsx)$/.test(e.name)){
      const t=fs.readFileSync(p,"utf8");
      for(const n of needles){
        let i=0; while((i=t.indexOf(n,i))>=0){
          const line=t.slice(0,i).split(/\n/).length;
          out.push(p.replace(/\\/g,"/")+":"+line+":"+n);
          i+=n.length;
          if(out.length>100) return;
        }
      }
    }
  }
}
for(const r of ["app","components","lib","features"]) if(fs.existsSync(r)) walk(r);
fs.writeFileSync("logs\\p0-search.txt", out.join("\n"), "utf8");
console.log("wrote", out.length);
