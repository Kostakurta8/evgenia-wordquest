# Fable 5 build prompt — "WordQuest: Fellowship of Words"

> Paste everything below the line into Claude Code running **Fable 5**, from inside
> `D:\Relocated\AI Projects\evgenia-wordquest\`. The `data/` folder already contains
> the two input files referenced here. Working title is **WordQuest** — rename freely.

---

## ROLE & GOAL

You are building a **world-class, mobile-first PWA vocabulary-learning app** — Duolingo-style,
visually stunning, dopamine-rich — for a **14–17-year-old Bulgarian girl named Evgenia**.

She is learning **1177 advanced/literary English words** that were drawn from
**J.R.R. Tolkien's *The Fellowship of the Ring***.

**The #1 priority, above everything else: she must UNDERSTAND each word completely** —
its meaning, how it sounds, how it's used, and how it appeared in the actual book.
Beautiful and fun is essential, but comprehension is the point. Never sacrifice clarity for flash.

The app is used on a **phone ~99% of the time** and **lives on the web** (deployed, not local).
Her progress is **saved in the cloud** (never only in the browser).

---

## INPUTS ALREADY PROVIDED (do NOT re-parse the source docx/PDF)

In `./data/`:

1. **`words_raw.json`** — an array of 1177 objects, already cleaned. Schema:
   ```jsonc
   {
     "id": 1,                 // 1..1177, follows book order
     "page": 1,               // page in the printed book (range 1..352)
     "word": "unobtrusive",   // English headword; may carry a qualifier e.g. "till (verb)"
     "definition": "Not conspicuous or attracting attention; modest in appearance or behaviour.",
     "synonyms": ["inconspicuous", "unassuming", "modest"],
     "antonyms": ["conspicuous", "obtrusive"],   // [] when source had "—"
     "translation": "незабележим, скромен"        // Bulgarian, UTF-8
   }
   ```

2. **`book_text.txt`** — full extracted text of the book, **571 pages**, each page delimited by a
   line `===PDF_PAGE n===`. Real text layer (not OCR). Use this for context-sentence matching.
   Note: the dictionary's `page` is the *printed-book* page (1..352); the PDF page index differs by
   an offset (front matter). Compute the offset (see algorithm) rather than assuming equality.

---

## TECH STACK (non-negotiable core)

- **Next.js (latest stable, App Router) + TypeScript (strict)**.
- **Tailwind CSS** + **Framer Motion** (60fps, juicy).
- **Supabase**: magic-link email auth (persistent/long-lived session) + Postgres for progress. Use `@supabase/ssr`.
- **PWA**: use **Serwist (`@serwist/next`)** (modern App-Router-friendly SW) — manifest, icons, offline shell, installable on iOS/Android.
- **State**: Zustand (with an offline cache that syncs to Supabase).
- **Deploy**: Vercel.
- **Mobile-first, portrait phone** is the primary target: thumb-reachable controls, bottom nav, large tap targets, `env(safe-area-inset-*)` awareness, no hover-only interactions.

### Fonts (IMPORTANT — Bulgarian UI needs Cyrillic glyphs)
The UI is Bulgarian by default, so **all chosen fonts must include Cyrillic**. Do NOT use Cinzel/Marcellus (no Cyrillic).
- Headings/display: **Lora** (literary serif, has Cyrillic) or **Cormorant** — bookish, fits the theme.
- UI/body: **Nunito** or **Manrope** (rounded, friendly, full Cyrillic).
Verify every visible Bulgarian string renders with correct glyphs.

---

## STEP 1 — DATA ENRICHMENT (you generate this during the build → `data/words.json`)

Write a **resumable Node/TS script** (`scripts/enrich.ts`) that reads `words_raw.json` + `book_text.txt`
and produces **`data/words.json`**: every original field PLUS:

| field | content |
|---|---|
| `explanationBg` | 1–2 short sentences in **plain, teen-friendly Bulgarian** explaining the meaning in this context. Accurate, no English jargon. |
| `explanationEn` | simple English paraphrase, ~CEFR B1. |
| `exampleEn` | a fresh, natural everyday example sentence (NOT from the book) showing correct usage. |
| `mnemonicBg` | a memory hook in Bulgarian — a sound-alike, association, or vivid image — to make it stick. Playful. |
| `ipa` | British-English IPA transcription (approximate if needed; may use a library/map). |
| `bookSentenceEn` | the **real sentence from `book_text.txt`** that contains the word, nearest its `page`. `null` if not found. |
| `bookSentenceRef` | the printed-book page used (number) or `null`. |

**You write `explanationBg`/`explanationEn`/`exampleEn`/`mnemonicBg` yourself** — this is the
generation work. Quality rules: these go to a **real learner**, so be **accurate**; base meaning strictly
on the provided `definition` (never invent a different sense); keep tone consistent and warm; Bulgarian
must be correct and natural.

**Book-sentence matching algorithm (be robust):**
1. Load `book_text.txt`; build a char-index → printed-page map. (Estimate the printed page of each PDF
   page, or just record PDF page; then compute a global **offset** = median(pdf_page − dict_page) over a
   sample of rare, unique headwords that occur once. Apply offset when choosing among matches.)
2. Normalize the headword: strip qualifiers like `(verb)`/`(noun)`; build a whole-word, case-insensitive
   regex covering simple inflections (base, +s/es/ed/ing/d, y→ies).
3. Find all matches; split surrounding text into sentences (handle `.!?`, ignore common abbreviations).
4. Pick the match whose page is closest to `dict_page + offset`; tie-break to the cleanest full sentence.
5. **Clean** the sentence: fix hyphen line-breaks (`moun-\ntain`→`mountain`), collapse whitespace, trim.
   Mark the matched word (e.g. wrap in `**…**`) so the UI can highlight it.
6. If no match, set `bookSentenceEn=null` (UI falls back to `exampleEn`).

**Validate**: assert output length === 1177; log a summary of how many words have a book sentence and
list any that don't. Commit `data/words.json`. This is a **build-time** step — runtime ships the JSON statically.

---

## STEP 2 — CONTENT STRUCTURE ("the journey")

- **Detect book chapters** from `book_text.txt` headings (e.g. "Chapter 1" … and Book I / Book II / Prologue).
  Map every word to a chapter via its `page`. Fellowship structure ≈ Prologue + Book I (12 ch) + Book II (10 ch).
- Each **chapter = a Region** (a waypoint on the map).
- Within a region, split words into **lessons of ≤ 8 words** (Duolingo-sized) in book order.
  (~1177 ÷ 8 ≈ ~150 lessons across ~23 regions.)
- Build a **stylized fantasy MAP path**: regions are waypoints; lessons are nodes along a winding trail;
  a node unlocks when the previous is complete. Current node pulses. This is the home screen.

---

## STEP 3 — THE WORD CARD (the heart of the app: "understand completely")

Before drilling a new word, show a **rich, beautiful Word Card**:
- Big headword + **IPA** + **🔊 audio** button (Web Speech API; prefer an `en-GB` voice).
- **Bulgarian explanation** (primary) with a toggle to show the **English explanation**.
- **Example sentence** (`exampleEn`).
- **The real book sentence** (`bookSentenceEn`) in a "от книгата · стр. {ref}" / "from the book · p.{ref}"
  card, with the target word **highlighted**. (Hide this block if null.)
- **Synonyms / antonyms** as tappable chips.
- **Memory hook** (`mnemonicBg`) in a playful callout.
- The **mascot** says a short encouraging line.
- A satisfying **"Разбрах! / Got it"** button to continue.

She should be able to revisit any learned word's card anytime (a searchable **Glossary/Lexicon** screen).

---

## STEP 4 — EXERCISE ENGINE (designed set — you may refine, but cover these)

Per lesson, run an adaptive sequence that mixes these drills (new words start with recognition,
graduate to production):

1. **Meaning Match (MC):** word → choose the correct Bulgarian translation or English meaning.
2. **Reverse Match (MC):** Bulgarian/definition → choose the English word.
3. **Listening (MC/type):** TTS speaks the word → she picks or types it.
4. **Type It:** type the English word from its meaning (active recall; lenient on case, accent-insensitive).
5. **Synonym / Antonym:** pick the synonym, or the odd-one-out, or match the antonym (uses those columns).
6. **★ Context Cloze (signature drill):** the **real book sentence** with the target word blanked
   (`____`) → fill from options or by typing. The single best vocabulary exercise — prioritize it for
   words that have a `bookSentenceEn`.
7. **Tap-the-Pairs warmup:** match a grid of English ↔ Bulgarian.

Rules:
- Shuffle option order every time (no positional bias). Distractors come from same-region words.
- A wrong answer **re-queues within the lesson** AND feeds the spaced-repetition queue.
- **Gentle failure model:** NO hard "hearts" that block learning. Use a **mastery bar** that fills with
  correct answers. Provide an OPTIONAL **"Challenge" mode** (lives + timer + bigger XP) for dopamine seekers.

---

## STEP 5 — SPACED REPETITION (SRS)

Implement an **SM-2-style** scheduler. Every word carries SRS state (ease, interval, due date, reps).
Misses are scheduled sooner. A **"Преговор / Review"** hub surfaces due words and runs a mixed drill of
exactly the items that need it. Show a "due today" count badge.

---

## STEP 6 — DOPAMINE SYSTEM (tasteful, 60fps, mobile)

- **XP** (per correct + lesson-complete bonus + "perfect lesson" bonus), **levels**, level-up animation.
- **Daily streak** with a **streak-freeze** item; **daily-goal ring** that fills.
- **Gems/coins** earned → spend on streak-freezes / cosmetics.
- **Treasure-chest reveal** at region milestones; **combo multiplier** for answer streaks.
- **Achievements/badges** gallery.
- **Animated mascot** reactions (idle / happy / celebrate / gentle-encourage on miss).
- **Confetti**, **sound effects** (with a global mute), and **phone haptics** via `navigator.vibrate`
  (gracefully no-op on iOS Safari — pair with a micro-animation + sound so feedback still lands).
- **End-of-lesson summary**: words learned, accuracy, XP, streak, a shareable result card.
- Respect **`prefers-reduced-motion`** (swap big motion for fades).

---

## STEP 7 — MASCOT

Create an **original companion creature** (NOT Tolkien IP — no Gandalf/Frodo/etc.). Suggestions: a small
**glowing moth/firefly guide**, a **luminous fox**, or a **tiny friendly dragon** carrying a lantern.
Give it a name, a simple expressive design (SVG/Lottie or layered PNG), and reaction states. It guides
the journey and reacts to her performance.

---

## STEP 8 — THEME / VISUAL SYSTEM (Hybrid: bright + Tolkien)

- Warm **parchment** base, **emerald + gold**, plus a vivid dopamine **accent**; full **dark mode**.
- **Map-as-path** home; **rune / scroll / ring / lantern** motifs (generic, NOT trademarked).
- Large rounded type, juicy tactile buttons, soft shadows, ambient particles (embers/fireflies, subtle).
- Starter tokens (tune freely): parchment `#F4E9D0`, ink `#2B2118`, emerald `#1F7A5C`, gold `#C9A227`,
  accent `#E8557A` / teal `#2EC5C0`. Define as CSS variables + Tailwind theme; light + dark.
