# WordQuest: Задругата на думите

**Live: https://evgenia-wordquest.vercel.app** (Vercel, project `evgenia-wordquest`, team kstamboldziev-6898).

Mobile-first PWA for learning 1177 advanced English words from *The Fellowship
of the Ring* — built for Evgenia. Duolingo-style journey map, real book
sentences, SM-2 spaced repetition, Bulgarian UI.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind v4 · Framer Motion ·
Supabase (magic-link auth + progress) · Zustand · Serwist PWA · Vercel.

Mascot: **Искра** — a glowing firefly guide (original, no Tolkien IP).

## Data pipeline

- `data/words_raw.json` — 1177 parsed dictionary entries (id, printed page,
  word, definition, synonyms, antonyms, BG translation). Do not regenerate.
- `data/book_text.txt` — full book text with `===PDF_PAGE n===` markers.
- `data/enrichment/input/slice_*.json` — generation inputs (50 words each).
- `data/enrichment/out/slice_*.json` — generated explanationBg/En, exampleEn,
  mnemonicBg, ipa per word (model-written, validated by the merger).
- `npm run enrich` — validates every generated item (Cyrillic checks, id
  completeness, IPA shape), matches each word to its real book sentence
  (per-page de-hyphenation, abbreviation-aware sentence split, inflection
  matching, robust printed→PDF page model: constant offset vs Theil–Sen
  linear, whichever has lower median residual), then writes:
  - `data/words.json` + `public/words.json` — the 1177 enriched words
  - `data/enrichment/REPORT.json` — coverage, page model, warnings
  - missing/invalid items → `data/enrichment/input/redo_*.json`, exit 2
    (resumable: generate `out/redo_*.json` and re-run).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run enrich     # rebuild data/words.json
```

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(see `.env.example`). Supabase project: `evgenia-wordquest` (eu-central-1).

## Build phases

- **P1** ✅ scaffold, theme tokens (parchment/emerald/gold, dark mode),
  Cyrillic fonts (Lora + Manrope), data enrichment → `words.json`
- **P2** map home, lesson player, Word Card, exercises 1–3, XP/streak,
  Supabase auth + progress
- **P3** exercises 4–7, SM-2 review hub, full dopamine layer, Lexicon,
  Challenge mode
- **P4** ✅ Serwist PWA (manifest + icons + offline SW; build uses `next build --webpack` — @serwist/next needs webpack), install nudge, art manifest (public/art/MANIFEST.md, 40 prompts), deployed to Vercel.

## Remaining

- Supabase Dashboard → Auth → URL Configuration: set Site URL to the live domain and add `https://evgenia-wordquest.vercel.app/auth/confirm` to Redirect URLs (one-time, needed for magic links from the phone).
- Real region artwork (prompts ready in `public/art/MANIFEST.md`).
- Playwright e2e spec + Lighthouse pass.
