/** v3 WebGL2 著色器（全部程序化：撕邊、纖維、金光、燒蝕、火舌、火星都在 GPU 上算，不上傳逐格畫布）。 */

export const ART_VS = `#version 300 es
in vec2 aPos;
uniform mat3 uMat;
uniform vec2 uCanvas;
out vec2 vArt;
out vec2 vLP;
void main() {
  vArt = aPos;
  vec3 p = uMat * vec3(aPos, 1.0);
  vLP = p.xy;
  vec2 c = p.xy / uCanvas * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

// SwiftShader（軟體 GPU）上「提早 return」不會省工，分支要寫成 if 區塊、各模式拆成獨立小程式。
const HEAD = `#version 300 es
precision highp float;
precision highp int;
in vec2 vArt;
in vec2 vLP;
out vec4 o;
uniform sampler2D uArt;
uniform vec3 uArtMap;      // kc, ox, oy
uniform vec2 uArtSize;     // 圖貼圖 px
uniform vec4 uFrame[2];    // ox, oy, cos, sin（R 單位）
uniform vec2 uDir;
uniform float uR;
uniform vec2 uC;
uniform vec4 uShape;       // 圓形旗標, 半寬, 半高, 圓角（CSS px，含外環）
uniform sampler2D uNoise;
uniform vec2 uNOff;
uniform vec4 uClip;        // 特效層 CSS：cx, cy, r, 柔邊（r<=0 不裁）
uniform float uBright;     // 特效顏色亮度上限（不亮過原圖最亮處）
uniform float uKc;
uniform vec3 uGold;
uniform vec3 uRed;
uniform vec3 uHeat;
uniform vec3 uHeat2;
uniform vec2 uFEnc;        // 燒蝕場編碼：f = x + b*y
uniform sampler2D uInfo;   // 預烤：r=到裂線0 的帶號距離、g=到裂線1、b=燒蝕雜訊項（CSS px）
uniform vec2 uArtCss;      // 圖（含外環）CSS 尺寸
uniform vec2 uReach;

