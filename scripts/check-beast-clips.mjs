/**
 * 六秒衝鋒影片・自動審查閘
 * ============================================================================
 *
 * 業主定調：「每隻都要 6 秒影片，聲音要有打架底氣與『咬上去』的霸氣邏輯、前後連貫。」
 * 「禁止用卡片造假，要本體神獸 1 比 1 的模樣生成出來。」
 *
 * 【為什麼要這支】
 *
 * 影片是花錢產的，一次六十支。等六十支都產完才發現配方不對，
 * 錢已經花掉了。所以每一支落地就驗，不對的當場點名，
 * 讓它回去重產——這就是「自動進入細修狀態」。
 *
 * 【驗什麼】
 *
 * 1 時長剛好六秒。六秒是配方的骨架：底氣蓄力 → 霸氣衝鋒 → 咬擊命中 → 餘韻。
 *   長度不對，四段的時間點就全部跑掉，聲音對不上畫面。
 * 2 mp4 與 webm 都要有。只有一種格式，另一種瀏覽器就開天窗。
 * 3 容量在預算內。手機優先是憲章，不是建議。
 * 4 有影片的卡，一定要有對應的去背本體立繪——
 *   本體是 1:1 的判準，沒有本體就無從比對影片裡是不是同一隻。
 * 5 技能檔案要宣告 video / videoMp4 / audioLogic 四段 / narrative。
 *   沒宣告，前端不會掛，等於白產。
 *
 * 用法：
 *   npm run check:beast-clips          全部驗
 *   npm run check:beast-clips -- --json  給 CI 吃
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const CARDS_DIR = path.join(root, 'public/skill-battle-archive/cards');
const SPIRIT_DIR = path.join(root, 'public/beast-game/spirit');

/** 六秒配方的骨架。四段的名字就是聲音的邏輯順序，順序不能換。 */
export const CHARGE_SPEC = {
  seconds: 6,
  /** 允許的誤差。影片編碼的時基不一定整除，±0.05 秒人耳分不出來。 */
  toleranceSec: 0.05,
  /** 單卡 mp4 + webm 合計上限（KB）。見〈手機容量預算〉。 */
  maxCardKb: 2400,
  /** 六十張合計上限（MB）。 */
  maxTotalMb: 140,
  /**
   * 影格尺寸上限。
   *
   * 舞台在手機上實測只有約 317×210 CSS px，就算 DPR 2 也不到 640×420。
   * 給 1280×720 是四倍過剩——多出來的像素永遠不會被看到，
   * 只是讓客戶多下載。手機優先是憲章，不是建議。
   */
  maxWidth: 854,
  maxHeight: 480,
  /** 聲音四段，順序固定：底氣蓄力 → 霸氣衝鋒 → 咬擊命中 → 餘韻。 */
  audioStages: ['build', 'rush', 'bite', 'tail'],
};

/**
 * 從 mp4 的 mvhd box 讀時長。
 *
 * 這台機器沒有 ffprobe，而且為了一個數字裝一套影音工具鏈不划算。
 * mvhd 是 mp4 規格裡固定的 box，timescale 與 duration 就在裡面，
 * 自己讀十行就有，不依賴任何外部程式。
 */
export function mp4Seconds(file) {
  const buf = fs.readFileSync(file);
  const at = buf.indexOf(Buffer.from('mvhd'));
  if (at < 0) return null;
  const version = buf[at + 4];
  const off = version === 1 ? at + 4 + 4 + 8 + 8 : at + 4 + 4 + 4 + 4;
  const timescale = buf.readUInt32BE(off);
  if (!timescale) return null;
  const duration = version === 1 ? Number(buf.readBigUInt64BE(off + 4)) : buf.readUInt32BE(off + 4);
  return Number((duration / timescale).toFixed(3));
}

/**
 * 從 mp4 的 tkhd box 讀影格尺寸。同樣不依賴外部工具。
 */
