// 本命神獸 4K 卡面生成腳本（測試版）
// 用法：node scripts/generate-star-beast.mjs <beast-id> <output-suffix>
// 例如：node scripts/generate-star-beast.mjs 1 v12-test
//
// 標準參考：public/star-beasts/spring/02-kang-jin-long-adult-standard-v1-google-candidate.png（亢金龍）
// 不會覆蓋現有檔案，一律存成新檔名，方便肉眼比對後再決定要不要正式取代。

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

// 七曜元素 → 「字的意境即武器」視覺語言
// 每個元素都必須「發光」——名字裡的七曜字就是這隻獸的武器，微光是牠身分的簽名，
// 必須是全圖第一眼抓住視線的焦點，不能是隱約的背景細節。
const ELEMENT_STYLE = {
  金: 'gilded metallic armor plating fused into the scales, sharp mirror-polished golden claws and horns that catch and refract light into small brilliant glints with every curve, a warm gold luminance glowing from within the metal seams like the metal itself is lit from inside — this golden glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  木: 'living wood-grain textured scales veined like bark, tendrils of new vine and unfurling leaves growing along the spine and mane; bright bioluminescent sap-light glows along the veins inside the bark and leaves like soft living green embers burning through the wood grain, brightest and most vivid at every joint and growth point — this inner glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  水: 'flowing translucent teal-blue scales with a wet sheen like moving water; a soft luminous glow pulses within the water itself, like captured moonlight rippling under the surface, bright phosphorescent sparkle trailing wherever the water moves or drips — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  火: 'ember-red and burnt-orange scales, flame-shaped fins and mane that flicker at the tips; the cracks between the scales glow brilliant molten orange-white like a heartbeat, radiating brightest from the chest core outward — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  土: 'earthen stone-textured hide like weathered rock and clay, moss growing along the ridges; veins of glowing mineral crystal run through the hide like softly lit ore seams, clusters of crystal glowing warm amber-white at the joints and horns — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  日: 'radiant solar-gold aura with a blazing sun-bright halo behind the head, sun-disc motifs etched into the brow and chest plates glowing like captured sunlight — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
  月: 'pale silver-blue moonlit sheen across the scales, a crescent-shaped marking on the brow that glows with a cool bright lunar light, faint starlight sparkle drifting off the mane — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
};

// 四季／四象 棲息地
const SEASON_HABITAT = {
  spring: 'a misty bamboo grove beside a rushing mountain stream and waterfall, cherry blossom branches drifting into frame, soft morning light through fog, lush jade-green valley cliffs in the background — the domain of the Eastern Azure Dragon (東方蒼龍)',
  summer: 'a sunlit tropical wetland with blooming red lotus and vivid green foliage, distant vermillion pavilion rooftops through shimmering heat haze, bright noon light on still water, crimson-crowned cranes wading in the shallows — the domain of the Southern Vermilion Bird (南方朱雀)',
  autumn: 'rugged western cliffs and canyon ridgelines under a low golden-hour sun, dry maple and ginkgo leaves swirling in the wind, pale desert-toned rock formations and drifting dust haze — the domain of the Western White Tiger (西方白虎)',
  winter: 'a snow-capped northern peak beside a half-frozen lake at dusk, dark misty pines dusted with snow, faint aurora-like green-violet light in the night sky, icicles and frost patterns on stone — the domain of the Northern Black Tortoise (北方玄武)',
};

const CARD_FRAME = 'The whole image is a tall portrait fantasy trading-card illustration: an ornate gilded gold-and-deep-jade Chinese-fantasy card border runs along all four edges, thick and richly textured like carved jade inlaid with gold filigree, with small gemstone accents set into the elaborate scrollwork corner ornaments. A circular star-constellation medallion — a dark jade disc engraved with a fine gold star-map showing only constellation lines and stars, no letters, no compass directions, no text of any kind — is centered at the very top edge and mirrored at the very bottom edge. Painterly, ultra-detailed digital fantasy illustration, cinematic dramatic lighting, rich color depth, extremely high resolution 4K quality, no text, no watermark, no letters anywhere in the image.';

async function main() {
  const beastId = Number(process.argv[2]);
  const suffix = process.argv[3];
  if (!beastId || !suffix) {
    console.error('用法：node scripts/generate-star-beast.mjs <beast-id> <output-suffix>');
    process.exit(1);
  }

  const dataPath = path.join(ROOT, 'data', 'star-beasts.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const beast = data.items.find((item) => item.id === beastId);
  if (!beast) throw new Error(`star-beasts.json 找不到 id=${beastId}`);

  const elementChar = Array.from(beast.name)[1];
  const elementStyle = ELEMENT_STYLE[elementChar];
  if (!elementStyle) throw new Error(`無法辨識「${beast.name}」的七曜元素字：${elementChar}`);
  const habitat = SEASON_HABITAT[beast.season];
  if (!habitat) throw new Error(`未知季節：${beast.season}`);

  const prompt = `A majestic mythical Chinese ${beast.animal} (${beast.name}, symbolizing "${beast.symbolicPart}" — ${beast.coreMeaning}), rendered as a powerful serpentine dragon-like creature in a dynamic rearing or coiled pose, perched on moss-covered rocks. Its own name is literally its weapon: ${elementStyle}. It inhabits ${habitat}. ${CARD_FRAME}`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: { imageSize: '4K' },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData);
  if (!imagePart?.inlineData?.data) {
    console.error(JSON.stringify(response, null, 2));
    throw new Error('沒有取得圖片資料');
  }

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const outDir = path.join(ROOT, 'public', 'star-beasts', beast.season);
  const outName = `${String(beastId).padStart(2, '0')}-${beast.slug}-adult-standard-${suffix}.png`;
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, buffer);
  console.log(`已儲存：${path.relative(ROOT, outPath)}（${(buffer.length / 1024).toFixed(0)} KB）`);
  console.log(`Prompt 摘要：${prompt.slice(0, 160)}...`);
}

main().catch((error) => {
  console.error('生成失敗：', error);
  process.exit(1);
});
