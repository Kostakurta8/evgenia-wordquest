/**
 * Resumable enrichment merger.
 *
 * Inputs:
 *   data/words_raw.json            — 1177 dictionary entries (id, page 1..352, word, ...)
 *   data/book_text.txt             — full book text, ===PDF_PAGE n=== markers (1..571)
 *   data/enrichment/out/*.json     — generated content slices (explanationBg/En,
 *                                    exampleEn, mnemonicBg, ipa per id); files are
 *                                    merged in name order, later files override.
 *
 * Outputs:
 *   data/words.json                — 1177 fully enriched words (canonical)
 *   public/words.json              — copy served statically to the app
 *   data/enrichment/REPORT.json    — coverage + page-model + warning details
 *
 * Resumability: if any id is missing or fails validation, redo input slices are
 * written to data/enrichment/input/redo_*.json and the script exits with code 2.
 * Generate out/redo_*.json for them and re-run. Console output is ASCII-only
 * (Windows console chokes on Cyrillic); full detail goes to REPORT.json.
 *
 * Run from the repo root: npm run enrich
 */
import fs from "node:fs";
import path from "node:path";

interface RawWord {
  id: number;
  page: number;
  word: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  translation: string;
}

interface GenFields {
  explanationBg: string;
  explanationEn: string;
  exampleEn: string;
  mnemonicBg: string;
  ipa: string;
}

interface EnrichedWord extends RawWord, GenFields {
  bookSentenceEn: string | null;
  bookSentenceRef: number | null;
}

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const OUT_DIR = path.join(DATA, "enrichment", "out");
const IN_DIR = path.join(DATA, "enrichment", "input");

// ---------------------------------------------------------------- utilities

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CYRILLIC = /[Ѐ-ӿ]/;

// ------------------------------------------------------------ load raw words

const raw: RawWord[] = JSON.parse(
  fs.readFileSync(path.join(DATA, "words_raw.json"), "utf8"),
);
if (raw.length !== 1177) {
  console.error(`FATAL: words_raw.json has ${raw.length} entries, expected 1177`);
  process.exit(1);
}
const rawById = new Map(raw.map((w) => [w.id, w]));

// ------------------------------------------- load + validate generated slices

interface Invalid {
  id: number;
  reason: string;
}

const gen = new Map<number, GenFields>();
const invalid: Invalid[] = [];
const warnings: string[] = [];

function validateItem(item: Record<string, unknown>): string | null {
  const id = item.id;
  if (typeof id !== "number" || !rawById.has(id)) return "unknown or missing id";
  for (const f of [
    "explanationBg",
    "explanationEn",
    "exampleEn",
    "mnemonicBg",
    "ipa",
  ]) {
    const v = item[f];
    if (typeof v !== "string" || v.trim().length < 2) return `empty field ${f}`;
  }
  const it = item as unknown as GenFields & { id: number };
  if (!CYRILLIC.test(it.explanationBg)) return "explanationBg not Cyrillic";
  if (!CYRILLIC.test(it.mnemonicBg)) return "mnemonicBg not Cyrillic";
  if (CYRILLIC.test(it.explanationEn)) return "explanationEn contains Cyrillic";
  if (CYRILLIC.test(it.exampleEn)) return "exampleEn contains Cyrillic";
  if (!/^\/.+\/$/.test(it.ipa.trim())) return "ipa not wrapped in slashes";
  return null;
}

if (fs.existsSync(OUT_DIR)) {
  const files = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of files) {
    let text = fs.readFileSync(path.join(OUT_DIR, file), "utf8");
    text = text.replace(/^﻿/, "").trim();
    // tolerate accidental markdown fences
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let arr: Record<string, unknown>[];
    try {
      arr = JSON.parse(text);
    } catch {
      console.error(`WARN: ${file} is not valid JSON - skipped`);
      continue;
    }
    if (!Array.isArray(arr)) {
      console.error(`WARN: ${file} is not an array - skipped`);
      continue;
    }
    for (const item of arr) {
      const reason = validateItem(item);
      const id = typeof item.id === "number" ? item.id : -1;
      if (reason) {
        invalid.push({ id, reason: `${file}: ${reason}` });
      } else {
        const it = item as unknown as GenFields & { id: number };
        gen.set(it.id, {
          explanationBg: it.explanationBg.trim(),
          explanationEn: it.explanationEn.trim(),
          exampleEn: it.exampleEn.trim(),
          mnemonicBg: it.mnemonicBg.trim(),
          ipa: it.ipa.trim(),
        });
      }
    }
  }
}

const missing = raw.filter((w) => !gen.has(w.id)).map((w) => w.id);

