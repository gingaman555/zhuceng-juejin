# 流程圖

以下圖表為 Mermaid 語法，可直接貼進支援 Mermaid 的編輯器（VS Code、GitHub、Notion）檢視。

## 1. 全系統地圖（三端）
```mermaid
flowchart TB
  C01[C-01 啟動頁] --> C02[C-02 身分：學生／老師／研究者]
  C02 --> C03[C-03 登入]
  C03 -->|學生首次| C04[C-04 建立小隊]
  C03 -->|學生| S00[S-00 故事說明 4 頁]
  C03 -->|老師| T00[T-00 系統說明 6 頁]
  C03 -->|研究者| R00[R-00 進入與同意]
  C04 --> S00
  S00 --> S01

  subgraph STU[學生端]
    S01[S-01 首頁] --> S02[S-02 任務清單]
    S02 --> S05[S-05 提交一項]
    S02 --> SUB[關卡送審 三格]
    S01 --> S03[S-03 地圖／收藏總覽]
    S03 --> S06[S-06 物件介紹]
    S01 --> GANTT[甘特 排程與比對]
    S01 --> S04[S-04 其他隊伍]
    S04 --> S06
  end

  subgraph TEA[老師端]
    T01[T-01 待你驗收] --> T03[T-03 逐項確認]
    T03 --> T06[T-06 單項審核]
    T01 --> T07[T-07 關卡審核]
    T01 --> T02[T-02 任務清單]
    T02 --> T05[T-05 撰寫任務內容]
    T01 --> T04[T-04 全班位置／收藏]
    T01 --> T08[T-08 學生端的世界]
    T04 --> S06
    T08 --> S06
  end

  subgraph RES[研究者端 灰階]
    R00 --> R01[R-01 總覽]
    R00 -.演練模式.-> R01
    R01 --> R02[R-02 審核語料]
    R01 --> R03[R-03 回饋與修正序列]
    R01 --> R04[R-04 天然對照]
    R01 --> R05[R-05 閱讀行為]
    R01 --> R06[R-06 提交節律]
    R01 --> R07[R-07 停留與介入]
    R01 --> R08[R-08 匯出]
    R00 --> R09[R-09 設計修訂記錄]
  end

  S05 -.提交.-> T01
  T06 -.合格考量.-> S02
  SUB -.送審.-> T07
  T07 -.發道具.-> S01
  T05 -.發派.-> S02
  S05 & T06 & S04 -.事件記錄.-> R01
```

## 2. 核心迴圈（學生一項任務的一生）
```mermaid
sequenceDiagram
  participant S as 學生
  participant SYS as 系統
  participant T as 老師
  T->>SYS: T-05 開一項（名稱／通過條件／注意／期限／環節）
  SYS->>S: S-02 出現這一項
  S->>SYS: 甘特 排哪一週交（老師看不到）
  S->>SYS: S-05 寫內容＋附檔案 → 送出
  SYS->>T: 進入 T-01 佇列（依停留週數排序）
  T->>SYS: T-06 通過或退回＋寫合格考量
  alt 通過
    SYS->>S: 狀態 passed、記錄通過週次、發物證（礦物）
  else 退回
    SYS->>S: 狀態 needs_more＋理由，可重交（次數不限）
  end
  Note over S,T: 必要項全數通過後才出現「送關卡」
```

## 3. 關卡與換層
```mermaid
flowchart LR
  A[必要項全數通過] --> B[SUB 三格送審<br/>做了什麼／怎麼判斷／下一層要注意]
  B --> C[T-07 老師審核]
  C -->|通過| D[定工具階級<br/>系統試算 延伸項通過數]
  D --> E[發道具＋寶物]
  E --> F[currentLayer + 1<br/>下一層清單解鎖]
  C -->|退回| B
```

## 4. 任務狀態機
```mermaid
stateDiagram-v2
  [*] --> todo
  todo --> submitted: 學生送出
  submitted --> passed: 老師通過
  submitted --> needs_more: 老師退回＋理由
  needs_more --> submitted: 重交（不限次數）
  submitted --> auto: 逾時未審（暫准）
  auto --> passed: 老師事後補確認
  passed --> [*]
  note right of auto
    不計入工具階級
    不對他組解鎖
  end note
```

## 5. 每週推進與其他組
```mermaid
flowchart TB
  W[＋1 週] --> A[weeksHere + 1]
  A --> B[其他組依清單產生提交]
  B --> C[老師 T-01 佇列更新<br/>逾期與建議聯繫重算]
  A --> D{到第 3 週?}
  D -->|是| E[第一組通過關卡<br/>進入水晶迴廊<br/>留下公開通過紀錄]
  A --> F{滿 4 週?}
  F -->|是| G[研究者端解鎖一個區間]
```

## 6. 研究者端的門檻
```mermaid
flowchart TB
  R0[R-00 同意書] -->|捲到底才啟用| A[已讀完，進入總覽]
  R0 -->|不需捲到底| B[進入演練模式]
  A --> C{現在第幾週?}
  C -->|未滿 4 週| D[R-01～R-08 不渲染內容<br/>只顯示解鎖說明]
  C -->|滿 4 週| E[解鎖第 1～4 週區間]
  B --> F[全部解鎖＋示範語料<br/>每頁常駐 DEMO 橫幅]
  F -->|關閉| R0
  R0 --> G[R-09 設計修訂記錄<br/>不受延遲揭露限制]
```

## 7. 資料流（誰寫、誰讀）
```mermaid
flowchart LR
  subgraph 寫入
    S1[學生 提交] --> SUBS[(Submissions)]
    S2[學生 排程] --> PLANS[(Plans)]
    T1[老師 審核] --> REVS[(Reviews)]
    T2[老師 開清單] --> TASKS[(Tasks)]
    T3[關卡通過] --> PASS[(Passes)]
    S3[學生 看他組紀錄] --> READS[(Reads)]
    R1[研究者 編碼] --> CODES[(Codes)]
  end
  SUBS & REVS & TASKS & PASS --> STU[學生端畫面]
  SUBS & REVS & TASKS & PASS --> TEA[老師端畫面]
  PLANS --> STU
  PLANS -.看不到.-x TEA
  SUBS & REVS & READS & PASS -->|延遲揭露過濾| RES[研究者端]
  CODES --> RES
  CODES -.看不到.-x STU
  CODES -.看不到.-x TEA
```

## 8. 迷霧規則（學生能看到什麼）
```mermaid
flowchart TB
  A[學生打開 S-03 地圖] --> B{這一層 <= 我的層?}
  B -->|是| C[顯示場景圖、名稱、道具、寶物、礦物格]
  B -->|否| D[只顯示深度與 ？？？<br/>岩壁後透出微光<br/>點了只提示還沒到]
  A2[學生點他組小人] --> E{他組的層 > 我的層?}
  E -->|是| F[遮蔽超前的層數<br/>只顯示已通過幾層]
  E -->|否| G[顯示公開的關卡三格與老師判斷]
```
