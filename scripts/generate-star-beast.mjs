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
  水: 'a flowing translucent teal-blue wet sheen and thin moving film of water coating its true natural body surface exactly as already described — its real skin, fur, feathers, scales or segmented rings must stay fully visible and anatomically consistent underneath, never replaced or swapped for a different material or texture partway down the body; a soft luminous glow pulses within that watery film, like captured moonlight rippling under the surface, bright phosphorescent sparkle trailing wherever the water moves or drips — this glow is the single most eye-catching feature of the whole image, unmistakable and loud',
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

// 外框顏色統一以四季／四象固定，同一季的每一隻卡框顏色都要一致，只有背景與神獸本體
// 隨字的意境變化。外框結構（雕花、勳章、無文字）四季皆同，只有這個顏色描述不同。
const SEASON_FRAME_COLOR = {
  spring: 'deep jade-green and gold, the disc a dark jade green',
  summer: 'deep vermilion-red and gold, the disc a dark garnet red',
  autumn: 'pale ivory-white and gold, the disc a pale moonstone white',
  winter: 'deep indigo-black and gold, the disc a dark obsidian black',
};

// 外框規格「鎖死」：每一張卡的框結構完全一致（同寬度、同四角紋飾、同邊中寶石、同勳章
// 位置與大小），唯一允許的差異是四季的顏色。描述越精確，28 張的框才會越一致。
function cardFrame(season) {
  const frameColor = SEASON_FRAME_COLOR[season];
  return `The whole image is a tall portrait fantasy trading-card illustration with one strict, standardized frame design: a thick ornate card border of even width runs along all four edges, made of polished carved gemstone in ${frameColor}, inlaid with flowing gold filigree scrollwork. All four corners carry the same symmetrical gold scrollwork ornament, each set with one small diamond-cut gemstone; one small diamond-shaped gemstone is centered on the left edge and one on the right edge. A circular star-constellation medallion — a round disc engraved with a fine gold star-map showing only constellation lines and star dots, no letters, no compass directions, no text of any kind — is centered at the very top edge, and an identical medallion is centered at the very bottom edge. The frame is clean, elegant and perfectly symmetrical, with no animal figures, no faces and no text built into the border itself. Painterly, ultra-detailed digital fantasy illustration, cinematic dramatic lighting, rich color depth, extremely high resolution 4K quality, no text, no watermark, no letters anywhere in the image.`;
}

// 王者之氣：每一隻都要有份量、霸氣，不能畫得單薄瘦弱。微胖厚實的體態＋君王般的氣場，
// 是這整批圖統一的體格與氣質標準。
const ROYAL_BEARING = 'This is the fully matured sovereign adult of its divine bloodline — the same lineage that, as a young divine cub, would one day grow into exactly this true adult form, carrying an unmistakable family resemblance in its markings and features across that bloodline. It carries a commanding, regal, kingly presence: a sovereign ruler among beasts. Its build is thick, weighty and imposingly muscular, with a touch of well-fed, powerful stoutness — solid and dense, never lean, thin, or scrawny. Its stance, expression and bearing radiate dominant royal authority, gravitas and quiet menace, like a king surveying its domain.';

// 全套 28 張共用的構圖與尊貴感標準（不是單一張卡的特例）：所有尊貴感一律用光/氣場/材質
// 表現，不用實體王冠或飾品；主體（尤其頭部）永遠避開卡框上緣，留出天空／場景的呼吸感；
// 若該動物的真實體態本來就會盤繞（蛇、蛟、龍、蚓等），路徑必須單一流暢、一眼就能從頭
// 追到尾，不能穿環打結。這套規則套用在每一次生成，讓 28 張卡永遠是同一套系統的延伸，
// 而不是各自為政的個別作品。
const COMPOSITION_STANDARD = 'All of its nobility and divinity must be conveyed purely through light, glow, aura and bearing — never through a physical crown, headwear, or jewelry resting on or touching its head or body. Compose the shot so its head, the visual focal point, sits slightly above the vertical center of the whole card — roughly 40% of the way down from the very top edge, never touching or crowding the top border or its medallion, with clear open sky or background visible above it. If this creature\'s true anatomy naturally coils or winds (a serpent, dragon, jiao, or worm-like body), its entire form must trace ONE single, clean, continuous flowing curve from head to tail that the eye can follow at a glance — like one unbroken brushstroke — never crossing over, looping through, or tangling with itself.';

