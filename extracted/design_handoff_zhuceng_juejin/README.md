# Handoff：逐層掘進（ZHU CENG JUE JIN）

## Overview
「逐層掘進」是一套把一學期的專題課程包裝成地底掘進遊戲的教學流程系統。學生以組為單位，從地表往地心挖五層；每一層對應課程的一個階段，老師在每一層開出任務清單，學生逐項交付、老師逐項確認，全數通過後送審關卡，通過才拿到往下一層的道具。系統有三端：**學生端（S）**、**老師端（T）**、**研究者端（R）**。

這份交付包的目標：讓 Claude Code 在 **Google Apps Script（HtmlService + Google Sheets）** 上完整重建這個系統——**包含全部像素圖像**——並可直接部署成網頁應用給老師實際點看。

## About the Design Files
本包內的 HTML 檔（`prototype/逐層掘進 原型.dc.html`）是**設計參考**，不是要直接上線的產品程式碼。它是用一套會把模板與邏輯類別組合起來的內部框架寫的（`<x-dc>` + `support.js`），**不要照搬那個框架**。

任務是：**在 Google Apps Script 環境重建這些畫面與行為**。原型檔的用法是——
- 讀 `class Component extends DCLogic` 裡的資料常數（`LAYERS`、`MINS`、`KLASSES`、`REVISIONS`、故事文案）→ 這些是**內容真值**，逐字搬過去，不要改寫、不要重新命名。
- 讀模板部分（`<x-dc>` 內的 HTML）→ 這是**版面與樣式真值**，inline style 的數值可直接沿用。
- 讀 `renderVals()` → 這是**行為真值**（狀態如何推導成畫面）。

## Fidelity
**High-fidelity（hifi）**。顏色、字級、間距、動畫都已定案，請像素級還原。字級只允許 11 / 22 / 33 / 44 px（點陣字 Cubic 11 的格點整數倍，非整數倍會糊）。

## 完整還原的四個硬性要求
1. **圖像**：`assets/jlz/` 內 41 張 PNG 全部要能顯示（5 洞窟場景、5 道具、6 寶物、23 礦物、2 角色）。GAS 的 HtmlService 不能直接對外提供專案內的檔案，做法見 `SYSTEM.md` §GAS 圖像方案（建議 base64 內嵌成 `Sprites.html`）。
2. **字型**：Cubic 11（俐方體 11 號），CDN `https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@v1.500/fonts/web/Cubic_11.woff2`，`font-display:block`，`image-rendering:pixelated` 用在所有 PNG。研究者端**不用**點陣字（見下）。
3. **三端不可混用視覺**：學生／老師端＝暖黑＋琥珀＋點陣字；研究者端＝灰階＋Noto Serif／Noto Sans／IBM Plex Mono＋`font-variant-numeric: tabular-nums`，且**沒有任何主要按鈕**。
4. **演練模式**：研究者端 R-00 的「進入演練模式」必須實作（見 `SYSTEM.md` §演練模式）。這是老師與口委看整套系統的入口。

## Screens / Views
畫面逐頁規格見 `SCREENS.md`（含每一頁的用途、版面、元件、文案）。
系統如何運作、資料模型、規則、GAS 架構見 `SYSTEM.md`。
流程圖（核心迴圈、狀態機、三端互動、資料流）見 `FLOWS.md`。
作品定義（要解決什麼、對象、範圍、非目標）見 `PRODUCT.md`。

## Interactions & Behavior
- 導覽：桌機為左側欄（學生 5 項／老師 7 項／研究者 10 項），手機為底部分頁（學生 5 項／老師 4 項＋T-01 上方入口卡），研究者端手機僅顯示「請用桌機」提示。
- 所有頁面頂端有常駐身分列（角色標籤＋角色像素圖＋名稱；右側為所在層與停留週數，老師端為班級與組數），`position:sticky; top:0`。
- 動畫只有兩支 keyframes：`seep`（地底微光滲流，5–7s）與 `dormant`（未取得物件的呼吸微光，4.6–6.2s，各格錯開 0.42s 倍數）。地圖每層另有依生態設定的動態（見 SCREENS）。
- 提示訊息（toast）：畫面底部置中，2.6s 後淡出。
- 逾期只標示不阻擋：仍可提交、仍可確認、仍計入等級。

## State Management
見 `SYSTEM.md` §狀態模型（含每個欄位、初始值、寫入時機）與 §事件記錄（研究者端資料來源）。

## Design Tokens
```
學生／老師端
  bg            #0B0A09      面板 panel     #14110E
  線 line       #26211C      次線           #1C1915 / #2E2822 / #3A3026
  主色 accent   #E9B341      文字 text      #E8E2D6
  次文字 dim    #8A8073      更次 faint     #5F574C
  警示 danger   #D9603F      通過標記底     #0B0A09（在琥珀塊上）
  字型          'C11'（Cubic 11）；字級僅 11 / 22 / 33 / 44
  切角          clip-path:polygon(13px 0,100% 0,100% calc(100% - 13px),calc(100% - 13px) 100%,0 100%,0 13px)
  地圖層底（已抵達→未抵達，透明度遞增壓暗）見 SCREENS §S-03

研究者端
  bg #0A0E12 / 面板 #0C1116 / 線 #1D2831 / 強調 #B4B6BE
  文字 #DFE6EB / 次 #B7C3CC / 更次 #8393A0 / 最次 #5A6874
  字型 'Noto Serif TC'（標題）、'Noto Sans TC'（正文）、'IBM Plex Mono'（數值與代號）
  DEMO 橫幅 底 #242017 / 線 #4A4238 / 標記字 #C9A227
```

## Assets
`assets/jlz/` 41 張 PNG，全部為像素圖，來源是使用者提供的素材包（`jlz-assets.json` 有 key / 中文名 / 分組對照）。命名即 key：
- `scene-L1..L5.png`（洞窟場景，地圖剖面與層級詳情橫幅用）
- `tool-compass / cutter / gauge / thermal / resonator.png`（五支道具）
- `tre-golddisc / prismlamp / mutebell / jadeseal / emptycrown / crown-restored.png`（寶物）
- `min-L1-01-dingming … min-L5-00-template.png`（23 塊礦物）
- `role-student.png` / `role-teacher.png`（角色，地圖小人也用 role-student）

名稱對照（中文名 → 檔名）寫在原型的 `SPRITE` 常數，直接照搬；**這份對照曾經因為改名而失效過，搬移後務必逐一驗證 23 塊礦物都有圖**。

## Files
```
prototype/逐層掘進 原型.dc.html   完整原型（唯一真值來源）
prototype/support.js              原型執行框架（僅供本機開啟原型用，不要移植）
assets/jlz/*.png                  41 張像素圖
PRODUCT.md                        作品定義書
SYSTEM.md                         系統運作方式、資料模型、規則、GAS 架構
FLOWS.md                          流程圖
SCREENS.md                        全畫面逐頁規格
```

本機開啟原型：直接用瀏覽器開 `prototype/逐層掘進 原型.dc.html`（需連網載入字型）。
