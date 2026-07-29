import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/api-stability';
import { buildGrowthCenter, parseGrowthModules, type GrowthElement } from '@/lib/growth-center-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ELEMENTS = new Set(['EARTH', 'WATER', 'FIRE', 'WIND', 'SPACE']);

function parseElement(value: string | null): GrowthElement | null {
  const normalized = value?.toUpperCase() ?? '';
  return ELEMENTS.has(normalized) ? normalized as GrowthElement : null;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const completedModules = parseGrowthModules(url.searchParams.get('completedModules'));
  const anonymousProfileId = url.searchParams.get('anonymousProfileId') || request.headers.get('x-anonymous-profile-id');
  const userId = url.searchParams.get('userId') || request.headers.get('x-user-id');
  const analysisHash = url.searchParams.get('analysisHash');
  const primaryElement = parseElement(url.searchParams.get('primaryElement'));
  const secondaryElement = parseElement(url.searchParams.get('secondaryElement'));
  const avoidElement = parseElement(url.searchParams.get('avoidElement'));

  const result = buildGrowthCenter({
    userId,
    anonymousProfileId,
    completedModules,
    primaryElement,
    secondaryElement,
    avoidElement,
    analysisHash,
  });

  return NextResponse.json(
    { ...result, requestId },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
