/** Shorten the existing engine log for the live view; never calculate a result. */
export function combatFeedback(text: string): string {
  return text.replace(/^.*?：/, '').replace(/攻\d+ × 元素[\d.]+ − 防[\d.]+ × [\d.]+ = (\d+)(?:（低於底值 \d+，取底值）)?/g, '傷害 $1');
}
