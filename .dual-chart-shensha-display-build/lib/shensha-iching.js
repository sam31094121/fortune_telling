"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHENSHA_ICHING_CLAIM = void 0;
exports.buildShenShaIChing = buildShenShaIChing;
/**
 * 《神煞易經》第④層：特星神煞 → 易經（後端運算，前端只照印）
 * ============================================================================
 *
 * 衍生鏈（業主定案 2026-09-27，順序不可顛倒）：
 *   客戶資料 → ①八字 → ②紫微（四柱逐字核對）→ ③特星神煞 → ④易經 → 前端只顯示
 *
 * - 卦象沿用三合一的 runIChingLayer（帶憑證起卦），不另起一套卦。
 * - 每一個命中的神煞都延伸出來：落在哪一柱、怎麼從八字紫微推出來（取法原文），不挑重點、不省略。
 * - 神煞的吉凶含義尚無登記來源，一律不寫；只寫可回查的事實（名稱、柱位、推導）。
 * - 公信力句子由來源閘門重算（C-SHENSHA-ICHING），只有 VERIFIED 才能說「已通過交叉比對」。
 *
 * 來源登記：docs/技能戰鬥檔案/易經/來源登記.json 的 C-SHENSHA-ICHING。
 */
const _____json_1 = __importDefault(require("../docs/\u6280\u80FD\u6230\u9B25\u6A94\u6848/\u6613\u7D93/\u4F86\u6E90\u767B\u8A18.json"));
const iching_source_gate_1 = require("./iching-source-gate");
const credibility_phrases_1 = require("./credibility-phrases");
const shensha_char_imagery_1 = require("./shensha-char-imagery");
const shensha_teacher_readings_1 = require("./shensha-teacher-readings");
const shensha_onion_1 = require("./shensha-onion");
const shensha_combos_1 = require("./shensha-combos");
exports.SHENSHA_ICHING_CLAIM = 'C-SHENSHA-ICHING';
/** 福氣／動能／提醒三類各幾項，給導師解盤一個總覽。 */
/** 三個重點：底氣／推力／留心。 */
const HIGHLIGHT_COPY = {
    福氣: { title: '你的底氣', text: n => `${n}是你一路走來的依靠，遇到難處時，這些是你可以回頭借力的地方。` },
    動能: { title: '推你往前的力量', text: n => `${n}是推著你往前的引擎，用在對的方向，就是你最有衝勁的時候。` },
    提醒: { title: '要多留一分心', text: n => `${n}不是壞消息，是先把燈點亮：知道哪裡要多留心，路就走得穩。` },
};
function highlightsOf(items) {
    return ['福氣', '動能', '提醒'].flatMap(tone => {
        const names = [...new Set(items.filter(i => i.teacher?.tone === tone).map(i => i.name))];
        return names.length ? [{ tone, title: HIGHLIGHT_COPY[tone].title, names, text: HIGHLIGHT_COPY[tone].text(names.join('、')) }] : [];
    });
}
function toneCountLine(items) {
    return ['福氣', '動能', '提醒'].map(tone => [tone, items.filter(i => i.teacher?.tone === tone).length]).filter(([, n]) => n > 0).map(([tone, n]) => `${tone} ${n}`).join('、');
}
function buildShenShaIChing(params) {
    const { pillars, pillarCheckPassed, card, iching } = params;
    const chain = [
        { step: '八字', text: `${pillars.year}／${pillars.month}／${pillars.day}／${pillars.hour}` },
        { step: '紫微', text: pillarCheckPassed ? '四柱與八字逐字核對一致' : '四柱與八字不一致，停在核對關' },
    ];
    if (!pillarCheckPassed)
        return { state: 'BLOCKED', chain, reason: '八字與紫微四柱尚未核對一致，不衍生神煞，也不起卦。' };
    if (card.state !== 'received') {
        chain.push({ step: '特星神煞', text: '尚未全部判定' });
        return { state: 'BLOCKED', chain, reason: '特星神煞尚未全部判定完成，易經解盤暫不提供，避免用不完整的神煞下結論。' };
    }
    const items = card.columns.flatMap(col => col.hits.map(hit => ({
        // 取法原文分號後是查柱範圍（工程用），客戶只看推導本身。
        id: hit.id, name: hit.name, pillar: col.label, derivation: hit.rule.split('；')[0], reference: hit.reference,
        onion: (0, shensha_onion_1.shenShaOnion)(hit.id),
        anchor: hit.anchor,
        // 重點句單獨出現時去掉開頭「其實」：十幾句連著都以「其實你」起頭，讀起來像套版。
        hook: (0, shensha_onion_1.shenShaOnion)(hit.id)?.layers.find(l => l.layer === '心')?.text.replace(/^其實/, '') ?? shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[hit.id]?.theme ?? null,
        tradition: shensha_teacher_readings_1.SHENSHA_TRADITION[hit.id] ? `傳統分類：${shensha_teacher_readings_1.SHENSHA_TRADITION[hit.id]}` : null,
        teacher: shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[hit.id] ? { theme: shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[hit.id].theme, tone: shensha_teacher_readings_1.SHENSHA_TEACHER_READINGS[hit.id].tone, text: (0, shensha_teacher_readings_1.teacherReadingFor)(hit.id, hit.name, col.label) } : null,
        // 老師解盤：字有字的意境，取姓名學字庫字義作參考（業主定案 2026-09-27）。
        imagery: (0, shensha_char_imagery_1.shenShaImagery)(hit.name),
    })));
    // 同一顆神煞落在兩柱以上：第二次起重點句改講這一柱，不再和第一次一模一樣（客人審查第二輪）。
    // 同一個心理學名詞在一張盤只出現一次（客人審查第三輪：天狗與十惡大敗都掛「沉沒成本」）。
    const termSeen = new Set();
    for (const item of items) {
        const term = item.onion?.term;
        if (!term)
            continue;
        if (termSeen.has(term.name))
            item.onion = { ...item.onion, term: null };
        else
            termSeen.add(term.name);
    }
    const firstPillar = new Map();
    for (const item of items) {
        const first = firstPillar.get(item.id);
        if (first)
            item.hook = `和${first}那顆是同一顆；落在${item.pillar}，${shensha_teacher_readings_1.PILLAR_LINK[item.pillar] ?? '在這一柱顯現'}。`;
        else
            firstPillar.set(item.id, item.pillar);
    }
    const distribution = card.columns.map(col => ({ pillar: col.label, count: col.hits.length }));
    chain.push({ step: '特星神煞', text: items.length ? `共 ${items.length} 項：${distribution.map(d => `${d.pillar}${d.count}`).join('、')}` : '本次依本派取法未命中任何特星神煞' });
    if (iching.status !== 'READY') {
        chain.push({ step: '易經', text: '未起卦' });
        return { state: 'BLOCKED', chain, reason: iching.reason };
    }
    const r = iching.reading;
    chain.push({ step: '易經', text: `生辰起卦：${r.hexagramName}，動爻第${r.changingLine}爻` });
    const combos = (0, shensha_combos_1.findShenShaCombos)(items.map(i => ({ id: i.id, name: i.name, pillar: i.pillar, tone: i.teacher?.tone })));
    const max = Math.max(0, ...distribution.map(d => d.count));
    const focus = distribution.filter(d => d.count === max && max > 0).map(d => d.pillar);
    const empty = distribution.filter(d => d.count === 0).map(d => d.pillar);
    const summary = items.length
        ? `這張盤由八字排出四柱（${chain[0].text}），紫微斗數逐字核對一致，從同一張盤衍生特星神煞 ${items.length} 項（${toneCountLine(items)}），以${focus.join('、')}最集中${empty.length ? `，${empty.join('、')}本派取法未命中` : ''}；本命卦為「${r.hexagramName}」。`
        : `這張盤由八字排出四柱（${chain[0].text}），紫微斗數逐字核對一致；依本派取法沒有命中特星神煞，這不代表其他流派也沒有。本命卦為「${r.hexagramName}」。`;
    const highlights = highlightsOf(items);
    const focusLine = items.length && focus.length
        ? `神煞最集中在${focus.join('、')}，${focus.map(p => shensha_teacher_readings_1.PILLAR_LINK[p]).filter(Boolean).join('；也')}——這張盤的故事，多半在這一面發生。`
        : null;
    const reading = [
        ...(items.length ? [shensha_teacher_readings_1.SHENSHA_PRINCIPLE] : []),
        `易經以同一份生辰起卦，得「${r.hexagramName}」：${r.essence.replace(/[。．.]?$/, '。')}行動建議：${r.advice}`,
    ];
    const registry = _____json_1.default;
    const claim = registry.claims.find(c => c.claim_id === exports.SHENSHA_ICHING_CLAIM);
    const status = claim ? (0, iching_source_gate_1.evaluateClaim)(claim, (0, iching_source_gate_1.indexSources)(registry)).status : 'PENDING_POOL';
    return {
        teaser: `本命卦「${r.hexagramName}」・神煞 ${items.length} 項${combos.length ? `・合看 ${combos.length} 組` : ''}`,
        oneLiner: items.length ? `讀意、讀位、讀卦：${focus.join('、')}最集中，回到「${r.hexagramName}」——${r.advice.split('（')[0]}。` : `盤上沒有特星神煞，回到「${r.hexagramName}」——${r.advice.split('（')[0]}。`,
        state: 'READY', chain, items, distribution, summary, focusLine, highlights, reading, combos,
        groups: card.columns.map(col => {
            const groupItems = items.filter(i => i.pillar === col.label);
            const tones = ['福氣', '動能', '提醒'].map(tone => [tone, groupItems.filter(i => i.teacher?.tone === tone).length]).filter(([, n]) => n > 0);
            return { pillar: col.label, anchor: `shensha-${col.pillar}`, count: col.hits.length, palace: `${shensha_teacher_readings_1.PILLAR_PALACE[col.label] ?? ''}。`, toneLine: tones.map(([tone, n]) => `${tone} ${n}`).join('　'), items: groupItems };
        }).filter(g => g.count > 0),
        hexagram: { name: r.hexagramName, glyph: r.glyph, kingWen: r.kingWen, changingLine: r.changingLine, changingLabel: `第${r.changingLine}爻動`, essence: r.essence, advice: r.advice },
        credibility: { status, line: `神煞易經解盤：${credibility_phrases_1.STATUS_WORDING[status]}` },
        imageryAttribution: shensha_char_imagery_1.SHENSHA_IMAGERY_ATTRIBUTION,
        onionCredibility: (0, shensha_onion_1.shenShaOnionCredibility)(),
    };
}
