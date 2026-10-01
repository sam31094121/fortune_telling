/**
 * 鬼魅阿修羅 — 獨立頁面
 * ============================================================================
 * 業主定案 2026-09-30：獨立頁面，100% 融會貫通阿修羅風格
 * 流程：填寫資料 → 八字→紫微→易經→阿修羅卡片
 * ============================================================================
 */

'use client';

import Link from 'next/link';
import styles from '@/app/dual-chart/dual-chart.module.css';

export default function GhostAsuraPage() {
  return (
    <div className={styles.page}>
      {/* 導航返回 */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLink}>
          ← 返回首頁
        </Link>
      </nav>

      {/* 卡片標題 */}
      <header className={styles.header} style={{
        color: '#D4AF37',
        textShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
      }}>
        <h1 style={{ color: '#D4AF37' }}>⚡ 鬼魅阿修羅</h1>
        <p style={{ color: '#A89860', letterSpacing: '0.08em' }}>
          易怒好鬥、驍勇善戰、心性暴躁、善於衝突
        </p>
      </header>

      {/* 說明文字 */}
      <section className={styles.panel} style={{
        background: 'linear-gradient(135deg, #0D0812 0%, #1A1520 50%, #0A0808 100%)',
        borderColor: 'rgba(212, 175, 55, 0.3)',
      }}>
        <h2 style={{ color: '#D4AF37', letterSpacing: '0.05em' }}>
          我是三千年戰神。命盤是戰場，不是保護區。
        </h2>
        <p style={{ color: '#F5F5F5', lineHeight: 1.8, marginBottom: '16px' }}>
          填寫一份生辰資料，我會用戰神的口吻直面你的盤：
        </p>
        <ul style={{
          color: '#E8E8E8',
          lineHeight: 2,
          paddingLeft: '24px',
          letterSpacing: '0.03em'
        }}>
          <li>⚔️ <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>八字命盤</span> — 我看你的五行，看你的氣運</li>
          <li>⚔️ <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>紫微斗數</span> — 我看你的宮位，看你的格局</li>
          <li>⚔️ <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>特星神煞</span> — 24 項戰局標記，每一項都決定勝負</li>
          <li>⚔️ <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>易經卜卦</span> — 起卦後看清，這一役怎麼打</li>
          <li>⚡ <span style={{ color: '#F5D547', fontWeight: 'bold' }}>戰神宣言</span> — 你的命盤就是你的武器</li>
        </ul>
      </section>

      {/* 表單導向 */}
      <section className={styles.panel} style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(212, 175, 55, 0.02))',
        borderColor: 'rgba(212, 175, 55, 0.4)',
        textAlign: 'center',
        padding: '48px 32px'
      }}>
        <h3 style={{
          color: '#D4AF37',
          fontSize: '18px',
          marginBottom: '16px',
          letterSpacing: '0.08em'
        }}>
          填寫生辰。戰場等你。
        </h3>
        <p style={{
          color: '#A89860',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          有人替你開門——進去後的仗還得自己打。
        </p>
        <Link
          href="/dual-chart"
          style={{
            display: 'inline-block',
            padding: '16px 48px',
            border: '2px solid #D4AF37',
            borderRadius: '999px',
            background: 'linear-gradient(180deg, #1A1520, #0D0812)',
            color: '#D4AF37',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            fontSize: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚔️ 填寫資料 → 生成戰譜
        </Link>
      </section>

      {/* 阿修羅宣言 */}
      <section className={styles.panel} style={{
        background: 'linear-gradient(135deg, #0D0812 0%, #1A1520 50%, #0A0808 100%)',
        borderLeft: '3px solid #D4AF37',
        borderColor: 'rgba(212, 175, 55, 0.3)',
        textAlign: 'center',
        padding: '32px'
      }}>
        <p style={{
          color: '#F5D547',
          fontSize: '16px',
          lineHeight: '1.9',
          letterSpacing: '0.05em',
          margin: 0,
          fontWeight: '600'
        }}>
          ⚡ 我看你的盤，就像看一個戰局。<br/>
          有人給你基地，但基地不是城堡——用它來出擊。<br/>
          困難時刻的選擇，五年後不會後悔。因為你賭的是自己的力量，不是別人的憐憫。
        </p>
      </section>
    </div>
  );
}
