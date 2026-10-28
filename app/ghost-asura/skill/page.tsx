/**
 * 鬼魅阿修羅｜技能檔案（/ghost-asura/skill）
 *
 * 後端運算、前端顯示：頁面上的每一段文字與區塊順序都來自後端 buildAsuraSkillFile()
 * （lib/ghost-asura-skill-file.ts；同一份資料也由 GET /api/ghost-asura/skill-file 提供）。
 * 這裡只依後端給的順序照印：不內建文字、不排序、不挑選、不改寫。
 * 八字只在後端算 —— 本頁不排盤、不算神煞、不引用任何命理或 ghost-asura 引擎。
 */

import type { Metadata } from 'next';
import { SHARE_DESCRIPTION, SHARE_OG_IMAGES, SHARE_TITLE, SHARE_TWITTER_IMAGES } from '@/lib/share-preview';
import { buildAsuraSkillFile } from '@/lib/ghost-asura-skill-file';
import styles from './skill.module.css';
import { Blocks, SealCard } from './AsuraSkillBlocks';

const FILE = buildAsuraSkillFile();

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: { absolute: FILE.meta.title },
  description: FILE.meta.description,
  keywords: FILE.meta.keywords,
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    siteName: FILE.meta.siteName,
    images: SHARE_OG_IMAGES,
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: SHARE_TWITTER_IMAGES,
  },
};

export default function GhostAsuraSkillPage() {
  return (
    <main className={styles.page}>
      <div className={styles.mist} aria-hidden="true" />

      <div className={styles.inner}>
        {/* 首屏：只有名字 */}
        <header className={styles.hero}>
          <h1 className={styles.heroName}>{FILE.hero.name}</h1>
        </header>

        {FILE.sections.map((section) => (
          <SealCard key={section.key} section={section}>
            <Blocks blocks={section.blocks} />
          </SealCard>
        ))}

        <footer className={styles.closing}>
          <p className={styles.closingVoice}>{FILE.closing.voice}</p>
          <p className={styles.signature}>{FILE.closing.signature}</p>
          <p className={styles.status}>{FILE.closing.status}</p>
        </footer>
      </div>
    </main>
  );
}
