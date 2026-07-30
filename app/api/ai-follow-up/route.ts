import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/api-stability';
import { buildGrowthCenter, parseGrowthModules, type GrowthElement } from '@/lib/growth-center-engine';
import type { AiFollowUpAnswer } from '@/lib/ai-follow-up-system';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ELEMENTS = new Set(['EARTH', 'WATER', 'FIRE', 'WIND', 'SPACE']);
const ANSWERS = new Set(['continued', 'paused']);

function parseElement(value: string | null): GrowthElement | null {
  const normalized = value?.toUpperCase() ?? '';
  return ELEMENTS.has(normalized) ? normalized as GrowthElement : null;
}

function parseAnswer(value: string | null): AiFollowUpAnswer | null {
  return ANSWERS.has(value ?? '') ? value as AiFollowUpAnswer : null;
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
  const answer = parseAnswer(url.searchParams.get('answer'));

  const result = buildGrowthCenter({
    userId,
    anonymousProfileId,
    completedModules,
    primaryElement,
    secondaryElement,
    avoidElement,
    analysisHash,
  });
  const followUp = result.data.followUp;
  const selectedReply = answer === 'continued'
    ? followUp.replyWhenContinued
    : answer === 'paused'
      ? followUp.replyWhenPaused
      : null;

  return NextResponse.json(
    {
      success: true,
      requestId,
      data: {
        followUp,
        answer,
        selectedReply,
        sourcePolicy: followUp.sourcePolicy,
        boundary: followUp.boundary,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
