/**
 * 五元素共用的唯一封印符资源。
 * 以 CSS、字型與向量式輪廓即時繪製，沒有低解析點陣圖；在 1080p 以上仍保持清晰。
 * 所有呈現封印的地方都必須由這裡呈現封印，不可各自複製或降級替換。
 */
export function SharedElementSealPaper({ burning = false }: { burning?: boolean }) {
  return (
    <span className={`space-seal-paper ${burning ? 'space-seal-paper--burning' : ''}`} data-seal-resource="shared-vector-1080p-plus">
      <span className="space-seal-paper__script">敕令</span>
      <span className="space-seal-paper__mark">封</span>
      {burning && <span className="space-seal-ash" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </span>}
    </span>
  );
}
