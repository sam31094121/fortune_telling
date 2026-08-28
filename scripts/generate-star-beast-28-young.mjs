// 28 軫水蚓・幼子神獸卡優化（一次性腳本）
// 用法：node scripts/generate-star-beast-28-young.mjs <output-suffix>
// 參考成獸 v8（頭部置中、無肢環節蟲身、神性光環）作為血緣一致的風格依據，
// 套進既有「幼子神獸卡」的翡翠新藝術框架語言（比照 26-zhang-yue-lu-young-divine.png）。

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

async function main() {
  const suffix = process.argv[2];
  if (!suffix) {
    console.error('用法：node scripts/generate-star-beast-28-young.mjs <output-suffix>');
    process.exit(1);
  }

  const referencePath = path.join(ROOT, 'public', 'star-beasts', 'summer', '28-zhen-shui-yin-adult-standard-v12-ratio-fixed.jpg');
  const referenceBuffer = fs.readFileSync(referencePath);

  const prompt = `Using the attached reference image only for its divine visual language (the glowing translucent segmented rings, the inner celestial-fire glow, the soft radiant halo, the small backswept horn-like ridges, its true limbless segmented-worm anatomy with no scales anywhere) and for family bloodline resemblance (same species identity, same glow color palette of warm inner fire fading into cool teal), create a completely different illustration: the young divine cub (幼獸) version of this same earthworm spirit (軫水蚓).

This must unmistakably read as a small baby/cub, clearly still growing up — NOT a miniature adult, not a young-adult-sized snake, and not simply a smaller copy of the fully-grown reference. Its total body length is short and stubby, only a few times its own head-width long, plump and grub-like rather than long and serpentine; if a human stood next to it, it would only reach about knee height. It has proportionally oversized head and eyes relative to its short thick body, like real baby animals do, with tiny soft nub versions of the adult's backswept horn ridges just barely forming. At the same time it must not read as soft, harmless, or purely-cute: this particular cub is already the future overlord of its own kind, and that inborn dominance must show through in its face even at this small size — narrowed, intense, faintly glowing eyes with real weight behind the gaze, a firm closed or faintly poised mouth (not a cute grin), head held high and slightly lowered forward like it is already sizing up whatever it looks at, small chin lifted with unearned confidence. Its whole small body forms ONE single, clean, continuous flowing curve that a viewer's eye can trace at a glance without confusion — never crossing over, looping through, or tangling with itself — and its head and raised front section tilt a few gentle degrees off vertical toward the right side of the frame, echoing the adult's dynamic asymmetry at cub scale. It still takes up a modest, clearly-child-sized portion of the frame — leave visibly more open background around it than around the towering adult. Keep the same true anatomy as the reference: a limbless segmented worm body, no scales, no legs — only glowing rings and drifting motes of light echoing the adult's fire-to-teal glow, noticeably brighter and more intense than a typical soft baby-creature glow, hinting at the power it will grow into. No crown, no headwear, no jewelry of any kind.

The card's frame, border ornament style and background setting must match the adult reference image exactly, not the generic cross-season young-divine template: the same thick ornate card border of even width in deep vermilion-red and gold, inlaid with flowing gold filigree scrollwork, matching gold-scrollwork corner ornaments each set with one small diamond-cut gemstone, one small diamond-shaped gemstone centered on the left and right edges, and a circular star-constellation medallion (fine gold star-map, no letters, no text) centered at the very top and bottom edges — identical frame language to the adult card, just scaled to this card. The scene is the same warm summer lotus pond with pink lotus flowers, palm trees, distant vermilion-roofed pavilions and white cranes wading in the water, golden-hour sunlight, that appears in the adult reference. The cub rests low on a moss-covered rock at the water's edge, its tail dipping into the pond, centered in the lower-middle of the frame with its head positioned slightly above the vertical center of the image — around 40% of the way down from the top edge, not the exact midpoint — and clear open sky visible above it. Painterly, ultra-detailed digital fantasy illustration, cinematic lighting, extremely high resolution 4K quality, no text, no watermark, no letters anywhere in the image.`;

  // 參考圖檔名雖是 .png，實際位元組可能是先前腳本誤存的 JPEG；用檔頭魔數判斷真實格式，
  // 避免 mimeType 宣告跟實際內容不符。
  const referenceMimeType = referenceBuffer.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'image/jpeg' : 'image/png';

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: referenceMimeType, data: referenceBuffer.toString('base64') } },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
      // 9:16 鎖定卡片標準直式比例，跟其餘 27 張卡片同一套模具。
      imageConfig: { imageSize: '4K', aspectRatio: '9:16' },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData);
  if (!imagePart?.inlineData?.data) {
    console.error(JSON.stringify(response, null, 2));
    throw new Error('沒有取得圖片資料');
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const outDir = path.join(ROOT, 'public', 'star-beasts', 'summer');
  const outName = `28-zhen-shui-yin-young-divine-${suffix}.${ext}`;
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, buffer);
  console.log(`已儲存：${path.relative(ROOT, outPath)}（${(buffer.length / 1024).toFixed(0)} KB）`);
}

main().catch((error) => {
  console.error('生成失敗：', error);
  process.exit(1);
});