export function mp4Size(file) {
  const buf = fs.readFileSync(file);
  const at = buf.indexOf(Buffer.from('tkhd'));
  if (at < 0) return null;
  const version = buf[at + 4];
  const off = at + 4 + 4 + (version === 1 ? 8 + 8 + 4 + 4 : 4 + 4 + 4 + 4) + 4 + 8 + 2 + 2 + 2 + 2 + 36;
  const width = buf.readUInt32BE(off) >> 16;
  const height = buf.readUInt32BE(off + 4) >> 16;
  return width && height ? { width, height } : null;
}

/** 卡片 id → 本體立繪檔名。與 lib/beast-battle-fx.ts 的 spiritArtFor 同一套規則。 */
function spiritFileFor(cardId) {
  const beast = /^beast_([ay])(\d{2})$/.exec(cardId);
  if (beast) return `${beast[2]}${beast[1] === 'y' ? 'y' : ''}.webp`;
  const guardian = {
    beast_g_qinglong: '01.webp', beast_g_zhuque: '22.webp',
    beast_g_baihu: '15.webp', beast_g_xuanwu: '08.webp',
  };
  return guardian[cardId] ?? null;
}

export function auditClips() {
  const cards = fs.existsSync(CARDS_DIR) ? fs.readdirSync(CARDS_DIR).sort() : [];
  const rows = [];
  let totalKb = 0;

  for (const cardId of cards) {
    const clips = path.join(CARDS_DIR, cardId, 'clips');
    const mp4 = path.join(clips, 'charge-battle.mp4');
    const webm = path.join(clips, 'charge-battle.webm');
    if (!fs.existsSync(mp4) && !fs.existsSync(webm)) {
      rows.push({ cardId, state: 'MISSING', problems: ['還沒產'] });
      continue;
    }

    const problems = [];
    /*
      標了 pendingSixSecondClip 的卡是**刻意撤下宣告**的安全狀態：
      舊批次的檔案還躺著，但技能檔案沒宣告，所以前端不會掛，客戶看不到。

      這種狀態不該擋——沒有人會看到錯的東西，等六秒版覆寫就好。
      擋的標準只有一個：**會放給客戶看、但不對**。
    */
    const skillsRaw = fs.existsSync(path.join(CARDS_DIR, cardId, 'skills.json'))
      ? JSON.parse(fs.readFileSync(path.join(CARDS_DIR, cardId, 'skills.json'), 'utf8'))
      : null;
    const chargeRaw = (skillsRaw?.skills ?? []).find((s) => s.skillId === 'skill_charge');
    if (chargeRaw?.pendingSixSecondClip && !chargeRaw.video) {
      rows.push({ cardId, state: 'PENDING', problems: ['舊批次已撤下宣告，等六秒版覆寫（客戶看不到，不擋）'] });
      continue;
    }
    const hasMp4 = fs.existsSync(mp4);
    const hasWebm = fs.existsSync(webm);
    if (!hasMp4) problems.push('缺 mp4（Safari 開不了）');
    if (!hasWebm) problems.push('缺 webm');

    // 解析度過剩不擋批次（片子還是能看），但要點名——多出來的像素客戶白下載。
    const notes = [];
    const dims = hasMp4 ? mp4Size(mp4) : null;
    if (dims && (dims.width > CHARGE_SPEC.maxWidth || dims.height > CHARGE_SPEC.maxHeight)) {
      const waste = ((dims.width * dims.height) / (CHARGE_SPEC.maxWidth * CHARGE_SPEC.maxHeight)).toFixed(1);
      notes.push(
        `${dims.width}×${dims.height} 超過 ${CHARGE_SPEC.maxWidth}×${CHARGE_SPEC.maxHeight}`
        + `（${waste} 倍像素）——舞台只有約 317×210 CSS px，多的看不到`,
      );
    }

    const seconds = hasMp4 ? mp4Seconds(mp4) : null;
    if (seconds === null) {
      if (hasMp4) problems.push('讀不到時長（不是有效的 mp4？）');
    } else if (Math.abs(seconds - CHARGE_SPEC.seconds) > CHARGE_SPEC.toleranceSec) {
      problems.push(`時長 ${seconds} 秒，不是 ${CHARGE_SPEC.seconds} 秒——四段時間點會全部跑掉`);
    }

    const kb = Math.round(
      ((hasMp4 ? fs.statSync(mp4).size : 0) + (hasWebm ? fs.statSync(webm).size : 0)) / 1024,
    );
    totalKb += kb;
    if (kb > CHARGE_SPEC.maxCardKb) problems.push(`${kb}KB 超過單卡上限 ${CHARGE_SPEC.maxCardKb}KB`);

    // 1:1 本體對照：有影片就一定要有那一隻的去背立繪，否則無從比對是不是同一隻。
    const spirit = spiritFileFor(cardId);
    if (!spirit) problems.push('認不得的卡片 id，對不到本體');
    else if (!fs.existsSync(path.join(SPIRIT_DIR, spirit))) {
      problems.push(`找不到本體立繪 ${spirit}——不能只有影片沒有 1:1 判準`);
    }

    // 技能檔案要宣告，前端才掛得上；沒宣告等於白產。
    const skillsPath = path.join(CARDS_DIR, cardId, 'skills.json');
    if (!fs.existsSync(skillsPath)) problems.push('沒有 skills.json');
    else {
      const data = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
      const charge = (data.skills ?? []).find((s) => s.skillId === 'skill_charge');
      if (!charge) problems.push('skills.json 裡沒有 skill_charge');
      else {
        if (!charge.video) problems.push('skill_charge 沒宣告 video（webm）');
        if (!charge.videoMp4) problems.push('skill_charge 沒宣告 videoMp4');
        if (charge.durationMs !== CHARGE_SPEC.seconds * 1000) {
          problems.push(`durationMs=${charge.durationMs}，與六秒配方不符`);
        }
        const stages = charge.audioLogic ?? [];
        for (const stage of CHARGE_SPEC.audioStages) {
          if (!stages.some((s) => String(s).startsWith(stage))) {
            problems.push(`聲音缺「${stage}」這一段——四段是連貫的，不能少`);
          }
        }
        if (!charge.narrative) problems.push('沒有 narrative（說不出這六秒在演什麼）');
      }
    }


    /*
      逐部位審查：以產線寫下的 qa-report.json 為準，不是我這邊重判。

      業主定調要逐項看頭、身體、手腳、嘴巴、牙齒、眼睛、指甲、尾巴，
      「如果不對，要自動進入細修的狀態」。那是**看畫面**才判得出來的事，
      這支腳本讀不了影格（這台沒有 ffmpeg），硬要在這裡宣稱通過就是作假。

      所以分工是：產線負責看畫面並把結論寫進 qa-report.json，
      這裡負責**不准繞過那份結論**。沒有報告、報告說沒過、
      或任何一個部位沒過，就一律不算合格——兩套審查合成一套，
      不會出現「閘門綠燈但實際上動作是假的」這種矛盾。
    */
    const qaPath = path.join(clips, 'qa-report.json');
    if (!fs.existsSync(qaPath)) {
      problems.push('沒有 qa-report.json——逐部位審查沒有紀錄，不能算通過');
    } else {
      let qa = null;
      try { qa = JSON.parse(fs.readFileSync(qaPath, 'utf8')); }
      catch { problems.push('qa-report.json 讀不動'); }
      if (qa) {
        const failed = Object.entries(qa.checklist ?? {})
          .filter(([, v]) => !v?.pass)
          .map(([k]) => k);
        if (failed.length) {
          problems.push(`逐部位未過：${failed.join('、')}（共 ${failed.length} 項）`);
        }
        if (qa.overall_pass === false) problems.push('產線判定 overall_pass=false');
        if (qa.human_review?.result === 'FAIL') {
          const issues = (qa.human_review.issues ?? []).slice(0, 2).join('；');
          problems.push(`人工複核 FAIL${issues ? '：' + issues : ''}`);
        }
        if (qa.limitation) notes.push(`產線註記：${String(qa.limitation).slice(0, 90)}`);
      }
    }

    rows.push({ cardId, state: problems.length ? 'FAIL' : notes.length ? 'WARN' : 'OK', seconds, kb, dims, problems, notes });
  }

  const totalMb = +(totalKb / 1024).toFixed(1);
  return { rows, totalMb, overBudget: totalMb > CHARGE_SPEC.maxTotalMb };
}

