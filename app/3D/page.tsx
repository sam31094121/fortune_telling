import type { Metadata } from 'next';
import ModelLabMount from '@/components/model-lab/ModelLabMount';

export const metadata: Metadata = {
  title: '3D 模型工作室',
  description: '獨立 3D 建模工作區：參考影片逐幀對位、模型檢視與輸出。',
  robots: { index: false, follow: false },
};

export default function ModelLabPage() {
  return <ModelLabMount />;
}
