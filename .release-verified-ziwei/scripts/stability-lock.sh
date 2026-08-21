#!/bin/bash

# 🔒 系統穩定性自動鎖住和恢復腳本
# 如果系統當機，自動恢復到最後穩定版本

PROJECT_DIR="C:\Users\DRAGON\Desktop\命理"
LOG_FILE="/tmp/stability-monitor.log"
HEALTH_CHECK_INTERVAL=30  # 每 30 秒檢查一次

# 記錄函數
log_event() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 檢查 Dev Server 健康狀態
check_server_health() {
  # 嘗試連接到服務器
  response=$(curl -s -m 5 http://localhost:3001 || echo "FAIL")

  if [[ "$response" == "FAIL" ]]; then
    return 1
  fi

  # 檢查是否返回 404 或其他錯誤
  if echo "$response" | grep -q "404\|This page could not be found"; then
    return 1
  fi

  return 0
}

# 自動恢復函數
auto_recover() {
  log_event "⚠️  檢測到系統異常，開始自動恢復..."

  cd "$PROJECT_DIR"

  # 步驟 1：停止所有 Node 進程
  log_event "停止 Node 進程..."
  taskkill /F /IM node.exe 2>/dev/null || true
  sleep 2

  # 步驟 2：清除 Next.js 快取
  log_event "清除編譯快取..."
  rm -rf .next

  # 步驟 3：恢復到最後穩定版本
  log_event "恢復到穩定版本..."
  git restore . 2>/dev/null || true
  git clean -fd 2>/dev/null || true

  # 步驟 4：重新啟動 Dev Server
  log_event "重新啟動 Dev Server..."
  npm run dev > /tmp/dev.log 2>&1 &

  sleep 4

  # 步驟 5：驗證恢復
  if check_server_health; then
    log_event "✅ 系統已成功恢復！"
    return 0
  else
    log_event "❌ 恢復失敗，等待下次嘗試..."
    return 1
  fi
}

# 主監控循環
main_monitor() {
  log_event "🟢 穩定性監控已啟動"

  failure_count=0
  max_failures=3

  while true; do
    if check_server_health; then
      if [ $failure_count -gt 0 ]; then
        log_event "✅ 系統恢復正常"
        failure_count=0
      fi
    else
      failure_count=$((failure_count + 1))
      log_event "⚠️  檢測到故障 (第 $failure_count 次)"

      if [ $failure_count -ge $max_failures ]; then
        log_event "🔴 觸發自動恢復"
        auto_recover
        failure_count=0
      fi
    fi

    sleep $HEALTH_CHECK_INTERVAL
  done
}

# 啟動監控
main_monitor
