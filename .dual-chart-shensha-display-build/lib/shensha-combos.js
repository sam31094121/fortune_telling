"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHENSHA_COMBO_RULES = void 0;
exports.findShenShaCombos = findShenShaCombos;
const DE_STARS = ['tiande', 'yuede', 'tiandehe', 'yuedehe', 'longde', 'ride'];
exports.SHENSHA_COMBO_RULES = [
    { id: 'march-leader', title: '奔走中帶兵', scope: 'same-pillar', min: 2, members: ['yima', 'jiangxing'],
        text: (_n, p) => `驛馬與將星同在${p}：一邊奔走，一邊帶隊，這是「在移動中建立影響力」的格局。出差、開拓、帶新團隊，最能發揮；記得先定方向再出發。` },
    { id: 'charm-trio', title: '魅力匯聚', scope: 'chart', min: 2, members: ['taohua', 'waiTaohua', 'hongyan', 'muyu'],
        text: n => `${n.join('、')}同時出現：人緣與魅力特別旺，容易被看見、被喜歡。這是天賦，也是功課——感情裡真誠清楚、把界線說明白，魅力才會成為福氣。` },
    { id: 'noble-pair', title: '貴人相逢', scope: 'chart', min: 2, members: ['tianyi', 'tiande', 'yuede', 'tiandehe', 'yuedehe'],
        text: n => `${n.join('、')}一起出現：貴人星不只一顆，遇到困難時常有人伸手。平常多結善緣、守信用，貴人記得的是你的為人。` },
    { id: 'de-softens', title: '德星化煞', scope: 'same-pillar', min: 1, members: DE_STARS, withTone: '提醒',
        text: (n, p) => `${p}有德星（${n.join('、')}）與提醒類神煞同柱：本派讀作「有德護身」，這一柱的關卡雖然存在，但常有轉圜的餘地。守住善念與分寸，就是最好的化解。` },
    { id: 'edge-and-command', title: '鋒芒與權柄', scope: 'same-pillar', min: 2, members: ['yangren', 'jiangxing', 'kuigang', 'jinshen'],
        text: (n, p) => `${n.join('、')}同在${p}：魄力與領導力都強，是能扛大事的組合。剛上加剛時，更要學會放軟聲音，力量才會被接受。` },
    { id: 'scholar', title: '書香與文思', scope: 'chart', min: 2, members: ['wenchang', 'xuetang', 'yuekong', 'huagai', 'liuxiu', 'shiling'],
        text: n => `${n.join('、')}一起出現：學習力、理解力與表達力兼具，適合走一條需要持續精進的專業路。把想法寫下來，你的文思就是機會。` },
    { id: 'solitary-depth', title: '孤高與靈性', scope: 'chart', min: 2, members: ['huagai', 'guchen', 'guasu', 'gejiao'],
        text: n => `${n.join('、')}同時出現：你需要比別人更多的獨處，才能沉澱與充電，這是深度的來源。只是別讓獨處變成孤單——固定和信任的人保持聯繫。` },
    { id: 'livelihood', title: '衣食有底', scope: 'chart', min: 2, members: ['lushen', 'jinyu', 'tianchu', 'jinkui', 'guoyin'],
        text: n => `${n.join('、')}一起出現：衣食與資源有根基，靠自己的本事就能站穩。你的財不是來得快，而是留得住；先存再花，底氣會越來越厚。` },
    { id: 'busy-mind', title: '心思深重', scope: 'chart', min: 2, members: ['yuanchen', 'wangshen', 'kongwang', 'jielu'],
        text: n => `${n.join('、')}同時出現：心裡的事多，容易想太多或擔心還沒發生的事。把念頭寫下來、分成能做和放下兩欄，心就會定下來。` },
    { id: 'outer-waves', title: '外來的風浪', scope: 'chart', min: 2, members: ['jiesha', 'wugui', 'zaisha', 'tiangou', 'suipo'],
        text: n => `${n.join('、')}一起出現：外在的變數與人事雜音較多，不是你做錯，而是要多一道防護。重要的事寫清楚、留備案，風浪來了就只是轉個彎。` },
    { id: 'distant-romance', title: '遠方的緣分', scope: 'same-pillar', min: 2, members: ['yima', 'taohua', 'waiTaohua', 'hongyan'], require: ['yima'],
        text: (n, p) => `${n.join('、')}同在${p}：緣分常在移動中出現——出差、旅行、搬遷，都可能遇見重要的人。` },
    { id: 'care-and-rest', title: '照顧人也照顧自己', scope: 'chart', min: 2, members: ['tianyiDoctor', 'bingfu', 'pima'],
        text: n => `${n.join('、')}一起出現：你很會照顧別人，也容易把別人的擔子扛在自己身上。先照顧好自己，這份溫暖才流得長。` },
];
/** 依本派組合規則，從整張盤的命中神煞找出所有成立的組合。 */
function findShenShaCombos(hits) {
    const pillars = [...new Set(hits.map(h => h.pillar))];
    const combos = [];
    for (const rule of exports.SHENSHA_COMBO_RULES) {
        if (rule.scope === 'chart') {
            const members = hits.filter(h => rule.members.includes(h.id));
            const names = [...new Set(members.map(m => m.name))];
            if (rule.require && !rule.require.every(id => hits.some(h => h.id === id)))
                continue;
            if (names.length >= rule.min)
                combos.push({ id: rule.id, title: rule.title, members: names, pillar: null, text: rule.text(names, null) });
            continue;
        }
        for (const pillar of pillars) {
            const inPillar = hits.filter(h => h.pillar === pillar);
            const names = [...new Set(inPillar.filter(h => rule.members.includes(h.id)).map(h => h.name))];
            if (names.length < rule.min)
                continue;
            if (rule.withTone && !inPillar.some(h => h.tone === rule.withTone))
                continue;
            if (rule.require && !rule.require.every(id => inPillar.some(h => h.id === id)))
                continue;
            combos.push({ id: rule.id, title: rule.title, members: names, pillar, text: rule.text(names, pillar) });
        }
    }
    return combos;
}
