"""从原始题库生成精简版 docs/questions.json"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, "etf2026_questions.json")
dst = os.path.join(ROOT, "docs", "questions.json")

raw = json.load(open(src, encoding="utf-8"))
out = []
for q in sorted(raw, key=lambda x: x["id"]):
    opts = sorted(q.get("etfOptionsDtoList", []), key=lambda o: o.get("optionIndex", ""))
    opts = [o["optionTitle"].strip() for o in opts if o.get("optionTitle", "").strip()]
    out.append({
        "id": q["id"],
        "t": q["questionTitle"].strip(),
        "o": opts,
        "a": q["questionSolution"].strip().upper(),
        "d": q.get("difficult", 1),
    })

os.makedirs(os.path.dirname(dst), exist_ok=True)
with open(dst, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} 题 -> {dst}")
