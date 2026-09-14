/**
 * 五元素寶珠色盤（全站唯一一份）。
 * WaterTreasureOrb 的 3D 材質與戰場上的 CSS 魔珠都讀這裡，不能各自改色。
 */

export type ProductElement = '空' | '風' | '水' | '火' | '地';

// 客戶介面固定使用「空、風、水、火、地」，但視覺保留正統五行的比例來源。
// 採用一組年輕的科技寶石色盤，但每一顆仍必須一眼看出元素本質：
// 金/空=鈦金、木/風=電光帝王綠、水=電光藍、火=鴿血紅、土/地=金絲楠木琥珀。
// 色相不是隨手選的：水藍／風綠／火紅同時對到全球最愛顏色調查前三名
//（2024 Ipsos／YouGov：藍 37-38%、綠 22%、紅 16%）與傳統五行色（金白·木青·水黑·火赤·土黄），
// 空／地則延續五行「金、土」的貴金屬與大地基調，走鈦金與琥珀而非死板的白／黄。
// 兩位老師只讀這張表，不能各自改色。
export const ORB_MATERIAL: Record<ProductElement, { color: string; emissive: string; ring: string; light: string; metalness: number; roughness: number }> = {
  // Not flat "theme colours": every base is a deep gemstone body, with a
  // different bright vein inside it. That keeps the palette contemporary
  // without turning the treasures into neon toy balls.
  空: { color: '#443087', emissive: '#b4a2ff', ring: '#eee9ff', light: '#dfd8ff', metalness: 0.82, roughness: 0.1 },
  風: { color: '#006f4d', emissive: '#00f5a0', ring: '#c6ffe1', light: '#8dffcd', metalness: 0.22, roughness: 0.09 },
  水: { color: '#006ee6', emissive: '#00e5ff', ring: '#c2fbff', light: '#60edff', metalness: 0.1, roughness: 0.04 },
  火: { color: '#a40039', emissive: '#ff1264', ring: '#ffd2e7', light: '#ff9fc5', metalness: 0.3, roughness: 0.055 },
  地: { color: '#9b4b00', emissive: '#ffad12', ring: '#ffebb0', light: '#ffe198', metalness: 0.52, roughness: 0.1 },
};

// 每個元素的魔珠色相必須鎖在自己天使色（ORB_MATERIAL）的同一色系上，只降飽和度／明度、
// 不換色相——這樣「解封」才是同一元素的洗白，而不是換了一顆完全無關的珠子。
export const DEMON_MATERIAL: Record<ProductElement, { color: string; emissive: string }> = {
  空: { color: '#120a1c', emissive: '#5b2a86' }, // 吞噬一切的虛空黑紫（同色系：天使紫金 #b4a2ff）
  風: { color: '#04120c', emissive: '#1f6b4a' }, // 瘴氣毒綠（同色系：天使翠綠 #00f5a0，不再跑去橄欖黃綠）
  水: { color: '#04141a', emissive: '#0d6b62' }, // 深淵毒潭黑青（同色系：天使電光藍 #00e5ff）
  火: { color: '#1a0410', emissive: '#7a0f3a' }, // 焦血暗紅（同色系：天使桃紅 #ff1264，不再跑去焦橙）
  地: { color: '#140d04', emissive: '#5c3d0f' }, // 腐土黴斑黑褐（同色系：天使琥珀 #ffad12）
};
