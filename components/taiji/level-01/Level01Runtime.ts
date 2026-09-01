export type Level01GameState =
  | 'IDLE'
  | 'PERMISSION'
  | 'CALIBRATING'
  | 'READY'
  | 'ACTIVE'
  | 'UNBALANCED'
  | 'APPROACHING'
  | 'BALANCED'
  | 'HOLDING'
  | 'LOCKED'
  | 'LEVEL_COMPLETE'
  | 'SENSOR_LOST'
  | 'LOW_PERFORMANCE'
  | 'FALLBACK';

export type QualityLevel = 'ULTRA' | 'HIGH' | 'BALANCED' | 'LOW';

export type Level01GameEvent = 'BALANCE_ENTER' | 'BALANCE_BREAK' | 'LOCK_COMPLETE' | null;

export interface Level01Score {
  balanceAccuracy: number;
  motionControl: number;
  stability: number;
  completionTimeMs: number;
  overall: number;
}

export interface Level01Runtime {
  gameState: Level01GameState;
  orientation: { alpha: number; beta: number; gamma: number };
  physics: {
    angularVelocity: number;
    angularMomentum: number;
    motionEnergy: number;
    tiltMagnitude: number;
  };
  balance: {
    progress: number;
    holdProgress: number;
    locked: boolean;
    combo: number;
  };
  performance: {
    fps: number;
    quality: QualityLevel;
  };
  score: Level01Score;
}

export function level01StateMessage(state: Level01GameState) {
  switch (state) {
    case 'IDLE': return '讓動盪的太極回到中心';
    case 'PERMISSION': return '正在取得手機姿態權限';
    case 'CALIBRATING': return '正在感應你的方向';
    case 'READY': return '太極已甦醒';
    case 'ACTIVE': return '先動，再控制，最後歸於靜';
    case 'UNBALANCED': return '感受動能，慢慢帶回中心';
    case 'APPROACHING': return '正在接近平衡';
    case 'BALANCED': return '找到中心了';
    case 'HOLDING': return '保持穩定';
    case 'LOCKED': return '中心已定';
    case 'LEVEL_COMPLETE': return '第一層・平衡完成';
    case 'SENSOR_LOST': return '暫時失去手機姿態感應';
    case 'LOW_PERFORMANCE': return '已自動降低畫質，保持流暢';
    case 'FALLBACK': return '拖曳太極，讓它回到中心';
  }
}