/** 直接用 node 跑就出報表；被 import 時只提供函式，不自己動作。 */
if (process.argv[1] && process.argv[1].endsWith("check-beast-clips.mjs")) {
  const report = auditClips();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const ok = report.rows.filter((r) => r.state === 'OK' || r.state === 'WARN');
    const warn = report.rows.filter((r) => r.state === 'WARN');
    const fail = report.rows.filter((r) => r.state === 'FAIL');
    const missing = report.rows.filter((r) => r.state === 'MISSING');
    const pending = report.rows.filter((r) => r.state === 'PENDING');
    for (const row of pending) console.log(`  … ${row.cardId}  ${row.problems[0]}`);
    for (const row of fail) {
      console.log(`  ✗ ${row.cardId}  ${row.seconds ?? '?'} 秒  ${row.kb ?? '?'}KB`);
      for (const p of row.problems) console.log(`      ${p}`);
    }
    for (const row of ok) {
      console.log(`  ${row.state === 'WARN' ? '△' : '✓'} ${row.cardId}  ${row.seconds} 秒  ${row.kb}KB  ${row.dims ? row.dims.width + '×' + row.dims.height : ''}`);
      for (const n of row.notes ?? []) console.log(`      ${n}`);
    }
    console.log(
      `\n合格 ${ok.length}（其中 ${warn.length} 張解析度過剩） ／ 要細修 ${fail.length} ／ 待重產 ${pending.length} ／ 還沒產 ${missing.length}`
      + `　共 ${report.rows.length} 張`,
    );
    /*
      推估要用「合格卡」的平均，不能用全部的平均。

      舊批次的兩秒片只有六百多 KB，混進去算會把六十張的推估拉低一半，
      看起來很安全，實際上照六秒配方產完會爆掉。
      推估的意義是提早知道會不會爆，算法一鬆就失去意義。
    */
    const basis = ok.length ? ok : report.rows.filter((r) => r.kb);
    const avgKb = basis.length ? basis.reduce((sum, r) => sum + r.kb, 0) / basis.length : 0;
    const projectedMb = +((avgKb * 60) / 1024).toFixed(1);
    console.log(
      `目前容量 ${report.totalMb}MB`
      + `　依合格卡平均 ${Math.round(avgKb)}KB 推估六十張 ${projectedMb}MB`
      + `　上限 ${CHARGE_SPEC.maxTotalMb}MB`
      + (projectedMb > CHARGE_SPEC.maxTotalMb ? '　← 會爆，配方要降規' : ''),
    );
  }
  /*
    有不合格的就擋下來，讓 CI 是紅的。

    「還沒產」不算不合格——六十張是分批產的，沒產的卡走既有的三維本體衝鋒，
    畫面不會開天窗。會擋的是**產了但不對**：時長不是六秒、缺一種格式、
    容量爆掉、沒有本體可比對、宣告不完整。那些放過去等於白花錢。

    永遠 exit 0 的檢查是裝飾，不是守門。
  */
  const blocked = report.rows.filter((r) => r.state === 'FAIL');
  if (blocked.length || report.overBudget) {
    console.log(
      `
擋下：${blocked.length} 張要細修`
      + (report.overBudget ? `，且容量 ${report.totalMb}MB 超過上限` : '')
      + '。修好再入庫。',
    );
    process.exit(1);
  }
  process.exit(0);
}
