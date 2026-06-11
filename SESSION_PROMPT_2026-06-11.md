# WordQuest — project state & next-session handoff (2026-06-11)

**Read this first when resuming work on Evgenia WordQuest.**

## What this is

Mobile-first PWA teaching **1177 advanced English words** from *The Fellowship of
the Ring* to Evgenia (14–17, Bulgarian). Duolingo-style journey map, real book
sentences, SM-2 spaced repetition, Bulgarian UI with EN toggle. #1 priority:
full comprehension of every word (meaning, sound, usage, book context).

- **Live:** https://evgenia-wordquest.vercel.app (Vercel project
  `evgenia-wordquest`, team `kstamboldziev-6898s-projects`, CLI deploys)
- **Repo:** https://github.com/Kostakurta8/evgenia-wordquest — **PUBLIC**
  (made public 2026-06-11 to clear the Vercel Hobby commit-author block)
- **Local:** `D:\Relocated\AI Projects\evgenia-wordquest\`
- **Supabase:** project `sfnrbogmmhloctlipwcr` (eu-central-1); keys in
  `.env.local` (gitignored); schema applied with RLS + signup trigger

## State: ALL PHASES BUILT + v2 polish — everything below is LIVE

| Commit | Content |
|---|---|
| `4d52fd1` P1 | Theme tokens (parchment/emerald/gold + dark), Lora+Manrope Cyrillic, **enrichment: 1177/1177 words, 93.5% (1100) real book sentences** |
| `7ba2a8a` P2 | Journey (20 regions/157 lessons), map, lesson player, Word Card, exercises 1–3, SM-2, zustand+Supabase sync, magic-link auth |
| `6b80cd1` P3 | Type-It, ★Context Cloze, Tap-Pairs, synonym pick, Review hub, combo/level-up/chests/10 achievements, Challenge mode, vitest 28/28 |
| `a5ae1a8` P4 | Serwist PWA (installable, offline), Искра icons, install nudge, art manifest, deployed |
| `7f63ce4` v2 | **20 hand-built SVG chapter scenes**, map trail v2 (S-curve path, fireflies, mascot at node), **region sheet with 20 original BG chapter recaps**, **Речник rebuilt** (empty-page + dead-BG-search bugs fixed, filters, load-more, fuzzy), **Трудни думи** deck, lesson polish (mascot feedback, XP float, stars, count-up), SVG nav icons |
| `529967b` | Преговор tab fix (infinite re-render from array-returning zustand selector) |

## Architecture map (key files)

```
data/words_raw.json          1177 parsed dictionary entries (id, page 1..352, word, def, syn/ant, BG)
data/book_text.txt           full book, ===PDF_PAGE n=== markers (571 pages)
data/words.json + public/    enriched dataset (explanationBg/En, exampleEn, mnemonicBg, ipa, bookSentenceEn/Ref)
data/journey.json + public/  20 regions / 157 lessons (≤8 words, book order)
scripts/enrich.ts            resumable merger: validates 24 gen slices, matches book sentences
scripts/build_journey.ts     chapter detection + EMPIRICAL dict↔PDF page map (see gotchas)
scripts/make_icons.mjs       Искра PNG icons from inline SVG via sharp
src/lib/
  types.ts i18n.ts           all UI strings {bg,en}; t(key, lang) + useT()
  data.ts                    client loaders — retry w/ backoff, NEVER caches rejections
  srs.ts                     SM-2 (grade q0..5, due helpers) — unit-tested
  xp.ts                      XP/levels/streak/gems rules — unit-tested
  answers.ts                 typed-answer normalization, Damerau-Lev ≤1 — unit-tested
  shuffle.ts hardWords.ts recaps.ts achievements.ts audio.ts (TTS en-GB, sfx, haptics)
  store/app.ts               zustand persist 'wq-app-v1' — progress/stats/lessons/chests/achievements
  sync.ts                    pull/merge/push to Supabase (chunked upserts, dirty tracking)
  supabase/ client.ts server.ts database.types.ts
