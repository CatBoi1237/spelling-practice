"""One-off generator: enrich existing words + generate new ones -> /app/scripts/out/*.json"""
import asyncio, json, os, re, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage

OUT = Path("/app/scripts/out")
BASE = json.loads((OUT / "base.json").read_text())
KEY = os.environ["EMERGENT_LLM_KEY"]

CATEGORIES = ["Science", "Literature", "Geography", "Animals", "Technology", "Medicine", "History", "Everyday English", "Academic", "Competition"]
DIFFS = {
    "easy": "Year 7-8 (ages 12-13): common but tricky everyday words, 5-10 letters",
    "medium": "Year 9-10 (ages 14-15): academic vocabulary, 7-12 letters, tricky patterns",
    "hard": "Year 11-12 (ages 16-18): advanced academic/literary vocabulary, often 9-14 letters",
    "extreme": "National spelling bee champion level: rare, foreign-derived, very hard-to-spell words",
}
PATTERNS = "double-consonant, silent-letter, -tion/-sion, ie/ei, -ough, -able/-ible, -ance/-ence, -ant/-ent, prefix, suffix, greek-root, latin-root, french-origin, homophone, vowel-combination, ph/gh, -ly/-ally, -ary/-ery/-ory, c/s confusion, y-to-i, british-spelling"

SCHEMA = """Each item MUST be a JSON object with exactly these keys:
"word" (lowercase unless proper noun), "partOfSpeech", "definition" (one clear sentence fragment, ending with a period),
"example" (natural sentence using the exact word), "syllables" (integer), "syllableBreak" (e.g. "ac-com-mo-date"),
"pronunciation" (simple respelling with CAPS stress, e.g. "uh-KOM-uh-dayt"), "origin" (one word: Latin/Greek/French/Old English/German/Italian/Arabic/etc.),
"originNote" (short phrase <= 12 words about the root/meaning), "spellingTip" (one memorable tip <= 20 words about the tricky part),
"misspellings" (array of 2-3 realistic misspellings), "category" (one of: %s),
"patterns" (array of 1-3 tags from: %s).
Return ONLY a JSON array. No markdown, no commentary.""" % (", ".join(CATEGORIES), PATTERNS)


def chat(session):
    return LlmChat(api_key=KEY, session_id=session, system_message="You are a meticulous lexicographer building a spelling-bee word database for Australian students. Use Australian/British spelling conventions. Output strict JSON only.").with_model("openai", "gpt-5.4")


def parse(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start, end = text.find("["), text.rfind("]")
    return json.loads(text[start:end + 1])


async def ask(session, prompt, retries=3):
    for attempt in range(retries):
        try:
            resp = await chat(f"{session}-{attempt}").send_message(UserMessage(text=prompt))
            return parse(resp)
        except Exception as e:
            print(f"[{session}] attempt {attempt+1} failed: {e}", flush=True)
            await asyncio.sleep(2)
    return []


async def enrich_batch(sem, i, batch):
    path = OUT / f"enrich_{i:03d}.json"
    if path.exists():
        return
    items = "\n".join(f'- {w["word"]} ({w["partOfSpeech"]}, {w["difficulty"]}): {w["definition"]}' for w in batch)
    prompt = f"Enrich these existing words. Keep the given word, partOfSpeech and definition EXACTLY as provided (do not change them) and add all other fields. Add an 'example' sentence too (natural, uses the exact word).\n{SCHEMA}\n\nWords:\n{items}"
    async with sem:
        data = await ask(f"enrich-{i}", prompt)
    path.write_text(json.dumps(data))
    print(f"enriched batch {i}: {len(data)}", flush=True)


async def gen_batch(sem, diff, cat, exclude, count):
    path = OUT / f"gen_{diff}_{cat.replace(' ', '_')}.json"
    if path.exists():
        return
    prompt = (
        f"Generate {count} DISTINCT English words for a spelling bee.\nDifficulty: {diff} = {DIFFS[diff]}.\nCategory: {cat}.\n"
        f"Every word MUST be genuinely spelling-challenging and appropriate for the difficulty. Do NOT include any of these already-used words: {', '.join(sorted(exclude))}.\n"
        f"Set \"difficulty\" is implied ({diff}); set \"category\" to \"{cat}\".\n{SCHEMA}"
    )
    async with sem:
        data = await ask(f"gen-{diff}-{cat}", prompt)
    for d in data:
        d["difficulty"] = diff
    path.write_text(json.dumps(data))
    print(f"generated {diff}/{cat}: {len(data)}", flush=True)


async def main():
    sem = asyncio.Semaphore(5)
    exclude = {w["word"].lower() for w in BASE}
    tasks = []
    for i in range(0, len(BASE), 25):
        tasks.append(enrich_batch(sem, i // 25, BASE[i:i + 25]))
    per = {"easy": 18, "medium": 22, "hard": 22, "extreme": 20}
    for diff in DIFFS:
        for cat in CATEGORIES:
            tasks.append(gen_batch(sem, diff, cat, exclude, per[diff]))
    await asyncio.gather(*tasks)
    print("DONE", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
