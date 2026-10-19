import BeastTurnGame from '@/components/BeastTurnGame';
// 2026-10-17 beast card：從星宿神獸頁點「簡單」會帶 ?mode=easy，伺服器就決定直接進選卡，不會先閃一下三選一。
export default async function BeastGamePage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  const { mode } = await searchParams;
  return <BeastTurnGame initialStep={mode === 'easy' ? 'select' : 'mode'} />;
}
