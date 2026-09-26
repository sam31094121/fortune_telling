'use client';import HomeTranslatedText from '@/components/HomeTranslatedText';
import type { BaziShenShaItem } from '@/lib/bazi/engine';
import { useInterfaceLanguage } from '@/components/InterfaceLanguage';
import ShenShaSourceEvidence, { ShenShaComparisonSummary, ShenShaEvidenceLinks } from './ShenShaSourceEvidence';
import { shenShaDisplayCopy, shenShaDisplayNames } from '@/lib/shensha-display-copy';


/**
 * LEVEL 3｜完整傳統八字命盤
 * 忠實呈現後端完整專業資料（老師／專業人士可核對）。
 * 傳統表格＋現代排版；只讀後端資料，不重算。
 */

const PILLAR_ORDER = ['year', 'month', 'day', 'hour'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProfessionalBaziTable({ result, hourUnknown, chartOnly = false }: { result: any; hourUnknown: boolean; chartOnly?: boolean }) {
  const pc = result.professionalChart;
  const { language } = useInterfaceLanguage();
  const locale = language === 'en' ? 'en' : 'zh';
  const copy = shenShaDisplayCopy[locale];
  const interpretationReady = pc.traditionalInterpretationGate?.interpretationReady === true;
  const gate = pc.traditionalInterpretationGate;
  const allowedShenSha = new Set(Object.entries(gate?.shenShaRules ?? {}).filter(([, rule]) => {
    const state = rule as { ready?: boolean; status?: string; outputStatus?: string };
    return gate?.coreReady && state.ready && state.status === 'VERIFIED' && state.outputStatus === 'READY';
  }).map(([id]) => id));
  const shenShaNames = shenShaDisplayNames[locale];
  const restrictedShenSha = Object.entries(shenShaNames).filter(([id]) => !allowedShenSha.has(id));
  const isShenShaConflict = (id: string) => gate?.shenShaRules?.[id]?.status === 'CONFLICT' || gate?.shenShaRules?.[id]?.outputStatus === 'BLOCKED_VARIANT';
  const conflictedShenSha = restrictedShenSha.filter(([id]) => isShenShaConflict(id)).map(([, name]) => name);
  const pendingShenSha = restrictedShenSha.filter(([id]) => !isShenShaConflict(id)).map(([, name]) => name);
  const shenShaItems: BaziShenShaItem[] = Array.isArray(pc.shenSha) ? pc.shenSha.filter((item: BaziShenShaItem) => allowedShenSha.has(item.id) && !(hourUnknown && item.evidence.startsWith('HOUR '))) : [];
  const shenShaSummary = <section aria-label="神煞逐柱結果" className="space-y-2 text-sm leading-7">
    <h3 className="font-bold text-amber-100">神煞</h3>
    {!allowedShenSha.size ? <p>{conflictedShenSha.length ? '取法分歧，暫未提供' : '尚待核對，暫未提供'}；不代表沒有神煞。</p>
      : !Array.isArray(pc.shenSha) ? <p>資料待補，請重新排盤。</p>
      : <>
        <div className="grid grid-cols-2 gap-2">{PILLAR_ORDER.map(key => {
          const items = shenShaItems.filter(item => item.evidence.startsWith(key.toUpperCase() + ' '));
          return key === 'hour' && hourUnknown ? <p key={key}>{pc.pillarDetails[key].label}：時辰未提供</p> : items.length ? <p key={key}>{pc.pillarDetails[key].label}：{[...new Set(items.map(item => item.name))].join('、')}</p> : null;
        })}</div>
        <p className="text-xs text-white/60">{copy.adopted} {copy.scope}</p>
        <details className="text-xs text-white/70"><summary>查看神煞取法與出處</summary>
          {shenShaItems.map((item, index) => <p key={index}>{item.name} · {item.evidence} · {item.rule}{item.source && <> · <a className="underline" href={item.source.url} target="_blank" rel="noreferrer">{item.source.title}，卷上{item.source.printedPage}頁</a></>}</p>)}
        </details>
      </>}
    {conflictedShenSha.length > 0 && <p data-shensha-restriction="conflict">{copy.conflict}{conflictedShenSha.join(locale === 'en' ? ', ' : '、')}{locale === 'en' ? '. ' : '。'}<ShenShaEvidenceLinks rules={gate?.shenShaRules} ids={restrictedShenSha.filter(([id]) => isShenShaConflict(id)).map(([id]) => id)} language={language} /></p>}
    {pendingShenSha.length > 0 && <p data-shensha-restriction="pending">{copy.pending}{pendingShenSha.join(locale === 'en' ? ', ' : '、')}{locale === 'en' ? '. ' : '。'}</p>}
    <p className="text-xs text-white/60"><ShenShaComparisonSummary rules={gate?.shenShaRules} language={language} /></p>
    <ShenShaSourceEvidence rules={gate?.shenShaRules} language={language} className="text-xs text-white/70" />
  </section>;
  const hasValue = (value: unknown) => {
    if (value == null) return false;
    if (Array.isArray(value)) return true;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return value !== '' && value !== 'UNKNOWN' && value !== 'NOT_CALCULATED';
  };
  const fieldStatus = (field: string) => {
    const trace = (pc.fieldTrace ?? []).find((item: { field: string }) => item.field === field);
    return trace?.professionalResult ?? 'MAPPING_MISSING';
  };
  const simpleValue = (value: unknown, field: string) => {
    if (!hasValue(value)) return fieldStatus(field);
    if (Array.isArray(value)) return value.length > 0 ? `${value.length} 筆` : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  const unavailableProfessionalFields = [
    { label: '十二長生／十二運', value: pc.twelveStages },
    { label: '空亡', value: pc.kongWang },
    { label: '胎元', value: pc.taiYuan },
    { label: '胎息', value: pc.taiXi },
    { label: '命宮', value: pc.mingGong },
    { label: '合沖刑害破', value: pc.interactions },
    { label: '神煞／特星', value: pc.shenSha },
  ].filter((item) => !hasValue(item.value));
  // The password-protected double chart reuses this table's real mapped fields,
  // without interpretation/AI sections. Existing callers keep the full view.
  if (chartOnly || !interpretationReady) return <div className="space-y-4" data-bazi-raw-chart>
    {!interpretationReady && <p className="rounded-xl border border-amber-200/20 bg-amber-100/[0.05] px-4 py-3 text-sm font-semibold leading-6 text-amber-50/85">{pc.traditionalInterpretationGate?.customerMessage ?? '傳統解釋守門尚未完成，本次只顯示基礎命盤。'}</p>}
    <p className="text-sm leading-7 text-white/70">{result.input.name || '命主'} · {result.input.gender === 'male' ? '男' : '女'}<HomeTranslatedText text={"· 國曆"} />{result.input.birthDate} · {result.input.birthTime}<HomeTranslatedText text={"（時辰代表時間）"} /></p>
    <p className="text-sm leading-7 text-white/70">{pc.calendar.lunarDate}<HomeTranslatedText text={"· 台灣標準時間（UTC+8）"} /></p>
    <table className="w-full table-fixed border-collapse text-center text-sm leading-7" aria-label="八字四柱表">
      <thead><tr>{PILLAR_ORDER.map(key => <th key={key} scope="col" className="border border-white/20 p-2 text-amber-100">{pc.pillarDetails[key].label}</th>)}</tr></thead>
      <tbody>
        <tr>{PILLAR_ORDER.map(key => <td key={key} className="border border-white/20 px-1 py-4 font-serif text-2xl text-amber-100">{pc.pillarDetails[key].ganzhi}</td>)}</tr>
        <tr>{PILLAR_ORDER.map(key => <td key={key} className="border border-white/20 p-2"><small className="block text-white/50"><HomeTranslatedText text={"天干十神"} /></small>{pc.pillarDetails[key].stemTenGod}</td>)}</tr>
        <tr>{PILLAR_ORDER.map(key => <td key={key} className="border border-white/20 p-2"><small className="block text-white/50"><HomeTranslatedText text={"藏干"} /></small>{(pc.hiddenStemStructure[key] ?? []).map((h: { stem: string; tenGod: string }) => <span key={h.stem} className="block">{h.stem} · {h.tenGod}</span>)}</td>)}</tr>
        <tr>{PILLAR_ORDER.map(key => <td key={key} className="border border-white/20 p-2"><small className="block text-white/50"><HomeTranslatedText text={"十二長生"} /></small>{pc.twelveStages[key]}</td>)}</tr>
      </tbody>
    </table>
    {shenShaSummary}
    <div className="grid gap-2 text-sm leading-7 sm:grid-cols-2">
      <p><HomeTranslatedText text={"空亡：年"} />{pc.kongWang.yearXunKong} · 日 {pc.kongWang.dayXunKong}</p><p><HomeTranslatedText text={"胎元："} />{pc.taiYuan}<HomeTranslatedText text={"· 胎息："} />{pc.taiXi}</p>
      <p><HomeTranslatedText text={"命宮："} />{pc.mingGong}<HomeTranslatedText text={"· 身宮："} />{pc.shenGong || '未提供'}</p><p><HomeTranslatedText text={"節氣："} />{pc.calendar.solarTerm} {pc.calendar.solarTermTime}</p>
    </div>
    <h3 className="text-base font-bold text-amber-100"><HomeTranslatedText text={"大運"} /></h3>
    <div className="grid grid-cols-2 gap-2 text-sm leading-6 sm:grid-cols-4">{result.luckCycles.map((cycle: { startAge: number; endAge: number; pillar: string; startYear: number }) => <p key={cycle.startAge} className="rounded-lg border border-white/20 p-2"><strong>{cycle.pillar}</strong><br />{cycle.startAge}–{cycle.endAge} 歲<br />{cycle.startYear}<HomeTranslatedText text={"年起"} /></p>)}</div>
    <p className="text-xs leading-6 text-white/60"><HomeTranslatedText text={"沿用既有排盤核心；年柱以立春、月柱以節氣分界，晚子時日柱不換日，未做真太陽時校正。"} /></p>
  </div>;
  return (
    <div className="space-y-4">
      {/* 出生資料 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"01｜出生資料"} /></h4>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold leading-6 text-white/60">
          <p>姓名：{result.input?.name || '未提供'}</p>
          <p>性別：{result.input?.gender === 'male' ? '男' : '女'}</p>
          <p><HomeTranslatedText text={"出生日期："} />{result.input?.birthDate || '—'}</p>
          <p><HomeTranslatedText text={"排盤時間：採標準時；未啟用出生地與真太陽時校正。"} /></p>
          <p><HomeTranslatedText text={"資料完整度："} />{hourUnknown ? 'PARTIAL_BAZI（三柱）' : 'FULL_BAZI（完整四柱）'}</p>
          <p><HomeTranslatedText text={"曆法："} />{pc.calendar.calendarType === 'solar' ? '陽曆排盤' : '曆法排盤'}</p>
          <p><HomeTranslatedText text={"出生時間："} />{hourUnknown ? '時辰未提供' : `${pc.calendar.birthTime} · ${pc.calendar.shichen.label}`}</p>
          <p><HomeTranslatedText text={"時辰範圍："} />{hourUnknown ? '—' : pc.calendar.shichen.range}</p>
          <p><HomeTranslatedText text={"真太陽時："} />{pc.calendar.trueSolarTimeApplied ? '已套用' : '未套用（標準時）'}</p>
          <p><HomeTranslatedText text={"節氣："} />{pc.calendar.solarTerm ? `${pc.calendar.solarTerm} ${pc.calendar.solarTermTime ?? ''}` : fieldStatus('solarTerm')}</p>
          <p><HomeTranslatedText text={"農曆："} />{pc.calendar.lunarDate || '—'}</p>
        </div>
      </section>

      {/* 四柱完整表 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"02｜四柱・藏干・十神"} /></h4>
        <div className="mt-3 space-y-2">
          {PILLAR_ORDER.map((key) => {
            const detail = pc.pillarDetails[key];
            const hidden = pc.hiddenStemStructure[key] ?? [];
            const isUnknown = key === 'hour' && hourUnknown;
            return (
              <div key={key} className="rounded-2xl bg-black/20 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-black text-white/80">{detail.label}</span>
                  <span className="font-serif text-xl font-black text-amber-100">{isUnknown ? '時辰未提供' : detail.ganzhi}</span>
                </div>
                {!isUnknown && (
                  <div className="mt-2 space-y-1 text-sm font-semibold leading-6 text-white/55">
                    <p><HomeTranslatedText text={"天干十神："} />{detail.stemTenGod}<HomeTranslatedText text={"｜地支主氣："} />{detail.branchMainElement} · {detail.branchMainTenGod}</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p><HomeTranslatedText text={"藏干："} />{hidden.map((h: any) => `${h.roleLabel}${h.stem}${h.element}${h.tenGod}(${Math.round(h.weight * 100)}%)`).join('、')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 五行分層統計（RAW 原始值放這層） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"03｜五行分層統計"} /></h4>
        <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-white/60">
          {Object.entries(pc.elementStatistics.percentages).map(([element, percent]) => (
            <p key={element}>
              {element}：{String(percent)}<HomeTranslatedText text={"%（天干"} />{pc.elementStatistics.stems[element] ?? 0}<HomeTranslatedText text={"・地支"} />{pc.elementStatistics.branches[element] ?? 0}<HomeTranslatedText text={"・藏干"} />{pc.elementStatistics.hiddenStems[element] ?? 0}）
            </p>
          ))}
        </div>
      </section>

      {/* 完整十神分布 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"04｜完整十神分布"} /></h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pc.tenGodDistribution.ranked.map((item: any) => (
            <span key={item.tenGod} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-sm font-bold text-white/70">{item.tenGod} {item.score}</span>
          ))}
        </div>
      </section>

      {/* 旺衰規則 + 用喜忌 + 格局 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"05｜旺衰・用喜忌・格局"} /></h4>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/60">
          <p><HomeTranslatedText text={"日主："} />{result.dayMaster.stem}{result.dayMaster.element}<HomeTranslatedText text={"｜旺衰判定："} />{result.dayMaster.level}</p>
          <p><HomeTranslatedText text={"用神："} />{result.gods.usefulGod}<HomeTranslatedText text={"｜喜神："} />{result.gods.joyGod}<HomeTranslatedText text={"｜忌神："} />{result.gods.avoidGod}</p>
          <p><HomeTranslatedText text={"格局主軸："} />{pc.structurePattern.primaryPattern}<HomeTranslatedText text={"｜輔助："} />{pc.structurePattern.supportingPattern}</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pc.strengthFactors.map((f: any) => (
            <p key={f.id} className="text-sm font-semibold leading-6 text-white/55">・{f.label}（{f.score}）：{f.detail}</p>
          ))}
        </div>
      </section>

      {/* 完整大運 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"06｜完整大運"} /></h4>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {result.luckCycles.map((c: any) => (
            <div key={c.ageRange} className="rounded-2xl bg-black/20 px-3 py-2.5 text-center">
              <p className="text-xs font-bold text-white/45">{c.ageRange}</p>
              <p className="font-serif text-lg font-black text-white/85">{c.pillar}</p>
              {c.tenGod && <p className="text-xs font-semibold text-white/50">{c.tenGod}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 完整流年 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"07｜完整流年"} /></h4>
        <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-white/60">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {result.annualFortunes.map((y: any) => (
            <p key={y.year}>{y.year}｜{y.pillar}｜{y.element}{y.tenGod ? `｜${y.tenGod}` : ''}</p>
          ))}
        </div>
      </section>

      {/* 旺衰總判（strengthAnalysis 完整保留） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"08｜旺衰總判"} /></h4>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/60">
          <p><HomeTranslatedText text={"月令季節："} />{pc.strengthAnalysis.monthSeason}<HomeTranslatedText text={"｜扶助"} />{pc.strengthAnalysis.supportScore}<HomeTranslatedText text={"｜壓力"} />{pc.strengthAnalysis.pressureScore}</p>
          <p><HomeTranslatedText text={"判定："} />{pc.strengthAnalysis.verdict}</p>
          <p>{pc.strengthAnalysis.explanation}</p>
          <p className="text-white/45"><HomeTranslatedText text={"格局主軸摘要："} />{result.structureFocus}</p>
        </div>
      </section>

      {/* 各柱十神結構（tenGods per pillar） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"09｜各柱十神結構"} /></h4>
        <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-white/60">
          {PILLAR_ORDER.map((key) => {
            const tg = pc.tenGods[key];
            const isUnknown = key === 'hour' && hourUnknown;
            return (
              <p key={key}>{pc.pillarDetails[key].label}：{isUnknown ? '時辰未提供' : `天干 ${tg.stem}｜地支主氣 ${tg.branchMain}｜藏干 ${tg.hidden.join('、') || '—'}`}</p>
            );
          })}
        </div>
      </section>

      {/* 五行原始計數（elementCounts RAW） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"10｜五行原始計數（RAW）"} /></h4>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
          {Object.entries(result.elementCounts ?? {}).map(([el, n]) => `${el} ${String(n)}`).join('｜')}
        </p>
        <p className="mt-1 text-xs font-semibold text-white/40"><HomeTranslatedText text={"時區備註："} />{result.timezone?.note ?? `${result.timezone?.country ?? ''} ${result.timezone?.city ?? ''}`}</p>
      </section>

      {/* 易經解讀鏈路（logicTrace / elementPriority｜Interpretation 層追蹤，非計算） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"11｜易經解讀鏈路追蹤"} /></h4>
        <div className="mt-3 space-y-1.5 text-sm font-semibold leading-6 text-white/55">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(result.aiDeepAnalysis?.logicTrace ?? []).map((t: any) => (
            <p key={t.step}>・{t.step}：{t.output}</p>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/55">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(result.aiDeepAnalysis?.elementPriority ?? []).map((item: any) => (
            <p key={item.rank}>{item.rank}. {item.displayName}（{item.judgementLevel}｜{item.needScore}）{item.reason ? `：${item.reason}` : ''}</p>
          ))}
        </div>
      </section>

      {/* 命局摘要｜核心未提供欄位明確標示（不隱藏、不假裝、不 易經補） */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"12｜命局摘要（傳統完整欄位對照）"} /></h4>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-semibold leading-6 text-white/60">
          <p><HomeTranslatedText text={"日主："} />{result.dayMaster.stem}{result.dayMaster.element}</p>
          <p><HomeTranslatedText text={"旺衰："} />{result.dayMaster.level}</p>
          <p><HomeTranslatedText text={"格局："} />{pc.structurePattern.primaryPattern}</p>
          <p><HomeTranslatedText text={"用神："} />{result.gods.usefulGod}</p>
          <p><HomeTranslatedText text={"喜神："} />{result.gods.joyGod}</p>
          <p><HomeTranslatedText text={"忌神："} />{result.gods.avoidGod}</p>
          <p><HomeTranslatedText text={"空亡："} />{pc.kongWang ? `年旬空 ${pc.kongWang.yearXunKong}｜日旬空 ${pc.kongWang.dayXunKong}` : fieldStatus('kongWang')}</p>
          <p><HomeTranslatedText text={"命宮："} />{simpleValue(pc.mingGong, 'mingGong')}</p>
          <p><HomeTranslatedText text={"胎元："} />{simpleValue(pc.taiYuan, 'taiYuan')}</p>
          <p><HomeTranslatedText text={"胎息："} />{simpleValue(pc.taiXi, 'taiXi')}</p>
          <p className="col-span-2"><HomeTranslatedText text={"十二長生："} />{pc.twelveStages ? `年 ${pc.twelveStages.year}｜月 ${pc.twelveStages.month}｜日 ${pc.twelveStages.day}｜時 ${hourUnknown ? '時辰未提供' : pc.twelveStages.hour}` : fieldStatus('twelveStages')}</p>
          <div className="col-span-2">{shenShaSummary}</div>
          <p className="col-span-2"><HomeTranslatedText text={"合沖刑害破："} />{simpleValue(pc.interactions, 'interactions')}</p>
          <p className="col-span-2 text-white/35"><HomeTranslatedText text={"血型：USER_NOT_PROVIDED（血型僅能由使用者提供，不得由八字推算）"} /></p>
        </div>
        <div className="mt-3 space-y-1 text-xs font-semibold leading-5 text-white/45">
          {Array.isArray(pc.interactions) && pc.interactions.slice(0, 6).map((item: any, index: number) => (
            <p key={`interaction-${index}`}><HomeTranslatedText text={"作用："} />{item.interactionType}｜{item.participants?.join('、')}｜{item.sourceRule}</p>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-white/35"><HomeTranslatedText text={"此區只呈現 Professional Result 已回傳欄位；缺欄會顯示 Data Condition Status，不以 易經補值、不顯示假資料。"} /></p>
      </section>

      {/* 易經白話解讀（aiReading｜Interpretation 層，完整保留） */}
      {result.aiReading && (
        <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
          <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"13｜易經白話解讀"} /></h4>
          <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-white/60">
            {result.aiReading.chartSummary && <p>{result.aiReading.chartSummary}</p>}
            {result.aiReading.summary && <p>{result.aiReading.summary}</p>}
            {result.aiReading.plainText && <p>{result.aiReading.plainText}</p>}
            {result.aiReading.encouragement && <p className="text-amber-100/80">{result.aiReading.encouragement}</p>}
          </div>
        </section>
      )}

      {/* 專業推導明細（detail｜elementFlow 五行流通、讀盤摘要） */}
      {result.detail && (
        <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
          <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"14｜專業推導明細"} /></h4>
          {result.detail.readableSummary && <p className="mt-3 text-sm font-semibold leading-6 text-white/60">{result.detail.readableSummary}</p>}
          <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/50">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(result.detail.elementFlow ?? []).slice(0, 8).map((f: any, i: number) => (
              <p key={i}>・{f.detail}</p>
            ))}
          </div>
        </section>
      )}

      {unavailableProfessionalFields.length > 0 && (
        <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
          <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"15｜目前未提供的傳統欄位"} /></h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {unavailableProfessionalFields.map((item) => (
              <span key={item.label} className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-sm font-bold text-white/45">{item.label}<HomeTranslatedText text={"：目前未提供"} /></span>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-white/35"><HomeTranslatedText text={"此區只反映 Professional Result 目前沒有提供的欄位；前端不補值、不推算。"} /></p>
        </section>
      )}

      {Array.isArray(pc.fieldTrace) && (
        <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
          <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"16｜Field Trace 欄位追蹤"} /></h4>
          <div className="mt-3 space-y-2">
            {pc.fieldTrace.map((trace: any) => (
              <div key={trace.field} className="rounded-2xl bg-black/20 px-3 py-2.5 text-sm font-semibold leading-6 text-white/55">
                <p className="font-black text-white/75">{trace.label}｜{trace.professionalResult}</p>
                <p>CORE {trace.core} → Professional Result {trace.professionalResult} → API {trace.api} → Adapter {trace.adapter} → Frontend {trace.frontend}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 引擎版本與資料完整度 */}
      <section className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5">
        <h4 className="text-base font-black text-[color:var(--text-main)]"><HomeTranslatedText text={"17｜引擎版本與驗證"} /></h4>
        <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-white/55">
          <p><HomeTranslatedText text={"引擎版本："} />{result.engineVersion}</p>
          <p><HomeTranslatedText text={"資料完整度："} />{hourUnknown ? 'PARTIAL_BAZI（三柱）' : 'FULL_BAZI（完整四柱）'}</p>
          <p><HomeTranslatedText text={"核心："} />{pc.engine?.name ?? '—'} {pc.engine?.version ?? ''}｜{pc.engine?.ruleSet ?? ''}</p>
          <p>Calculation ID：{pc.pipeline?.calculationId ?? pc.calculationId ?? '—'}</p>
          <p>Input Fingerprint：{pc.pipeline?.birthInputFingerprint ?? pc.birthInputFingerprint ?? '—'}</p>
          <p>Professional Result ID：{pc.pipeline?.professionalResultId ?? pc.professionalResultId ?? '—'}</p>
          <p>Pipeline State：{pc.pipeline?.currentState ?? '—'}｜{pc.pipeline?.validationStatus ?? '—'}</p>
          <p><HomeTranslatedText text={"資料流："} />{(result.dataFlow?.pipeline ?? []).join(' → ')}</p>
          <p><HomeTranslatedText text={"驗證狀態："} />{pc.verification?.readyForInterpretation ? '已通過專業驗證' : '未通過'}</p>
          <p><HomeTranslatedText text={"完整欄位檢查："} />{pc.professionalCompleteness?.valid ? '通過' : '未通過'}</p>
          {Object.entries(result.dataFlow?.rules ?? {}).map(([key, value]) => (
            <p key={key}>{key}：{value ? '通過' : '未通過'}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
