/**
 * 紫微話術的「權威依據」查表（後端運算，前端不得匯入）
 * ============================================================================
 * 目的：只要紫微斗數有權威依據，就能放心拿來當話術——但引用多大，取決於依據多大。
 * 依據來源：data/ziwei/quanshu-coverage.json（《紫微斗數全書》逐條對照，2026-10-12）。
 *
 * 沒有國家級認證機構，所以「公權力」在這裡指的是：古籍口訣＋獨立計算逐盤核對。
 * 禁止宣稱國家認證、禁止宣稱科學已證實；古籍查無口訣者不得說出自古籍。
 * ============================================================================
 */

import coverage from '../../data/ziwei/quanshu-coverage.json';

export type StarAuthority = 'QUANSHU_VERSE' | 'QUANSHU_NOTE' | 'NO_VERSE' | 'UNKNOWN';

const VERIFIED = new Set<string>(coverage.verified);
const VERIFIED_NOTE = new Set<string>(Object.keys(coverage.verifiedWithNote));
const NO_VERSE = new Set<string>(coverage.noQuanshuVerse);

export function authorityOf(starName: string): StarAuthority {
  if (VERIFIED.has(starName)) return 'QUANSHU_VERSE';
  if (VERIFIED_NOTE.has(starName)) return 'QUANSHU_NOTE';
  if (NO_VERSE.has(starName)) return 'NO_VERSE';
  return 'UNKNOWN';
}

/** 每一級依據「可以怎麼說」——話術引用的上限。 */
export const AUTHORITY_PHRASE: Record<StarAuthority, string> = {
  QUANSHU_VERSE: '可說「這顆星的位置依《紫微斗數全書》安星口訣，已用獨立計算核對一致」',
  QUANSHU_NOTE: '可說「位置與《紫微斗數全書》一致，細部分法採通行讀法」',
  NO_VERSE: '只能說「通行排盤體系的讀法」，古籍查無安星口訣，不得說出自古籍',
  UNKNOWN: '不得引用任何出處，只能描述盤面',
};

const LABEL: Record<StarAuthority, string> = {
  QUANSHU_VERSE: '古籍口訣',
  QUANSHU_NOTE: '古籍＋通行讀法',
  NO_VERSE: '古籍無口訣',
  UNKNOWN: '無登記',
};

interface PalaceStars {
  palaceName: string;
  majorStars: { name: string }[];
  supportingStars: { name: string }[];
  maleficStars: { name: string }[];
}

/** 產生給三位老師的「引用依據表」：每顆星標上古籍等級與可說的話。 */
export function renderAuthorityBlock(palaces: PalaceStars[]): string {
  const seen = new Map<string, StarAuthority>();
  for (const p of palaces) {
    for (const s of [...p.majorStars, ...p.supportingStars, ...p.maleficStars]) {
      if (!seen.has(s.name)) seen.set(s.name, authorityOf(s.name));
    }
  }
  const rows = [...seen.entries()].map(([name, level]) => `${name}【${LABEL[level]}】`).join('、') || '（無）';
  const rules = (Object.keys(AUTHORITY_PHRASE) as StarAuthority[])
    .filter((l) => [...seen.values()].includes(l))
    .map((l) => `${LABEL[l]}：${AUTHORITY_PHRASE[l]}`)
    .join('\n');
  return `【引用依據表（後端依《紫微斗數全書》逐條核對）】\n${rows}\n${rules}\n共通：沒有國家級認證機構，不得說「國家認證」；不得說「科學已證實」；有依據的星曜可以用依據增加可信度，但依據只證明「位置排得對」，不證明「預測準」。`;
}
