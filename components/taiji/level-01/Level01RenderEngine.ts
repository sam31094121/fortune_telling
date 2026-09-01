import { level01BubbleOffset, type PhysicsState } from './Level01Physics';
import type { QualityLevel } from './Level01Runtime';

export class Level01RenderEngine {
  private bubble: HTMLElement | null = null;

  bindBubble(element: HTMLElement | null) {
    this.bubble = element;
  }

  render(state: PhysicsState, visualMomentum: number, balanceProgress: number, holdProgress: number, quality: QualityLevel) {
    const bubble = this.bubble;
    if (!bubble) return;
    const x = level01BubbleOffset(state.gamma);
    const y = level01BubbleOffset(state.beta);
    bubble.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`;
    const shadow = bubble.parentElement;
    if (!shadow) return;
    const tilt = Math.hypot(state.beta, state.gamma);
    const energy = Math.max(state.motionEnergy, visualMomentum * 0.72);
    shadow.style.setProperty('--shadow-shift-x', `${(x * 0.32).toFixed(2)}px`);
    shadow.style.setProperty('--shadow-shift-y', `${(y * 0.12).toFixed(2)}px`);
    shadow.style.setProperty('--shadow-spread', `${(1 + Math.min(0.14, tilt * 0.008 + energy * 0.08)).toFixed(3)}`);
    shadow.style.setProperty('--shadow-opacity', `${(0.72 - Math.min(0.2, energy * 0.16)).toFixed(3)}`);
    shadow.style.setProperty('--shadow-glow', `${(0.42 + Math.min(0.3, energy * 0.24)).toFixed(3)}`);
    shadow.style.setProperty('--shadow-angle', `${Math.max(-3, Math.min(3, state.gamma * 0.08)).toFixed(2)}deg`);
    shadow.style.setProperty('--particle-drift-x', `${(x * 0.2).toFixed(2)}px`);
    shadow.style.setProperty('--particle-drift-y', `${(y * 0.16).toFixed(2)}px`);
    shadow.style.setProperty('--particle-opacity', `${(0.3 + Math.min(0.22, energy * 0.2 + tilt * 0.006)).toFixed(3)}`);
    shadow.style.setProperty('--pair-gap', `${(8 + Math.min(5, tilt * 0.13 + energy * 2)).toFixed(2)}px`);
    shadow.style.setProperty('--pair-angle', `${Math.max(-8, Math.min(8, state.gamma * 0.22)).toFixed(2)}deg`);
    shadow.style.setProperty('--shadow-rise', `${(-Math.min(5, tilt * 0.42)).toFixed(2)}px`);
    shadow.style.setProperty('--shadow-depth', `${(1 - Math.min(0.16, Math.abs(state.beta) * 0.012)).toFixed(3)}`);
    shadow.style.setProperty('--balance-progress', `${Math.max(0, Math.min(1, balanceProgress))}`);
    shadow.style.setProperty('--hold-progress', `${Math.max(0, Math.min(1, holdProgress))}`);
    shadow.dataset.quality = quality;
  }
}
