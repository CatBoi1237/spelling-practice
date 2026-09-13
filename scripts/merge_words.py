"""Merge base + enriched + generated word batches into frontend/src/data/words.json (re-runnable)."""
import json, glob, re
from pathlib import Path

OUT = Path("/app/scripts/out")
BASE = {w["word"].lower(): w for w in json.loads((OUT / "base.json").read_text())}
CATS = {"Science", "Literature", "Geography", "Animals", "Technology", "Medicine", "History", "Everyday English", "Academic", "Competition"}
FIELDS = ["word", "difficulty", "partOfSpeech", "definition", "example", "syllables", "syllableBreak", "pronunciation", "origin", "originNote", "spellingTip", "misspellings", "category", "patterns"]
VALID = re.compile(r"^[A-Za-z][A-Za-z'\-]{2,}$")


def clean(item, base=None):
    w = (item.get("word") or "").strip()
    if not VALID.match(w):
        return None
    out = {k: item.get(k) for k in FIELDS}
    if base:  # never alter the original curated data
        out.update({"word": base["word"], "difficulty": base["difficulty"], "partOfSpeech": base["partOfSpeech"], "definition": base["definition"], "example": base["example"]})
    out["word"] = out["word"] if base else w.lower()
    if out["difficulty"] not in ("easy", "medium", "hard", "extreme"):
        return None
    if not out.get("definition") or not out.get("example"):
        return None
    if out["word"].lower() not in out["example"].lower():
        out["example"] = f"{out['example'].rstrip('.')} — {out['word']}."
    try:
        out["syllables"] = int(out.get("syllables") or 0) or None
    except (TypeError, ValueError):
        out["syllables"] = None
    out["misspellings"] = [m for m in (out.get("misspellings") or []) if isinstance(m, str) and m.lower() != out["word"].lower()][:3]
    out["patterns"] = [p for p in (out.get("patterns") or []) if isinstance(p, str)][:3]
    if out.get("category") not in CATS:
        out["category"] = "Everyday English" if out["difficulty"] == "easy" else "Academic"
    return {k: v for k, v in out.items() if v not in (None, "", [])}


merged = {}
for f in sorted(glob.glob(str(OUT / "enrich_*.json"))):
    for item in json.load(open(f)):
        key = (item.get("word") or "").lower()
        if key in BASE:
            c = clean(item, BASE[key])
            if c:
                merged[key] = c
# any base word that failed enrichment still ships
for key, b in BASE.items():
    merged.setdefault(key, {**b, "category": "Everyday English" if b["difficulty"] == "easy" else "Academic", "patterns": []})

new_count = 0
for f in sorted(glob.glob(str(OUT / "gen_*.json"))):
    for item in json.load(open(f)):
        key = (item.get("word") or "").lower()
        if key in merged:
            continue
        c = clean(item)
        if c:
            merged[key] = c
            new_count += 1

words = sorted(merged.values(), key=lambda w: (["easy", "medium", "hard", "extreme"].index(w["difficulty"]), w["word"]))
Path("/app/frontend/src/data/words.json").write_text(json.dumps(words, ensure_ascii=False, separators=(",", ":")))
by = {}
for w in words:
    by[w["difficulty"]] = by.get(w["difficulty"], 0) + 1
print(f"total={len(words)} base={len(BASE)} new={new_count} by_difficulty={by}")
