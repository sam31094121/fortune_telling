export type ExperienceCuratedContent = {
  primary: string;
  items: string[];
  removedCount: number;
};

function normalizeSemanticText(value: string) {
  return value
    .trim()
    .replace(/[，。！？、；：\s]+/g, '')
    .replace(/行動力|執行速度|完成能力|推進能力/g, '執行能力')
    .replace(/拖延|停滯|速度慢/g, '節奏不穩')
    .replace(/風險訊號|警戒訊號|阻力/g, '風險');
}

export function curateExperienceContent(input: string[], maxItems = 3): ExperienceCuratedContent {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const raw of input) {
    const item = raw.trim();
    if (!item) continue;
    const key = normalizeSemanticText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= maxItems) break;
  }

  return {
    primary: items[0] || '目前先完成第一個可驗證行動。',
    items,
    removedCount: Math.max(0, input.filter(Boolean).length - items.length),
  };
}