src/components/
  MapTrail.tsx               map v2: StatsBar, Fireflies, TrailPath, LessonNode, ChestModal, RegionSheet
  RegionScene.tsx            20 layered SVG scenes (primitives kit, config per slug)
  WordCard.tsx Mascot.tsx BottomNav.tsx (custom SVG icons) CloudSync.tsx InstallNudge.tsx
  lesson/ LessonPlayer.tsx Exercise.tsx (FeedbackFooter shared) TypeIt.tsx Cloze.tsx Pairs.tsx
  review/ ReviewPlayer.tsx   due session OR explicit wordIds (hard-words deck)
src/app/
  (tabs)/ page(map) review lexicon profile · lesson/[lessonId] · challenge · auth/confirm · manifest.ts sw.ts
tests/                       vitest: srs, xp, answers (28 tests)
```

## Commands

```bash
npm run dev          # Turbopack dev (SW disabled in dev)
npm run build        # next build --webpack  ← REQUIRED for Serwist
npm run lint / test / typecheck / enrich
npx tsx scripts/build_journey.ts
npx vercel --prod --yes   # deploy (CLI authed as kstamboldziev-6898)
```

## Gotchas (hard-won — do not rediscover)

1. **@serwist/next needs webpack**: prod build = `next build --webpack`;
   dev needs `turbopack: {}` in next.config.ts to silence the guard.
   `public/sw.js` is generated → gitignored + eslint-ignored.
2. **zustand selectors must return stable refs** — an inline
   `useApp(s => someArrayDerivation(s.x))` infinite-loops the page (broke
   Преговор). Select the object, derive with `useMemo`.
3. **react-hooks lint (React Compiler rules)**: no `Math.random` in render →
   pre-roll exercise options in effects/handlers (see `rollChoices`/`withChoices`);
   no sync `setState` in effects → keyed sub-components (TaskTimer) or
   `useSyncExternalStore` (theme).
4. **data.ts loaders must never cache a rejected promise** — one flaky fetch
   blanked Речник permanently. Retry + clear cache slot + error UI w/ retry.
5. **Search normalization**: `normalizeAnswer` (answers.ts) is Latin-only by
   design (typed answers). For search use the Cyrillic-safe `fold()` in
   lexicon/page.tsx — BG queries through normalizeAnswer become "".
6. **Dictionary pages ≠ PDF pages** (different editions, NON-linear relation).
   build_journey.ts fits an empirical map from single-occurrence headwords
   (bucket medians + monotone piecewise-linear). The dictionary ENDS inside
   The Mirror of Galadriel → last 3 chapters have no vocab (dropped).
7. **Vercel Hobby author-block**: CLI deploys send git author; Vercel acct is
   Google-login (no GitHub connection) → blocked on private repos. Repo made
   PUBLIC = fix. (AIcademy used git-stripped copy instead.)
8. **Source data dirt**: raw synonyms/antonyms can be string/null (741 rows) —
   `toList()` in enrich.ts normalizes; source headwords carry typos
   ("conjectura", "featuresless") — generated content corrects them.
9. iOS Safari: Web Speech needs user gesture (all speak() calls are in tap
   handlers); `navigator.vibrate` unsupported → buzz() no-ops.
10. Replayed lessons award task-XP only (no completion/perfect bonus, no gems).

## Remaining / next steps

1. **ONE MANUAL STEP (owner)**: Supabase Dashboard → Authentication → URL
   Configuration → Site URL = `https://evgenia-wordquest.vercel.app`, add
   `https://evgenia-wordquest.vercel.app/auth/confirm` to Redirect URLs.
   Until then magic links redirect to localhost. (Not settable via MCP.)
2. Cloud sync round-trip untested with a real sign-in (code paths typed +
   reviewed; schema + RLS live; advisors clean).
3. Playwright e2e spec + Lighthouse audit (quality bar from original spec).
4. Optional features owner declined for now: Спаси Искра spelling game,
   weekly progress chart, Дума на деня, flashcards in Речник, AI-painted
   region art (40 prompts ready in `public/art/MANIFEST.md`).
5. Each child = own email sign-in → separate cloud progress (works already).

## Verification habits for this repo

Gates: `tsc --noEmit` + `eslint` + `vitest` + `next build --webpack` all clean
before commit. UI changes: drive the real flow in a 390×844 browser (lesson →
summary → map unlock; review session → summary) and assert HEADINGS render —
don't trust element-count==0 as "hidden by design" (that's how the Преговор
crash slipped through once).