if (missing.length > 0) {
  fs.mkdirSync(IN_DIR, { recursive: true });
  // remove stale redo inputs
  for (const f of fs.readdirSync(IN_DIR).filter((f) => f.startsWith("redo_"))) {
    fs.unlinkSync(path.join(IN_DIR, f));
  }
  const CHUNK = 50;
  let n = 0;
  for (let i = 0; i < missing.length; i += CHUNK) {
    n++;
    const slice = missing.slice(i, i + CHUNK).map((id) => rawById.get(id)!);
    fs.writeFileSync(
      path.join(IN_DIR, `redo_${n}.json`),
      JSON.stringify(slice, null, 1),
      "utf8",
    );
  }
  const reasons = new Map<string, number>();
  for (const inv of invalid) {
    const key = inv.reason.replace(/^[^:]+: /, "");
    reasons.set(key, (reasons.get(key) ?? 0) + 1);
  }
  console.error(`INCOMPLETE: ${missing.length} ids lack valid generated fields.`);
  console.error(`Wrote ${n} redo slice(s) to data/enrichment/input/redo_*.json`);
  console.error(`Missing ids: ${missing.slice(0, 40).join(",")}${missing.length > 40 ? ",..." : ""}`);
  for (const [reason, count] of reasons) console.error(`  ${count}x ${reason}`);
  process.exit(2);
}

// --------------------------------------------------------------- parse book

const bookRaw = fs.readFileSync(path.join(DATA, "book_text.txt"), "utf8");
const marker = /===PDF_PAGE (\d+)===/g;

interface PageChunk {
  page: number;
  text: string;
}
const pageChunks: PageChunk[] = [];
{
  let m: RegExpExecArray | null;
  let lastPage = -1;
  let lastEnd = 0;
  while ((m = marker.exec(bookRaw)) !== null) {
    if (lastPage >= 0) {
      pageChunks.push({ page: lastPage, text: bookRaw.slice(lastEnd, m.index) });
    }
    lastPage = parseInt(m[1], 10);
    lastEnd = m.index + m[0].length;
  }
  if (lastPage >= 0) pageChunks.push({ page: lastPage, text: bookRaw.slice(lastEnd) });
}

// de-hyphenate within each page, then join pages handling cross-page hyphens
interface Span {
  start: number;
  end: number;
  page: number;
}
const spans: Span[] = [];
let fullText = "";
for (const chunk of pageChunks) {
  let t = chunk.text.replace(/\r\n/g, "\n").replace(/­/g, "");
  t = t.replace(/([A-Za-z])-\n[ \t]*([a-z])/g, "$1$2"); // moun-\ntain -> mountain
  // cross-page hyphenation: previous text ends "...moun-" and this page starts "tain"
  const tail = fullText.match(/([A-Za-z])-\s*$/);
  const head = t.match(/^\s*([a-z])/);
  if (tail && head) {
    fullText = fullText.replace(/-\s*$/, "");
    t = t.replace(/^\s+/, "");
  }
  const start = fullText.length;
  fullText += t + "\n";
  spans.push({ start, end: fullText.length, page: chunk.page });
}

function pageAt(idx: number): number {
  let lo = 0;
  let hi = spans.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (spans[mid].end <= idx) lo = mid + 1;
    else hi = mid;
  }
  return spans[lo].page;
}

// ------------------------------------------------------ sentence segmentation

const ABBREV = new Set([
  "mr", "mrs", "ms", "dr", "st", "prof", "etc", "vs", "cf",
  "no", "p", "pp", "mt", "co", "inc", "jr", "sr",
]);

interface Sent {
  start: number;
  end: number;
}
function splitSentences(text: string): Sent[] {
  const out: Sent[] = [];
  const n = text.length;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?") {
      let j = i + 1;
      while (j < n && /[.!?]/.test(text[j])) j++;
      while (j < n && /['’”")\]]/.test(text[j])) j++;
      if (j < n && !/\s/.test(text[j])) continue; // mid-token, e.g. 3.5
      if (ch === ".") {
        const before = text.slice(Math.max(0, i - 8), i);
        const wb = before.match(/([A-Za-z][a-z]*)$/)?.[1] ?? "";
        if (
          (wb.length === 1 && /[A-Z]/.test(before.slice(-1))) ||
          ABBREV.has(wb.toLowerCase())
        ) {
          i = j - 1;
          continue;
        }
      }
      let k = j;
      while (k < n && /\s/.test(text[k])) k++;
      const nx = k < n ? text[k] : "";
      if (k >= n || /[A-Z0-9'‘“"(\[—–-]/.test(nx)) {
        if (i + 1 > start) out.push({ start, end: j });
        start = k;
        i = j - 1;
      }
    } else if (ch === "\n" && i + 1 < n && text[i + 1] === "\n") {
      if (i > start) out.push({ start, end: i });
      let k = i;
      while (k < n && /\s/.test(text[k])) k++;
      start = k;
      i = k - 1;
    }
  }
  if (start < n) out.push({ start, end: n });
  return out.filter((s) => s.end - s.start >= 3);
}

const sents = splitSentences(fullText);
const sentStarts = sents.map((s) => s.start);

function sentenceAt(idx: number): Sent | null {
  let lo = 0;
  let hi = sentStarts.length - 1;
  if (hi < 0) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sentStarts[mid] <= idx) lo = mid;
    else hi = mid - 1;
  }
  const s = sents[lo];
  return idx >= s.start && idx < s.end ? s : null;
}

