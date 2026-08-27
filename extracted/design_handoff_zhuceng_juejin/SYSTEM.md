# 系統運作方式 · 資料模型 · GAS 架構

## 一、三端與權限
| 端 | 可讀 | 可寫 | 不可 |
|---|---|---|---|
| 學生 S | 自己組的任務、自己的排程、已抵達層的內容、他組的公開通過紀錄 | 提交內容、排程、第五層自訂項與命名 | 看未抵達層、看他組未公開內容、改期限 |
| 老師 T | 全班所有組、所有層（不上鎖）、佇列 | 開／改／刪任務清單、逐項確認與理由、關卡審核與工具階級、切換班級 | 看學生的排程（設計上不給） |
| 研究者 R | 解鎖區間內的事件記錄、自己的編碼 | 只有自己的編碼 | 任何課堂資料的寫入、看未解鎖區間、看個人身分 |

## 二、狀態模型（原型 `state`）
```
role            'student' | 'teacher' | 'researcher'
device          'desktop' | 'mobile'
screen          畫面代號（見 SCREENS）
// 學生
currentLayer    1..5        目前所在層
weeksHere       1..n        全班共用的「學期第幾週」，＋1 週會推進
passed          number[]    已通過關卡的層
toolLevels      {層: '第一階'|'第二階'|'第三階'}
tasks           Task[]      見下
plan            {taskId: week, gate: week}   學生排程（老師看不到）
passedWeek      {taskId: week}               實際通過的週次
draftText/draftFiles/openTaskId              提交草稿
gateText[3] / gateSubmitted / gateVerdict    關卡三格
mapTab          'map' | 'coll'   地圖／收藏總覽
expanded        展開的層          mapTeam/mapView  地圖上選到的組
specId/specFrom 圖鑑開啟的物件與來源畫面
// 老師
klassId         目前班級          editLayer/editId/nf/draftSet  任務編輯
reviewId        佇列中選到的項    reason  合格考量草稿
// 研究者
resConsent      同意書已讀完      resScrolled  是否捲到底
resDemo         演練模式          resFilter/resCoder/resPick/resExport
codes           {revId: 編碼}     研究者自己的編碼
// 事件記錄（研究者端唯一資料來源）
subLog[]  {taskId, group, title, layer, week, dueWeek, overdue, len}
revLog[]  {id, group, title, layer, result:'pass'|'needfix', reason, len, hasReason, week, latency}
readLog[] {reader, target, layer, week, readerLayer, readerStay, recentlyRejected}
```

### Task
```
{ id, layer, klass, type:'required'|'extended', title, cond, note,
  due, over, mineral, mDesc,
  status:'todo'|'submitted'|'needs_more'|'passed'|'auto',
  text, files[], fb, fbType }
```
- `cond` 通過條件（學生看得到）、`note` 要注意的地方（寫提醒，不寫步驟）
- `due` 存成 `第 N 週 · M/D（週X）`；`不設限` 為無期限
- `mineral` 這一項對應的物證名稱（＝規畫環節）
- `fb` 老師的合格考量、`fbType` `'pass'|'needfix'`

### 期限與日期
```
courseStart = 2026-09-14（週一）      // 換成實際開課日
weekDate(n, dow) = courseStart + (n-1)*7 + (dow-1) 天
dueLabel(t) = 'W3 · 10/2（五）'
weekRange(n) = '9/28–10/4'
```
老師訂期限＝先選週次（W1–W6，每顆顯示該週日期範圍），再選那一週的哪一天（週一／三／五／日，每顆顯示對應日期），下方即時預覽學生會看到的字串。

### 工具校準階級（系統試算，老師可覆寫）
延伸項通過數 0 → 第一階、1–2 → 第二階、3+ → 第三階。學生端在任務清單即時顯示試算值並註明最終由老師定。

## 三、核心迴圈（狀態轉移）
```
todo ──提交──▶ submitted ──老師通過──▶ passed（記 passedWeek，發物證）
                    │
                    └──老師退回──▶ needs_more ──重交──▶ submitted   （重交次數不限）
逾時未審 ──▶ auto（未經確認：不計入工具階級、不對他組解鎖）

必要項全部 passed ──▶ 可送關卡（SUB 三格）──▶ 老師 T-07 審核
   通過 ──▶ 發道具＋定工具階級 ──▶ currentLayer+1、passed.push、weeksHere 歸零計算
   退回 ──▶ 回到該層，可再送
```

## 四、每週推進（＋1 週）
`weeksHere+1`，並且：
- 其他組依自己的清單產生提交 → 進入老師佇列
- 逾期狀態重算（`dueWeek < 現在週`）
- 第 3 週第一組通過關卡、進入第二層，並留下公開的關卡三格紀錄
- 研究者端每滿 4 週解鎖一次

## 五、演練模式（研究者端）
**入口**：R-00 同意書頁的第二顆按鈕「進入演練模式」（不需捲到底即可按）。
**開啟後**：
1. `resDemo = true`、`resConsent = true`，直接進 R-01。
2. 解除四週一次的延遲揭露（`unlockedThrough = 6`，所有 R 頁可進）。
3. 灌入示範語料：`demoLogs()` 依 `MINS` 與六組隊名合成 subLog / revLog / readLog（每週 2–3 筆提交與審核，含 8 種真實語氣的合格考量、其中一筆刻意沒寫理由；每週一筆他組閱讀）。
4. 每一頁上方常駐 DEMO 橫幅：底 #242017、線 #4A4238、標記字 #C9A227，文案「演練模式：所有頁面已解除延遲揭露，畫面上的語料與數值是示範樣本，不是實際課堂紀錄。」右側有「關閉」。
5. 頂端狀態行改為「演練模式　·　全部可見（示範樣本，非實際課堂紀錄）」。
**關閉時**：清空三份示範記錄、回到 R-00。
**用途**：對老師、口委、研究團隊展示這一端能看到什麼，不需要等到第 4 週、也不需要真的課堂資料。示範樣本不可用於研究判讀——橫幅必須一直在。

