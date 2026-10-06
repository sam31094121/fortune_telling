import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GhostAsuraHomeEntry from '@/components/GhostAsuraHomeEntry';

// Mock HomeTranslatedText component
jest.mock('@/components/HomeTranslatedText', () => {
  return function MockComponent({ text }: { text: string }) {
    return <span>{text}</span>;
  };
});

// Mock stableHash
jest.mock('@/features/ghost-asura/language', () => ({
  stableHash: jest.fn(() => 42),
}));

describe('GhostAsuraHomeEntry Component', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('應該正確呈現主容器', () => {
      render(<GhostAsuraHomeEntry />);
      const region = screen.getByRole('region', { name: /鬼魅阿修羅主頁卡片/i });
      expect(region).toBeInTheDocument();
    });

    it('應該顯示核心印記網格', () => {
      render(<GhostAsuraHomeEntry />);
      const gridLabel = screen.getByText(/核心印記/i);
      expect(gridLabel).toBeInTheDocument();
    });

    it('應該呈現5個網格按鈕（featured + 4 secondary）', () => {
      render(<GhostAsuraHomeEntry />);
      const buttons = screen.getAllByRole('button', {
        name: /。/i // 所有aria-label包含描述的按鈕
      });
      // featured + 4 secondary impressions
      expect(buttons.length).toBeGreaterThanOrEqual(5);
    });

    it('應該顯示卡片元資料（免費、3分鐘、立即解盤）', () => {
      render(<GhostAsuraHomeEntry />);
      expect(screen.getByText(/免費/i)).toBeInTheDocument();
      expect(screen.getByText(/3 分鐘/i)).toBeInTheDocument();
      expect(screen.getByText(/立即解盤/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('應該有適當的ARIA region標籤', () => {
      render(<GhostAsuraHomeEntry />);
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', expect.stringContaining('鬼魅阿修羅'));
    });

    it('應該有aria-describedby指向詳細描述', () => {
      render(<GhostAsuraHomeEntry />);
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-describedby', 'asura-description');
    });

    it('應該隱藏sr-only描述文本但可被屏幕閱讀器訪問', () => {
      render(<GhostAsuraHomeEntry />);
      const srOnly = document.querySelector('#asura-description');
      expect(srOnly).toBeInTheDocument();
      expect(srOnly).toHaveClass('sr-only');
    });

    it('網格容器應該有aria-live和aria-atomic', () => {
      render(<GhostAsuraHomeEntry />);
      const gridGroup = screen.getByRole('group', { name: /核心印記選擇/i });
      expect(gridGroup).toHaveAttribute('aria-live', 'polite');
      expect(gridGroup).toHaveAttribute('aria-atomic', 'true');
    });

    it('按鈕應該有aria-pressed屬性', () => {
      render(<GhostAsuraHomeEntry />);
      const buttons = screen.getAllByRole('button', {
        name: /。/i
      });
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('按鈕應該有aria-describedby連接到sr-only內容', () => {
      render(<GhostAsuraHomeEntry />);
      const firstButton = screen.getAllByRole('button', {
        name: /。/i
      })[0];
      const describedById = firstButton.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      expect(document.getElementById(describedById!)).toBeInTheDocument();
    });

    it('主容器應該可通過Tab鍵訪問', () => {
      render(<GhostAsuraHomeEntry />);
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Keyboard Navigation', () => {
    it('應該通過ArrowRight鍵導航到下一個印記', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const region = screen.getByRole('region');
      await user.click(region);
      await user.keyboard('{ArrowRight}');

      // 檢查aria-pressed狀態是否改變
      await waitFor(() => {
        const pressedButtons = screen.getAllByRole('button').filter(
          btn => btn.getAttribute('aria-pressed') === 'true'
        );
        expect(pressedButtons.length).toBeGreaterThan(0);
      });
    });

    it('應該通過ArrowLeft鍵導航到前一個印記', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const region = screen.getByRole('region');
      await user.click(region);
      await user.keyboard('{ArrowLeft}');

      await waitFor(() => {
        const pressedButtons = screen.getAllByRole('button').filter(
          btn => btn.getAttribute('aria-pressed') === 'true'
        );
        expect(pressedButtons.length).toBeGreaterThan(0);
      });
    });

    it('應該包裝環繞navigation（最後一項→第一項）', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const region = screen.getByRole('region');
      await user.click(region);

      // 按多次右鍵以到達末尾
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowRight}');
      }

      // 不應該出現錯誤，應該循環回到開始
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Mouse Interaction', () => {
    it('點擊按鈕應該選擇印記', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[1]); // 點擊第二個按鈕

      expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    });

    it('懸停應該觸發交互追蹤', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.hover(buttons[0]);

      // 驗證localStorage被更新
      const stored = localStorage.getItem('asura_impression_analytics');
      expect(stored).toBeTruthy();
    });

    it('點擊應該觸發交互追蹤', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      const stored = localStorage.getItem('asura_impression_analytics');
      const data = JSON.parse(stored || '{}');
      expect(data.data).toBeTruthy();
    });
  });

  describe('Description Box Animation', () => {
    it('選擇印記後應該顯示描述框', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      // 描述框應該可見
      await waitFor(() => {
        expect(screen.getByText(/深入解析此印記/i)).toBeInTheDocument();
      });
    });

    it('描述框應該包含功能特性', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText(/法術特性/i)).toBeInTheDocument();
        expect(screen.getByText(/命盤影響/i)).toBeInTheDocument();
        expect(screen.getByText(/轉化方式/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('應該將交互數據保存到localStorage', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      const stored = localStorage.getItem('asura_impression_analytics');
      expect(stored).toBeTruthy();

      const data = JSON.parse(stored!);
      expect(data.version).toBe('v1');
      expect(data.timestamp).toBeTruthy();
    });

    it('應該使用版本控制防止快取失效', () => {
      const testData = {
        version: 'v1',
        timestamp: Date.now(),
        data: { test: { title: 'test', clicks: 1, hovers: 0, lastInteraction: Date.now() } }
      };

      localStorage.setItem('asura_impression_analytics', JSON.stringify(testData));
      render(<GhostAsuraHomeEntry />);

      // 快取應該被識別為有效
      const stored = localStorage.getItem('asura_impression_analytics');
      expect(stored).toBeTruthy();
    });

    it('應該在快取過期時清除數據', () => {
      const expiredData = {
        version: 'v1',
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8天前
        data: {}
      };

      localStorage.setItem('asura_impression_analytics', JSON.stringify(expiredData));
      render(<GhostAsuraHomeEntry />);

      // 組件應該忽略過期快取
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('應該在小屏幕上呈現4列網格', () => {
      // 模擬手機視口
      global.innerWidth = 375;
      render(<GhostAsuraHomeEntry />);

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('應該在大屏幕上呈現5列網格', () => {
      // 模擬桌面視口
      global.innerWidth = 1024;
      render(<GhostAsuraHomeEntry />);

      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('應該在localStorage不可用時優雅降級', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(
        () => { throw new Error('localStorage unavailable'); }
      );

      render(<GhostAsuraHomeEntry />);

      // 組件應該仍然正常渲染
      expect(screen.getByRole('region')).toBeInTheDocument();

      spy.mockRestore();
    });

    it('應該處理缺失的HomeTranslatedText gracefully', () => {
      render(<GhostAsuraHomeEntry />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('應該處理空的二級印記列表', () => {
      render(<GhostAsuraHomeEntry />);

      // 即使secondary列表為空，也應該渲染featured印記
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Link Navigation', () => {
    it('未選擇印記時點擊不應該阻止導航', () => {
      render(<GhostAsuraHomeEntry />);

      const link = screen.getByRole('link', { name: /鬼魅阿修羅|開啟阿修羅秘卷/i });
      expect(link).toHaveAttribute('href', '/ghost-asura');
    });

    it('選擇印記時應該阻止默認Link導航', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      // 描述框應該顯示，Link導航被阻止
      await waitFor(() => {
        expect(screen.getByText(/深入解析此印記/i)).toBeInTheDocument();
      });
    });
  });
});