- Everything portrait-first, bottom nav (Map · Review · Lexicon · Profile), big thumb targets.

---

## STEP 9 — ARTWORK (~40 AI images, region/scene banners only)

Generate **~40 images** total: a banner per Region + a few milestone "scene" cards.
**Generic high-fantasy only — NO named characters and NO movie likenesses** (IP-safe and avoids generator
content blocks). Example scene prompts: "rolling green hills with little round doors in the hillsides,
golden hour, painterly"; "misty grey mountains over a pine valley"; "ancient mossy forest with shafts of
light"; "a river journey in canoes at dusk"; "a ruined stone watchtower on a hill under stars";
"a starlit glade with silver lanterns". Store in `/public/art/`. **Per-word visuals = icons/emoji +
animation**, never bespoke per-word images. If image generation isn't available in your environment,
create tasteful gradient/SVG placeholders and leave a `TODO: art` manifest listing the 40 prompts.

---

## STEP 10 — i18n

Bulgarian UI **by default**, with a **toggle to English** (persisted). All chrome strings in a
`{ bg, en }` dictionary — no hard-coded UI text. **Target words are always English.**

---

## STEP 11 — AUTH & DATA (Supabase)

- **Magic-link** email sign-in (`signInWithOtp`), **persistent session** (she signs in once, stays in for months).
- Postgres schema (provide a SQL migration), with **RLS** so each user sees only their rows:
  - `profiles(id uuid pk → auth.users, display_name, ui_lang, created_at)`
  - `progress(user_id, word_id int, status, mastery, ease, interval_days, due_at, reps, times_seen, times_correct, last_seen, pk(user_id,word_id))`
  - `stats(user_id pk, xp, level, streak, longest_streak, last_active, gems, daily_goal)`
  - `achievements(user_id, key, earned_at)`
