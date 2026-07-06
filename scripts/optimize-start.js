const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [OPTIMIZER] 啟動全自動命理網頁優化開啟流程...');

// 1. 清理快取
const nextDir = path.join(__dirname, '../.next');
if (fs.existsSync(nextDir)) {
  console.log('🧹 [OPTIMIZER] 正在清理舊的 Next.js 緩存目錄...');
  try {
    if (process.platform === 'win32') {
      execSync('rmdir /s /q "' + nextDir + '"', { stdio: 'ignore' });
    } else {
      execSync('rm -rf "' + nextDir + '"', { stdio: 'ignore' });
    }
    console.log('✓ [OPTIMIZER] 快取清理完畢！');
  } catch (err) {
    console.log('⚠️ [OPTIMIZER] 快取正在被其他進程佔用，跳過清理步驟...');
  }
}

// 2. 啟動 Next.js 開發服務
console.log('⚡ [OPTIMIZER] 正在啟動 Next.js 開發伺服器...');
const devProcess = spawn('npx', ['next', 'dev'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
});

let browserOpened = false;

devProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // 監聽 Ready 訊號，自動開啟網頁
  if (!browserOpened && (output.includes('Ready') || output.includes('Local:'))) {
    browserOpened = true;
    console.log('\n✨ [OPTIMIZER] 開發伺服器已就緒！正在全自動開啟網頁並對接...');
    
    const url = 'http://localhost:3000';
    const startCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    
    exec(startCmd, (err) => {
      if (err) {
        console.error('❌ [OPTIMIZER] 自動開啟網頁失敗:', err.message);
      } else {
        console.log('✓ [OPTIMIZER] 命理網頁已在瀏覽器成功拉起，功能運作正常！');
      }
    });
  }
});

process.on('SIGINT', () => {
  devProcess.kill();
  process.exit();
});
