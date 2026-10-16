import HomeTranslatedText from '@/components/HomeTranslatedText';

/** 業主定案 2026-10-16：首頁這些小標籤（免費／免登入／約 20 秒…）沒有意義、佔空間，全部隱藏。
 *  只隱藏不刪：要恢復把下面改成 false 即可（首頁各卡片的 items 原封不動保留）。 */
const HOME_TRUST_EVIDENCE_HIDDEN = true;

/** 首頁神秘入口旁的可核對信任標（費用／時間或資料／登入）— 不寫假人數 */
export default function HomeTrustEvidence({
  items,
  label = "可核對承諾",
}: {
  items: readonly string[];
  label?: string;
}) {
  if (HOME_TRUST_EVIDENCE_HIDDEN || !items.length) return null;
  return (
    <ul className="home-trust-evidence" aria-label={label}>
      {items.map((item) => (
        <li key={item} className="home-trust-evidence__chip">
          <HomeTranslatedText text={item} />
        </li>
      ))}
    </ul>
  );
}
