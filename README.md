# 逐層掘進 ZHU CENG JUE JIN

設計研究所畢業製作：讓學生在與老師一來一往的驗收互動中學專案管理的系統。
整學期是一趟從地表挖到地心的挖掘——**四個領域**、四隻守關生物、一項任務一隻擋路的東西；
**老師寫下的合格考量就是教材本身。**

## 文件

| 檔案 | 內容 |
|---|---|
| `目前規劃總整理.md` | **從頭到尾講一次現在的設計。** 不知道前情的人看這一份 |
| `生物與物品-製作需求書.md` | 要發想的內容：40 隻生物、108 種掉落物、24 件戰利品。含世界觀、寫作口吻、不可違反的規則 |
| `規劃-放行與通知.md` | 老師放行一層之後，學生怎麼發現、怎麼收到 |
| `舊版/` | 已經被取代的文件，留著追溯用。**不要照那裡面的規格做事** |

## 結構

| 位置 | 內容 |
|---|---|
| `gas/` | **部署到 Google Apps Script 的全部檔案**（`Code.gs` 後端 ＋ HTML 前端），步驟見 `gas/部署說明.md` |
| `preview/` | 本機預覽：`node serve.js` 開 http://localhost:8791 。假後端 `preview/mock-gas.js`，種子 `preview/dev/seed.js`（帳號 res01 / tea01 / stu01，密碼 pw1234） |
| `functions/` | Firebase Cloud Functions。`index.js` 把 `Code.gs` 原封不動載進沙盒跑 |
| `build_*.txt` ＋ `patch-tpl.js` ＋ `build-gas.js` | 產出鏈：原型模板 → 編號補丁 → `gas/Template.html`、`gas/Logic.html`、`preview/index.html` |
| `bosses/` | 四隻守關生物的像素資料與預覽頁 |
| `extracted/` | 原始設計交付包，**永遠不動** |

## 改動流程

原型檔（`build_logic.txt`、`build_tpl.txt`、`gas/Logic.html`）**永遠不動**。

- 版型改動 → `patch-tpl.js` 末端加一條編號補丁
- 行為／文案改動 → `gas/Live.html` 的裝飾層
- 後端改動 → `gas/Code.gs`，**同步改** `preview/mock-gas.js`

```bash
node patch-tpl.js && node build-gas.js && node build-web.js
```

## 驗證

```bash
node functions/selftest.js
```

42 項。直接讀 `gas/Code.gs`——`functions/Code.gs` 是 build 產物（CI 部署前才 `cp` 過去），
不要拿它當來源。

```bash
node check-stale.js
```

舊機制殘留檢查，build 之後跑。三道：

| | 擋什麼 |
| --- | --- |
| 禁用詞 | 拿掉的機制不可以出現在畫得出來的字裡。只掃字串常數與模板文字，不掃註解 |
| 標籤平衡 | 每個 `sc-if`／`sc-for` 區塊裡的 div 要自己平衡 |
| 算了畫不出來 | Live 指派了 `v.X`，但模板沒有插槽、Live 也沒讀回去 |

為什麼要它：機制拿掉之後，字常常還留著——「送交關卡審核」的按鈕還在、
「還不能放他們過關」還在擋。靠人一頁一頁讀不會有終點，因為同一個畫面在
不同狀態下講的話不一樣（要走到「全部任務都過完」那一支，得先把三項都判過）。

第二道擋的是最貴的那一種：sc-if 區塊裡的 div 不平衡時，條件為假整段被拿掉
會留下孤兒收尾，瀏覽器就提早關掉外層——老師端整個版面掉出主欄那次就是這樣。

比對原型寫死的字時，那一半一定要是舊字；R-09 是修訂紀錄，本來就在講拿掉了
什麼。那幾行在原始碼裡標 `舊詞OK`，檢查就跳過。標之前先確定它真的畫不到
使用者面前——標錯的話這一支就白寫了。

CI 兩條 workflow 都會跑；`deploy.yml` 是在建完前端之後跑，有殘留就不部署。

全流程稽核在瀏覽器跑：開 http://localhost:8791/preview/index.html ，console 依序執行

```js
eval(await fetch('/preview/dev/seed.js').then(r=>r.text())); await SEED();
eval(await fetch('/preview/dev/audit.js').then(r=>r.text())); await __AUDIT();
```

39 項，走完四個領域的完整流程。**每次要先清 `localStorage` 再種**，
不然會測到上一輪留下的狀態。
