#!/bin/bash
# 清理所有測試資料：drill 演練帳號 + wed_s1 + ra_stu1
# 用法：bash cleanup-all-test.sh

BASE="https://firestore.googleapis.com/v1/projects/boss-fight-816f3/databases/(default)/documents/world/v1"

DOCS=(
  # ── drill 演練（classId: C108xhpv）──
  "Users/U106xhpv"       # drill_tA_0915 測試老師A
  "Users/U109xhpv"       # drill_tB_0915 測試老師B
  "Users/U111xhpv"       # drill_tC_0915 測試老師C
  "Users/U113xhpv"       # drill_s1_0915 測試學生1
  "Users/U118xhpv"       # drill_s2_0915 測試學生2
  "Users/U122xhpv"       # drill_s3_0915 測試學生3
  "Users/U127xhpv"       # drill_s4_0915 測試學生4
  "Users/U131xhpv"       # drill_s5_0915 測試學生5
  "Users/U136xhpv"       # drill_s6_0915 測試學生6
  "Classes/C108xhpv"     # 測試｜上線前演練 DRILL0915
  "Teams/G115xhpv"       # 測試隊A
  "Teams/G124xhpv"       # 測試隊B
  "Teams/G133xhpv"       # 測試隊C
  "Milestones/M141xhpv"  # 演練任務
  "Runs/R145xhpv"        # 演練 Run
  "Keeps/K150xhpv"       # 演練 Keep

  # ── 孤兒測試帳號（班級已不存在）──
  "Users/U1110e51"        # wed_s1
  "Users/U111dzmc"        # ra_stu1
)

echo "即將刪除 ${#DOCS[@]} 筆測試資料..."
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
echo "完成。刪了 ${#DOCS[@]} 筆。"
