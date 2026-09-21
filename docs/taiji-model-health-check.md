# 立體太極模型・審查健康檢查

時間：2026/9/20 下午5:09:01（UTC+8）

## 範圍
只查 model-lab「立體太極模型」卡片（`/3D`），米其林精神誠實計分。

## HTTP
- `/`：{"status":200,"len":69545}
- `/3D`：{"status":200,"len":34038}

## 檔案
- `components/model-lab/models/taiji/infiniteHollowSquares.ts`：OK 6786B @ 2026-09-20T08:59:23.418Z
- `components/model-lab/models/taiji/TaijiModel.tsx`：OK 8958B @ 2026-09-20T08:59:28.019Z
- `docs/model-lab-taiji-score.md`：OK 588B @ 2026-09-20T08:59:39.866Z

## 幾何核對
- IN_DEPTH＝10（往內立方層）
- FACE_DEPTH＝8（六面同心四方形）
- faceInwardSquares＝true
- exports＝cubeTwelveEdges, assertTwelveEdges, buildInfiniteHollowSquareSegments

## 模型掛線
- 圖層 id＝twelveHollowSquares
- 名稱＝十二線・往內無限四方形
- on()＝twelveHollowSquares
- id 與 on 一致＝true

## 米其林分數（誠實）
| 軸 | 現況 | 目標 |
|----|------|------|
| 品質 | **8.2** | 9.5 |
| 穩定 | **8** | 9.0 |
| 服務 | **7.5** | 8.5 |

### 為何未到全壘打
用戶：有分未全壘打；外簡內方無限仍需畫面驗證
外觀單純的十二線已有；往內四方形層次已寫入（10+8），但「鑽進去仍是方」的全壘打感仍待你眼驗／實拍確認。

## P0 / P1
1. **P0**：瀏覽器實開 `/3D` 確認往內同心四方形可讀（外簡內方）。
2. **P1**：若層太密或太淡，調 IN_DEPTH／線寬／透明度至「一鑽就懂」。
3. **P1**：服務向——圖層旁一行引導：「外：十二線；往內：仍是四方形無限」。
