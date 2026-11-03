import 'server-only';
import { calculateDualChart } from '@/lib/dual-chart';
import { computeGhostAsuraDisplay, normalizeAsuraInput } from './ghost-asura-display';
import { buildAsuraThreeCoreVoice } from './asura-three-core-voice';
import type { AsuraThreeCoreVoice } from './asura-three-core-voice';
import type { AsuraDisplay, AsuraDisplaySection } from '@/lib/ghost-asura-display-contract';
import type { AsuraConversationIntent, AsuraConversationResponse, AsuraConversationTopic } from '@/lib/ghost-asura-conversation-contract';

const sectionKeys = { past: 'hits', present: 'pillars', future: 'verdict' } as const;
const topics = { past: '看過去', present: '看現在', future: '看未來' } as const;
const nonempty = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim() !== ''))];

/** Stable reference identity only: neither matching names nor current-age hints establish a basis. */
export function conversationBasis(display: AsuraDisplay, section?: AsuraDisplaySection): NonNullable<AsuraConversationResponse['basis']> {
  const seen = new Set<string>();
  return (section?.guidance?.related ?? []).flatMap((ref) => {
    const identity = `${ref.columnKey}|${ref.id}`;
    if (seen.has(identity)) return [];
    const column = display.columns.find((item) => item.key === ref.columnKey);
    const seal = column?.seals.find((item) => item.id === ref.id);
    const entry = section?.items.find((item) => item.id === ref.id);
    if (!column || !seal || !entry) return [];
    const text = nonempty([entry.plain || entry.text || seal.meaning || seal.declaration]).join('\n');
    if (!text) return [];
    seen.add(identity);
    return [{ name: seal.name, columnLabel: column.heading, text }];
  });
}

/** Compose the bounded guide from server output, never from a client-supplied display. */
export function conversationFromDisplay(display: AsuraDisplay, topic: AsuraConversationTopic, intent: AsuraConversationIntent, voice: AsuraThreeCoreVoice | null): AsuraConversationResponse {
  const step: AsuraConversationResponse['step'] = intent === 'summary'
    ? { number: 1, total: 3, label: '結論', complete: false }
    : intent === 'why' ? { number: 2, total: 3, label: '依據', complete: false }
      : { number: 3, total: 3, label: '行動', complete: true };
  const scopeNote = nonempty([display.scopeNote, display.alert]).join('\n');
  const unavailable = (answer: string): AsuraConversationResponse => ({ status: 'UNAVAILABLE', topic, intent, step, answer, options: [], scopeNote });
  if (display.ageGate?.status === 'WITHHELD') return unavailable(display.ageGate.message || '目前無法提供這段解說。');
  if (!display.audit.listing.ok || display.hourAssumed) return unavailable('目前資料核對未完成，暫時無法取得。');
  const section = display.sections.find((item) => item.key === sectionKeys[topic]);
  const basis = conversationBasis(display, section);
  const action = nonempty([voice?.lines.find((line) => line.label === '斷語')?.text])[0];
  const options = [
    ...(intent === 'summary' ? [{ id: 'intent:why', label: '看依據' }] : []),
    ...(intent === 'why' && action ? [{ id: 'intent:action', label: '看行動提醒' }] : []),
    ...Object.entries(topics).filter(([key]) => key !== topic && display.sections.some((item) => item.key === sectionKeys[key as AsuraConversationTopic] && Boolean(item.narrative || item.blocks?.length || item.lead))).map(([key, label]) => ({ id: `topic:${key}`, label })),
  ];
  let pieces: string[] = [];
  if (intent === 'action') pieces = nonempty([action]);
  else if (section && intent === 'summary') {
    pieces = nonempty([section.narrative]);
    if (!pieces.length) pieces = nonempty((section.blocks ?? []).map((block) => block.text));
    if (!pieces.length) pieces = nonempty([section.lead]);
  } else if (intent === 'why') pieces = basis.map((item) => `${item.columnLabel}・${item.name}\n${item.text}`);
  return {
    status: pieces.length ? 'READY' : 'UNAVAILABLE', topic, intent, step,
    answer: pieces.length ? pieces.join('\n\n') : intent === 'why' ? '這段解說目前沒有可對應的印記依據，不補作判斷。' : '這份解說目前沒有對應內容。', options,
    ...(intent === 'why' ? { basis } : {}),
    scopeNote: nonempty([
      scopeNote,
      intent === 'why' ? '這裡列出本段實際引用的印記，來源核定範圍仍以原解說為準。' : null,
      intent === 'action' && voice ? `這是同一份解說的整體行動提醒，不是特定時段的行動判斷。${voice.note}` : null,
    ]).join('\n'),
  };
}

/** Only select existing backend text; no new interpretation or persistent personal memory. */
export function buildAsuraConversation(raw: unknown, topic: AsuraConversationTopic, intent: AsuraConversationIntent, now = new Date()): AsuraConversationResponse {
  const input = normalizeAsuraInput(raw);
  if (input.hourAssumed === true) throw new Error('請補上出生時辰，再開始對話。');
  const display = computeGhostAsuraDisplay(raw, now);
  if (display.ageGate?.status === 'WITHHELD' || !display.audit.listing.ok || display.hourAssumed) return conversationFromDisplay(display, topic, intent, null);
  const { hourAssumed: _assumed, identityTarget: _identity, targetDate: _targetDate, ...engineInput } = input;
  const voice = buildAsuraThreeCoreVoice(calculateDualChart(engineInput), display, { hourAssumed: false });
  return conversationFromDisplay(display, topic, intent, voice);
}
