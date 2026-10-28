/**
 * 神獸戰鬥姿勢關鍵幀產生器（以新版卡面為唯一母版；先產到 .tmp，驗收通過才進 public）
 * ============================================================================
 *
 * 做法沿用 scripts/gen-beast-spirits.mjs：以圖生圖（餵新版卡面）→ 要求純黑底 → 黑底去背。
 * 差別：這支每次指定「姿勢」，用來補出原圖看不到的動作（跑、撲、咬、收腳），
 * 產物只放 .tmp/rig/poses/，**不進 public、不進版控**，要人工逐張驗收、細修後才採用。
 *
 * 會呼叫付費 API：預設只跑 --pose 指定的那幾個，不會一聲不響全跑；每張都印出檔案大小。
 *
 * 用法：
 *   node scripts/gen-beast-rig-poses.mjs --card baihu --pose run-reach
 *   node scripts/gen-beast-rig-poses.mjs --card baihu --pose all --out .tmp/rig/poses
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const MODEL = 'gemini-3.1-flash-image';
const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const card = arg('--card', 'baihu');
const poseArg = arg('--pose', 'run-reach');
const outDir = path.join(root, arg('--out', '.tmp/rig/poses'));
const round = arg('--round', '1');
/** 輸出尺寸（模型支援時）：1K／2K／4K；不支援時自動退回預設 */
const imageSize = arg('--size', '');
/** 第二張參考圖：同一隻老虎的另一個已驗收姿勢，用來鎖定這一隻的條紋與臉部花紋（跨姿勢一致） */
const ref2 = arg('--ref2', '');

/** 每張卡的母版（新版卡面）與描述。其他神獸之後各補一筆。 */
const CARDS = {
  baihu: {
    name: 'White Tiger (白虎)',
    reference: 'public/beast-game/front/guardian-baihu.v2.webp',
    identity: [
      'a massive white tiger with bold black stripes, cream-white thick fur with a heavy mane-like ruff around the face,',
      'amber-gold eyes, pink nose, long ivory fangs, long curved claws, a long tail with alternating black and white bands.',
      'Keep EXACTLY the same fur texture, stripe pattern, colours, proportions and painterly realistic style as the reference.',
    ].join(' '),
    detail: [
      'Render at the highest level of detail: individually visible fur strands, a thick full mane around the face as in the reference, crisp whiskers,',
      'sharp separate toe pads and claws, detailed wet nose and gums, sharp ivory fangs, clear amber irises with round pupils and eyelid detail,',
      'fine stripe edges with natural fur breakup. Painterly realistic style identical to the reference, no cartoon smoothing, no plastic look, no blur.',
    ].join(' '),
  },
  qinglong: {
    name: 'Azure Dragon (青龍)',
    reference: 'public/beast-game/front/guardian-qinglong.v2.webp',
    identity: [
      'a massive Chinese azure dragon (Qinglong) with deep blue overlapping scales, a golden-tan belly with broad ventral plates,',
      'a long golden-brown flowing mane and antler-like horns, long whiskers, glowing amber eyes, sharp ivory fangs, four-clawed golden talons, flowing golden fringe along the spine and tail.',
      'Keep EXACTLY the same scale pattern, colours, mane, horns, proportions and painterly realistic style as the reference. No wings (a wingless serpentine eastern dragon).',
    ].join(' '),
    detail: [
      'Render at the highest level of detail: individually visible overlapping scales with highlights, fine flowing mane strands, crisp whiskers,',
      'sharp separate talons, detailed teeth and gums, clear amber eye with eyelid detail, fine scale edge breakup.',
      'Painterly realistic style identical to the reference, no cartoon smoothing, no plastic look, no blur.',
    ].join(' '),
    poses: {
      'run-reach': 'Soaring mid-flight toward the left: body stretched long and nearly straight in a gentle wave, head thrust far forward and level, front claws reaching ahead, hind legs trailing, tail and mane streaming behind, mouth slightly open.',
      'run-gather': 'Soaring mid-flight, coiled phase: body folded into a strong S-curve with the head lowered and forward, front claws drawn in, mane flaring back, tail curling behind.',
      'pounce-open': 'Diving strike, a completely different pose from the reference: the whole body plunges steeply DOWNWARD and to the left along a diagonal, head thrust far forward and tilted down toward the prey, jaws opened to the absolute maximum with upper and lower fangs and tongue clearly visible, both front arms flung forward with talons spread wide, mane and tail whipping upward behind, fierce glowing eyes wide open.',
      'bite-close': 'The bite landing: the head slams forward and down, the MOUTH IS CLOSED TIGHTLY with lips pulled back baring clenched interlocking fangs (no open gap), a snarling wrinkled muzzle, eyes narrowed to furious slits, front talons raking forward and down, neck muscles bulging, body coiled behind the head, mane blown forward by the impact.',
      'land-crouch': 'Coiled rest: body coiled in a tight spiral low to the ground, head raised and facing left, snarling, mane and tail settling. Similar to the reference coil but slightly lower.',
    },
  },
};

