/**
 * 六秒衝鋒影片・一條龍串接與「以玩家為主」守門
 * ============================================================================
 *
 * 業主定調：「以後好生成角色，就立刻把檔案生成出來，連接一條龍的貫通連接。」
 * 「玩家的邏輯，要精準交叉玩家的邏輯，要以玩家而不是以對家為主。」
 *
 * 這支鎖三件事：
 *   一、產完就自動接上——不必改任何程式碼
 *   二、沒產的卡不准硬掛影片——會 404 成黑方塊蓋掉三維對撞
 *   三、聲音與鏡頭以玩家為主，對手不發自己的叫聲
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/* ── 一、一條龍：宣告了就掛，沒宣告就不掛 ──────────────────────── */
{
  const ritual = read('components/BeastDuelRitual.tsx');

  // 掛不掛，取決於技能檔案有沒有宣告 video——不是猜路徑存不存在。
  assert.ok(
    /setChargeVideoSrc\(\s*id && skills\?\.charge\.video \?/.test(ritual),
    '影片層必須以「技能檔案宣告了 video」為條件，不得無條件掛上',
  );
  assert.ok(
    !/setChargeVideoSrc\(vids\.webm\)/.test(ritual),
    '不得無條件把慣例路徑掛上去——六十張裡多數還沒產，硬掛會 404 成黑方塊',
  );

  const archive = read('lib/beast-skill-archive.ts');
  assert.ok(/export function chargeVideoFor/.test(archive), '要有慣例路徑函式');
  assert.ok(/video\?: string/.test(archive), 'PresentationSkill 要能帶 video 欄位');
  assert.ok(/videoMp4\?: string/.test(archive), '要能帶 videoMp4 欄位（Safari 走 mp4）');

  // presentationSkillsFor 只是查表挑出三支技能，不得把原始欄位洗掉——
  // 洗掉的話 skills.json 宣告了 video 前端也拿不到，一條龍就斷在這裡。
  assert.ok(
    /list\.find\(\(s\) => s\.skillId === id\)/.test(archive),
    '取技能要原封不動回傳原物件，不得重建（重建會掉 video 欄位）',
  );
}

/* ── 二、六秒配方是唯一規格 ─────────────────────────────────────── */
{
  const gate = read('scripts/check-beast-clips.mjs');
  assert.ok(/seconds: 6/.test(gate), '配方時長必須是六秒');
  for (const stage of ['build', 'rush', 'bite', 'tail']) {
    assert.ok(gate.includes(`'${stage}'`), `聲音四段要有「${stage}」`);
  }

  const doc = read('docs/beast-game-skill.md');
  assert.ok(/六秒衝鋒影片/.test(doc), '技能檔案要有六秒衝鋒影片這一章');
  assert.ok(/底氣蓄力/.test(doc) && /咬擊命中/.test(doc), '要寫明四段的名字');
  assert.ok(/1:1/.test(doc), '要寫明本體 1:1、禁止用卡片造假');
  for (const part of ['牙齒', '眼睛', '指甲', '尾巴']) {
    assert.ok(doc.includes(part), `逐部位審查清單要包含「${part}」`);
  }

  // 已入庫的卡，宣告必須符合配方。舊批次沒改完就會在這裡擋下來。
  const cardsDir = path.join(root, 'public/skill-battle-archive/cards');
  for (const cardId of fs.readdirSync(cardsDir)) {
    const clip = path.join(cardsDir, cardId, 'clips', 'charge-battle.mp4');
    if (!fs.existsSync(clip)) continue;
    const data = JSON.parse(read(`public/skill-battle-archive/cards/${cardId}/skills.json`));
    const charge = (data.skills ?? []).find((s) => s.skillId === 'skill_charge');
    if (!charge?.video) continue; // 還沒宣告的不掛，不在這支的守備範圍
    assert.equal(charge.durationMs, 6000, `${cardId} 宣告了影片就必須是六秒配方`);
  }
}

/* ── 三、以玩家為主 ─────────────────────────────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  assert.ok(
    /export function playPlayerBeastVoice[\s\S]{0,400}?if \(side !== 'player'\) return;/.test(fx),
    '本體叫聲必須在函式入口就擋掉對手側——以玩家為主，不是兩邊都叫',
  );

  const ritual = read('components/BeastDuelRitual.tsx');
  /*
    取完整的呼叫，不能用 /playPlayerBeastVoice\([^)]*\)/ ——
    參數裡有 actionSide(0) 這種巢狀括號，那個正規式會在第一個 ) 就截斷，
    抓到半截字串再去比對，測出來的是假的。所以自己數括號。
  */
  const calls = [];
  for (let at = ritual.indexOf('playPlayerBeastVoice('); at >= 0; at = ritual.indexOf('playPlayerBeastVoice(', at + 1)) {
    let depth = 0;
    for (let i = ritual.indexOf('(', at); i < ritual.length; i += 1) {
      if (ritual[i] === '(') depth += 1;
      else if (ritual[i] === ')') {
        depth -= 1;
        if (depth === 0) { calls.push(ritual.slice(at, i + 1)); break; }
      }
    }
  }
  assert.ok(calls.length > 0, '儀式要播放玩家本體叫聲');
  /*
    真正的規則不是「第二個參數要寫死 'player'」——揭牌是逐張交替的，
    那個參數本來就該是這一張的側別（對手那張到了函式入口會被擋掉）。

    要鎖的是**叫聲的卡片來源**：永遠取自 player[...]，絕不取自 opponent[...]。
    寫死側別反而擋不住「side 傳 player、卡片卻拿對手那張」這種真正的錯。
  */
  for (const call of calls) {
    assert.ok(
      call.includes('player['),
      `叫聲的卡片必須取自玩家自己的陣容：${call}`,
    );
    assert.ok(
      !call.includes('opponent['),
      `叫聲不得取用對手的卡片——以玩家為主：${call}`,
    );
  }
}

console.log('PASS: 一條龍串接（宣告才掛、不硬掛）');
console.log('PASS: 六秒配方唯一規格、逐部位審查清單在案');
console.log('PASS: 聲音以玩家為主，對手不發自己的叫聲');
