'use client';
/**
 * 出戰副本選擇：只用圖案與數字，不放說明文字（說明請客戶自己點「說明」看）。
 * ★＝免費試用牌；◆＝沒有強化的收藏；「+N」＝已合體的永久加成（數字由後端共同卡庫提供，這裡只照印）。
 * 金框＝這一場用的那一張。同一種只有一個選項時不顯示，預設由上層自動選最強的一張。
 */
export interface CopyOption { id: string; bonus: string }
export interface CopyRow { cardId: string; name: string; thumbnail: string; trial: boolean; copies: CopyOption[]; value: string }

const gold = '#fde68a';
const chipStyle = (on: boolean): React.CSSProperties => ({
  minWidth: 52, minHeight: 52, padding: '0 10px', borderRadius: 999, fontSize: 20, fontWeight: 800, lineHeight: 1,
  color: on ? '#111827' : gold, background: on ? gold : 'rgba(15,23,42,0.9)',
  border: on ? `3px solid #fff7ed` : `2px solid rgba(253,230,138,0.55)`, boxShadow: on ? '0 0 12px rgba(253,230,138,0.8)' : 'none',
});

export default function OwnedCopyPicker({ rows, onPick }: { rows: CopyRow[]; onPick: (cardId: string, copyId: string) => void }) {
  const shown = rows.filter(row => row.copies.length + (row.trial ? 1 : 0) > 1);
  if (!shown.length) return null;
  return <section aria-label="出戰副本" data-testid="copy-picker" style={{ display: 'grid', gap: 10, margin: '12px 0' }}>
    {shown.map(row => <div key={row.cardId} role="radiogroup" aria-label={`${row.name}出戰副本`} data-orb-owned-copy={row.cardId}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.thumbnail} alt="" width={44} height={44} style={{ objectFit: 'cover', borderRadius: 10, border: `2px solid ${gold}` }} />
      {row.trial && <button type="button" role="radio" aria-checked={row.value === ''} aria-label="試用" data-copy-id="" style={chipStyle(row.value === '')} onClick={() => onPick(row.cardId, '')}>★</button>}
      {row.copies.map((copy, index) => {
        const on = row.value === copy.id; let fused = false; try { fused = BigInt(copy.bonus) > 0n; } catch { /* 不合法就當沒強化 */ }
        return <button key={copy.id} type="button" role="radio" aria-checked={on} aria-label={`第 ${index + 1} 張`} data-copy-id={copy.id}
          style={chipStyle(on)} onClick={() => onPick(row.cardId, copy.id)}>{fused ? `+${copy.bonus}` : '◆'}</button>;
      })}
    </div>)}
  </section>;
}