/** 姿勢庫：全部是「面向畫面左側、側視」，與母版同方向，方便對齊與鏡射。 */
const POSES = {
  'run-reach': 'Mid-gallop, fully airborne: front legs stretched far forward and slightly raised, hind legs pushed far back, body stretched long and low, head forward and level, mouth slightly open, tail streaming behind and up.',
  'run-gather': 'Mid-gallop, gathered phase: all four paws tucked together under the belly, back strongly arched, head lowered and forward, ears pinned back, tail raised in a curve.',
  'pounce-open': 'Leaping attack: body airborne and stretched toward the left, front legs reaching forward with claws fully extended, hind legs trailing, head thrust forward with the mouth WIDE open showing all fangs, fierce eyes.',
  'bite-close': 'Biting moment: head lunged forward and slightly downward with the jaws snapping shut, fangs bared, front claws raking forward, body low and stretched, eyes narrowed with fury.',
  'land-crouch': 'Landing recovery: crouched low on all four legs, front legs bent, shoulders high, head lowered and facing left, snarling, tail swaying behind. Similar to the reference crouch but slightly lower.',
};

function apiKey() {
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const key = /GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/.exec(env)?.[1];
  if (!key) throw new Error('.env.local 裡找不到 GEMINI_API_KEY');
  return key.trim();
}

function prompt(spec, pose) {
  return [
    `Redraw the creature from the reference image as a single full-body character sprite in a NEW POSE.`,
    `It is ${spec.identity}`,
    `Pose: ${(spec.poses ?? POSES)[pose]}`,
    `Strict side view, facing the LEFT edge of the image, same camera distance and same scale as the reference.`,
    `Do NOT redesign the creature: same species, same markings, same anatomy, same rendering style as the reference.`,
    spec.detail,
    ref2 ? `A SECOND reference image shows the SAME individual creature in another pose: copy its exact markings, scale or stripe layout, mane volume and colours so the two images are clearly the same animal.` : ``,
    `Isolated on a PURE SOLID BLACK background (#000000), absolutely no scenery, no ground, no rocks, no leaves,`,
    `no mist, no glow spill, no vignette, no text, no frame, no border.`,
    `The creature must not touch the image edges; leave clear black margin on all four sides.`,
  ].join(' ');
}

async function generate(key, spec, pose) {
  const source = await sharp(path.join(root, spec.reference)).png().toBuffer();
  const second = ref2 ? fs.readFileSync(path.join(root, ref2)) : null;
  const body = (withSize) => ({
    contents: [{ parts: [
      { text: prompt(spec, pose) },
      { inline_data: { mime_type: 'image/png', data: source.toString('base64') } },
      ...(second ? [{ inline_data: { mime_type: 'image/png', data: second.toString('base64') } }] : []),
    ] }],
    ...(withSize && imageSize ? { generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize } } } : {}),
  });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body(true)),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData ?? p.inline_data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) throw new Error('回應裡沒有影像');
  return Buffer.from(inline.data, 'base64');
}

const spec = CARDS[card];
if (!spec) throw new Error(`未知的卡：${card}`);
const poses = poseArg === 'all' ? Object.keys(spec.poses ?? POSES) : poseArg.split(',');
for (const p of poses) if (!(spec.poses ?? POSES)[p]) throw new Error(`未知的姿勢：${p}`);
fs.mkdirSync(outDir, { recursive: true });
const key = apiKey();
for (const pose of poses) {
  const file = path.join(outDir, `${card}-${pose}.r${round}.png`);
  const png = await generate(key, spec, pose);
  fs.writeFileSync(file, png);
  const meta = await sharp(png).metadata();
  console.log(`${path.relative(root, file)} ${meta.width}x${meta.height} ${png.length}B`);
}
