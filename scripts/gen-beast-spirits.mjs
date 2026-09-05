/**
 * 神獸本體立繪產生器（去背）
 * ============================================================================
 *
 * 業主定調：「每一張都要生成牠本體的神獸跑過去對方的牌，
 * 60 都以他的神獸本體生成出來……生成出來後放在後端檔案裡作為技能。」
 *
 * 【為什麼需要這一步】
 *
 * public/star-beasts 的原圖沒有 alpha 通道（實測 3 channels），
 * 是完整背景的插畫。直接丟進三維場景會變成「一塊會飛的長方形插畫」。
 * 要讓神獸本體真的跑過去對打，需要**去背的全身立繪**。
 *
 * 【做法：以圖生圖，再去背】
 *
 * 1 把既有的神獸插畫餵給影像模型，要求「同一隻神獸、全身、純黑背景」
 *   —— 以圖生圖是為了讓生出來的還是那一隻，不是另外畫一隻新的。
 * 2 把純黑鍵成透明。黑底去背比複雜背景可靠得多，
 *   所以是「請它畫在黑底上」而不是「請它給我透明背景」。
 * 3 存成 public/beast-game/spirit/NN.png
 *
 * 【花錢的東西要看得到】
 *
 * 這支會呼叫付費 API。所以：
 *   預設只跑 --limit 指定的張數，不會一聲不響跑完六十張
 *   已經存在的檔案預設跳過（--force 才覆寫）
 *   每一張都印出結果與檔案大小，跑到哪裡看得見
 *
 * 用法：
 *   node scripts/gen-beast-spirits.mjs --limit 2        先試兩張
 *   node scripts/gen-beast-spirits.mjs --limit 60       全部
 *   node scripts/gen-beast-spirits.mjs --only 1,2,3     指定幾隻
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const OUT_DIR = path.join(root, 'public/beast-game/spirit');
const MODEL = 'gemini-3.1-flash-image';

const args = process.argv.slice(2);
const argValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const limit = Number(argValue('--limit') ?? 2);
const only = argValue('--only')?.split(',').map((n) => Number(n.trim())).filter(Number.isFinite);
const force = args.includes('--force');
/**
 * 生成幼子本體。
 *
 * 六十張卡是二十八隻成獸＋二十八隻幼子＋四象。成獸與幼子是不同形態，
 * 衝出去的樣子不該一樣——幼子用成獸的立繪，就是拿大人的圖冒充小孩。
 * 幼子另存成 NNy.webp。
 */
const young = args.includes('--young');

function apiKey() {
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const key = /GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/.exec(env)?.[1];
  if (!key) throw new Error('.env.local 裡找不到 GEMINI_API_KEY');
  return key.trim();
}

/**
 * 提示詞。
 *
 * 重點在「同一隻」與「純黑底」：
 * 前者確保生出來的還是那隻神獸（所以要餵原圖），
 * 後者是為了可靠去背——要求透明背景常常拿到灰白格子或髒邊。
 */
function prompt(beast, isYoung = false) {
  if (isYoung) {
    // 幼子是另一個形態，不能拿成獸的描述去生——那等於拿大人的圖冒充小孩。
    return [
      `Redraw the creature from the reference image as a single full-body character sprite.`,
      `It is the YOUNG CUB form of "${beast.name}", one of the 28 Chinese lunar mansion guardian beasts (${beast.animal}).`,
      `Keep the same species, colours and markings as the reference, but render it clearly as a juvenile:`,
      `rounder body, larger head and eyes relative to the body, shorter limbs, softer fur or scales.`,
      `Full body, side-facing three-quarter view, mid-stride as if scampering forward into battle.`,
      `Isolated on a PURE SOLID BLACK background (#000000), absolutely no scenery, no ground,`,
      `no mist, no glow spill, no vignette, no text, no frame, no border.`,
      `The creature must not touch the image edges; leave clear black margin on all four sides.`,
    ].join(' ');
  }
  return [
    `Redraw the creature from the reference image as a single full-body character sprite.`,
    `It is "${beast.name}", one of the 28 Chinese lunar mansion guardian beasts (${beast.animal}).`,
    `Keep the same species, anatomy, colours and ornamentation as the reference.`,
    `Full body, side-facing three-quarter view, mid-stride as if charging forward into battle.`,
    `Isolated on a PURE SOLID BLACK background (#000000), absolutely no scenery, no ground,`,
    `no mist, no glow spill, no vignette, no text, no frame, no border.`,
    `The creature must not touch the image edges; leave clear black margin on all four sides.`,
    `Dramatic rim lighting on the creature itself is fine, but the background must stay pure black.`,
  ].join(' ');
}

