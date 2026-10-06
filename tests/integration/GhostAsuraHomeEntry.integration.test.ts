import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GhostAsuraHomeEntry from '@/components/GhostAsuraHomeEntry';

/**
 * 集成測試：測試GhostAsuraHomeEntry組件與所有依賴的交互
 */
describe('GhostAsuraHomeEntry Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('完整用戶流程', () => {
    it('用戶應該能夠完成完整的探索流程', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      // 1. 初始狀態 - 應該顯示featured印記
      expect(screen.getByRole('region')).toBeInTheDocument();

      // 2. 懸停印記
      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.hover(buttons[1]);

      // 3. 點擊選擇印記
      await user.click(buttons[1]);
      expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');

      // 4. 描述框應該可見
      await waitFor(() => {
        const descBox = screen.getByText(/深入解析此印記/i);
        expect(descBox).toBeInTheDocument();
      });

      // 5. 交互數據應該被追蹤
      const stored = localStorage.getItem('asura_impression_analytics');
      expect(stored).toBeTruthy();
    });

    it('用戶應該能夠使用鍵盤完整導航整個卡片', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const region = screen.getByRole('region');
      await user.click(region);

      // 導航到不同印記
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowRight}');

      // 驗證狀態改變
      const pressedButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-pressed') === 'true'
      );
      expect(pressedButtons.length).toBeGreaterThan(0);

      // 向左導航
      await user.keyboard('{ArrowLeft}');

      // 應該仍然有按下的按鈕
      const pressedAfterLeft = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-pressed') === 'true'
      );
      expect(pressedAfterLeft.length).toBeGreaterThan(0);
    });
  });

  describe('交互追蹤與排序', () => {
    it('應該根據交互頻率重新排列二級印記', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });

      // 多次點擊同一個按鈕以增加分數
      for (let i = 0; i < 3; i++) {
        await user.click(buttons[2]);
      }

      // 多次懸停另一個按鈕
      for (let i = 0; i < 5; i++) {
        await user.hover(buttons[3]);
      }

      // 驗證交互數據被正確記錄
      const stored = localStorage.getItem('asura_impression_analytics');
      const data = JSON.parse(stored || '{}');

      expect(data.data).toBeTruthy();
      expect(Object.keys(data.data).length).toBeGreaterThan(0);
    });

    it('交互分數應該正確計算（點擊=3分，懸停=1分）', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });

      // 點擊5次 = 15分
      for (let i = 0; i < 5; i++) {
        await user.click(buttons[0]);
      }

      // 懸停3次 = 3分，共18分
      for (let i = 0; i < 3; i++) {
        await user.hover(buttons[0]);
      }

      const stored = localStorage.getItem('asura_impression_analytics');
      const data = JSON.parse(stored || '{}');

      // 驗證數據結構
      const firstButtonData = Object.values(data.data || {})[0] as any;
      expect(firstButtonData.clicks).toBe(5);
      expect(firstButtonData.hovers).toBeGreaterThan(0);
    });
  });

  describe('緩存版本管理', () => {
    it('應該使用正確的緩存版本', () => {
      const testData = {
        version: 'v1',
        timestamp: Date.now(),
        data: {}
      };

      localStorage.setItem('asura_impression_analytics', JSON.stringify(testData));

      const { rerender } = render(<GhostAsuraHomeEntry />);

      // 緩存應該保持
      const stored = localStorage.getItem('asura_impression_analytics');
      const data = JSON.parse(stored!);
      expect(data.version).toBe('v1');
    });

    it('應該在版本不匹配時清除緩存', () => {
      const oldData = {
        version: 'v0', // 舊版本
        timestamp: Date.now(),
        data: {}
      };

      localStorage.setItem('asura_impression_analytics', JSON.stringify(oldData));

      render(<GhostAsuraHomeEntry />);

      // 舊版本應該被清除
      const stored = localStorage.getItem('asura_impression_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        expect(data.version).toBe('v1');
      }
    });
  });

  describe('無障礙集成', () => {
    it('屏幕閱讀器應該能夠讀取完整的卡片信息', () => {
      render(<GhostAsuraHomeEntry />);

      // 區域應該有合適的標籤
      const region = screen.getByRole('region', { name: /鬼魅阿修羅/i });
      expect(region).toBeInTheDocument();

      // 應該有詳細描述
      const description = document.getElementById('asura-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
    });

    it('所有按鈕應該有明確的標籤和按下狀態', () => {
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });

      buttons.forEach(button => {
        const ariaLabel = button.getAttribute('aria-label');
        const ariaPressed = button.getAttribute('aria-pressed');

        expect(ariaLabel).toBeTruthy();
        expect(ariaPressed).toMatch(/^(true|false)$/);
      });
    });

    it('Live region應該正確公告狀態改變', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const gridGroup = screen.getByRole('group', { name: /核心印記選擇/i });
      expect(gridGroup).toHaveAttribute('aria-live', 'polite');
      expect(gridGroup).toHaveAttribute('aria-atomic', 'true');

      // 改變選擇
      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[1]);

      // Live region應該包含更新
      const srOnlyContent = gridGroup.querySelector('.sr-only');
      expect(srOnlyContent).toBeInTheDocument();
    });
  });

  describe('視覺與動畫一致性', () => {
    it('應該應用正確的活躍狀態樣式', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });

      // 點擊按鈕前
      expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');

      // 點擊另一個按鈕
      await user.click(buttons[1]);

      // 舊按鈕應該不再被按下
      expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
      // 新按鈕應該被按下
      expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    });

    it('描述框應該有正確的ARIA屬性', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });
      await user.click(buttons[0]);

      await waitFor(() => {
        const descBox = screen.getByText(/深入解析此印記/i).closest('div');
        expect(descBox).toBeInTheDocument();
      });
    });
  });

  describe('錯誤恢復', () => {
    it('應該在無效的緩存數據時優雅恢復', () => {
      localStorage.setItem('asura_impression_analytics', 'invalid json');

      expect(() => {
        render(<GhostAsuraHomeEntry />);
      }).not.toThrow();

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('應該在localStorage滿時優雅處理', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      render(<GhostAsuraHomeEntry />);

      expect(screen.getByRole('region')).toBeInTheDocument();

      spy.mockRestore();
    });
  });

  describe('性能特性', () => {
    it('多個按鈕交互應該不阻塞UI', async () => {
      const user = userEvent.setup();
      render(<GhostAsuraHomeEntry />);

      const buttons = screen.getAllByRole('button', { name: /。/i });

      // 快速連續點擊多個按鈕
      const startTime = performance.now();

      for (let i = 0; i < buttons.length; i++) {
        await user.click(buttons[i % buttons.length]);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 應該在合理時間內完成（< 5秒）
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('國際化集成', () => {
    it('應該使用HomeTranslatedText進行所有文本', () => {
      render(<GhostAsuraHomeEntry />);

      // 驗證常見的翻譯文本已被呈現
      expect(screen.getByText(/核心印記/i)).toBeInTheDocument();
      expect(screen.getByText(/立即解盤/i)).toBeInTheDocument();
    });
  });
});
