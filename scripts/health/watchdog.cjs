// 由健康檢查工具以 NODE_OPTIONS=--require 注入到它啟動的每個 node 子行程（next build／next start／gates 及其 worker）。
// 工具本身被強制結束（kill -9、taskkill /F、Stop-Process -Force）時沒有機會清理子行程；
// 這裡每 1.5 秒看一次工具的 pid 還在不在，不在就自己結束，所以不會留下孤兒 next start 占著 34xx 埠與記憶體。
'use strict';
const parent = Number(process.env.HC_PARENT_PID);
if (Number.isInteger(parent) && parent > 0 && parent !== process.pid) {
  const alive = () => { try { process.kill(parent, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const t = setInterval(() => { if (!alive()) { try { process.stderr.write(`[health-watchdog] 健康檢查工具（pid ${parent}）已不在，結束 pid ${process.pid}\n`); } catch {} process.exit(1); } }, Number(process.env.HC_WATCHDOG_MS) || 1500);
  t.unref();
}
