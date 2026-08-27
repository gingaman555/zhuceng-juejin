# 逐層掘進 ZHU CENG JUE JIN

設計系畢業製作：讓學生在與老師一來一往的驗收互動中學習專案管理的 Google Apps Script 系統。整學期是一場從地表挖到地心的探險——五層洞窟、23 塊礦石、四隻守關生物；老師寫下的合格考量就是教材本身。

## 結構

| 位置 | 內容 |
|---|---|
| `gas/` | **部署到 Google Apps Script 的全部檔案**（Code.gs 後端 ＋ HTML 前端），部署步驟見 `gas/部署說明.md` |
| `逐層掘進_GAS部署包.zip` | 上面那一包的壓縮版，重新 build 之後要重打 |
| `preview/` | 本機預覽：`node serve.js` 開 http://localhost:8791，假後端在 `preview/mock-gas.js`，開發種子 `preview/dev/seed.js`（console 跑 `SEED()`，帳號 res01 / tea01 / stu01，密碼 pw1234） |
| `build_*.txt` ＋ `patch-tpl.js` ＋ `build-gas.js` | 產出鏈：原型模板 → 編號補丁 → `gas/Template.html`、`gas/Logic.html`、`preview/index.html` |
| `bosses/` | 四隻守關生物的像素資料與預覽頁（`bosses/preview.html`） |
| `BOSS_規劃.md` | 守關生物機制的完整規格 |
| `extracted/` | 原始設計交付包（`流程原型制作需求.zip` 解開的內容），**永遠不動** |

## 改動流程

原型檔（`build_logic.txt`、`build_tpl.txt`）保持原封不動。

- 版型改動 → `patch-tpl.js` 末端加一條編號 `must(old, new)`
- 行為／文案改動 → `gas/Live.html` 的裝飾層
- 後端改動 → `gas/Code.gs`，同步改 `preview/mock-gas.js`

改完跑：

```bash
node patch-tpl.js && node build-gas.js
```
