const fs = require('fs');
const dir = 'C:/Users/DRAGON/Desktop/命理/_tmp_asura_perf/out';
const files = ['perf-390x844-cpu4x.json','perf-390x844-cpu6x.json','perf-360x800-cpu4x.json','perf-360x800-cpu6x.json'];
const out = {};
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  const slimSegs = {};
  for (const [k,v] of Object.entries(r.actions.segmentSwitch || {})) {
    slimSegs[k] = {
      verdict: v.verdict,
      frames: v.frames,
      longTaskCount: v.longTaskCount,
      longTaskMax: v.longTaskMax,
      longTasks: v.longTasks,
      actionMeta: v.actionMeta,
    };
  }
  out[f] = {
    buildHint: r.buildHint,
    blocked: r.blocked,
    open: r.actions.openCard && {
      verdict: r.actions.openCard.verdict,
      frames: r.actions.openCard.frames,
      longTaskCount: r.actions.openCard.longTaskCount,
      longTaskMax: r.actions.openCard.longTaskMax,
      longTasks: r.actions.openCard.longTasks,
      actionMeta: r.actions.openCard.actionMeta,
    },
    segs: slimSegs,
    peel: r.actions.peelOnion && {
      verdict: r.actions.peelOnion.verdict,
      frames: r.actions.peelOnion.frames,
      longTaskCount: r.actions.peelOnion.longTaskCount,
      longTaskMax: r.actions.peelOnion.longTaskMax,
      longTasks: r.actions.peelOnion.longTasks,
      actionMeta: r.actions.peelOnion.actionMeta,
    },
    scroll: r.actions.scrollTimeline && {
      verdict: r.actions.scrollTimeline.verdict,
      frames: r.actions.scrollTimeline.frames,
      longTaskCount: r.actions.scrollTimeline.longTaskCount,
      longTaskMax: r.actions.scrollTimeline.longTaskMax,
      longTasks: r.actions.scrollTimeline.longTasks,
    },
    cssSamples: r.cssCostAfterOpen && r.cssCostAfterOpen.samples,
    cssCostly: (r.cssCostAfterOpen && r.cssCostAfterOpen.costly) || [],
  };
}
fs.writeFileSync(dir + '/perf-slim.json', JSON.stringify(out, null, 2));
console.log('wrote perf-slim.json bytes', fs.statSync(dir + '/perf-slim.json').size);
