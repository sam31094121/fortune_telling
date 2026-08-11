'use client';

/**
 * 【AI 八字｜Customer Frontend Visual Rebuild V1】
 * 三層固定架構（不得混成一頁）：
 *   LEVEL 1 八字命工卡 → LEVEL 2 老師專業解盤 → LEVEL 3 完整傳統命盤
 * 鐵律：只呈現後端資料，前端零計算（Adapter 只做映射）。
 */

import { useRef, useState } from 'react';
import { toBaziCustomerView } from './adapter';
import { BaziHeroCard } from './BaziHeroCard';
import { TeacherSummary } from './TeacherSummary';
import { ProfessionalBaziTable } from './ProfessionalBaziTable';
import { BaziBottomActions } from './BaziBottomActions';

/** 天干五行對照（顯示用標識色，非計算） */
const STEM_ELEMENT_LABEL: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BaziCustomerShell({ result, hourUnknown }: { result: any; hourUnknown: boolean }) {
  const [level, setLevel] = useState<'teacher' | 'full' | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const view = toBaziCustomerView(result, hourUnknown);
  const elementOf = (stem: string) => STEM_ELEMENT_LABEL[stem];

  const openLevel = (next: 'teacher' | 'full') => {
    setLevel((current) => (current === next ? null : next));
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'start' }));
  };

  return (
    <div className="space-y-6">
      {/* LEVEL 1｜命工卡 */}
      <BaziHeroCard view={view} elementOf={elementOf} onOpenTeacher={() => openLevel('teacher')} />

      {/* LEVEL 2 / 3 */}
      <div ref={detailRef} className="scroll-mt-24">
        {level === 'teacher' && (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xl font-black text-[color:var(--text-main)]">老師專業解盤</h3>
              <p className="text-xs font-bold text-white/40">先排準，再解讀。</p>
            </div>
            <TeacherSummary view={view} />
          </div>
        )}
        {level === 'full' && (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xl font-black text-[color:var(--text-main)]">完整傳統八字命盤</h3>
              <p className="text-xs font-bold text-white/40">專業核對用</p>
            </div>
            <ProfessionalBaziTable result={result} hourUnknown={hourUnknown} />
          </div>
        )}
      </div>

      <BaziBottomActions active={level} onTeacher={() => openLevel('teacher')} onFull={() => openLevel('full')} />
    </div>
  );
}
