export type QuestStage = 'intro' | 'checkin' | 'area' | 'tension' | 'action' | 'reward';
export type QuestAreaId = 'self' | 'work' | 'relationship';
export type ActionMode = 'ready' | 'check' | 'smaller';
export type QuestContext = {
  date: string;
  areaId: QuestAreaId;
  pathId: string;
  smaller: boolean;
  outcome: 'done' | 'started' | 'unknown';
};
export type SavedQuestState = {
  date: string;
  stage: QuestStage;
  areaId: QuestAreaId | null;
  pathId: string | null;
  completed: boolean; // Reward earned, not proof that the action was completed.
  actionMode?: ActionMode;
  smaller?: boolean;
  outcome?: QuestContext['outcome'];
  returnContext?: QuestContext | null;
};
type Areas = readonly { id: string; paths: readonly { id: string }[] }[];
export function localDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d, 12)) === value;
}
export function previousQuestLabel(date: string, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return date === localDateKey(yesterday) ? '昨天' : '上次';
}
export function readQuestState(value: unknown, areas: Areas, now = new Date()): SavedQuestState | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as SavedQuestState;
  if (!validDate(s.date) || s.date > localDateKey(now) || typeof s.completed !== 'boolean') return null;
  if (!['intro', 'checkin', 'area', 'tension', 'action', 'reward'].includes(s.stage)) return null;
  if (s.actionMode !== undefined && !['ready', 'check', 'smaller'].includes(s.actionMode)) return null;
  if (s.smaller !== undefined && typeof s.smaller !== 'boolean') return null;
  if (s.outcome !== undefined && !['done', 'started', 'unknown'].includes(s.outcome)) return null;
  const area = areas.find(a => a.id === s.areaId);
  const hasPath = Boolean(area?.paths.some(p => p.id === s.pathId));
  const empty = s.areaId === null && s.pathId === null;
  if (['intro', 'area'].includes(s.stage) && !empty) return null;
  if (s.stage === 'tension' && (!area || s.pathId !== null)) return null;
  if (['action', 'reward'].includes(s.stage) && !hasPath) return null;
  if (s.stage === 'checkin' && !empty && !hasPath) return null;
  let context: QuestContext | null = null;
  const c = s.returnContext;
  if (c && validDate(c.date) && c.date <= localDateKey(now)
    && areas.some(a => a.id === c.areaId && a.paths.some(p => p.id === c.pathId))
    && typeof c.smaller === 'boolean' && ['done', 'started', 'unknown'].includes(c.outcome)) context = c;
  return { ...s, smaller: s.smaller ?? s.actionMode === 'smaller', outcome: s.outcome ?? 'unknown', returnContext: context };
}
export function restoreQuestState(value: unknown, areas: Areas, now = new Date()): SavedQuestState | null {
  const s = readQuestState(value, areas, now);
  if (!s) return null;
  if (s.date === localDateKey(now)) return s;
  const context = s.returnContext ?? (s.areaId && s.pathId ? {
    date: s.date, areaId: s.areaId, pathId: s.pathId,
    smaller: Boolean(s.smaller), outcome: s.outcome ?? 'unknown',
  } : null);
  return {
    ...s, date: localDateKey(now), returnContext: context,
    // A previous award must not turn a newer unfinished action into a completion.
    completed: false,
    stage: s.stage === 'checkin' || (s.stage === 'reward' && s.completed) ? 'checkin' : s.stage === 'reward' ? 'action' : s.stage,
  };
}
