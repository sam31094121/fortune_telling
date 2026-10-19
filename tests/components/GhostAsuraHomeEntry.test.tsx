import { describe, it, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import GhostAsuraHomeEntry from '@/components/GhostAsuraHomeEntry';

// 2026-10-19: authorized migration from retired impression selector to the
// accepted single-link entry. Interaction/persistence checks live in integration.
describe('現行阿修羅單一入口', () => {
  it('整張卡只有一個具名稱的正式入口', () => {
    const { container } = render(<GhostAsuraHomeEntry />);
    const link = screen.getByRole('link', { name: '鬼魅阿修羅｜開啟阿修羅秘卷' });
    expect(link).toHaveAttribute('href', '/ghost-asura');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(container.querySelectorAll('button,input,select,textarea,[role="button"]')).toHaveLength(0);
    expect(link.querySelector('a')).toBeNull();
  });
  it('標題、示意與行動文字沿用核定內容', () => {
    render(<GhostAsuraHomeEntry />);
    expect(screen.getByRole('heading', { level: 2, name: '鬼魅阿修羅' })).toBeInTheDocument();
    expect(screen.getByText('四柱印記，點開閱讀力量與駕馭之道。')).toBeInTheDocument();
    expect(screen.getByText('印記示意：五陰纏影')).toBeInTheDocument();
    expect(screen.getByText('請點我開啟')).toBeInTheDocument();
  });
  it.each(['免費', '3 分鐘', '本命阿修羅 · 獨立秘卷', '立即解盤'])('已核定隱藏的文案不回流：%s', text => {
    render(<GhostAsuraHomeEntry />);
    expect(screen.queryByText(text, { exact: true })).not.toBeInTheDocument();
  });
  it('裝飾字不混入無障礙名稱', () => {
    const { container } = render(<GhostAsuraHomeEntry />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(screen.getByRole('link')).toHaveAccessibleName('鬼魅阿修羅｜開啟阿修羅秘卷');
  });
  it('重繪及重新掛載均保持同一示意，沒有另起卦', () => {
    const { container, rerender, unmount } = render(<GhostAsuraHomeEntry />);
    const before = container.innerHTML;
    rerender(<GhostAsuraHomeEntry />);
    expect(container.innerHTML).toBe(before);
    unmount();
    expect(render(<GhostAsuraHomeEntry />).container.innerHTML).toBe(before);
  });
  it.each([360, 390, 430, 1024])('視窗寬度 %i 不改入口與示意資料', width => {
    // JSDOM verifies DOM invariants only, not CSS geometry or touch behavior.
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    render(<GhostAsuraHomeEntry />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ghost-asura');
    expect(screen.getByText('印記示意：五陰纏影')).toBeInTheDocument();
  });
});