float nz(vec2 p) { return texture(uNoise, p / 256.0 + uNOff).r; }
float shapeSD(vec2 X) {
  vec2 p = X - uC;
  float c = uShape.y - length(p * vec2(1.0, uShape.y / max(uShape.z, 1e-3)));
  vec2 q = abs(p) - vec2(uShape.y, uShape.z) + uShape.w;
  float r = uShape.w - (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
  return mix(r, c, uShape.x);
}
float clipA() {
  float k = 1.0 - smoothstep(uClip.z - uClip.w, uClip.z, length(vLP - uClip.xy));
  return uClip.z > 0.0 ? k : 1.0;
}
const float FR = 24.0; // 撕邊距離的細編碼範圍（±px，8 位元 ≈ 0.19px 一階，雙線性內插後連續）
vec4 dec(vec4 v) { return vec4((v.rg * 2.0 - 1.0) * FR, uFEnc.x + v.b * uFEnc.y, v.a); }
vec4 info(vec2 X) { return dec(texture(uInfo, vec2(X.x / uArtCss.x, 1.0 - X.y / uArtCss.y))); }
float sOf(int e, vec2 X) {
  vec4 F = uFrame[e];
  vec2 q = (X - uC) / uR - F.xy;
  float s = (dot(q, F.zw) + 1.05) / 2.1;
  float dir = e == 0 ? uDir.x : uDir.y;
  return 0.5 + (s - 0.5) * dir;
}
`;

/** 預烤（只在預排時畫一次，MRT 兩張）：
 *  o  (RGBA16F) r=到裂線0 的帶號距離、g=到裂線1、b=燒蝕雜訊項、a=紙芯內緣暗線（皆 CSS px／0..1）
 *  o2 (RGBA8)   r=裂開前的細黑線、g=紙芯毛邊帶、b=熾邊衰減、a=燒蝕前緣線寬變化 */
export const BAKE_FS = HEAD.replace('out vec4 o;', 'layout(location = 0) out vec4 o;\nlayout(location = 1) out vec4 o2;') + `
uniform highp sampler2D uCrackTex; // R32F, 129 x 2
uniform float uBurnAmp;
uniform int uNL;
uniform float uS;
float crackV(int e, float u) {
  float f = clamp((u + 1.05) / 2.1 * 128.0, 0.0, 128.0);
  int i = int(min(floor(f), 127.0));
  float k = f - float(i);
  float a = texelFetch(uCrackTex, ivec2(i, e), 0).r;
  float b = texelFetch(uCrackTex, ivec2(i + 1, e), 0).r;
  return mix(a, b, k);
}
float crackD(int e, vec2 X) {
  vec4 F = uFrame[e];
  vec2 q = (X - uC) / uR - F.xy;
  return (-q.x * F.w + q.y * F.z - crackV(e, dot(q, F.zw))) * uR;
}
void main() {
  vec2 p = vArt * 0.085;
  float fb = 0.5 * nz(p) + 0.3 * nz(p * 2.13 + 17.0) + 0.2 * nz(p * 4.71 + 41.0);
  float nt = uBurnAmp * ((fb - 0.5) * 2.0) + uBurnAmp * 0.32 * ((nz(vArt * 0.62) - 0.5) * 2.0);
  float d0 = crackD(0, vArt), d1 = uNL == 3 ? crackD(1, vArt) : 3e4;
  bool useB = abs(d1) < abs(d0);
  float edgeD = min(abs(d0), abs(d1));
  float edgeS = useB ? sOf(1, vArt) : sOf(0, vArt);
  float aa = 0.5 / uKc;
  float lineW = max(0.45, uS * 0.0055);
  float cl = 1.0 - smoothstep(lineW - aa, lineW + aa, edgeD);
  float bw = max(0.9, uS * 0.012) * (0.55 + 0.9 * nz(vec2(edgeS * uR * 1.3, 9.0)));
  float paper = (1.0 - smoothstep(bw - aa, bw + aa, edgeD)) * (0.85 + 0.3 * (nz(vArt * 1.7) - 0.5));
  float cline = exp(-abs(edgeD - bw) * 2.2) * 0.45;
  float gw = max(1.2, uS * 0.028);
  float rg = exp(-edgeD / gw);
  float lwv = nz(vArt * 0.33 + 7.0);
  float fb2 = min(edgeD, max(shapeSD(vArt), 0.0) * 1.15 + 1.0) + nt;
  o = vec4(clamp(vec2(d0, d1) / FR * 0.5 + 0.5, 0.0, 1.0), clamp((fb2 - uFEnc.x) / uFEnc.y, 0.0, 1.0), cline);
  o2 = vec4(cl, clamp(paper, 0.0, 1.0), rg, lwv);
}`;

/** 縫內透出的光：從兩側撕邊後方溢出，靠撕邊最亮、往縫中央柔和衰減；只在兩片之間、圖與框內。 */
export const GLOW_FS = HEAD + `
uniform int uGlowE;
uniform float uGlowA;
uniform float uGlowS;
uniform mat3 uInvA;
uniform mat3 uInvB;
void main() {
  float s = sOf(uGlowE, vArt);
  float reach = uGlowE == 0 ? uReach.x : uReach.y;
  float sg = max(uGlowS, 0.5);
  float rv = smoothstep(reach + 0.012, reach - 0.012, s);
  vec2 XA = (uInvA * vec3(vLP, 1.0)).xy, XB = (uInvB * vec3(vLP, 1.0)).xy;
  vec4 IA = info(XA), IB = info(XB);
  float dA = uGlowE == 0 ? IA.r : IA.g, dB = uGlowE == 0 ? IB.r : IB.g;
  float oA = dA > -1.5 ? max(dA, 0.0) : 1e3, oB = -dB > -1.5 ? max(-dB, 0.0) : 1e3;
  float I = exp(-(oA * oA) / (sg * sg)) + exp(-(oB * oB) / (sg * sg)) + 0.16 * exp(-min(max(dA, 0.0), max(-dB, 0.0)) / (3.0 * sg)) * (1.0 - smoothstep(1.6 * sg, 2.6 * sg, min(max(dA, 0.0), max(-dB, 0.0))));
  float inBoth = min(shapeSD(vArt), min(shapeSD(XA), shapeSD(XB)));
  I *= uGlowA * rv * smoothstep(0.0, max(2.0, sg), inBoth - 1.0) * clipA();
  I = min(I, 0.92);
  vec3 col = mix(uGold, uHeat, 0.25) * uBright;
  o = vec4(col * I, I);
}`;

/** 裂尖亮點：小、隨裂尖移動、只在圖內。 */
export const TIP_FS = HEAD + `
uniform int uGlowE;
uniform float uGlowA;
uniform float uGlowS;
void main() {
  vec4 I0 = info(vArt);
  float d = uGlowE == 0 ? I0.r : I0.g;
  float s = sOf(uGlowE, vArt);
  float reach = uGlowE == 0 ? uReach.x : uReach.y;
  float ds = (s - reach) * 2.1 * uR;
  float sg = max(uGlowS, 1.0);
  float I = uGlowA * exp(-(ds * ds + d * d) / (sg * sg)) * smoothstep(0.0, 1.5, shapeSD(vArt) - 0.5) * clipA();
  I = min(I, 0.9);
  o = vec4(uGold * uBright * I, I);
}`;

/** 碎片本體（含厚度影、撕邊裝飾、燒蝕）。重的部分都已預烤，這裡只讀貼圖＋少量運算。 */
export const PIECE_FS = HEAD + `
uniform sampler2D uDeco;   // 預烤裝飾（見 BAKE_FS 的 o2）
uniform vec4 uPS;          // 這一層的帶號距離 = min(x*d0 + z, y*d1 + w)（往內為正）
uniform vec2 uUse;         // 這一層用到哪幾道撕邊
uniform vec2 uOpen;
uniform float uThr;
uniform float uRimG;
uniform float uRimR;
uniform float uAlpha;
uniform float uThick;      // 厚度影不透明度（0＝不畫）
uniform vec2 uThickOff;    // 厚度影偏移（圖座標）
uniform float uOverlap;
uniform float uDecoOn;     // 有撕邊已長出來才畫裝飾
float psd(vec4 I) { return min(uPS.x * I.r + uPS.z, uPS.y * I.g + uPS.w); }
void main() {
  vec2 iuv = vec2(vArt.x / uArtCss.x, 1.0 - vArt.y / uArtCss.y);
  vec4 I0 = dec(texture(uInfo, iuv));
  float shp = shapeSD(vArt);
  float cov = clamp((psd(I0) + uOverlap) * uKc + 0.5, 0.0, 1.0) * clamp(shp * uKc + 1.5, 0.0, 1.0);
  float covS = 0.0;
  if (uThick > 0.0) {
    vec2 Xs = vArt - uThickOff;
    covS = clamp(psd(info(Xs)) * uKc + 0.5, 0.0, 1.0) * clamp(shapeSD(Xs) * uKc + 0.5, 0.0, 1.0) * uThick;
  }
  vec2 tc = (vArt * uArtMap.x + uArtMap.yz) / uArtSize;
  vec4 A = texture(uArt, tc);
  vec3 col = A.rgb; // 貼圖為非預乘（分段上傳的 ImageData）
  float e0 = uUse.x > 0.5 ? abs(I0.r) : 1e4, e1 = uUse.y > 0.5 ? abs(I0.g) : 1e4;
  float useB = e1 < e0 ? 1.0 : 0.0;
  float edgeD = min(e0, e1);
  float burnCov = 1.0;
  vec4 D = vec4(0.0);
  if (uDecoOn > 0.5) {
    D = texture(uDeco, iuv);
    float s0 = sOf(0, vArt), s1 = sOf(1, vArt);
    float rv = mix(smoothstep(uReach.x + 0.004, uReach.x - 0.004, s0), smoothstep(uReach.y + 0.004, uReach.y - 0.004, s1), useB);
    float op = mix(uOpen.x, uOpen.y, useB);
    col = mix(col, vec3(18.0, 9.0, 6.0) / 255.0, D.r * rv * (1.0 - op) * 0.92);
    col = mix(col, vec3(182.0, 165.0, 136.0) / 255.0 * uBright, D.g * rv * op * 0.95);
    col = mix(col, vec3(40.0, 22.0, 12.0) / 255.0, I0.a * rv * op);
    col = mix(col, uGold * uBright, clamp(D.b * rv * uRimG, 0.0, 0.85));
    col = mix(col, uRed * uBright, clamp(D.b * rv * uRimR, 0.0, 0.85));
  }
  // 燒蝕：從撕邊與外框往內吃（雜訊已預烤）；前緣：熾熱細線（金→紅，粗細不一）→ 焦黑 → 焦褐
  if (uThr > -9000.0) {
    float f = I0.b;
    float q = f - uThr;
    burnCov = clamp(q * uKc + 0.5, 0.0, 1.0);
    float lwv = mix(0.5, 2.4, uDecoOn > 0.5 ? D.a : 0.5);
    col = mix(col, vec3(58.0, 25.0, 10.0) / 255.0, (1.0 - smoothstep(6.0, 16.0, q)) * 0.62);
    col = mix(col, vec3(20.0, 8.0, 4.0) / 255.0, (1.0 - smoothstep(2.4, 6.5, q)) * 0.95);
    col = mix(col, uHeat2 * uBright, 1.0 - smoothstep(0.6 * lwv + 0.4, 1.5 * lwv + 0.6, q));
    col = mix(col, uHeat * uBright, 1.0 - smoothstep(0.0, 0.5 * lwv + 0.3, q));
  }
  float ca = clipA();
  float a = A.a * cov * burnCov * uAlpha * ca;
  float as = covS * burnCov * ca * (1.0 - a);
  o = vec4(col * a + vec3(34.0, 16.0, 9.0) / 255.0 * as, a + as);
}`;

export const PT_VS = `#version 300 es
in vec2 aPos;
in vec2 aUV;
in vec4 aCol;
in vec2 aK;
uniform vec2 uCanvas;
out vec2 vUV;
out vec4 vCol;
out vec2 vK;
out vec2 vLP;
void main() {
  vUV = aUV; vCol = aCol; vK = aK; vLP = aPos;
  vec2 c = aPos / uCanvas * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

export const PT_FS = `#version 300 es
precision highp float;
in vec2 vUV;
in vec4 vCol;
in vec2 vK;
in vec2 vLP;
out vec4 o;
uniform sampler2D uNoise;
uniform float uTime;
uniform vec4 uClip;
uniform float uBrightP;
uniform float uKind;       // 0 火星、1 火舌、2 小點（uniform 分支）
void main() {
  float a = 0.0;
  vec3 col = vCol.rgb;
  if (uKind < 0.5) {
    // 火星：帶尾巴的細線，頭亮尾暗
    a = (1.0 - smoothstep(0.45, 1.0, abs(vUV.y))) * smoothstep(-1.0, -0.4, vUV.x) * (1.0 - smoothstep(0.82, 1.0, vUV.x));
    a *= mix(0.25, 1.0, (vUV.x + 1.0) * 0.5);
  }
  if (uKind > 0.5 && uKind < 1.5) {
    // 火舌：破碎、鋸齒、往上散成小火苗（不是水滴）
    float y = vUV.y, x = vUV.x;
    float n = texture(uNoise, vec2(x * 0.05 + vK.y * 97.0, y * 0.06 - uTime * 0.55)).r;
    float n2 = texture(uNoise, vec2(x * 0.13 + vK.y * 53.0, y * 0.16 - uTime * 1.1)).r;
    float xo = x + (n - 0.5) * 1.6 * y;                       // 越往上越飄
    float wdt = 0.9 * pow(max(1.0 - y, 0.0), 0.65) * (0.6 + 0.9 * (n2 - 0.5));
    float F = 1.0 - abs(xo) / max(wdt, 0.03);
    a = smoothstep(0.0, 0.3, F) * smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.62, 0.95, y + (n2 - 0.5) * 0.5));
    float core = smoothstep(0.3, 0.85, F) * pow(max(1.0 - y, 0.0), 1.2);
    vec3 edgeC = vec3(0.72, 0.13, 0.06) * uBrightP;
    col = mix(edgeC, col, core);
    a *= 0.7 + 0.3 * core;
  }
  if (uKind > 1.5) {
    a = 1.0 - smoothstep(0.25, 1.0, length(vUV));
  }
  if (uClip.z > 0.0) a *= 1.0 - smoothstep(uClip.z - uClip.w, uClip.z, length(vLP - uClip.xy));
  a *= vCol.a;
  o = vec4(col * a, a);
}`;
