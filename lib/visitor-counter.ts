import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
  種子數也歸零。

  這是另一個底數：新功能一上線就從一百零一萬起跳。
  上面那個 MIN_DISPLAY 是地板，這個是起跑點——兩個都是憑空的。
  真實計數從 0 開始，這才是它本來的樣子。
*/
export const VISITOR_SEED_COUNT = 0;
/*
  底數歸零。

  這個常數原本是 1,011,500——不管實際有幾個人，畫面至少顯示這個數。
  於是 number／iching／karma 三個功能顯示「1,271,2xx 人」，
  而真實訪客是 0。認同數同理：顯示 630,674，真實 46。

  專案鐵律第一條是禁止作假。虛增的社會證明是對客戶說謊，
  不因為「別人都這樣做」而變成可以。歸零之後數字會很難看，
  但難看的真話勝過好看的假話。
*/
export const VISITOR_MIN_DISPLAY_COUNT = 0;

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
