import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { advance, bossNotice, chooseAI, legalActions, newMatch, type Action } from '@/lib/beast-game/interactive';
import { openBattleSession, openTableTicket, signBattleSession, signTableTicket, type BattleSession } from '@/lib/beast-game/battle-session';
import { battleViewFor } from '@/lib/beast-game/battle-view';
import { resolveStake } from '@/lib/beast-game/stake';
import { judgeVictorySkill } from '@/lib/beast-game/iching-judgment';
import { distributeRewardCards } from '@/lib/beast-game/reward-distribution';
import { MAX_STAKE_CARDS, stakeRewardCount } from '@/lib/beast-game/stake-rules';
import { getCard, playableCards } from '@/lib/beast-game/registry';
import { createRng } from '@/lib/beast-game/turn';
import { newBattle } from '@/lib/beast-game/battlefield';
import { autoPlaceOpponent, fieldTeam } from '@/lib/beast-game/battle-bridge';
import { BATTLEFIELD_DECK_SIZE, buildFreshOpeningDeck, buildUniqueDeck, sanitizeDeckSelection } from '@/lib/beast-game/deck-builder';
import type { StakeOutcome } from '@/lib/beast-collection-ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 困難戰場（五卡押注戰場）後端運算
 * ============================================================================
 *
 * 業主定調（2026-09-15）：易經與技能運算在後端，再送給前端；前端只負責顯示易經。
 *
 * 這裡算：開局洗牌發牌與易經自動佈陣（DEAL，第三階段 3A）、開戰種子與難度、易經出手判斷與首領反制、每一招的結果、勝負、
 * 易經技術判斷、押注獎勵張數。前端只送「佈陣」與「出哪一招」，只顯示回傳的結果。
 *
 * 無狀態：每次回傳簽名戰局票（battle-session.ts），任何一台機器都能接續。
 */

type Body = {
  type?: string;
  token?: unknown;
  action?: unknown;
  playerTeam?: unknown;
  opponentTeam?: unknown;
  stakeCardId?: unknown;
  stakeCount?: unknown;
  tableToken?: unknown;
  playerDeckIds?: unknown;
  previousOpening?: unknown;
};

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': 'no-store' } });

function isTeam(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && id.length <= 80);
}

function isAction(value: unknown): value is Action {
  if (!value || typeof value !== 'object') return false;
  const action = value as { type?: unknown; index?: unknown };
  if (action.type === 'ATTACK' || action.type === 'SKILL' || action.type === 'RAGE') return true;
  return action.type === 'SWITCH' && Number.isInteger(action.index);
}

/** 押注戰打完才結算；勝負只取核心的 match.winner。 */
function settle(session: BattleSession): StakeOutcome | undefined {
  const { match, stakeCardId, stakeCount } = session;
  if (match.status !== 'FINISHED' || !stakeCardId) return undefined;
  const opponentStake = match.opponent.team[0]?.cardId;
  if (!opponentStake) return undefined;
  const base = resolveStake({
    playerStake: stakeCardId,
    opponentStake,
    winner: match.winner === 'player' ? 'PLAYER' : match.winner === 'opponent' ? 'OPPONENT' : 'DRAW',
  });
  // 易經判斷技術等級：只有玩家贏了才觸發，技術越高獎勵越多。
  const judgment = base.verdict === 'WON' ? judgeVictorySkill(match) : null;
  const rewardCount = judgment ? stakeRewardCount(stakeCount, judgment.bonusCards) : 0;
  return judgment
    ? { ...base, gainedCount: rewardCount, rewardCardIds: distributeRewardCards(opponentStake, rewardCount), ichingJudgment: judgment }
    : base;
}

