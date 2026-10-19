import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EasyFirstMatchup from '@/components/battlefield/EasyFirstMatchup';
import type { ElementCell } from '@/lib/beast-game/guide-book';

const advantage: ElementCell = { kind: 'ADVANTAGE', multiplier: 1.2, headline: '風剋地．你占上風', reason: 'server explanation', percent: '+20%' };
beforeEach(() => localStorage.clear());

test('first real matchup uses server text once; neutral, animation, later turns and remount stay quiet', () => {
  const { rerender, unmount } = render(<EasyFirstMatchup matchup={{...advantage,kind:'NEUTRAL'}} turn="1:1" enabled />);
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<EasyFirstMatchup matchup={advantage} turn="1:2" enabled={false} />);
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<EasyFirstMatchup matchup={advantage} turn="1:2" enabled />);
  expect(screen.getByRole('status')).toHaveTextContent(advantage.headline);
  rerender(<EasyFirstMatchup matchup={advantage} turn="1:3" enabled />);
  expect(screen.queryByRole('status')).toBeNull();
  unmount();
  render(<EasyFirstMatchup matchup={advantage} turn="2:1" enabled />);
  expect(screen.queryByRole('status')).toBeNull();
});

test('unavailable storage does not break the battle or repeat the hint every turn', () => {
  jest.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
  const { rerender } = render(<EasyFirstMatchup matchup={advantage} turn="1:1" enabled />);
  expect(screen.getByRole('status')).toHaveTextContent(advantage.headline);
  rerender(<EasyFirstMatchup matchup={advantage} turn="1:2" enabled />);
  expect(screen.queryByRole('status')).toBeNull();
});
