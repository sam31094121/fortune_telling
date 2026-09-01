const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const overlay = read('components/taiji/level-01/Level01Taiji.tsx');
const styles = read('components/taiji/level-01/level01.module.css');
const controller = read('components/taiji/level-01/Level01MotionController.ts');
const audio = read('components/taiji/level-01/Level01Audio.ts');
const haptics = read('components/taiji/level-01/Level01Haptics.ts');
const runtime = read('components/taiji/level-01/Level01Runtime.ts');
const quality = read('components/taiji/level-01/Level01QualityManager.ts');
const sensor = read('components/taiji/level-01/Level01SensorController.ts');
const errorBoundary = read('components/taiji/level-01/Level01ErrorBoundary.tsx');

if (!overlay.includes('LEVEL_01 UI SCOPE LOCK')) throw new Error('level 01 scope lock comment is required');
if (!overlay.includes('啟動太極') || !styles.includes('.startButton')) throw new Error('level 01 must expose the explicit central activation ritual');
if (!overlay.includes('data-level01-surface="dynamic-shadow"')) throw new Error('level 01 must keep its dynamic shadow surface');
if (!overlay.includes('data-level01-layer="world-reference"') || !styles.includes('.worldReference')) throw new Error('fixed world-reference direction layer is required');
if (!overlay.includes('data-level01-layer="energy-field"') || !overlay.includes('data-level01-layer="balance-ring"')) throw new Error('energy field and balance ring layers are required');
if (!styles.includes('--balance-angle') || !styles.includes('--hold-angle')) throw new Error('balance and hold progress must drive the ring');
if (!overlay.includes('重新校正') || !overlay.includes('重新連接') || !overlay.includes('改用拖曳')) throw new Error('recalibration and sensor-loss recovery controls are required');
if (!overlay.includes('拖曳控制太極平衡') || !controller.includes('beginPointer') || !controller.includes('updatePointer')) throw new Error('desktop/touch fallback must preserve the same balancing objective');
if (!overlay.includes('第一層必要控制') || !overlay.includes('退出') || !overlay.includes('音效開')) throw new Error('active mode must expose only essential controls');
if (!runtime.includes("| 'HOLDING'") || !runtime.includes("| 'SENSOR_LOST'") || !runtime.includes("| 'LOW_PERFORMANCE'")) throw new Error('complete game-state vocabulary is required');
if (!sensor.includes('SENSOR_SPIKE_THRESHOLD_DEG') || !sensor.includes('unwrapAngle') || !sensor.includes('SENSOR_DEAD_ZONE_DEG')) throw new Error('sensor fusion must reject spikes, unwrap headings, and apply a dead zone');
if (!quality.includes('QUALITY_RECOVER_HOLD_MS') || !quality.includes("this.quality = 'LOW'")) throw new Error('adaptive quality must include hysteresis and an immediate low-quality guard');
if (!audio.includes('DynamicsCompressorNode') || !audio.includes('ambientOsc') || !audio.includes('balanceOsc')) throw new Error('audio must include limited ambient, motion, and balance layers');
if (!controller.includes('Level01RuntimeBoundary') || !errorBoundary.includes('getDerivedStateFromError')) throw new Error('level 01 errors must be contained locally');
if (!haptics.includes('gameEvent') || !haptics.includes('armedByUserGesture')) throw new Error('haptics must be event-driven and gesture-gated');
if (!styles.includes('aspect-ratio: 1') || !styles.includes("data-level01-quality='LOW'")) throw new Error('level 01 must reserve layout and expose quality-specific visual reductions');
if (overlay.includes("window.addEventListener('pointerdown'") || overlay.includes("window.addEventListener('touchstart'")) throw new Error('sensor permission must not be requested from an unrelated page gesture');

console.log('Taiji Level 01 UI boundary passed');
