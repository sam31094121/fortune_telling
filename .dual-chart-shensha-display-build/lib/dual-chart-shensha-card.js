"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHENSHA_INSPECTED_PILLARS = void 0;
exports.buildShenShaCardView = buildShenShaCardView;
const ALL = ['year', 'month', 'day', 'hour'];
const CARD_ORDER = ['year', 'month', 'day', 'hour'];
const LABEL = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
/**
 * 各規則實際會落在哪幾柱（與 lib/bazi/engine.ts computeShenSha、lib/dual-chart-shensha.ts 的查柱範圍一致）。
 * 未完成的規則只讓它查得到的柱位顯示「待確認」，不拖累其他柱。
 * 不在表內的規則一律視為四柱皆查，寧可多標待確認，也不冒充未命中。
 */
exports.SHENSHA_INSPECTED_PILLARS = {
    tianyi: ALL, wenchang: ALL, yima: ALL, jiangxing: ALL, muyu: ALL,
    tiande: ALL, yuede: ALL, tiandehe: ALL,
    taohua: ['year', 'month', 'hour'], gejiao: ['year', 'month', 'hour'], ripo: ['year', 'month', 'hour'],
    huagai: ['year', 'month', 'hour'], yangren: ['year', 'month', 'hour'],
    longde: ['month', 'day', 'hour'], tiangou: ['month', 'day', 'hour'], wugui: ['month', 'day', 'hour'],
    jinkui: ['month', 'day', 'hour'], zaisha: ['month', 'day', 'hour'], liue: ['month', 'day', 'hour'],
    yuepo: ['year', 'day', 'hour'],
    yuanchen: ['hour'], waiTaohua: ['hour'],
    kuigang: ['day'], kongwang: ['year', 'month', 'hour'], jinyu: ALL, xuetang: ALL, hongyan: ALL,
    suipo: ['month', 'day', 'hour'], yuekong: ALL, jielu: ['hour'], tianzhuan: ['day'], dizhuan: ['day'], shiling: ['day'], ride: ['day'], rigui: ['day'],
    sangmen: ['month', 'day', 'hour'], baihu: ['month', 'day', 'hour'], bingfu: ['month', 'day', 'hour'], pima: ['month', 'day', 'hour'],
    yuedehe: ALL, feiren: ['year', 'month', 'hour'], jinshen: ['day', 'hour'], bazhuan: ['day'], jiuchou: ['day'], liuxiu: ['day'],
    guoyin: ALL, tianchu: ALL, liuxia: ALL, sanqi: ALL, wangshen: ['month', 'day', 'hour'],
    tianshe: ['day'], yinyangChacuo: ['day'], guluan: ['day'], shieDabai: ['day'], sifei: ['day'],
    lushen: ALL, tianyiDoctor: ['year', 'day', 'hour'], jiesha: ['month', 'day', 'hour'], guchen: ['month', 'day', 'hour'], guasu: ['month', 'day', 'hour'],
};
const DONE = new Set(['MATCHED', 'NOT_MATCHED']);
function buildShenShaCardView(stars, coreReady, pillarMismatches) {
    const complete = Boolean(stars && Array.isArray(stars.raw) && Array.isArray(stars.coverage) && stars.coverage.length
        && ALL.every(key => Array.isArray(stars.byPillar?.[key])));
    if (!complete)
        return { state: 'unavailable', notice: '神煞資料尚未完整，暫不能判斷有無結果。', footnote: null, columns: [] };
    const pending = coreReady ? stars.coverage.filter(item => !DONE.has(item.status)) : [];
    const pendingFor = (key) => pending
        .filter(item => (exports.SHENSHA_INSPECTED_PILLARS[item.id] ?? ALL).includes(key)).map(item => item.name);
    const columns = CARD_ORDER.map((key) => {
        const hits = coreReady ? stars.byPillar[key].map(hit => ({
            id: hit.id, name: hit.name, rule: hit.rule,
            sourceLabel: hit.source ? `${hit.source.title}，${/^\d/.test(hit.source.printedPage) ? `印頁${hit.source.printedPage}` : hit.source.printedPage}` : '太極紫微易經派取法（原典頁碼待補）',
            reference: !hit.source,
        })) : [];
        const pendingNames = coreReady ? pendingFor(key) : [];
        const state = hits.length ? 'HIT' : !coreReady || pendingNames.length ? 'PENDING' : 'NONE';
        return {
            pillar: key, label: LABEL[key], state, hits, pendingNames,
            emptyText: state === 'HIT' ? null : state === 'PENDING' ? '待確認' : '—',
            note: hits.length && pendingNames.length ? `另有${pendingNames.join('、')}待確認` : null,
        };
    });
    const notice = pillarMismatches?.length ? `八字與紫微四柱不一致，神煞暫不判定。${pillarMismatches.join('；')}。`
        : !coreReady ? '基礎四柱尚未通過驗證，神煞暫不判定。'
            : pending.length ? `部分項目尚未完成，不代表沒有神煞。待確認：${pending
                .map(item => `${item.name}（${(exports.SHENSHA_INSPECTED_PILLARS[item.id] ?? ALL).map(p => LABEL[p]).join('、')}）`).join('、')}。`
                : null;
    const hasReference = columns.some(col => col.hits.some(hit => hit.reference));
    const footnote = coreReady ? `神煞由已核對一致的八字、紫微四柱衍生。${hasReference ? '標＊者依本站太極紫微易經派取法，原典頁碼待補。' : ''}` : null;
    return { state: !coreReady || pending.length ? 'partial' : 'received', notice, footnote, columns };
}
