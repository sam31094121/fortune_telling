import type { LabRef, LabView } from '../registry';

/**
 * 由影片逐幀追蹤反推出的物體姿態（正交相機、相機固定在 +Z）。
 * within = 影片金線像素落在模型線條 1.5px 內的比例；meanPx = 平均距離。
 * 追蹤程式與原始數據在工作階段暫存區，參考幀檔案不進版控（.gitignore）。
 * 26.5s 未收錄：金線僅 105px、追蹤於 25.9s 後失準，四種對稱姿態都無法同時對上金線與黑點位置。
 */
export const TAIJI_VIEWS: LabView[] = [
  { id: 't37', name: '37.0s 最終正面', quaternion: [0.39659, 0.01212, -0.02016, 0.9177], halfHeight: 1.4493, offset: [-0.0195, 0.02], note: '吻合 98.5%・平均 0.54px' },
  { id: 't11_5', name: '11.5s 正方形視角', quaternion: [0.5002, 0.50353, -0.49944, 0.49681], halfHeight: 1.4171, offset: [-0.0011, -0.0074], note: '吻合 96.1%・平均 0.44px' },
  { id: 't13_25', name: '13.25s 轉開', quaternion: [0.56549, 0.40111, -0.41683, 0.58787], halfHeight: 1.4286, offset: [-0.0043, -0.0131], note: '吻合 100%・平均 0.41px' },
  { id: 't20_2', name: '20.2s 接近正面', quaternion: [-0.38575, -0.07855, 0.1969, -0.89792], halfHeight: 1.4286, offset: [-0.0018, -0.0004], note: '吻合 100%・平均 0.24px' },
  { id: 't24_5', name: '24.5s 正對陽面', quaternion: [-0.05771, -0.01015, 0.2209, -0.97354], halfHeight: 1.4223, offset: [-0.0031, 0.0136], note: '吻合 100%・平均 0.19px' },
  { id: 'cavity_front', name: '本體方口・正面（沿 Y 軸）', quaternion: [Math.SQRT1_2, 0, 0, Math.SQRT1_2], halfHeight: 1.25, offset: [0, 0], note: '內外立方連接投影；原四維等邊，三維投影面不一定為正方形。' },
  { id: 'cavity_left', name: '本體方口・左斜面', quaternion: [0.701057385, 0.092295956, -0.092295956, 0.701057385], halfHeight: 1.25, offset: [0, 0], note: '左斜視檢查內外立方連接與原黑白曲面。' },
  { id: 'cavity_right', name: '本體方口・右斜面', quaternion: [0.701057385, -0.092295956, 0.092295956, 0.701057385], halfHeight: 1.25, offset: [0, 0], note: '右斜視檢查內外立方連接與原黑白曲面。' },
  { id: 'cavity_back', name: '本體方口・背面', quaternion: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2], halfHeight: 1.25, offset: [0, 0], note: '從另一端確認方形通道沒有封底。' },
];

const PIECES = { ghost: false, seam: true, rim: true, black: true, white: true, dotFrontRound: false };

export const TAIJI_REFS: LabRef[] = [
  { id: 'r37', name: '37.0s 最終正面', src: '/model-lab/ref/taiji/t37.png', viewId: 't37', layers: { ...PIECES, dotWhite: true, dotBlack: true, dotsBack: false } },
  { id: 'r37_round', name: '37.0s 最終正面（點改正面圓）', src: '/model-lab/ref/taiji/t37.png', viewId: 't37', layers: { ...PIECES, dotWhite: true, dotBlack: true, dotsBack: false, dotFrontRound: true } },
  { id: 'r11_5', name: '11.5s 正方形＋對角線', src: '/model-lab/ref/taiji/t11_5.png', viewId: 't11_5', layers: { ghost: true, seam: true, rim: true, black: false, white: false, dotWhite: false, dotBlack: false, dotsBack: false, dotFrontRound: false } },
  { id: 'r13_25', name: '13.25s 對角線張開', src: '/model-lab/ref/taiji/t13_25.png', viewId: 't13_25', layers: { ghost: true, seam: true, rim: true, black: false, white: false, dotWhite: false, dotBlack: false, dotsBack: false, dotFrontRound: false } },
  { id: 'r20_2', name: '20.2s 兩片成形', src: '/model-lab/ref/taiji/t20_1667.png', viewId: 't20_2', layers: { ...PIECES, dotWhite: false, dotBlack: false, dotsBack: false } },
  { id: 'r24_5', name: '24.5s 陽面與黑點', src: '/model-lab/ref/taiji/t24_5.png', viewId: 't24_5', layers: { ...PIECES, dotWhite: false, dotBlack: true, dotsBack: false } },
];
