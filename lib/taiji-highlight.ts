import * as THREE from 'three';

/* 【白階｜2026-11-25 第四輪】深層粒子（量子／細胞／糾纏／深淵）的高光滾降。
   原本全部是加法混合（AdditiveBlending，src×alpha + dst）：單顆粒子核心就可超過 1，
   重疊處在畫面緩衝區直接爆成 255（第 9 段實測主體 18～39% 死白）。
   調曝光無效（加法是在色調映射之後累加），所以改兩件事，粒子數量、大小、位置、時間全部不變：
   1. 每個片段先算原本的貢獻 c = 顏色 × alpha²（與原加法完全相同），最亮通道低於 0.4 原樣保留，
      最亮通道高於 0.4 時用指數肩部滾降、最高逼近 0.8（三通道等比例縮放，色相飽和度不變）——暗部、星點、細線的亮度與原本一樣，只有核心高光被收。
   2. 疊加方式由「加法」改成「有上限的濾色」：rgb 輸出滾降後的貢獻，alpha 通道帶「最亮通道 ÷ 0.9」，混合為 src + dst×(1−src.a)，
      多顆重疊時最亮通道收斂到 0.9（白色 L*≈91），永遠不會到 255；稀疏處與原本加法幾乎相同。
   PointsMaterial（深淵噴流）沒有自訂著色器，只換成同樣的濾色混合並保留色調映射。 */
export const TAIJI_HIGHLIGHT_KNEE = 0.6;
export const TAIJI_HIGHLIGHT_CEILING = 0.86;
/** 多顆重疊時的漸近上限（最亮通道）：0.9≈sRGB 230，白色 L*≈91，永遠到不了 255 */
export const TAIJI_HIGHLIGHT_ASYMPTOTE = 0.9;

function kneeGlsl(knee: number, ceiling: number) {
  const K = knee.toFixed(3);
  const ROOM = (ceiling - knee).toFixed(3);
  return /* glsl */ `
  vec3 taijiHighlightRolloff(vec3 c) {
    // 以最亮通道判斷、整組等比例縮放：色相與飽和度不變（金仍是金、冰藍仍是冰藍），只收亮度
    float peak = max(max(c.r, c.g), c.b);
    if (peak <= ${K}) return c;
    float rolled = ${K} + ${ROOM} * (1.0 - exp(-(peak - ${K}) / ${ROOM}));
    return c * (rolled / peak);
  }
`;
}

function screenBlend(material: THREE.Material, srcIsPremultiplied: boolean) {
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  // 自訂著色器：rgb = 滾降後貢獻，alpha 通道帶「最亮通道 / 漸近上限」→ 結果 = src + dst×(1−src.a)，重疊收斂到 0.9
  // PointsMaterial：濾色（src×a + dst×(1−src)），收斂到 1 但不硬切
  // 第五輪：PointsMaterial 改「預乘」輸出（rgb×a），濾色的底色係數用預乘後的貢獻（1−c·a）；
  // 原本用未預乘顏色當係數，柔光貼圖邊緣 a 很小但 c 很亮，會把下面的金核挖成灰點（第 21～24 段變灰主因）
  material.blendSrc = THREE.OneFactor;
  material.blendDst = srcIsPremultiplied ? THREE.OneMinusSrcAlphaFactor : THREE.OneMinusSrcColorFactor;
  material.blendEquationAlpha = THREE.AddEquation;
  // 透明度通道沿用原本加法的累加方式（a² + 底），畫布與頁面合成的覆蓋率與原本一致
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneFactor;
}

export function applyTaijiHighlightRolloff<T extends Record<string, unknown>>(
  built: T,
  options: { knee?: number; ceiling?: number } = {},
): T {
  const glsl = kneeGlsl(options.knee ?? TAIJI_HIGHLIGHT_KNEE, options.ceiling ?? TAIJI_HIGHLIGHT_CEILING);
  Object.values(built).forEach((value) => {
    if (!(value instanceof THREE.Material) || value.blending !== THREE.AdditiveBlending) return;
    if (value instanceof THREE.ShaderMaterial) {
      const pattern = /gl_FragColor = vec4\((\w+) \* alpha, alpha\);/g;
      if (!pattern.test(value.fragmentShader)) return;
      value.fragmentShader = value.fragmentShader
        .replace(/precision highp float;/, `precision highp float;\n${glsl}`)
        .replace(pattern, `{ vec3 taijiRolled = taijiHighlightRolloff($1 * alpha * alpha); gl_FragColor = vec4(taijiRolled, max(max(taijiRolled.r, taijiRolled.g), taijiRolled.b) / ${TAIJI_HIGHLIGHT_ASYMPTOTE.toFixed(3)}); }`);
      screenBlend(value, true);
    } else {
      // 第五輪：PointsMaterial／MeshBasicMaterial 也走同一條「預乘貢獻 → 保色相滾降 → alpha 帶上限載體」路線，
      // 和自訂著色器完全一致（重疊收斂 0.9，不會死白；底色只依預乘後的亮度被蓋，不再被柔光邊緣挖成灰點）
      const asym = TAIJI_HIGHLIGHT_ASYMPTOTE.toFixed(3);
      value.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader
          .replace('void main() {', `${glsl}\nvoid main() {`)
          .replace('#include <premultiplied_alpha_fragment>', `{ vec3 taijiRolled = taijiHighlightRolloff(gl_FragColor.rgb * gl_FragColor.a); gl_FragColor = vec4(taijiRolled, max(max(taijiRolled.r, taijiRolled.g), taijiRolled.b) / ${asym}); }`);
      };
      value.customProgramCacheKey = () => `taiji-rolloff-${glsl.length}-${asym}`;
      screenBlend(value, true);
    }
    value.needsUpdate = true;
  });
  return built;
}
