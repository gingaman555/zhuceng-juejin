#!/bin/bash
# 清理 drill_*_0915 測試帳號（classId: C108xhpv）的所有 Firestore 文件
# 用法：bash cleanup-drill.sh

BASE="https://firestore.googleapis.com/v1/projects/boss-fight-816f3/databases/(default)/documents/world/v1"

DOCS=(
  "Users/U106xhpv"       # drill_tA_0915 (測試老師A)
  "Users/U109xhpv"       # drill_tB_0915 (測試老師B)
  "Users/U111xhpv"       # drill_tC_0915 (測試老師C)
  "Users/U113xhpv"       # drill_s1_0915 (測試學生1)
  "Users/U118xhpv"       # drill_s2_0915 (測試學生2)
  "Users/U122xhpv"       # drill_s3_0915 (測試學生3)
  "Users/U127xhpv"       # drill_s4_0915 (測試學生4)
  "Users/U131xhpv"       # drill_s5_0915 (測試學生5)
  "Users/U136xhpv"       # drill_s6_0915 (測試學生6)
  "Classes/C108xhpv"     # 測試｜上線前演練 DRILL0915
  "Teams/G115xhpv"       # 測試隊A
  "Teams/G124xhpv"       # 測試隊B
  "Teams/G133xhpv"       # 測試隊C
  "Milestones/M141xhpv"  # 測試任務
  "Runs/R145xhpv"        # 測試 Run
  "Keeps/K150xhpv"       # 測試 Keep
)

echo "即將刪除 ${#DOCS[@]} 筆 Firestore 文件..."
echo ""

for doc in "${DOCS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/$doc")
  if [ "$code" = "200" ]; then
    echo "✓ $doc"
  else
    echo "✗ $doc (HTTP $code)"
  fi
done

echo ""
echo "完成。"