function reply(session: BattleSession, extra: { action?: Action } = {}) {
  const { match } = session;
  return NextResponse.json({
    ok: true,
    match,
    token: signBattleSession(session),
    legal: legalActions(match, 'player'),
    view: battleViewFor(match),
    notice: bossNotice(match),
    outcome: settle(session),
    ...extra,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    let valid = false;
    try { valid = new URL(origin).host === (request.headers.get('host') ?? new URL(request.url).host); } catch { /* malformed origin */ }
    if (!valid) return fail('來源不符。', 403);
  }
  let body: Body;
  try { body = await request.json(); } catch { return fail('資料格式無效。'); }
  if (!body || typeof body !== 'object') return fail('資料格式無效。');

  try {
    if (body.type === 'DEAL') {
      // 開局：洗牌、發牌、易經自動佈陣都在後端。易經用同一套佈陣規則上場——沒有特權、沒有額外格子。
      const ids = playableCards().map((card) => card.id);
      const requested = isTeam(body.playerDeckIds) ? sanitizeDeckSelection(body.playerDeckIds, ids) : [];
      const previous = (body.previousOpening && typeof body.previousOpening === 'object' ? body.previousOpening : {}) as { player?: unknown; opponent?: unknown };
      const rng = createRng(randomInt(2147483647));
      const playerDeck = requested.length === BATTLEFIELD_DECK_SIZE ? requested : buildUniqueDeck(ids, rng);
      // 上一局的起手牌排到牌庫後面，避免連續兩局拿到同一手。
      const playerOrder = buildFreshOpeningDeck(playerDeck, isTeam(previous.player) ? previous.player : [], rng);
      const opponentOrder = buildFreshOpeningDeck(buildUniqueDeck(ids, rng), isTeam(previous.opponent) ? previous.opponent : [], rng);
      const fresh = newBattle(playerOrder, opponentOrder, rng, false);
      const table = autoPlaceOpponent(fresh, rng);
      const tableToken = signTableTicket({ v: 1, kind: 'table', playerCards: table.player.hand.slice(), opponentTeam: fieldTeam(table, 'OPPONENT'), issuedAt: Date.now() });
      return NextResponse.json({
        ok: true, table, deckIds: playerDeck, tableToken,
        opening: { player: fresh.player.hand.slice(), opponent: fresh.opponent.hand.slice() },
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (body.type === 'START') {
      if (!isTeam(body.playerTeam)) return fail('陣容資料無效，請重新佈陣。');
      // 牌桌票：玩家只能用這一桌發到手上的牌；易經陣容一律採用後端排好的，不採信前端。
      const table = openTableTicket(body.tableToken);
      if (!table) return fail('牌桌憑證無效或已過期，請重新發牌；押注卡未扣除。');
      if (body.playerTeam.some((id) => !table.playerCards.includes(id))) return fail('上場的卡必須是這一桌發到手上的牌，請重新佈陣。');
      const stakeCount = Number(body.stakeCount ?? 0);
      if (!Number.isInteger(stakeCount) || stakeCount < 0 || stakeCount > MAX_STAKE_CARDS) return fail(`押注要選 1～${MAX_STAKE_CARDS} 張。`);
      const stakeCardId = typeof body.stakeCardId === 'string' ? body.stakeCardId : null;
      if (stakeCount > 0 && (!stakeCardId || !getCard(stakeCardId))) return fail('押注卡無效，押注卡未扣除。');
      // 正式押注戰＝困難首領；體驗戰（免押卡、新客人）維持簡單。難度由後端決定，不採信前端。
      const match = newMatch(body.playerTeam, table.opponentTeam, randomInt(2147483647), { difficulty: stakeCount > 0 ? 'HARD' : 'EASY' });
      return reply({ v: 1, match, stakeCardId: stakeCount > 0 ? stakeCardId : null, stakeCount, issuedAt: Date.now() });
    }

    if (body.type === 'ACTION' || body.type === 'AUTO') {
      const session = openBattleSession(body.token);
      if (!session) return fail('戰局憑證無效或已過期，押注卡未扣除；請重新開戰。');
      if (session.match.status !== 'PLAYING') return fail('這場戰鬥已結束。');
      // 自動連擊：後端依基礎規則替玩家決定下一招（玩家那一側永遠是基礎規則）。
      const action = body.type === 'AUTO' ? chooseAI(session.match, 'player') : body.action;
      if (!isAction(action)) return fail('出招資料無效。');
      const next = advance(session.match, action);
      return reply({ ...session, match: next }, { action });
    }

    return fail('未知操作。');
  } catch (error) {
    return fail(error instanceof Error ? error.message : '戰場暫時無法運算，押注卡未扣除。');
  }
}
