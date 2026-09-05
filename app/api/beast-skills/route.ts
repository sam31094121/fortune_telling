import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * GET /api/beast-skills?poolId=beast_a01
 * 讀 public/skill-battle-archive（《技能戰鬥檔案》）/cards/{poolId}/skills.json
 * 無 poolId 時回總表 技能戰鬥檔案.json
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get('poolId');
  const root = path.join(process.cwd(), 'public', 'skill-battle-archive');

  try {
    const file = poolId
      ? path.join(root, 'cards', poolId, 'skills.json')
      : path.join(root, 'index.json');
    const raw = await readFile(file, 'utf8');
    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: poolId ? `skills not found for ${poolId}` : 'skill archive missing' },
      { status: 404 },
    );
  }
}
