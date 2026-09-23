/** 首頁神秘入口旁的可核對信任標（費用／時間或資料／登入）— 不寫假人數 */
export default function HomeTrustEvidence({
  items,
  label = "可核對承諾",
}: {
  items: readonly string[];
  label?: string;
}) {
  if (!items.length) return null;
  return (
    <ul className="home-trust-evidence" aria-label={label}>
      {items.map((item) => (
        <li key={item} className="home-trust-evidence__chip">
          {item}
        </li>
      ))}
    </ul>
  );
}
