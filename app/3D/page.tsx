import type { Metadata } from 'next';
import ModelLabMount from '@/components/model-lab/ModelLabMount';

export const metadata: Metadata = {
  title: '立體太極模型工作室',
  description: '立體太極模型工作室：獨立 3D 工作區，逐幀對位影片、拆解建模、逐層對照。',
  robots: { index: false, follow: false },
};

export default function ModelLabPage() {
  return <ModelLabMount />;
}
