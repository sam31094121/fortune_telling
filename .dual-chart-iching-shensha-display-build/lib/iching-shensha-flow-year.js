"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildShenShaFlow = buildShenShaFlow;
const iching_shensha_teacher_readings_1 = require("./iching-shensha-teacher-readings");
const PILLAR_LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
function itemOf(year, hit) {
    const reading = iching_shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[hit.id];
    const where = hit.pillar === 'flow' ? '流年' : PILLAR_LABEL[hit.pillar];
    const text = hit.pillar === 'flow'
        ? `這一年遇上${hit.name}「${reading?.theme ?? hit.name}」。${reading?.action ?? ''}`
        : `這一年歲神${hit.name}落在${where}，${iching_shensha_teacher_readings_1.PILLAR_LINK[where] ?? '在這一柱顯現'}。${reading?.action ?? ''}`;
    return { id: hit.id, name: hit.name, pillar: where, derivation: `${year.year} ${year.ganZhi}年：${hit.rule}`, tone: reading?.tone ?? null, theme: reading?.theme ?? null, text };
}
const namesOf = (items) => [...new Set(items.map(i => i.name))].join('、');
const countOf = (items) => new Set(items.map(i => i.name)).size;
/** 歲神同一顆落在兩柱時寫成「五鬼（月柱、日柱）」，顆數與名單才對得上。 */
const placedOf = (items) => [...new Set(items.map(i => i.name))].map(name => { const where = items.filter(i => i.name === name).map(i => i.pillar); return where.length > 1 ? `${name}（${where.join('、')}）` : name; }).join('、');
function buildShenShaFlow(years) {
    const ready = years.filter((y) => Boolean(y));
    if (!ready.length || ready.length !== years.length)
        return { state: 'BLOCKED', reason: '四柱尚未核對一致，流年神煞暫不提供。' };
    const views = ready.map(year => {
        const touched = year.touched.map(hit => itemOf(year, hit));
        const suiShen = year.suiShen.map(hit => itemOf(year, hit));
        const label = `${year.year} ${year.ganZhi}年`;
        const oneLiner = touched.length || suiShen.length
            ? `${touched.length ? `遇到 ${countOf(touched)} 顆新神煞（${namesOf(touched)}）` : '沒有遇到新的神煞'}；${suiShen.length ? `歲神 ${countOf(suiShen)} 顆落入本命（${placedOf(suiShen)}）` : '歲神沒有落入本命'}。`
            : '依本派取法，這一年沒有遇到新的神煞，歲神也沒有落入本命——適合按部就班，把手上的事做紮實。';
        return { year: year.year, ganZhi: year.ganZhi, label, oneLiner, touched, suiShen };
    });
    const first = views[0];
    return {
        state: 'READY',
        teaser: `${first.label}・遇到 ${countOf(first.touched)}・歲神 ${countOf(first.suiShen)}`,
        intro: '流年神煞分兩段看：「這一年遇到」是用你本命的日干、日支、年支、月支起算，看這一年的干支帶來哪幾顆神煞（你的本命盤上不一定有）；「這一年的歲神」是從這一年的地支起算歲神，看落在你本命哪一柱——和本命同名的神煞是不同的兩回事。流年以立春為界。',
        touchedTitle: '這一年遇到',
        suiShenTitle: '這一年的歲神',
        emptyTouched: '這一年沒有遇到新的神煞。',
        emptySuiShen: '這一年的歲神沒有落入本命。',
        years: views,
        note: '流年取法依太極紫微易經派（本站自家一派），原典頁碼待補；歲神只講提醒與轉化，不作吉凶斷語，僅作自我反思參考。',
    };
}