- **Word CONTENT stays as static `words.json` shipped in the app — NOT in the DB.** Only progress/stats in DB.
- **Offline-first**: cache progress locally (Zustand persist) and **sync to Supabase** when online (phone use).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Put placeholders in `.env.example`.

---

## STEP 12 — PWA

Manifest + maskable icons + splash; Serwist service worker; offline shell + cached `words.json`;
"Add to Home Screen" nudge; standalone display. Must feel like a native app on her phone.

---

## QUALITY BARS (must pass before "done")

- TypeScript strict: **0 errors**. ESLint clean.
- All **1177** words load; **every lesson playable**; **0 console errors**.
- Mobile **Lighthouse ≥ 90** Performance + Accessibility (test at iPhone viewport).
- **60fps** animations; `prefers-reduced-motion` honored; screen-reader labels + keyboard support.
- Unit tests for **SRS scheduling** and **answer scoring/normalization**.
- **Playwright** smoke pass on a **mobile viewport**: sign-in stub → open a lesson → Word Card →
  do each exercise type → finish → XP/streak update → review queue populated.

---

## BUILD ORDER (phases — verify each before moving on)

- **P1** — Scaffold (Next + TS + Tailwind + Framer + Supabase client + Serwist). Theme tokens + fonts
  (Cyrillic-safe). Write & run `scripts/enrich.ts` → `data/words.json` (assert 1177; report book-sentence coverage).
