// 第 24 章（柳土獐）design-preview 版生成：完全比照第 23 章（鬼金羊）design-preview-v5 的
// 概念與素材——同一套玉綠金雕花框（紅藍寶石鑲嵌）、同一個夏季金黃荷花園棲地、
// 同樣「字即武器」邏輯（土＝大地琥珀紋理、獐＝真實獐形、嘴＝發光焦點）。
// 用法：node scripts/generate-star-beast-24-preview.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) throw new Error('未在 .env.local 找到 GEMINI_API_KEY');

const prompt = [
  // 神獸本體：獐（真實動物形體，神格化）＋ 土（大地元素材質）＋ 嘴（本宮部位發光焦點）
  'A majestic divine river deer (柳土獐 of the Twenty-Eight Mansions, symbolizing 朱雀之嘴 — the beak of the Vermilion Bird, gentle yet watchful), a slender antler-less deer with soft tan fur and two small downward tusks at its mouth, standing gracefully on a wooden plank walkway over a lotus pond. It must read unmistakably as a real river deer — true deer anatomy, proportions and silhouette — rendered divine, noble and serene like a storybook guardian spirit.',
  // 字的意境即武器：土 → 大地琥珀／金砂紋理，聚焦於嘴
  'Its name is literally its power: the earth element (土) manifests as warm amber, golden-clay filigree patterns swirling through its fur like gilded earth veins, and its small tusked mouth and jaw softly radiate a warm golden earth-light — the mouth is the clear glowing focal point, echoed by tiny motes of golden dust drifting from its breath.',
  // 棲地：與第 23 章完全相同的夏季黃金荷花園
  'The scene matches its sibling cards exactly: a golden-hour summer lotus garden — glowing warm orange sky with a soft sun, red and orange lotus blossoms and broad lotus leaves in the water, tall bamboo on the left, hanging flowering branches above, and a distant golden pavilion with an arched bridge glowing in the haze.',
  // 外框：與第 23 章 design-preview-v5 相同規格
  'The whole image is a tall portrait fantasy trading-card illustration with an ornate card frame identical in style to its sibling cards: a thick border of polished deep jade-green gemstone inlaid with elaborate flowing gold filigree scrollwork, decorated with small ruby-red and sapphire-blue gemstones set symmetrically along the frame, with rich gold corner ornaments. A circular polished dark-jade medallion engraved with a fine golden star-constellation map — only constellation lines and star dots, no letters, no text — is centered at the very top edge, and an identical jade star-map medallion is centered at the very bottom edge.',
  'Warm storybook painterly style, ultra-detailed, rich glowing color depth, no text, no watermark, no letters anywhere in the image.',
].join(' ');

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: prompt,
  config: {
    responseModalities: ['IMAGE'],
    imageConfig: { imageSize: '4K', aspectRatio: '2:3' },
  },
});

const parts = response.candidates?.[0]?.content?.parts ?? [];
const imagePart = parts.find((part) => part.inlineData);
if (!imagePart?.inlineData?.data) {
  console.error(JSON.stringify(response, null, 2));
  throw new Error('沒有取得圖片資料');
}

const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
const outPath = path.join(ROOT, 'public', 'star-beasts', 'summer', '24-liu-tu-zhang-adult-design-preview-v5.png');
fs.writeFileSync(outPath, buffer);
console.log(`已儲存：${path.relative(ROOT, outPath)}（${(buffer.length / 1024).toFixed(0)} KB）`);
