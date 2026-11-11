/** 內部預覽：餵食／合體鏈 P0 視覺元件（動效助手）。正式環境一律 404；只用假資料，不讀存檔。 */
import { notFound } from 'next/navigation';
import Preview from './preview';

export const metadata = { title: '內部預覽・合體鏈視覺 P0', robots: { index: false } };

export default function FusionChainVisualPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Preview />;
}
