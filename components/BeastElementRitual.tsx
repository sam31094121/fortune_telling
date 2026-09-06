'use client';
import { useEffect, useState } from 'react';
import type { ElementLesson, elementGuide } from '@/lib/beast-game/element-lesson';

/** Displays server explanations; never imports the combat engine at runtime. */
export default function BeastElementRitual({lesson}:{lesson?:ElementLesson}) {
 const [guide,setGuide]=useState<ReturnType<typeof elementGuide>|null>(null);
 const [error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError(false);fetch('/api/beast-game/elements',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(setGuide).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[attempt]);
 return <section aria-label="神獸戰鬥儀式・相生相剋" className="my-4 rounded-xl border border-cyan-300/40 bg-slate-950 p-3 text-slate-100">
  <h3 className="text-lg font-bold text-cyan-100">神獸戰鬥儀式・相生相剋</h3>
  <p className="my-2 text-sm leading-6">先認識元素 → 看雙方關係 → 讀本場戰果。畫面停留供你閱讀，戰鬥由後端運算。</p>
  <p className="my-2 text-sm leading-6 text-cyan-100">判決只依卡片、技能與戰鬥紀錄，不需填姓名、生日或時辰。雙方使用相同規則；相剋不是保證獲勝。</p>
  {guide?<><p className="text-sm leading-6">{guide.mapping}</p><table className="my-3 w-full text-left text-sm"><caption className="sr-only">五元素相生相剋關係</caption><thead><tr><th className="py-2">元素</th><th>相生・支持</th><th>相剋・制約</th></tr></thead><tbody>{guide.rows.map(row=><tr key={row.element} className="border-t border-slate-700"><th className="py-2">{row.element}</th><td>{row.element} 生 {row.generates}</td><td>{row.element} 剋 {row.counters}</td></tr>)}</tbody></table><p className="text-sm leading-6">{guide.generation}</p><p className="mt-2 text-sm leading-6">{guide.counter}</p></>:error?<p role="alert">元素說明暫時未載入。<button className="min-h-11 underline" onClick={()=>setAttempt(v=>v+1)}>重新載入說明</button></p>:<p>正在載入元素說明…</p>}
  {lesson?<div className="mt-4 border-t border-cyan-300/40 pt-3" aria-live="polite"><h4 className="font-bold">本場元素解讀</h4><p className="mt-2">我方：{lesson.player}</p><p>對手：{lesson.opponent}</p><p className="my-2 font-bold text-amber-100">{lesson.relationship}</p><p className="text-sm leading-6">{lesson.impact}</p><p className="my-2 font-bold">{lesson.verdict}</p>{lesson.judgment&&<div className="my-3 rounded-lg border border-slate-600 p-3"><h4 className="font-bold">技能判決依據</h4><p className="text-sm leading-6">{lesson.judgment.reason}</p><p className="text-sm leading-6">{lesson.judgment.remaining}</p><p className="text-sm leading-6">核對完成：第 {lesson.judgment.rounds} 回合終局</p></div>}<details><summary className="min-h-11 cursor-pointer py-2">看後端逐回合戰報</summary><ol className="space-y-2 text-sm leading-6">{lesson.logs.map((log,i)=><li key={i}>{log}</li>)}</ol></details></div>:<p className="mt-3 text-sm text-cyan-100">完成一次對戰後，這裡會保留雙方元素、實際倍率與戰果，讓你對照學習。</p>}
 </section>;
}
