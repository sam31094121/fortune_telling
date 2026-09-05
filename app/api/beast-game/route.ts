import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { playableCards } from '@/lib/beast-game/registry';
import { resolveStake, validateStake } from '@/lib/beast-game/stake';
import { evaluateBalance } from '@/lib/beast-game/balance';
import { getSkill } from '@/cards/skills';
import { BATTLE_PRESENTATION_SKILLS } from '@/cards/skills/battle-presentation';
import { skillBodyArtFor } from '@/lib/beast-skill-archive';
import { GAME_CORE_VERSION } from '@/lib/beast-game/schema';
import { playSeries } from '@/lib/beast-game/series';
import {
  DECK_SIZE,
  LINEUP_SLOTS,
  MAX_LINEUP_COST,
  STARTING_LIFE,
  buildLineup,
  createRng,
  validateLineup,
} from '@/lib/beast-game/turn';

export const dynamic = 'force-dynamic';

/**
 * 神獸卡遊戲｜卡池與決鬥
 *
 * 規格第八、十二條：戰鬥結果全部由 Game Core 算，前端不自己扣血、不自己判勝負；
 * 動畫只能播放「已經算好的事實」。所以決鬥在這裡跑完才回前端。
 */
export async function GET() {
  // 數值技能（Effect Engine）與《技能戰鬥檔案》演出技能共存：分開回傳，互不取代。
  const battleSkills = BATTLE_PRESENTATION_SKILLS.map((skill) => ({
    id: skill.id,
    name: skill.name,
    trigger: '演出・三戰兩勝',
    description: skill.description,
    source: '技能戰鬥檔案',
  }));

  const cards = playableCards().map((card) => ({
    id: card.id,
    name: card.name,
    element: card.element,
    rarity: card.rarity,
    form: card.form,
    cost: card.cost,
    stats: card.stats,
    thumbnail: card.art.thumbnail,
    front: card.art.front,
    story: card.story,
    mansionId: card.mansionId,
    skills: [...card.skills, ...card.passive].map((id) => {
      const skill = getSkill(id);
      return skill
        ? { id: skill.id, name: skill.name, trigger: skill.trigger, description: skill.description }
        : { id, name: id, trigger: 'PASSIVE' as const, description: '' };
    }),
    /** 《技能戰鬥檔案》：本體衝鋒／命中衝擊／隨時戰鬥（與數值技能共存） */
    battleSkills,
    skillBody: skillBodyArtFor(card.id),
    skillArchive: `/skill-battle-archive/cards/${card.id}/skills.json`,
    power: evaluateBalance(card).powerBudget,
  }));

  return NextResponse.json({
    ok: true,
    coreVersion: GAME_CORE_VERSION,
    rules: { lineupSlots: LINEUP_SLOTS, lineupBudget: MAX_LINEUP_COST, deckSize: DECK_SIZE, startingLife: STARTING_LIFE },
    cards,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let body: { lineup?: Array<string | null>; replaySeed?: number; stake?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: '請選擇三張出戰卡。' }, { status: 400 });
  }
  if (body.replaySeed !== undefined && (!Number.isInteger(body.replaySeed) || body.replaySeed < 0 || body.replaySeed >= 2 ** 31)) {
    return NextResponse.json({ ok: false, error: '重播資料無效，請重新啟陣。' }, { status: 400 });
  }
  const lineup = Array.isArray(body.lineup) ? body.lineup : [];
  const verdict = validateLineup(lineup);
  if (!verdict.ready) {
    // 三席沒放滿就不開戰，而且要講得出理由——不是把按鈕變灰就算了。
    return NextResponse.json({ ok: false, error: verdict.reason }, { status: 400 });
  }

  /*
    賭注卡。

    這是整套遊戲唯一會拿走客戶東西的機制，所以在這裡就要擋：
    沒放賭注卡不准開戰。押注前必須知道自己押了什麼，
    不能打完才發現有押注這回事。
  */
  const stakeCardId = typeof body.stake === 'string' ? body.stake : null;
  const knownIds = new Set(playableCards().map((card) => card.id));
  const stakeCheck = validateStake(stakeCardId, (id) => knownIds.has(id));
  if (!stakeCheck.ready) {
    return NextResponse.json({ ok: false, error: stakeCheck.reason }, { status: 400 });
  }

  /*
    種子由伺服器產生，客戶不能指定。

    原本直接收 body.seed。那等於讓人可以一直換種子試到贏為止——
    對單機對戰來說不是我們在作假，但「公平對決」這四個字就站不住了。

    replaySeed 是唯一的例外：用同一顆種子把同一場重播一次，
    結果一定一模一樣（這正是可回查的意義），並且會標成重播、不算新戰績。
  */
  const isReplay = Number.isInteger(body.replaySeed);
  const seed = isReplay
    ? Number(body.replaySeed)
    : Math.floor(randomInt(0, 2 ** 31 - 1));

  const chosen = lineup.filter((id): id is string => Boolean(id));
  const ids = playableCards().map((card) => card.id);
  const rng = createRng(seed);

  /*
    對手用完全一樣的規則產生：同一個卡池、同樣的三席、同樣二十張牌組。
    對手沒有額外本命、沒有額外氣、沒有專屬卡——想確認的話，
    回傳的 fairness 欄位就是給客戶看的那份對照。
  */
  const opponentLineup = buildLineup(ids, rng);
  // Lock the opponent's stake before resolving combat; no choosing prizes after seeing the winner.
  const opponentStakeId = ids[Math.floor(rng() * ids.length)];
  const series = playSeries(chosen, opponentLineup, seed);

  /*
    對手也押一張，同樣從卡池抽、同樣用這一場的種子——
    「雙方各放一張」不是說說而已，對手押的是哪一張會一起回傳。
  */
  const stakeOutcome = resolveStake({
    playerStake: stakeCardId as string,
    opponentStake: opponentStakeId,
    winner: series.winner,
  });
  const nameOf = (id: string) => playableCards().find((c) => c.id === id)?.name ?? id;

  return NextResponse.json({
    ok: true,
    /*
      押注結算。由伺服器算，前端不得自己判斷誰拿走誰的卡。
      gained／forfeited 一律帶名字，客戶看到的是「你失去了尾火虎」，
      不是「本次未獲得獎勵」這種把沒收藏起來的說法。
    */
    stake: {
      ...stakeOutcome,
      playerStakeName: nameOf(stakeOutcome.stakes.player),
      opponentStakeName: nameOf(stakeOutcome.stakes.opponent),
      gainedCardName: stakeOutcome.gainedCardId ? nameOf(stakeOutcome.gainedCardId) : null,
      forfeitedCardName: stakeOutcome.forfeitedCardId ? nameOf(stakeOutcome.forfeitedCardId) : null,
    },
    seed,
    isReplay,
    firstPlayer: series.firstPlayer,
    winner: series.winner,
    series,
    turns: series.pairs.length,
    life: { player: series.score.player, opponent: series.score.opponent },
    opponentLineup: opponentLineup.map((id) => playableCards().find((c) => c.id === id)?.name ?? id),
    opponentLineupIds: opponentLineup,
    /*
      公平性對照表。直接端給客戶看——
      「我們沒有偷偷讓對手比較強」這句話要有東西可以對，不能只是宣告。
    */
    fairness: {
      seedSource: isReplay ? '重播（沿用你指定的種子）' : '伺服器產生，客戶端無法指定',
      firstPlayer: '每局依速度決定先手，同速由本場種子決定',
      sameRules: [
        '三局取多勝；二比零時第三組自動揭牌，一比一時親手揭開決勝局',
        '每局重置生命與技能次數，沿用卡片屬性、元素相剋與戰鬥技能',
        '單挑不抽牌、不補位，抽棄牌技能在此模式不生效',
        `雙方開場布陣最多 ${MAX_LINEUP_COST} 氣，同一卡不能重複上陣`,
        '百次行動仍未分勝負則該局平手，最多三局按勝局數結算；同分退回押注',
      ],
      replayable: '記下這顆種子，用「重播這一場」可以完整重現同一場對戰。',
    },
    timeline: [],
    log: series.pairs.flatMap((pair) => pair.actions),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