// 二十八宿每一隻的動物身分是整套系統的核心：不能全部套成龍體，那樣就抹殺了「每一宿對應
// 不同動物」的意境。只有蛟（角木蛟）與龍（亢金龍）本來就是龍屬，其餘 26 隻都要是牠自己
// 真正的動物形體與姿態，只是畫成「神格化、強大、有威嚴」的版本，不是把牠們也畫成龍。
const ANIMAL_FORM = {
  蛟: { body: 'a powerful serpentine Chinese jiao-dragon (a hornless flood-dragon), sinuous eel-like four-legged dragon body', pose: 'a dynamic rearing, coiling pose' },
  龍: { body: 'a powerful Chinese dragon, majestic four-legged serpentine dragon body', pose: 'a dynamic rearing, coiling pose' },
  貉: { body: 'a majestic divine raccoon dog (tanuki), a sturdy compact quadruped body with a bushy ringed tail and a masked face', pose: 'a grounded, watchful crouching pose' },
  兔: { body: 'a majestic divine hare, a lean quadruped body with tall alert ears and powerful coiled hind legs', pose: 'a poised, ready-to-leap pose' },
  狐: { body: 'a majestic divine fox, an elegant slender quadruped body with several flowing tails trailing like silk', pose: 'a graceful, watchful standing pose' },
  虎: { body: 'a majestic divine tiger, a powerful striped feline quadruped body with a long muscular tail held high and taut like a weapon ready to strike', pose: 'a low prowling, about-to-pounce pose' },
  豹: { body: 'a majestic divine leopard, a sleek spotted feline quadruped body built for speed', pose: 'a low bounding, mid-leap pose' },
  獬: { body: 'a majestic divine xiezhi (獬豸), a powerful single-horned lion-goat hybrid quadruped body', pose: 'a solemn, standing-guard pose' },
  牛: { body: 'a majestic divine ox, a powerful heavy-set bovine quadruped body with sweeping curved horns, richly well-fed and thickly muscled like a prized, lovingly raised (養) sacred ox', pose: 'a grounded, standing-firm pose' },
  蝠: { body: 'a majestic divine bat, a quadruped body with large membrane wings spread wide and clawed feet', pose: 'a wings-spread gliding or perched pose' },
  鼠: { body: 'a majestic divine rat, a sleek whiskered rodent quadruped body rendered powerful and imposing far beyond its small-animal origin', pose: 'an alert, upright watchful pose' },
  燕: { body: 'a majestic divine swallow, a streamlined avian body with long forked tail feathers and swept-back wings', pose: 'a wings-spread mid-flight pose' },
  豬: { body: 'a majestic divine wild boar, a powerful tusked quadruped body with a bristling mane', pose: 'a low charging, head-down pose' },
  貐: { body: 'a majestic divine yayu (窫貐), a powerful tiger-bodied beast with a fierce draconic head', pose: 'a low prowling pose' },
  狼: { body: 'a majestic divine wolf, a powerfully built canine quadruped body with a thick mane, standing with the proud, unbowed dignity of a pack sovereign', pose: 'a low prowling pose, head held high with dignity' },
  狗: { body: 'a majestic divine hound, a powerful canine quadruped body with alert upright ears', pose: 'a standing-guard pose' },
  雉: { body: 'a majestic divine pheasant, an ornate avian body with a long trailing tail of iridescent feathers', pose: 'a wings-spread display pose' },
  雞: { body: 'a majestic divine rooster, a proud avian body with a flame-like comb and sweeping tail feathers', pose: 'a wings-spread crowing pose atop a perch' },
  烏鴉: { body: 'a majestic divine raven, a sleek dark-feathered avian body with sharp intelligent eyes', pose: 'a wings-spread perched pose' },
  猴: { body: 'a majestic divine monkey, an agile muscular primate body balanced on powerful haunches', pose: 'a dynamic crouching, about-to-leap pose' },
  無尾猿: { body: 'a majestic divine gibbon (tailless ape), a long-limbed muscular primate body', pose: 'a dynamic swinging or upright standing pose' },
  犴: { body: 'a majestic divine han (犴), a powerful wild jackal-like canine beast body', pose: 'an alert prowling pose' },
  羊: { body: 'a majestic divine ram, a sturdy quadruped body with large curved horns and a thick woolen mane', pose: 'a standing-firm, head-lowered pose' },
  獐: { body: 'a majestic divine river deer, a slender antler-less deer quadruped body with small protruding fangs', pose: 'an alert, poised pose' },
  馬: { body: 'a majestic divine horse, a powerful sleek equine quadruped body with a flowing mane and tail', pose: 'a rearing, galloping pose' },
  鹿: { body: 'a majestic divine stag, an elegant antlered deer quadruped body', pose: 'a standing, regal pose' },
  蛇: { body: 'a majestic divine winged serpent, a long limbless serpentine snake body with a pair of feathered wings', pose: 'a coiled, rising pose' },
  蚓: { body: 'an ascended divine earthworm deity, unmistakably a god-tier mythical being rather than an enlarged ordinary animal — a long segmented limbless worm body carved from living crystal and light, its translucent segments glowing with deep inner celestial fire, faint holy mist and drifting motes of light constantly rising off its body, a soft divine halo of radiant energy pulsing in the air behind its raised head — no crown, no headwear, no jewelry, no physical ornament of any kind resting on or touching its head or body, all of its nobility conveyed purely through light, glow and bearing rather than any worn object; its head carries a conceptual echo of a Chinese dragon\'s noble bearing — a slightly more elongated, regal head silhouette with a proud jaw and brow line, and a small pair of backswept horn-like ridges rising from the back of its head, reminiscent of a dragon\'s dignity at a glance — while remaining unmistakably its own true self: no dragon scales, no whiskers, no dragon snout, still the same soft segmented worm head and true worm anatomy everywhere else, just carrying that mythic gravitas; its eyes burning with an unnatural otherworldly inner light, its thick segmented mass coiled with visible muscular tension and crackling with faint threads of glowing sacred energy along every ring', pose: 'a powerful but compact rearing pose, its entire body forming ONE single, clean, continuous flowing curve from head to tail-tip that a viewer\'s eye can trace at a glance without confusion — like one unbroken stroke of a brush — never crossing over, looping through, or tangling with itself at any point; a simple open spiral or a single graceful S-curve, not a pretzel or a knot; coiled low and dense rather than stretched tall, its whole raised upper body and head tilted a few degrees off vertical toward the right side of the frame — not leaning far, just enough asymmetry that the pose feels alive and dynamic rather than perfectly symmetrical — framed so the center of its head lands slightly above the vertical center of the whole image — roughly in the upper-middle area, around 40% of the way down from the very top edge of the card to the very bottom edge (not the exact 50% midpoint, and not the illustration area only); leave roughly the top third of the image as open sky/background with nothing but distant scenery above the head, and let the single flowing coil of its body and tail fill the space below it, extending closer to the bottom edge; its mass sits low, braced wide against the ground or water for weight and stability — commanding and forceful despite having no limbs, the way a cobra rears without arms or legs' },
};

