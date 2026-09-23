import type { Metadata } from 'next';
import { InjectBattleBoard } from './InjectBattleBoard';

export const metadata: Metadata = {
  title: '注入變身・測試戰場',
};

export default function CardBattleV1Page() {
  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <InjectBattleBoard />
    </main>
  );
}
