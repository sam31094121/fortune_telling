import styles from './SharedElementSealPaper.module.css';

/**
 * 五元素共用的唯一封印符资源。
 * 以 CSS、字型與向量式輪廓即時繪製，沒有低解析點陣圖；在 1080p 以上仍保持清晰。
 * 所有呈現封印的地方都必須由這裡呈現封印，不可各自複製或降級替換。
 */
export function SharedElementSealPaper({ burning = false }: { burning?: boolean }) {
  return (
    <span className={`space-seal-paper ${styles.paper} ${burning ? 'space-seal-paper--burning' : ''}`} data-seal-resource="shared-vector-1080p-plus">
      <svg className={styles.ink} viewBox="0 0 100 300" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path strokeWidth="3" d="M17 17 Q50 9 83 17 M20 21 Q50 14 80 21 M22 27 Q50 21 78 27" />
          <path strokeWidth="4" d="M31 33 Q22 41 32 47 Q43 51 42 36 M50 30 L49 58 M66 33 Q80 40 67 47 L58 51 M24 58 Q50 50 77 57" />
          <path strokeWidth="5" d="M51 65 Q45 83 51 98 L50 196 Q44 210 52 228" />
          <path strokeWidth="3.5" d="M25 78 L74 72 L65 88 L31 94 M24 108 Q51 94 77 104 L63 119 L34 125 M29 135 L72 130 L63 149 L30 156 M22 171 L78 163 M30 183 L71 179" />
          <path strokeWidth="3" d="M30 87 L23 120 L33 144 L22 174 L34 196 M72 88 L80 118 L68 143 L79 170 L65 197 M33 204 L23 219 L40 215 L34 231 M66 203 L78 217 L61 213 L68 231" />
          <path strokeWidth="4" d="M49 224 L38 238 L51 234 L45 249 M25 253 Q50 243 76 251" />
          <path strokeWidth="1.4" opacity=".6" d="M12 67 L10 230 M88 64 L90 233" />
          <path strokeWidth="2.8" d="M29 259 L72 258 L73 293 L28 294 Z" />
        </g>
        <text x="50" y="285" textAnchor="middle" fill="currentColor" fontSize="29" fontWeight="900" fontFamily="serif">鎮</text>
      </svg>
      {burning && <span className="space-seal-ash" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </span>}
    </span>
  );
}
