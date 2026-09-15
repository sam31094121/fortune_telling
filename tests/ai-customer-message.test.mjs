#!/usr/bin/env node
/**
 * 守門：AI 供應商原文（英文、額度、金鑰、網址）不得出現在客戶畫面。
 * 見 lib/ai-error-message.ts。
 */
import assert from 'node:assert/strict';
import { AI_BUSY_MESSAGE, customerSafeAiMessage } from '../lib/ai-error-message.ts';

let pass = 0;
const check = (title, fn) => { fn(); pass += 1; console.log(`PASS ${title}`); };

check('月度花費上限 429 原文換成中文', () => {
  const raw = new Error('{"error":{"code":429,"message":"Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend","status":"RESOURCE_EXHAUSTED"}}');
  assert.equal(customerSafeAiMessage(raw), AI_BUSY_MESSAGE);
});
check('金鑰錯誤不外洩', () => {
  assert.equal(customerSafeAiMessage(new Error('API key not valid. Please pass a valid API key.'), '稍後再試'), '稍後再試');
});
check('網路失敗英文換成中文', () => {
  assert.equal(customerSafeAiMessage(new Error('fetch failed')), AI_BUSY_MESSAGE);
});
check('非 Error 物件給預設中文', () => {
  assert.equal(customerSafeAiMessage('boom'), AI_BUSY_MESSAGE);
});
check('自己寫的中文訊息保留', () => {
  assert.equal(customerSafeAiMessage(new Error('易經老師解盤逾時，請稍後再試。')), '易經老師解盤逾時，請稍後再試。');
});
check('回給客戶的訊息一定是中文為主', () => {
  for (const raw of ['Internal error', 'Model overloaded, try later', 'Unexpected token < in JSON']) {
    const out = customerSafeAiMessage(new Error(raw));
    assert.ok((out.match(/[㐀-鿿]/g) ?? []).length >= out.length * 0.3, out);
  }
});

console.log(`PASS ${pass} / FAIL 0`);
console.log('AI_CUSTOMER_MESSAGE_CERTIFIED=true');