## 六、研究者端的三條硬性限制（不可拿掉）
1. **沒有主要按鈕**：只有篩選、排序、展開、勾選、匯出，以及研究者自己的編碼。
2. **延遲揭露**：每四週一次；未解鎖時 R-01～R-08 完全不渲染內容，只顯示一行說明；R-00 與 R-09 不受限。
3. **非隨機分派聲明**：R-04 兩個對照區塊固定掛「非隨機分派，僅能談關聯」，不可關閉；R-06 不做組別排行；R-08 標明強制匿名與已移除欄位。

R-01 另有「尚未發生的事」：誠實列出零使用的機制（他組閱讀 0、分段通過 0、延伸項未選、逾時暫准 0），與 R-09 的設計修訂記錄對讀。

## 七、Google Apps Script 架構

### 檔案
```
Code.gs          doGet / API 函式 / Sheets 讀寫
Index.html       單一頁面（含全部 inline style 與 <script>）
Sprites.html     41 張 PNG 的 base64（<?!= include('Sprites') ?> 內嵌）
Styles.html      @font-face、@keyframes、body reset（只有這三類）
```
```js
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('逐層掘進').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(n) { return HtmlService.createHtmlOutputFromFile(n).getContent(); }
```

### 圖像方案（完整還原的關鍵）
HtmlService **不能**直接提供專案資料夾的檔案，`assets/jlz/x.png` 這種相對路徑在 GAS 上一定失效。三個做法，**優先用 A**：

**A. base64 內嵌（建議）**：把 41 張 PNG 轉成一份 `Sprites.html`：
```html
<script>
window.JLZ_SPRITES = {
  "tool-compass": "data:image/png;base64,iVBOR...",
  "min-L1-01-dingming": "data:image/png;base64,..."
};
</script>
```
所有 `background:url(assets/jlz/KEY.png)` 改成 `background:url(${JLZ_SPRITES[KEY]})`。
每張 PNG 是 16–48px 的像素圖，base64 後合計約數百 KB，遠低於 HtmlService 的限制。轉檔：`base64 -i x.png` 或 Node 腳本批次產生。

**B. Drive 公開連結**：把圖放 Drive 資料夾 → 共用「知道連結的人可讀」→ `https://drive.google.com/uc?export=view&id=FILE_ID`。缺點是首次載入慢、偶有配額問題。

**C. Sheets 存 base64**：不建議，單格 50000 字元上限會爆。

不論哪個方案，所有像素圖都要 `image-rendering: pixelated`，並且 `center/contain no-repeat`（場景圖是 `center/cover`）。

### Sheets 當資料庫
| 工作表 | 欄位 |
|---|---|
| Config | key, value（開課日、班級、目前週次、老師名） |
| Classes | classId, name, term, started |
| Teams | teamId, classId, name, members, layer, weeks, passed |
| Tasks | taskId, classId, layer, type, title, cond, note, due, mineral, published |
| Submissions | subId, taskId, teamId, week, text, files, ts |
| Reviews | revId, subId, teamId, taskId, result, reason, week, latency, ts |
| Plans | teamId, taskId, week（學生排程，老師端不讀） |
| Passes | teamId, layer, week, toolLevel, gateCell1..3, ts |
| Reads | readId, readerTeam, targetTeam, layer, week, ts |
| Codes | revId, coder, code（研究者編碼，與課堂資料分表） |

### API（google.script.run）
```
getBootstrap(role, teamId)      一次回傳該端需要的整包狀態
submitItem(taskId, text, files) 學生提交 → 寫 Submissions
reviewItem(subId, result, reason) 老師確認 → 寫 Reviews、更新 Tasks 狀態
submitGate(cells[])             關卡送審
reviewGate(layer, pass, toolLevel, reason)  關卡審核＋發道具
publishList(classId, layer, items[])        發派清單
savePlan(teamId, taskId, week)  學生排程
advanceWeek()                   ＋1 週（含其他組模擬，僅示範用）
researchSlice(weekThrough)      研究者端資料切片（後端就做延遲揭露過濾）
saveCode(revId, coder, code)    研究者編碼
exportCsv(kinds[])              匯出（後端強制匿名）
```
**延遲揭露要在後端做**：未解鎖區間的資料根本不要送到前端，前端只做呈現。演練模式則由前端合成示範資料，**不打後端**。

### GAS 上的注意事項
- 全部 JS 必須在 `Index.html` 的 `<script>` 內（不能用 ES module import）。
- `google.script.run` 只有非同步回呼，沒有 Promise；自己包一層 `function call(fn, ...args)` 回傳 Promise。
- 沙箱 iframe 內 `localStorage` 可用但不保證，狀態一律回寫 Sheets 或 `PropertiesService`。
- 外部 CDN 的 CSS／字型可以載入（Cubic 11 走 jsDelivr 沒問題）。
- 每次 `doGet` 都是新頁面，畫面切換全部在前端做（單頁應用），不要用多個 doGet 路由。
- Sheets 讀寫要批次（`getValues` / `setValues` 一次一個範圍），逐格讀寫會慢到不能用。