// ------------------------------------------------------------- word matching

function headwordBase(word: string): string {
  return word.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function inflectionForms(base: string): string[] {
  const b = base.toLowerCase();
  const parts = b.split(/\s+/);
  const last = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join(" ");
  const forms = new Set<string>();
  const add = (s: string) => forms.add(prefix ? `${prefix} ${s}` : s);
  add(last);
  add(last + "s");
  add(last + "es");
  add(last + "ed");
  add(last + "d");
  add(last + "ing");
  if (/[^aeiou]y$/.test(last)) {
    const st = last.slice(0, -1);
    add(st + "ies");
    add(st + "ied");
  }
  if (/e$/.test(last)) {
    const st = last.slice(0, -1);
    add(st + "ing");
    add(st + "ed");
  }
  if (last.length >= 3 && /[^aeiouwxy]$/.test(last) && /[aeiou]/.test(last.slice(-2, -1)) && /[^aeiou]/.test(last.slice(-3, -2))) {
    const c = last[last.length - 1];
    add(last + c + "ed");
    add(last + c + "ing");
  }
  return [...forms];
}

function formsRegex(base: string, flags: string): RegExp {
  const alts = inflectionForms(base)
    .map(escapeRe)
    .map((f) => f.replace(/ /g, "\\s+"))
    .sort((a, b) => b.length - a.length); // longest first so "lamented" beats "lament"
  return new RegExp(`\\b(?:${alts.join("|")})\\b`, flags);
}

interface Match {
  idx: number;
  page: number;
}

const matchesByWord = new Map<number, Match[]>();
for (const w of raw) {
  const base = headwordBase(w.word);
  if (!base) {
    matchesByWord.set(w.id, []);
    continue;
  }
  const re = formsRegex(base, "gi");
  const list: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null && list.length < 2000) {
    list.push({ idx: m.index, page: pageAt(m.index) });
  }
  matchesByWord.set(w.id, list);
}

// ------------------------------------------ printed-page -> pdf-page mapping

const singlePairs: Array<{ d: number; p: number }> = [];
for (const w of raw) {
  const list = matchesByWord.get(w.id)!;
  if (list.length === 1) singlePairs.push({ d: w.page, p: list[0].page });
}

let predict: (d: number) => number;
let invert: (p: number) => number;
let modelDesc: string;
let residConst = NaN;
let residLin = NaN;

if (singlePairs.length >= 10) {
  const offsets = singlePairs.map(({ d, p }) => p - d);
  const offC = median(offsets);
  residConst = median(singlePairs.map(({ d, p }) => Math.abs(p - d - offC)));

  // Theil–Sen robust linear fit
  const sample =
    singlePairs.length > 400
      ? singlePairs.filter((_, i) => i % Math.ceil(singlePairs.length / 400) === 0)
      : singlePairs;
  const slopes: number[] = [];
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      if (sample[j].d !== sample[i].d) {
        slopes.push((sample[j].p - sample[i].p) / (sample[j].d - sample[i].d));
      }
    }
  }
  const a = median(slopes);
  const b = median(singlePairs.map(({ d, p }) => p - a * d));
  residLin = median(singlePairs.map(({ d, p }) => Math.abs(p - (a * d + b))));

  if (residLin < residConst - 0.25) {
    predict = (d) => a * d + b;
    invert = (p) => (p - b) / a;
    modelDesc = `linear pdf=${a.toFixed(4)}*dict+${b.toFixed(2)} (Theil-Sen, n=${singlePairs.length})`;
  } else {
    predict = (d) => d + offC;
    invert = (p) => p - offC;
    modelDesc = `constant offset ${offC >= 0 ? "+" : ""}${offC} (n=${singlePairs.length})`;
  }
} else {
  predict = (d) => d;
  invert = (p) => p;
  modelDesc = `identity fallback (only ${singlePairs.length} single-match anchors)`;
}

// ----------------------------------------------------- choose + clean quotes

