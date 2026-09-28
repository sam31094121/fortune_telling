"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildShenShaShare = buildShenShaShare;
function buildShenShaShare(card, iching, flow) {
    if (card.state !== 'received' || iching.state !== 'READY')
        return null;
    const lines = [{ label: '易經老師', text: iching.oneLiner }];
    if (flow.state === 'READY')
        lines.push({ label: flow.years[0].label, text: flow.years[0].oneLiner });
    return {
        title: '神煞易經',
        subtitle: '八字 → 紫微 → 特星神煞 → 易經',
        columns: card.columns.map(col => ({ label: col.label, names: col.hits.map(hit => ({ name: hit.name, tone: hit.tone })) })),
        emptyColumn: '—',
        hexagram: `本命卦「${iching.hexagram.name}」`,
        lines,
        footer: '太極紫微易經派・僅作自我反思參考',
        site: 'heaven-earth-humanity-pair.vercel.app',
        fileName: '神煞易經分享卡.png',
        shareText: `我的神煞易經：${iching.teaser}`,
        buttonLabel: '製作分享卡',
        busyLabel: '分享卡製作中',
        doneLabel: '分享卡已完成，可以長按圖片儲存或分享。',
        failLabel: '這台裝置暫時無法製作圖片，可以直接截圖分享。',
        privacyNote: '分享卡不含出生日期、時辰與姓名。',
    };
}
