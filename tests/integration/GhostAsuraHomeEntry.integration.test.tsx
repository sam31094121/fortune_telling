import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GhostAsuraHomeEntry from '@/components/GhostAsuraHomeEntry';

describe('現行入口整合：真翻譯元件、鍵盤及資料不變', () => {
  beforeEach(() => { localStorage.clear(); });
  it('Tab 只停入口一次，下一次離開；反向 Tab 可返回', async () => {
    const user = userEvent.setup();
    render(<><GhostAsuraHomeEntry /><button>後續功能</button></>);
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '後續功能' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('link')).toHaveFocus();
  });
  it.each(['鬼魅阿修羅', '印記示意：五陰纏影', '請點我開啟'])('點擊 %s 冒泡到同一入口且元件沒有攔截', text => {
    render(<GhostAsuraHomeEntry />);
    const link = screen.getByRole('link');
    const seen: boolean[] = [];
    // Inspect before stopping JSDOM's unsupported navigation. This listener is
    // on document, after React's root event handling, not a mocked Next Link.
    const capture = (event: MouseEvent) => { seen.push(event.defaultPrevented); event.preventDefault(); };
    document.addEventListener('click', capture, { once: true });
    fireEvent.click(screen.getByText(text, { exact: true }));
    expect(seen).toEqual([false]);
    expect(link).toHaveAttribute('href', '/ghost-asura');
  });
  it('瀏覽、懸停、鍵盤不寫入舊分析快取或客戶收藏', async () => {
    const stored = '{"version":"v0","data":{"old":1}}';
    localStorage.setItem('asura_impression_analytics', stored);
    localStorage.setItem('tdh_beast_collection_v1', 'synthetic-preserve');
    const write = jest.spyOn(Storage.prototype, 'setItem');
    const remove = jest.spyOn(Storage.prototype, 'removeItem');
    const clear = jest.spyOn(Storage.prototype, 'clear');
    const user = userEvent.setup();
    const { unmount } = render(<GhostAsuraHomeEntry />);
    await user.hover(screen.getByRole('link'));
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    unmount();
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(localStorage.getItem('asura_impression_analytics')).toBe(stored);
    expect(localStorage.getItem('tdh_beast_collection_v1')).toBe('synthetic-preserve');
  });
  it.each(['invalid json', '{"version":"v1","timestamp":0}', ''])('舊快取不影響現行入口：%s', value => {
    localStorage.setItem('asura_impression_analytics', value);
    render(<GhostAsuraHomeEntry />);
    expect(screen.getByText('印記示意：五陰纏影')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ghost-asura');
    expect(localStorage.getItem('asura_impression_analytics')).toBe(value);
  });
  it('儲存空間不可用仍可進入，不吞掉入口', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<GhostAsuraHomeEntry />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ghost-asura');
  });
});
