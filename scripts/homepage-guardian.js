#!/usr/bin/env node

/**
 * 首頁衛士 - 24/7 監控和自動恢復系統
 * 確保首頁永遠不會消失，如果發生問題立刻自動修復
 */

const http = require('http');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOMEPAGE_URL = 'http://localhost:3000';
const CHECK_INTERVAL = 10000; // 每10秒檢查一次
const LOG_FILE = path.join(__dirname, '../.guardian-log.txt');
const MAX_RETRIES = 3;

class HomepageGuardian {
  constructor() {
    this.isHealthy = true;
    this.failureCount = 0;
    this.devServerProcess = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    try {
      fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
      console.error('日誌寫入失敗:', e.message);
    }
  }

  /**
   * 檢查首頁是否健康
   */
  async checkHomepage() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log('首頁檢查超時（15秒）', 'WARN');
        resolve(false);
      }, 15000);

      const req = http.get(HOMEPAGE_URL, (res) => {
        clearTimeout(timeout);
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // 檢查是否返回了實際的首頁內容
          const isValid =
            res.statusCode === 200 &&
            (data.includes('天地人') || data.includes('人格'));
          resolve(isValid);
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        this.log(`首頁連接失敗: ${err.message}`, 'ERROR');
        resolve(false);
      });
    });
  }

  /**
   * 自動恢復首頁
   */
  async autoRecover() {
    this.log('⚠️  首頁無法訪問，開始自動恢復流程...', 'CRITICAL');

    // 步驟1: 強制殺死所有 Node/npm 進程
    this.log('步驟1: 清理現存進程...', 'INFO');
    spawnSync('pkill', ['-9', '-f', 'node.*next'], { stdio: 'ignore' });
    spawnSync('pkill', ['-9', '-f', 'npm run dev'], { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 2000));

    // 步驟2: 驗證配置
    this.log('步驟2: 驗證 next.config.mjs...', 'INFO');
    const configPath = path.join(__dirname, '../next.config.mjs');
    let config = fs.readFileSync(configPath, 'utf-8');

    // 移除危險的 optimizeCss
    if (config.includes('optimizeCss: true')) {
      this.log('⚠️  偵測到危險配置 optimizeCss: true，移除中...', 'WARN');
      config = config.replace(/\s*optimizeCss:\s*true,?\n/g, '');
      fs.writeFileSync(configPath, config);
      this.log('✓ 配置已修復', 'INFO');
    }

    // 步驟3: 清理構建
    this.log('步驟3: 清理舊的構建文件...', 'INFO');
    const nextDir = path.join(__dirname, '../.next');
    if (fs.existsSync(nextDir)) {
      spawnSync('rm', ['-rf', nextDir], { stdio: 'ignore' });
    }

    // 步驟4: 重新啟動 dev server
    this.log('步驟4: 重新啟動 dev server...', 'INFO');
    const projectRoot = path.join(__dirname, '..');
    this.devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    this.devServerProcess.unref();

    // 步驟5: 等待服務啟動
    this.log('步驟5: 等待服務啟動（最多30秒）...', 'INFO');
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const isHealthy = await this.checkHomepage();
      if (isHealthy) {
        this.log('✅ 首頁已成功恢復！', 'SUCCESS');
        this.failureCount = 0;
        return true;
      }
    }

    this.log(
      '❌ 自動恢復失敗，超過最大重試次數',
      'ERROR'
    );
    return false;
  }

  /**
   * 持續監控循環
   */
  async guardianLoop() {
    this.log('🛡️  首頁衛士已啟動，開始監控...', 'INFO');

    setInterval(async () => {
      const isHealthy = await this.checkHomepage();

      if (isHealthy) {
        if (!this.isHealthy) {
          this.log('✅ 首頁已恢復正常', 'SUCCESS');
        }
        this.isHealthy = true;
        this.failureCount = 0;
      } else {
        this.failureCount++;
        this.log(
          `❌ 首頁檢查失敗 (${this.failureCount}/${MAX_RETRIES})`,
          'WARN'
        );

        if (this.failureCount >= MAX_RETRIES) {
          this.isHealthy = false;
          await this.autoRecover();
        }
      }
    }, CHECK_INTERVAL);
  }

  /**
   * 啟動衛士
   */
  start() {
    this.log('=' .repeat(60), 'INFO');
    this.log('首頁衛士系統已啟動', 'INFO');
    this.log('監控間隔: ' + CHECK_INTERVAL + 'ms', 'INFO');
    this.log('自動恢復: 已啟用', 'INFO');
    this.log('=' .repeat(60), 'INFO');

    this.guardianLoop();
  }
}

// 啟動衛士
const guardian = new HomepageGuardian();
guardian.start();

// 優雅退出
process.on('SIGINT', () => {
  guardian.log('首頁衛士已關閉', 'INFO');
  process.exit(0);
});
