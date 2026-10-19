import { describe, it, expect } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import GhostAsuraHomeEntry from '@/components/GhostAsuraHomeEntry';
expect.extend(toHaveNoViolations);

describe('單一入口無障礙', () => {
  it('執行 axe 所有預設可自動化規則，零違規', async () => {
    const { container } = render(<GhostAsuraHomeEntry />);
    expect(await axe(container)).toHaveNoViolations();
  });
  it.each(['aria-allowed-attr', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-roles', 'heading-order', 'link-name', 'tabindex', 'duplicate-id', 'image-alt'])('合法 axe 規則：%s', async rule => {
    const { container } = render(<GhostAsuraHomeEntry />);
    expect(await axe(container, { runOnly: { type: 'rule', values: [rule] } })).toHaveNoViolations();
  });
  it('鍵盤能移入及移出，無鍵盤陷阱', async () => {
    const user = userEvent.setup();
    render(<><button>前一項</button><GhostAsuraHomeEntry /><button>後一項</button></>);
    await user.tab();
    expect(screen.getByRole('button', { name: '前一項' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '後一項' })).toHaveFocus();
  });
  it('用途由可存取名稱及實際目的地共同表達', () => {
    render(<GhostAsuraHomeEntry />);
    expect(screen.getByRole('link')).toHaveAccessibleName('鬼魅阿修羅｜開啟阿修羅秘卷');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ghost-asura');
  });
  // JSDOM has no layout: contrast, visible focus, reduced motion and forced
  // colors require real-browser/manual verification. Do not label them passed
  // using nonexistent axe rules or a mere container existence assertion.
});