// symbolicPart（本宮象徵部位）→ 該部位要成為武器微光的視覺焦點，讓「字的意境即武器」
// 落到牠身體上真正對應的那個位置，不是隨機發光。找不到對應關鍵字就不特別強調。
const BODY_FOCUS_RULES = [
  [/尾/, 'its tail'],
  [/角/, 'its horn'],
  [/首|頭|冠/, 'its head and brow'],
  [/心/, 'its chest, over the heart'],
  [/胸|肋/, 'its chest and ribs'],
  [/脖頸|頸|咽喉/, 'its neck and throat'],
  [/身軀|軀|屋脊/, 'its back and spine'],
  [/翅膀|羽翼|翼/, 'its wings'],
  [/眼|耳目/, 'its eyes'],
  [/口|嘴|喉/, 'its mouth and jaw'],
  [/腹|胃/, 'its belly'],
  [/腳|足/, 'its legs and paws'],
  [/牆壁|宮室|虛位/, 'its flanks'],
  [/將軍|聚眾|邊疆/, 'its shoulders and forelimbs'],
];

// 個別例外：規則對到的部位若在該動物身上不存在（例如鹿沒有羽翼），在這裡覆寫成
// 牠身上真正對應意境的部位。key 是 beast id。
const BODY_FOCUS_OVERRIDES = {
  26: 'its grand antlers, spreading wide like a pair of wings', // 張月鹿・朱雀羽翼 → 鹿角如翼
};

function bodyFocus(beast) {
  const override = BODY_FOCUS_OVERRIDES[beast.id];
  if (override) return override;
  const hit = BODY_FOCUS_RULES.find(([re]) => re.test(beast.symbolicPart));
  return hit ? hit[1] : 'its whole body';
}

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
  const form = ANIMAL_FORM[beast.animal];
  if (!form) throw new Error(`無法辨識「${beast.name}」的動物形體：${beast.animal}（請先在 ANIMAL_FORM 補上）`);
  const focus = bodyFocus(beast);

  const prompt = `${form.body} (${beast.name}, symbolizing "${beast.symbolicPart}" — ${beast.coreMeaning}), perched on moss-covered rocks in ${form.pose}. It must read unmistakably as a ${beast.animal}, not as a dragon or any other creature — keep its real anatomy, proportions and silhouette faithful to a ${beast.animal}, only rendered divine and powerful. ${ROYAL_BEARING} ${COMPOSITION_STANDARD} Its own name is literally its weapon, concentrated most intensely on ${focus}: ${elementStyle}. It inhabits ${habitat}. ${cardFrame(beast.season)}`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      // 9:16 鎖定卡片標準直式比例，跟其餘 27 張卡片（2160x3840）同一套模具；
      // 沒鎖定時模型會自行選 2:3，導致比例跟其他卡不一致。
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
  // API 實際回傳格式以 mimeType 為準（常見是 image/jpeg，不一定是 PNG）；
  // 副檔名必須跟真實格式一致，否則檔案內容與檔名不符。
  const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const outDir = path.join(ROOT, 'public', 'star-beasts', beast.season);
  const outName = `${String(beastId).padStart(2, '0')}-${beast.slug}-adult-standard-${suffix}.${ext}`;
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, buffer);
  console.log(`已儲存：${path.relative(ROOT, outPath)}（${(buffer.length / 1024).toFixed(0)} KB，格式 ${mimeType}）`);
  console.log(`Prompt 摘要：${prompt.slice(0, 160)}...`);
}

main().catch((error) => {
  console.error('生成失敗：', error);
  process.exit(1);
});
