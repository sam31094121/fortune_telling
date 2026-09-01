import { LEVEL_COMPLETE_DELAY_MS, LOCKED_HOLD_MS } from './level01.constants';
import { level01StateMessage, type Level01GameEvent, type Level01GameState, type Level01Score } from './Level01Runtime';
import type { Level01BalanceState } from './Level01BalanceEngine';

export type Level01GameSnapshot = {
  state: Level01GameState;
  message: string;
  combo: number;
  holdProgress: number;
  score: Level01Score;
  event: Level01GameEvent;
};

const EMPTY_SCORE: Level01Score = {
  balanceAccuracy: 0,
  motionControl: 0,
  stability: 0,
  completionTimeMs: 0,
  overall: 0,
};

export class Level01GameController {
  private state: Level01GameState = 'IDLE';
  private stateEnteredAt = 0;
  private sessionStartedAt = 0;
  private lockedAt = -1;
  private combo = 0;
  private lastBalanceState: Level01BalanceState = 'UNBALANCED';
  private event: Level01GameEvent = null;
  private samples = 0;
  private balanceTotal = 0;
  private controlTotal = 0;
  private stabilityTotal = 0;
  private score: Level01Score = { ...EMPTY_SCORE };
  private resumableState: Level01GameState = 'ACTIVE';
  private fallbackSession = false;
  private awakened = false;

  beginPermission(now: number) {
    this.resetSession(now);
    this.fallbackSession = false;
    this.transition('PERMISSION', now);
  }

  beginCalibration(now: number) {
    this.transition('CALIBRATING', now);
  }

  ready(now: number) {
    this.transition('READY', now);
  }

  activate(now: number) {
    if (this.state === 'READY' || this.state === 'FALLBACK') this.transition('ACTIVE', now);
  }

  fallback(now: number) {
    this.fallbackSession = true;
    this.transition('FALLBACK', now);
  }

  sensorLost(now: number) {
    if (this.isFinished()) return;
    this.transition('SENSOR_LOST', now);
  }

  lowPerformance(active: boolean, now: number) {
    if (this.isFinished()) return;
    if (active && this.state !== 'LOW_PERFORMANCE') {
      this.resumableState = this.state;
      this.transition('LOW_PERFORMANCE', now);
    } else if (!active && this.state === 'LOW_PERFORMANCE') {
      this.transition(this.resumableState === 'LOW_PERFORMANCE' ? 'ACTIVE' : this.resumableState, now);
    }
  }

  exit(now: number) {
    this.transition('IDLE', now);
  }

  sync(input: {
    balanceState: Level01BalanceState;
    balanceProgress: number;
    holdProgress: number;
    motionEnergy: number;
    now: number;
  }) {
    this.event = null;
    if (this.state === 'READY') {
      if (input.now - this.stateEnteredAt < 420) return this.snapshot(input.holdProgress);
      this.transition('ACTIVE', input.now);
    }
    if (this.state === 'LEVEL_COMPLETE' || this.state === 'IDLE' || this.state === 'PERMISSION' || this.state === 'CALIBRATING' || this.state === 'SENSOR_LOST') {
      return this.snapshot(input.holdProgress);
    }

    if (!this.awakened) {
      this.awakened = input.motionEnergy >= 0.14 || input.balanceProgress < 0.7;
      if (!this.awakened) {
        this.transition(this.fallbackSession ? 'FALLBACK' : 'ACTIVE', input.now, false);
        return this.snapshot(0);
      }
    }

    if (this.state !== 'LOW_PERFORMANCE') {
      const mapped = input.balanceState;
      if (mapped !== this.lastBalanceState) {
        if (mapped === 'BALANCED' || mapped === 'HOLDING') {
          this.combo = Math.min(9, this.combo + 1);
          this.event = 'BALANCE_ENTER';
        } else if ((this.lastBalanceState === 'BALANCED' || this.lastBalanceState === 'HOLDING') && mapped !== 'LOCKED') {
          this.combo = 0;
          this.event = 'BALANCE_BREAK';
        }
      }
      this.lastBalanceState = mapped;
      if (mapped === 'LOCKED') {
        if (this.lockedAt < 0) {
          this.lockedAt = input.now;
          this.event = 'LOCK_COMPLETE';
        }
        this.transition('LOCKED', input.now, false);
        if (input.now - this.lockedAt >= LEVEL_COMPLETE_DELAY_MS) {
          this.finish(input.now);
        }
      } else {
        this.lockedAt = -1;
        this.transition(this.fallbackSession ? 'FALLBACK' : mapped, input.now, false);
      }
    }

    this.samples += 1;
    this.balanceTotal += input.balanceProgress;
    this.controlTotal += 1 - Math.min(1, Math.abs(input.motionEnergy - Math.max(0.08, 1 - input.balanceProgress)));
    this.stabilityTotal += input.balanceState === 'HOLDING' || input.balanceState === 'LOCKED' ? 1 : input.balanceProgress * 0.55;
    this.score = this.calculateScore(input.now);
    return this.snapshot(input.holdProgress);
  }

  snapshot(holdProgress = 0): Level01GameSnapshot {
    return {
      state: this.state,
      message: level01StateMessage(this.state),
      combo: this.combo,
      holdProgress: this.state === 'LOCKED' || this.state === 'LEVEL_COMPLETE' ? 1 : Math.max(0, Math.min(1, holdProgress)),
      score: { ...this.score },
      event: this.event,
    };
  }

  isFinished() {
    return this.state === 'LEVEL_COMPLETE';
  }

  private transition(next: Level01GameState, now: number, resetEnteredAt = true) {
    if (this.state === next) return;
    this.state = next;
    if (resetEnteredAt) this.stateEnteredAt = now;
  }

  private resetSession(now: number) {
    this.sessionStartedAt = now;
    this.lockedAt = -1;
    this.combo = 0;
    this.samples = 0;
    this.balanceTotal = 0;
    this.controlTotal = 0;
    this.stabilityTotal = 0;
    this.score = { ...EMPTY_SCORE };
    this.lastBalanceState = 'UNBALANCED';
    this.awakened = false;
  }

  private finish(now: number) {
    this.transition('LEVEL_COMPLETE', now);
    this.score = this.calculateScore(now);
  }

  private calculateScore(now: number): Level01Score {
    if (this.samples === 0) return { ...EMPTY_SCORE };
    const balanceAccuracy = Math.round(this.balanceTotal / this.samples * 100);
    const motionControl = Math.round(this.controlTotal / this.samples * 100);
    const stability = Math.round(this.stabilityTotal / this.samples * 100);
    const completionTimeMs = this.sessionStartedAt > 0 ? Math.max(0, now - this.sessionStartedAt) : 0;
    const timeBonus = Math.max(55, 100 - Math.max(0, completionTimeMs - LOCKED_HOLD_MS) / 180);
    return {
      balanceAccuracy,
      motionControl,
      stability,
      completionTimeMs: Math.round(completionTimeMs),
      overall: Math.round(balanceAccuracy * 0.38 + motionControl * 0.27 + stability * 0.25 + timeBonus * 0.1),
    };
  }
}