async function generateOne(key, beast, isYoung = false) {
  // 幼子用幼子的參考圖，成獸用成獸的——不能拿大人的圖去生小孩。
  const reference = isYoung ? beast.youngDivineImage : beast.image;
  const sourcePath = path.join(root, 'public', reference.replace(/^\//, ''));
  const source = fs.readFileSync(sourcePath);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt(beast, isYoung) },
            { inline_data: { mime_type: 'image/png', data: source.toString('base64') } },
          ],
        }],
      }),
    },
  );

  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData ?? p.inline_data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) throw new Error('回應裡沒有影像');
  return Buffer.from(inline.data, 'base64');
}

/**
 * 純黑鍵成透明。
 *
 * 不是整張比對顏色，而是逐像素看亮度：夠暗就透明，接近邊緣的做半透明，
 * 這樣邊緣不會出現硬鋸齒。門檻刻意保守——寧可留一點暗邊，
 * 也不要把神獸身上的暗色部位挖穿。
 */
async function keyOutBlack(buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const LOW = 18;   // 這個亮度以下：完全透明
  const HIGH = 52;  // 這個亮度以上：完全不透明
  for (let i = 0; i < out.length; i += info.channels) {
    const luma = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
    if (luma <= LOW) out[i + 3] = 0;
    else if (luma < HIGH) out[i + 3] = Math.round(((luma - LOW) / (HIGH - LOW)) * 255);
  }
  /*
    去背後直接縮到網頁尺寸並轉 WebP。

    模型回的是 848×1259 的 PNG，一張約 1.4MB。六十張就是 84MB——
    手機優先 60FPS 的憲章下這是不能接受的，而且也沒有必要：
    三維場景裡本體最大也只佔螢幕高度的一半，512 高綽綽有餘。
    存優化後的版本就好，原始尺寸留著只會佔空間。
  */
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .resize({ height: 512, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
}

async function main() {
  const key = apiKey();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const beasts = JSON.parse(fs.readFileSync(path.join(root, 'data/star-beasts.json'), 'utf8')).items;

  const targets = (only ? beasts.filter((b) => only.includes(b.id)) : beasts).slice(0, only ? undefined : limit);
  console.log(`準備生成 ${targets.length} 張${young ? '幼子' : '成獸'}本體（模型 ${MODEL}）`);

  let made = 0;
  let skipped = 0;
  for (const beast of targets) {
    const n = String(beast.id).padStart(2, '0');
    const outPath = path.join(OUT_DIR, young ? `${n}y.webp` : `${n}.webp`);
    if (fs.existsSync(outPath) && !force) {
      console.log(`  跳過 ${n} ${beast.name}（已存在，要覆寫加 --force）`);
      skipped += 1;
      continue;
    }
    try {
      const raw = await generateOne(key, beast, young);
      const cut = await keyOutBlack(raw);
      fs.writeFileSync(outPath, cut);
      const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
      const meta = await sharp(outPath).metadata();
      console.log(`  ✓ ${n} ${beast.name}  ${meta.width}x${meta.height}  ${kb}KB  alpha=${meta.hasAlpha}`);
      made += 1;
    } catch (error) {
      console.log(`  ✗ ${n} ${beast.name}  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`完成 ${made} 張，跳過 ${skipped} 張。輸出：public/beast-game/spirit/`);
}

await main();
