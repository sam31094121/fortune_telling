import { act, renderHook } from '@testing-library/react';
import { useDropPlayback } from '../../components/nine-grid/useDropPlayback';
import { usePlaybackFinish, FINISH_MS } from '../../components/nine-grid/usePlaybackFinish';
import { usePlaybackViewport } from '../../components/nine-grid/usePlaybackViewport';

describe('九宮格分段播放', () => {
  let reduce = false;
  let listeners: Set<() => void>;
  beforeEach(() => {
    jest.useFakeTimers(); reduce = false; listeners = new Set();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({
      get matches() { return reduce; },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }) });
  });
  afterEach(() => { jest.useRealTimers(); });
  const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  test('最後一位飛行前不累加，落地後停留，再完成；重播從零開始', () => {
    const { result } = renderHook(() => useDropPlayback(1));
    advance(300); expect(result.current.shown).toBe(0);
    advance(849); expect(result.current.shown).toBe(0);
    advance(1); expect(result.current.shown).toBe(1);
    expect(result.current.playing).toBe(true);
    advance(349); expect(result.current.playing).toBe(true);
    advance(1); expect(result.current.playing).toBe(false);
    act(() => result.current.setStep(0));
    expect(result.current.shown).toBe(0);
    expect(result.current.landed).toBe(false);
    advance(1150); expect(result.current.shown).toBe(1);
  });

  test('跳過與重播清除上一輪計時，不會跳位或超過總數', () => {
    const { result } = renderHook(() => useDropPlayback(8));
    advance(500);
    act(() => result.current.setStep(8));
    advance(2000); expect(result.current.step).toBe(8);
    act(() => result.current.setStep(0));
    for (let i = 0; i < 8; i++) advance(1500);
    expect(result.current.shown).toBe(8);
    expect(result.current.playing).toBe(false);
  });

  test('減少動態直接顯示全部，重播與播放途中變更偏好也適用', () => {
    reduce = true;
    const { result } = renderHook(() => useDropPlayback(10));
    expect(result.current.shown).toBe(10);
    act(() => result.current.setStep(0));
    expect(result.current.shown).toBe(10);
    reduce = false;
    act(() => result.current.setStep(0));
    advance(400);
    act(() => { reduce = true; listeners.forEach((fn) => fn()); });
    expect(result.current.shown).toBe(10);
    advance(5000); expect(result.current.step).toBe(10);
  });

  test('隱藏分頁不播放，卸載取消計時', () => {
    const { result, rerender, unmount } = renderHook(({ enabled }) => useDropPlayback(2, enabled), { initialProps: { enabled: false } });
    advance(5000); expect(result.current.step).toBe(0);
    rerender({ enabled: true }); advance(1500);
    expect(result.current.step).toBe(1);
    unmount(); expect(jest.getTimerCount()).toBe(0);
  });

  test('先定位且完整可見才播放；離開視窗暫停，不拉回使用者', () => {
    const element = document.createElement('div');
    let top = 1000;
    element.getBoundingClientRect = () => ({ top, bottom: top + 500 } as DOMRect);
    const scroll = jest.fn(() => { top = 12; });
    element.scrollIntoView = scroll;
    const ref = { current: element };
    const { result, rerender } = renderHook(({ request }) => {
      const ready = usePlaybackViewport(ref, request, true);
      return { ready, playback: useDropPlayback(10, ready) };
    }, { initialProps: { request: 0 } });
    expect(result.current.ready).toBe(false);
    expect(result.current.playback.shown).toBe(0);
    advance(40); expect(result.current.ready).toBe(true);
    expect(scroll.mock.calls.length).toBe(1);
    advance(300);
    act(() => { top = -200; window.dispatchEvent(new Event('scroll')); });
    expect(result.current.ready).toBe(false);
    advance(5000); expect(result.current.playback.shown).toBe(0);
    expect(scroll.mock.calls.length).toBe(1);
    rerender({ request: 1 }); advance(40);
    expect(scroll.mock.calls.length).toBe(2);
    expect(result.current.ready).toBe(true);
  });

  test('暫停保留剩餘飛行時間，繼續不重複加數', () => {
    const { result } = renderHook(() => useDropPlayback(2));
    advance(500); act(() => result.current.setPaused(true));
    advance(5000); expect(result.current.shown).toBe(0);
    expect(result.current.flightVisible).toBe(true);
    act(() => result.current.setPaused(false));
    advance(649); expect(result.current.shown).toBe(0);
    advance(1); expect(result.current.shown).toBe(1);
    advance(350); expect(result.current.step).toBe(1);
  });
  test('逐步每次只落一位，切回自動不重複；最後一位與重播一致', () => {
    const { result } = renderHook(() => useDropPlayback(3));
    act(() => result.current.setMode('manual'));
    advance(5000); expect(result.current.shown).toBe(0);
    act(() => result.current.next()); advance(1500);
    expect(result.current.shown).toBe(1);
    advance(5000); expect(result.current.shown).toBe(1);
    act(() => result.current.next()); advance(1500);
    expect(result.current.shown).toBe(2);
    act(() => result.current.setMode('auto')); advance(1); advance(1500);
    expect(result.current.step).toBe(3);
    act(() => { result.current.setMode('manual'); result.current.setStep(0); });
    expect(result.current.shown).toBe(0);
    for (let i=0;i<3;i++) { act(() => result.current.next()); advance(1500); }
    expect(result.current.step).toBe(3);
    act(() => result.current.next()); expect(result.current.step).toBe(3);
  });
  test('逐步減少動態仍一次一位，飛行中切換偏好只完成當步', () => {
    const { result } = renderHook(() => useDropPlayback(2));
    act(() => result.current.setMode('manual'));
    reduce = true;
    act(() => result.current.next()); expect(result.current.shown).toBe(1);
    advance(5000); expect(result.current.shown).toBe(1);
    reduce = false;
    act(() => result.current.next()); advance(400);
    act(() => { reduce = true; listeners.forEach((fn) => fn()); });
    expect(result.current.step).toBe(2);
  });

  test('最後落地後只收尾一次再顯示結果；重播清理收尾，略過即顯示', () => {
    const { result } = renderHook(() => {
      const player = useDropPlayback(1);
      return { player, finish: usePlaybackFinish(player.step === 1, player.animateFinish, player.run) };
    });
    advance(1150); expect(result.current.finish.closing).toBe(false);
    advance(350); expect(result.current.finish.closing).toBe(true);
    expect(result.current.finish.showResult).toBe(false);
    advance(FINISH_MS - 1); expect(result.current.finish.showResult).toBe(false);
    advance(1); expect(result.current.finish.showResult).toBe(true);
    act(() => result.current.player.setMode('manual'));
    expect(result.current.finish.closing).toBe(false);
    act(() => { result.current.player.setMode('auto'); result.current.player.setStep(0); });
    advance(1500); expect(result.current.finish.closing).toBe(true);
    act(() => result.current.player.setStep(0));
    advance(FINISH_MS); expect(result.current.finish.showResult).toBe(false);
    act(() => result.current.player.setStep(1));
    expect(result.current.finish.closing).toBe(false);
    expect(result.current.finish.showResult).toBe(true);
  });
  test('減少動態略過收尾，收尾中切換偏好立即顯示結果', () => {
    const { result } = renderHook(() => {
      const player = useDropPlayback(1);
      return { player, finish: usePlaybackFinish(player.step === 1, player.animateFinish, player.run) };
    });
    advance(1500); expect(result.current.finish.closing).toBe(true);
    act(() => { reduce = true; listeners.forEach((fn) => fn()); });
    expect(result.current.finish.showResult).toBe(true);
    act(() => result.current.player.setStep(0));
    expect(result.current.finish.showResult).toBe(true);
    expect(result.current.finish.closing).toBe(false);
    act(() => { result.current.player.setMode('manual'); result.current.player.setStep(0); });
    act(() => result.current.player.next());
    expect(result.current.finish.showResult).toBe(true);
  });
});
