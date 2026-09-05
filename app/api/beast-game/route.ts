import { NextResponse } from 'next/server';
import { playableCards } from '@/lib/beast-game/registry';
import { evaluateBalance } from '@/lib/beast-game/balance';
import { getSkill } from '@/cards/skills';
import { GAME_CORE_VERSION } from '@/lib/beast-game/schema';
import {
  DECK_SIZE,
  LINEUP_SLOTS,
  MAX_LINEUP_COST,
  STARTING_LIFE,
  buildDeck,
  buildLineup,
  createDuel,
  createRng,
  playToEnd,
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
  let body: { lineup?: Array<string | null>; seed?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: '請傳入有效的 JSON。' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: '請選擇三張出戰卡。' }, { status: 400 });
  }
  const lineup = Array.isArray(body.lineup) ? body.lineup : [];
  const verdict = validateLineup(lineup);
  if (!verdict.ready) {
    // 三席沒放滿就不開戰，而且要講得出理由——不是把按鈕變灰就算了。
    return NextResponse.json({ ok: false, error: verdict.reason }, { status: 400 });
  }

  const chosen = lineup.filter((id): id is string => Boolean(id));
  const seed = Number.isFinite(body.seed) ? Number(body.seed) : Date.now() % 100000;
  const ids = playableCards().map((card) => card.id);
  const rng = createRng(seed);

  const state = playToEnd(createDuel({
    player: { lineup: chosen, deck: buildDeck(ids, rng) },
    // 對手的三席也從卡池抽，同一顆種子可重現。
    opponent: {
      lineup: buildLineup(ids, rng),
      deck: buildDeck(ids, rng),
    },
    seed,
  }));

  return NextResponse.json({
    ok: true,
    seed,
    winner: state.winner,
    turns: state.turn,
    life: { player: state.players.PLAYER.life, opponent: state.players.OPPONENT.life },
    timeline: state.timeline,
    log: state.log,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