function cleanliness(text: string): number {
  let score = Math.abs(text.length - 130);
  if (/[#@_=\\{}<>|~`*]/.test(text)) score += 100;
  if (/^[a-z]/.test(text)) score += 30;
  return score;
}

function buildSentence(
  w: RawWord,
): { sentence: string; ref: number; distance: number } | null {
  const list = matchesByWord.get(w.id)!;
  if (list.length === 0) return null;
  const expected = predict(w.page);

  let best: { m: Match; sent: Sent; dist: number; clean: number } | null = null;
  for (const m of list) {
    const sent = sentenceAt(m.idx);
    if (!sent) continue;
    const rawSent = fullText.slice(sent.start, sent.end);
    const dist = Math.abs(m.page - expected);
    const clean = cleanliness(rawSent.replace(/\s+/g, " ").trim());
    if (
      !best ||
      dist < best.dist - 0.5 ||
      (Math.abs(dist - best.dist) <= 0.5 && clean < best.clean)
    ) {
      best = { m, sent, dist, clean };
    }
  }
  if (!best) return null;

  let text = fullText.slice(best.sent.start, best.sent.end).replace(/\s+/g, " ").trim();

  const re = formsRegex(headwordBase(w.word), "i");
  const hit = re.exec(text);
  if (!hit) return null;

  // keep quotes short: window around the match if the sentence is very long
  if (text.length > 360) {
    let w0 = Math.max(0, hit.index - 170);
    let w1 = Math.min(text.length, hit.index + hit[0].length + 170);
    while (w0 > 0 && text[w0 - 1] !== " ") w0--;
    while (w1 < text.length && text[w1] !== " ") w1++;
    text =
      (w0 > 0 ? "…" : "") + text.slice(w0, w1).trim() + (w1 < text.length ? "…" : "");
  }

  const re2 = formsRegex(headwordBase(w.word), "i");
  const hit2 = re2.exec(text);
  if (!hit2) return null;
  text =
    text.slice(0, hit2.index) +
    "**" +
    hit2[0] +
    "**" +
    text.slice(hit2.index + hit2[0].length);

  let ref = Math.round(invert(best.m.page));
  ref = Math.max(1, Math.min(352, ref));
  if (Math.abs(ref - w.page) <= 2) ref = w.page; // trust the dictionary's own page when close

  return { sentence: text, ref, distance: best.dist };
}

// ---------------------------------------------------------------- merge all

const enriched: EnrichedWord[] = [];
let covered = 0;
let suspicious = 0;
const sampleSentences: Array<{ id: number; word: string; sentence: string }> = [];

for (const w of raw) {
  const g = gen.get(w.id)!;
  const bs = buildSentence(w);
  if (bs) {
    covered++;
    if (bs.distance > 40) suspicious++;
    if (sampleSentences.length < 5 && bs.distance <= 5) {
      sampleSentences.push({ id: w.id, word: w.word, sentence: bs.sentence });
    }
  }
  // quality warnings (non-fatal)
  const exRe = formsRegex(headwordBase(w.word), "i");
  if (!exRe.test(g.exampleEn)) {
    warnings.push(`id ${w.id} (${w.word}): exampleEn does not contain the headword`);
  }
  if (g.explanationBg.toLowerCase() === w.translation.toLowerCase()) {
    warnings.push(`id ${w.id} (${w.word}): explanationBg is a copy of translation`);
  }
  enriched.push({
    ...w,
    ...g,
    bookSentenceEn: bs?.sentence ?? null,
    bookSentenceRef: bs?.ref ?? null,
  });
}

if (enriched.length !== 1177) {
  console.error(`FATAL: enriched length ${enriched.length} != 1177`);
  process.exit(1);
}

fs.writeFileSync(path.join(DATA, "words.json"), JSON.stringify(enriched), "utf8");
fs.mkdirSync(path.join(ROOT, "public"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "public", "words.json"),
  JSON.stringify(enriched),
  "utf8",
);

const report = {
  generatedAt: new Date().toISOString(),
  total: enriched.length,
  bookSentenceCoverage: covered,
  coveragePct: Math.round((covered / enriched.length) * 1000) / 10,
  pageModel: modelDesc,
  residualConst: residConst,
  residualLinear: residLin,
  suspiciousMatches: suspicious,
  invalidItems: invalid,
  warnings: warnings.slice(0, 200),
  warningCount: warnings.length,
  sampleSentences,
};
fs.writeFileSync(
  path.join(DATA, "enrichment", "REPORT.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log("ENRICH OK");
console.log(`words: ${enriched.length}`);
console.log(`book-sentence coverage: ${covered}/${enriched.length} (${report.coveragePct}%)`);
console.log(`page model: ${modelDesc}`);
console.log(`residuals: const=${residConst} linear=${residLin}`);
console.log(`suspicious (match >40 pdf-pages from expected): ${suspicious}`);
console.log(`warnings: ${warnings.length} (see data/enrichment/REPORT.json)`);
console.log(`samples: ${sampleSentences.map((s) => s.word).join(", ")}`);