- **P2** — Map/path home + lesson player + **Word Card** + exercises 1–3 + XP/streak + Supabase magic-link
  auth + progress read/write. Playable end-to-end for one region.
- **P3** — Exercises 4–7 + **SRS** + Review hub + full dopamine layer (haptics/sound/confetti/mascot/levels/
  achievements) + Lexicon/Glossary search + Challenge mode.
- **P4** — Artwork (~40) + PWA + i18n toggle + a11y + Lighthouse + Playwright verify + **deploy to Vercel**.

---

## CONSTRAINTS / GOTCHAS

- Do **not** put the 1177 words in the database; ship them as static JSON.
- Do **not** depict Tolkien IP in generated art; keep book-sentence quotes short (educational/personal use).
- **Explanation accuracy is paramount** — this is for a real learner; if unsure of a sense, defer to the
  provided `definition`.
- **Vercel deploy:** the git commit-author email must match the GitHub account on the Vercel project, or a
  Hobby-tier deploy is rejected ("commit email not matched to GitHub"). Set `git config user.email` to the
  account's GitHub email before deploying. (Known issue from a prior project on this machine.)
- iOS Safari: Web Speech needs a user gesture to start; `navigator.vibrate` is unsupported — degrade gracefully.

**Begin with P1. Show me the data-enrichment summary (1177 count + book-sentence coverage) before continuing to P2.**
