// Spelling rule mini-lessons. `quiz` = pick the correct spelling; `pattern` links to Pattern Mode.
export const LESSONS = [
  {
    id: "silent-letters", title: "Silent letters", pattern: "silent-letter", emoji: "🤫",
    summary: "English keeps letters it no longer pronounces — usually a fossil of the word's history.",
    body: "Silent letters are leftovers from older pronunciations or borrowed spellings. Common groups: silent k before n (knife, knight), silent b after m (climb, thumb), silent w before r (wrist, wrong), silent g before n (gnome, foreign), silent h (rhythm, honest) and silent p (psychology, pneumonia). The trick is to link the silent letter to a related word where it IS pronounced: sign → signature, muscle → muscular.",
    examples: ["knife", "rhythm", "psychology", "pneumonia", "subtle", "receipt"],
    quiz: [
      { options: ["recipt", "receipt", "receit"], answer: "receipt" },
      { options: ["pnuemonia", "pneumonia", "neumonia"], answer: "pneumonia" },
      { options: ["rythm", "rhythem", "rhythm"], answer: "rhythm" },
    ],
  },
  {
    id: "double-consonants", title: "Double consonants", pattern: "double-consonant", emoji: "👯",
    summary: "The 1-1-1 rule and why 'accommodate' gets two c's and two m's.",
    body: "Double the final consonant before adding -ing/-ed when a ONE-syllable word has ONE vowel followed by ONE consonant: run → running, stop → stopped. For longer words, double only if the stress is on the last syllable: begin → beginning, but open → opening. Some words are simply built from doubled Latin prefixes: ac-com-modate (ad + com), ne-ces-sary (one c, two s: 'one collar, two sleeves').",
    examples: ["accommodate", "necessary", "beginning", "committee", "embarrass", "occurrence"],
    quiz: [
      { options: ["accomodate", "acommodate", "accommodate"], answer: "accommodate" },
      { options: ["occurence", "occurrence", "ocurrence"], answer: "occurrence" },
      { options: ["embarass", "embarrass", "embarras"], answer: "embarrass" },
    ],
  },
  {
    id: "prefixes", title: "Prefixes", pattern: "prefix", emoji: "⬅️",
    summary: "Adding a prefix never changes the spelling of the root — even if it creates a double letter.",
    body: "Prefixes attach to the front of a word without dropping letters: mis + spell = misspell, un + necessary = unnecessary, dis + satisfied = dissatisfied, ir + relevant = irrelevant. Learn the meaning of common prefixes (re- again, pre- before, anti- against, sub- under, inter- between) and you can decode thousands of words.",
    examples: ["misspell", "unnecessary", "dissatisfied", "irrelevant", "interrupt", "subterranean"],
    quiz: [
      { options: ["mispell", "misspell", "misspel"], answer: "misspell" },
      { options: ["dissatisfied", "disatisfied", "dissatisfyed"], answer: "dissatisfied" },
      { options: ["unecessary", "unnecesary", "unnecessary"], answer: "unnecessary" },
    ],
  },
  {
    id: "suffixes", title: "Suffixes", pattern: "suffix", emoji: "➡️",
    summary: "Drop the silent e before a vowel suffix, keep it before a consonant suffix — mostly.",
    body: "hope → hoping (drop e before -ing) but hope → hopeful (keep e before -ful). Exceptions keep the e to protect a soft c or g: notice → noticeable, courage → courageous. Words ending in a consonant + y change y to i: happy → happiness, but a vowel + y stays: enjoy → enjoyment. Watch -ful (one l): beautiful, careful.",
    examples: ["noticeable", "courageous", "happiness", "argument", "truly", "beautiful"],
    quiz: [
      { options: ["noticable", "noticeable", "noticible"], answer: "noticeable" },
      { options: ["arguement", "argument", "arguemant"], answer: "argument" },
      { options: ["truely", "truly", "trully"], answer: "truly" },
    ],
  },
  {
    id: "vowel-combos", title: "Vowel combinations", pattern: "vowel-combination", emoji: "🎶",
    summary: "ie or ei? -ea- or -ee-? The famous rules — and their exceptions.",
    body: "'i before e except after c' works when the sound is 'ee': believe, achieve, receive, ceiling. It fails when the sound is 'ay' (weigh, neighbour) and in famous exceptions: weird, seize, protein, caffeine, height, foreign, leisure. For -ea-/-ee- there is no rule: memorise them in families (feature, creature, treasure).",
    examples: ["believe", "receive", "weird", "seize", "leisure", "foreign"],
    quiz: [
      { options: ["recieve", "receive", "receeve"], answer: "receive" },
      { options: ["wierd", "weird", "wired"], answer: "weird" },
      { options: ["liesure", "leisure", "leasure"], answer: "leisure" },
    ],
  },
  {
    id: "tion-sion", title: "-tion, -sion and -cian", pattern: "-tion/-sion", emoji: "🔚",
    summary: "The 'shun' sound has three spellings — the root word tells you which.",
    body: "-tion is by far the most common (nation, education). Use -sion when the root ends in -d, -de, -se or -mit: decide → decision, expand → expansion, permit → permission. Use -ssion when the root ends in -ss or -mit: discuss → discussion. Use -cian for people and professions: musician, magician, electrician.",
    examples: ["decision", "permission", "expansion", "musician", "occasion", "conscious"],
    quiz: [
      { options: ["permision", "permission", "permittion"], answer: "permission" },
      { options: ["musician", "musition", "musitian"], answer: "musician" },
      { options: ["occassion", "ocasion", "occasion"], answer: "occasion" },
    ],
  },
  {
    id: "confused", title: "Commonly confused words", pattern: "homophone", emoji: "🔀",
    summary: "affect/effect, stationary/stationery, principal/principle — meaning decides spelling.",
    body: "affect is usually the verb (to influence), effect the noun (the result). Stationery with an e is envelopes; stationary with an a is standing still. Your principal is your pal; a principle is a rule. Complement completes; a compliment is kind. Desert (one s, sandy) vs dessert (two s — you want seconds).",
    examples: ["affect", "effect", "stationery", "principle", "complement", "dessert"],
    quiz: [
      { options: ["The rain will affect the match.", "The rain will effect the match.", "The rain will efect the match."], answer: "The rain will affect the match." },
      { options: ["I bought new stationary for school.", "I bought new stationery for school.", "I bought new stationairy for school."], answer: "I bought new stationery for school." },
      { options: ["Honesty is my guiding principal.", "Honesty is my guiding principle.", "Honesty is my guiding principel."], answer: "Honesty is my guiding principle." },
    ],
  },
  {
    id: "british-american", title: "British vs American spelling", pattern: "british-spelling", emoji: "🌏",
    summary: "Australian spelling follows British conventions: -our, -ise, -re, and doubled l.",
    body: "colour/color, favourite/favorite (-our vs -or); realise/realize, organise/organize (-ise vs -ize); centre/center, theatre/theater (-re vs -er); travelling/traveling, jewellery/jewelry (double l). Also: defence (n.) vs defense, programme vs program, grey vs gray. In a spelling bee, ask the judge which convention is accepted — this app accepts British/Australian forms.",
    examples: ["colour", "realise", "centre", "travelling", "jewellery", "defence"],
    quiz: [
      { options: ["jewelery", "jewellery", "jewlery"], answer: "jewellery" },
      { options: ["favourite", "favorate", "favourit"], answer: "favourite" },
      { options: ["travelling", "travling", "travelling ."], answer: "travelling" },
    ],
  },
  {
    id: "greek-roots", title: "Greek roots", pattern: "greek-root", emoji: "🏛️",
    summary: "ph = f, ch = k, y as a vowel, and rh-: the fingerprints of Greek.",
    body: "Greek-derived words use ph for the f sound (philosophy, photograph), ch for k (chorus, chronology, psychology), y as a vowel (rhythm, symbol, hypothesis) and often start with silent-ish clusters: pn- (pneumonia), ps- (psychology), rh- (rhetoric). Key roots: bio (life), graph (write), phon (sound), tele (far), chron (time), hydro (water).",
    examples: ["philosophy", "chronology", "hypothesis", "psychology", "rhetoric", "photosynthesis"],
    quiz: [
      { options: ["philosofy", "philosophy", "filosophy"], answer: "philosophy" },
      { options: ["hypothesis", "hipothesis", "hypothisis"], answer: "hypothesis" },
      { options: ["cronology", "chronology", "chronologie"], answer: "chronology" },
    ],
  },
  {
    id: "latin-roots", title: "Latin roots", pattern: "latin-root", emoji: "📜",
    summary: "Recognise the root and the prefix, and long academic words fall apart into easy pieces.",
    body: "Latin gives English its academic core. Roots: dict (say: predict, dictionary), scrib/script (write: describe, manuscript), aud (hear: audible), vis/vid (see: visible, evidence), port (carry: transport), ject (throw: reject), spec (look: inspect, spectacle). Combine with prefixes (con-, ex-, in-, pre-, sub-) and suffixes (-tion, -ible, -ous) to build and decode words.",
    examples: ["manuscript", "audible", "evidence", "conspicuous", "prescription", "circumference"],
    quiz: [
      { options: ["manuscript", "manuscrypt", "manuscipt"], answer: "manuscript" },
      { options: ["conspicious", "conspicuous", "conspicous"], answer: "conspicuous" },
      { options: ["circumferance", "circumference", "circumfrence"], answer: "circumference" },
    ],
  },
  {
    id: "traps", title: "Common spelling traps", pattern: "c/s confusion", emoji: "🪤",
    summary: "The words most often misspelled by strong spellers — and how to lock them in.",
    body: "definitely (there is a 'finite' inside — never 'definately'); separate (there's 'a rat' in it); necessary (one collar, two sleeves); privilege (no d — 'leg' at the end); occasion (two c, one s); recommend (re + commend, one c); calendar (ends -ar); cemetery (all e's); minuscule (from 'minus'); supersede (the only -sede word in English).",
    examples: ["definitely", "separate", "privilege", "recommend", "calendar", "supersede"],
    quiz: [
      { options: ["definately", "definitely", "definitley"], answer: "definitely" },
      { options: ["seperate", "separate", "separete"], answer: "separate" },
      { options: ["priviledge", "privilege", "privelege"], answer: "privilege" },
    ],
  },
];
