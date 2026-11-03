/** Display-only protocol. Birth data is recomputed on the server for every request. */
export type AsuraConversationTopic = 'past' | 'present' | 'future';
export type AsuraConversationIntent = 'summary' | 'why' | 'action';
export interface AsuraConversationResponse {
  status: 'READY' | 'UNAVAILABLE';
  topic: AsuraConversationTopic;
  intent: AsuraConversationIntent;
  step: { number: 1 | 2 | 3; total: 3; label: '結論' | '依據' | '行動'; complete: boolean };
  answer: string;
  /** Same-result cards referenced by this section; names and text are display-only. */
  basis?: Array<{ name: string; columnLabel: string; text: string }>;
  options: Array<{ id: string; label: string }>;
  scopeNote: string;
}
