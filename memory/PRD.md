# Spelling Bee Champion — PRD

**Original request:** Build a polished, interactive Spelling Bee web app for students (Yr 7–12). Word is spoken via browser TTS; the student types the spelling; app gives immediate feedback. Multiple difficulties, modes, results, progress tracking, and settings.

**User choices (2026-02):** localStorage only (no accounts), 400+ curated words built-in, default design.

## Architecture
- **Frontend:** React 19 + React Router 7 + Tailwind + shadcn/ui + lucide-react + Recharts + Sonner
- **Backend:** FastAPI + Mongo template (not used by app — everything is client-side)
- **Storage:** localStorage keys `sb.settings.v1`, `sb.stats.v1`, `sb.history.v1`, `sb.missed.v1`, `sb.theme.v1`
- **TTS:** browser SpeechSynthesis API

## What's implemented (2026-02)
- Dashboard: hero, stat bento, difficulty picker, 6 mode cards, missed-words chips
- Practice: TTS play/repeat/speed/sentence, monospace autocomplete-off input, submit/give-up, per-char diff feedback, auto-advance on correct, timer + lives for Challenge/Endless/Test modes, anti-cheat (word never appears in DOM until feedback)
- Results: accuracy, correct, best streak, avg time, missed-words review, Try Again + Practise Mistakes
- Progress: summary cards, Recharts accuracy line + difficulty bar, missed list, recent sessions table
- Settings: speed, voice select, sound effects, auto-play, auto-advance, theme dark/light, preferred difficulty, reset
- 400+ words across easy/medium/hard/extreme with definitions & examples

## Backlog / P1 ideas
- Daily challenge with shareable score card
- Custom user word lists (import CSV / paste)
- Phonetic (IPA) breakdown on missed words
- Optional cloud sync (login)
- Sound effect variety + confetti animation
