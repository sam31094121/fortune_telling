const { exec } = require('child_process');
const http = require('http');

console.log('☯️ [天宿分享企劃] 正在啟動 Facebook / LINE 外網太極預覽通道...');
console.log('💡 提示：因為 Facebook 和 LINE 機器人無法讀取你電腦的 localhost，必須建立一條臨時外網安全通道。');

const checkDevServer = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:8888', (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
};

const main = async () => {
  const isRunning = await checkDevServer();
  if (!isRunning) {
    console.log('⚠️ 檢測到 localhost:8888 開發伺服器尚未啟動！');
    console.log('🚀 正在為您背景啟動 Next.js 開發伺服器...');
    exec('npm run dev', { cwd: process.cwd() });
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  console.log('⚡ 正在建立外網穿透隧道...');
  // 使用 localtunnel 來建立外網連接埠對應
  const lt = exec('npx localtunnel --port 8888');

  lt.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('your url is:')) {
      const url = output.split('your url is:')[1].trim();
      console.log('\n======================================================');
      console.log('👑 [天宿太極預覽分享網址已生成]');
      console.log(`🔗 公開分享連結： ${url}`);
      console.log('======================================================');
      console.log('\n📝【計畫性複製貼上分享企劃】：');
      console.log('1. 請直接「選取並複製」上方以 https:// 開頭的公開分享連結。');
      console.log('2. 貼到你的 Facebook 貼文、手機 LINE 聊天室中。');
      console.log('3. 貼上後靜置 1-2 秒，對方的視窗就會【自動彈出發光的 3D 太極預覽卡片框架】！');
      console.log('4. 你的客戶一碰（點選該卡片），就會瞬間進入你本機運行的神聖命理遊戲中！');
      console.log('\n📌 (重要：請保持此命令視窗開啟，關閉此視窗會使外網連結通道失效)');
    }
  });

  lt.stderr.on('data', (data) => {
    // 錯誤日誌輸出
  });
};

main();
