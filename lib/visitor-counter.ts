import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const VISITOR_SEED_COUNT = 1_010_128;

export const FEATURE_KEYS = {
  home: 'home',
  personality: 'personality',
  matching: 'matching',
  number: 'number',
  music: 'music',
  iching: 'iching',
  karma: 'karma',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const featureKeySet = new Set<string>(Object.values(FEATURE_KEYS));

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === 'string' && featureKeySet.has(value);
}

let visitorSupabaseClient: SupabaseClient | null | undefined;

export function getVisitorSupabaseClient(): SupabaseClient | null {
  if (visitorSupabaseClient !== undefined) return visitorSupabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    visitorSupabaseClient = null;
    return visitorSupabaseClient;
  }

  visitorSupabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return visitorSupabaseClient;
}
