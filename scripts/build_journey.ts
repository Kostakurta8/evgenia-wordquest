/**
 * Builds data/journey.json (+ public/journey.json): the chapter → region →
 * lesson structure of the learning path.
 *
 * Chapter starts are detected from book_text.txt ("Chapter N" + ALL-CAPS
 * title, plus PROLOGUE) and located in PDF-index space via the
 * ===PDF_PAGE n=== markers. The dictionary's printed pages (1..352) come
 * from a *different edition* than the PDF, so PDF indices are converted to
 * dictionary pages with the inverse of the linear page model fitted by
 * scripts/enrich.ts (read from data/enrichment/REPORT.json). Words are then
 * split in *id space*: chapter i owns word ids from the first stable run of
 * pages ≥ its dict start page. Lessons are balanced chunks of ≤ 8 words in
 * book order.
 */
import fs from "node:fs";
import path from "node:path";

interface RawWord {
  id: number;
  page: number;
  word: string;
}

interface ChapterMeta {
  slug: string;
  titleEn: string;
  titleBg: string;
  emoji: string;
}

// Canonical Fellowship structure: Prologue + Book I (12) + Book II (10).
const CHAPTERS: ChapterMeta[] = [
  { slug: "prologue", titleEn: "Prologue", titleBg: "Пролог", emoji: "📜" },
  { slug: "long-expected-party", titleEn: "A Long-expected Party", titleBg: "Дългоочаквано празненство", emoji: "🎆" },
  { slug: "shadow-of-the-past", titleEn: "The Shadow of the Past", titleBg: "Сянката на миналото", emoji: "🕯️" },
  { slug: "three-is-company", titleEn: "Three is Company", titleBg: "Трима са дружина", emoji: "🌾" },
  { slug: "short-cut-to-mushrooms", titleEn: "A Short Cut to Mushrooms", titleBg: "Пряк път към гъбите", emoji: "🍄" },
  { slug: "conspiracy-unmasked", titleEn: "A Conspiracy Unmasked", titleBg: "Разкрит заговор", emoji: "🤝" },
  { slug: "old-forest", titleEn: "The Old Forest", titleBg: "Старата гора", emoji: "🌳" },
  { slug: "house-of-tom-bombadil", titleEn: "In the House of Tom Bombadil", titleBg: "В дома на Том Бомбадил", emoji: "🏡" },
  { slug: "fog-on-the-barrow-downs", titleEn: "Fog on the Barrow-downs", titleBg: "Мъгла над Могилните ридове", emoji: "🌫️" },
  { slug: "prancing-pony", titleEn: "At the Sign of the Prancing Pony", titleBg: "Под знака на „Скокливото пони“", emoji: "🍺" },
  { slug: "strider", titleEn: "Strider", titleBg: "Бързоход", emoji: "🥾" },
  { slug: "knife-in-the-dark", titleEn: "A Knife in the Dark", titleBg: "Нож в мрака", emoji: "🗡️" },
  { slug: "flight-to-the-ford", titleEn: "Flight to the Ford", titleBg: "Бягство към брода", emoji: "🌊" },
  { slug: "many-meetings", titleEn: "Many Meetings", titleBg: "Много срещи", emoji: "✨" },
  { slug: "council-of-elrond", titleEn: "The Council of Elrond", titleBg: "Съветът на Елронд", emoji: "🏛️" },
  { slug: "ring-goes-south", titleEn: "The Ring Goes South", titleBg: "Пръстенът поема на юг", emoji: "🏔️" },
  { slug: "journey-in-the-dark", titleEn: "A Journey in the Dark", titleBg: "Пътуване в мрака", emoji: "⛏️" },
  { slug: "bridge-of-khazad-dum", titleEn: "The Bridge of Khazad-dûm", titleBg: "Мостът на Казад-дум", emoji: "🔥" },
  { slug: "lothlorien", titleEn: "Lothlórien", titleBg: "Лотлориен", emoji: "🌟" },
  { slug: "mirror-of-galadriel", titleEn: "The Mirror of Galadriel", titleBg: "Огледалото на Галадриел", emoji: "🪞" },
  { slug: "farewell-to-lorien", titleEn: "Farewell to Lórien", titleBg: "Сбогом на Лориен", emoji: "🎁" },
  { slug: "great-river", titleEn: "The Great River", titleBg: "Великата река", emoji: "🛶" },
  { slug: "breaking-of-the-fellowship", titleEn: "The Breaking of the Fellowship", titleBg: "Разпадането на Задругата", emoji: "💔" },
];

const MAX_LESSON_WORDS = 8;
const LAST_DICT_PAGE = 352;

const root = path.resolve(import.meta.dirname, "..");
const words = (
  JSON.parse(fs.readFileSync(path.join(root, "data", "words_raw.json"), "utf8")) as RawWord[]
).sort((a, b) => a.id - b.id);
const lines = fs.readFileSync(path.join(root, "data", "book_text.txt"), "utf8").split(/\r?\n/);

// ---------------------------------------------------------------------------
// Empirical dict-page ↔ PDF-index map. The dictionary's pages come from a
// different edition and the relationship is NOT globally linear (front
// matter, density drift), so we fit it from the data: every single-token
// headword that occurs exactly once in the whole book yields an anchor pair
// (dictPage, pdfIndex). Bucket medians + monotone piecewise-linear
// interpolation give pdfIndex → dictPage.
// ---------------------------------------------------------------------------

function buildPdfPages(allLines: string[]): { pdf: number; text: string }[] {
  const pages: { pdf: number; text: string }[] = [];
  let cur: string[] = [];
  let curPdf = 0;
  for (const line of allLines) {
    const m = line.trim().match(/^===PDF_PAGE (\d+)===$/);
    if (m) {
      if (curPdf > 0) pages.push({ pdf: curPdf, text: cur.join("\n") });
      curPdf = parseInt(m[1], 10);
      cur = [];
    } else {
      cur.push(line);
    }
  }
  if (curPdf > 0) pages.push({ pdf: curPdf, text: cur.join("\n") });
  return pages;
}

function inflectionRegex(head: string): RegExp | null {
  const base = head
    .replace(/\([^)]*\)/g, "")
    .trim()
    .toLowerCase();
  if (!/^[a-z]{4,}$/.test(base)) return null; // single alphabetic token only
  const stem = base.replace(/[.*+?^${}()|[\]\\]/g, "");
  const variants = [stem + "s", stem + "es", stem + "ed", stem + "ing", stem + "d", stem];
  if (stem.endsWith("y")) variants.push(stem.slice(0, -1) + "ies", stem.slice(0, -1) + "ied");
  return new RegExp(`\\b(?:${variants.join("|")})\\b`, "gi");
}

function fitPageMap(): { pdfOf: (dict: number) => number; dictOf: (pdf: number) => number; anchors: number } {
  const pdfPages = buildPdfPages(lines);
  const pairs: { dict: number; pdf: number }[] = [];
  for (const w of words) {
    const re = inflectionRegex(w.word);
    if (!re) continue;
    let count = 0;
    let foundPdf = -1;
    for (const p of pdfPages) {
      re.lastIndex = 0;
      const m = p.text.match(re);
      if (m) {
        count += m.length;
        foundPdf = p.pdf;
        if (count > 1) break;
      }
    }
    if (count === 1) pairs.push({ dict: w.page, pdf: foundPdf });
  }
  if (pairs.length < 50) throw new Error(`too few page anchors: ${pairs.length}`);

  // Bucket by dict page, take median pdf per bucket, enforce monotonicity.
  const BUCKET = 16;
  const byBucket = new Map<number, number[]>();
  for (const p of pairs) {
    const b = Math.floor((p.dict - 1) / BUCKET);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(p.pdf);
  }
  const pts: { dict: number; pdf: number }[] = [];
  for (const [b, arr] of [...byBucket.entries()].sort((x, y) => x[0] - y[0])) {
    arr.sort((x, y) => x - y);
    pts.push({ dict: b * BUCKET + 1 + BUCKET / 2, pdf: arr[Math.floor(arr.length / 2)] });
  }
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].pdf <= pts[i - 1].pdf) pts[i].pdf = pts[i - 1].pdf + 1;
  }

  const interp = (x: number, xs: number[], ys: number[]): number => {
    if (x <= xs[0]) return ys[0] + ((x - xs[0]) * (ys[1] - ys[0])) / (xs[1] - xs[0]);
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        return ys[i - 1] + ((x - xs[i - 1]) * (ys[i] - ys[i - 1])) / (xs[i] - xs[i - 1]);
      }
    }
    const n = xs.length;
    return ys[n - 1] + ((x - xs[n - 1]) * (ys[n - 1] - ys[n - 2])) / (xs[n - 1] - xs[n - 2]);
  };
  const dicts = pts.map((p) => p.dict);
  const pdfs = pts.map((p) => p.pdf);
  if (process.env.DEBUG_JOURNEY) {
    console.log(`anchors: ${pairs.length}`);
    console.log("control points (dict → pdf):");
    pts.forEach((p) => console.log(`  ${p.dict} → ${p.pdf}`));
    const tail = pairs.filter((p) => p.dict > 280).sort((a, b) => a.dict - b.dict);
    console.log("raw tail anchors (dict, pdf):", tail.map((p) => `${p.dict}:${p.pdf}`).join(" "));
  }
  return {
    pdfOf: (dict: number) => interp(dict, dicts, pdfs),
    dictOf: (pdf: number) => Math.round(interp(pdf, pdfs, dicts)),
    anchors: pairs.length,
  };
}

const pageMap = fitPageMap();
const pdfToDict = pageMap.dictOf;

// 1. Locate chapter start lines (and their PDF index) in document order.
const lettersOnly = (s: string) => s.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
interface Hit {
  chapterIdx: number;
  pdfIndex: number;
}
const hits: Hit[] = [];
let currentPdf = 0;
let nextChapter = 1;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const marker = line.match(/^===PDF_PAGE (\d+)===$/);
  if (marker) {
    currentPdf = parseInt(marker[1], 10);
    continue;
  }
  if (hits.length === 0 && /^PROLOGUE$/.test(line)) {
    hits.push({ chapterIdx: 0, pdfIndex: currentPdf });
    continue;
  }
  if (/^Chapter \d+$/.test(line) && nextChapter < CHAPTERS.length) {
    // Confirm with the ALL-CAPS title nearby. The text layer splits accented
    // letters ("KHAZAD-DÛM" → "KHAZAD-DU M"), so compare letters only.
    const want = lettersOnly(CHAPTERS[nextChapter].titleEn);
    const got = lettersOnly(`${lines[i + 1] ?? ""} ${lines[i + 2] ?? ""}`);
    if (!got.includes(want)) {
      console.warn(`warn: Chapter at line ${i + 1}: expected "${CHAPTERS[nextChapter].titleEn}", saw "${(lines[i + 1] ?? "").slice(0, 50)}"`);
    }
    hits.push({ chapterIdx: nextChapter, pdfIndex: currentPdf });
    nextChapter++;
  }
}
if (hits.length !== CHAPTERS.length) {
  throw new Error(`expected ${CHAPTERS.length} chapter starts, found ${hits.length}`);
}

// 2. Dict-space start page per chapter via the inverse page model.
const startPages = hits.map((h) => Math.max(1, pdfToDict(h.pdfIndex)));
startPages[0] = 1;
if (process.env.DEBUG_JOURNEY) {
  hits.forEach((h, i) =>
    console.log(`chapter ${i} pdf=${h.pdfIndex} → dictStart=${startPages[i]} (${CHAPTERS[h.chapterIdx].titleEn})`),
  );
}
for (let i = 1; i < startPages.length; i++) {
  if (startPages[i] <= startPages[i - 1]) {
    throw new Error(`non-monotonic chapter starts: ${startPages.join(",")}`);
  }
}

// 3. Boundaries in word-id space: first index where a run of 3 words has page ≥ start.
function firstStableIndex(startPage: number, fromIdx: number): number {
  for (let i = fromIdx; i < words.length; i++) {
    if (
      words[i].page >= startPage &&
      (words[i + 1]?.page ?? 9999) >= startPage &&
      (words[i + 2]?.page ?? 9999) >= startPage
    ) {
      return i;
    }
  }
  return words.length;
}

const boundaries: number[] = [0];
for (let c = 1; c < CHAPTERS.length; c++) {
  boundaries.push(firstStableIndex(startPages[c], boundaries[c - 1]));
}
boundaries.push(words.length);

// 4. Regions with balanced lessons of ≤ MAX_LESSON_WORDS.
interface LessonOut {
  id: string;
  index: number;
  wordIds: number[];
}
interface RegionOut extends ChapterMeta {
  index: number;
  book: 0 | 1 | 2;
  startPage: number;
  endPage: number;
  wordCount: number;
  lessons: LessonOut[];
}

// The dictionary stops at the end of Lothlórien (its last pages map to PDF
// ~485 while Mirror of Galadriel starts at PDF 488), so trailing chapters
// with no words are dropped from the journey rather than treated as errors.
let lastWithWords = CHAPTERS.length - 1;
while (lastWithWords > 0 && boundaries[lastWithWords] >= words.length) lastWithWords--;
const chapterCount = lastWithWords + 1;
boundaries[chapterCount] = words.length;
if (chapterCount < CHAPTERS.length) {
  console.log(
    `note: dictionary ends inside "${CHAPTERS[lastWithWords].titleEn}"; omitting ${CHAPTERS.length - chapterCount} trailing chapters with no vocab: ${CHAPTERS.slice(chapterCount).map((ch) => ch.titleEn).join(", ")}`,
  );
}

const regions: RegionOut[] = [];
let totalLessons = 0;
for (let c = 0; c < chapterCount; c++) {
  const slice = words.slice(boundaries[c], boundaries[c + 1]);
  const k = Math.max(1, Math.ceil(slice.length / MAX_LESSON_WORDS));
  const size = Math.ceil(slice.length / k);
  const lessons: LessonOut[] = [];
  for (let j = 0; j < k; j++) {
    const ids = slice.slice(j * size, (j + 1) * size).map((w) => w.id);
    if (ids.length === 0) continue;
    lessons.push({ id: `r${String(c + 1).padStart(2, "0")}-l${String(j + 1).padStart(2, "0")}`, index: j, wordIds: ids });
  }
  totalLessons += lessons.length;
  regions.push({
    ...CHAPTERS[c],
    index: c,
    book: c === 0 ? 0 : c <= 12 ? 1 : 2,
    startPage: startPages[c],
    endPage: c + 1 < chapterCount ? startPages[c + 1] - 1 : LAST_DICT_PAGE,
    wordCount: slice.length,
    lessons,
  });
}

const journey = { regions, totalWords: words.length, totalLessons };
const sum = regions.reduce((s, r) => s + r.wordCount, 0);
if (sum !== words.length) throw new Error(`word split mismatch: ${sum} != ${words.length}`);
const empty = regions.filter((r) => r.wordCount === 0);
if (empty.length > 0) throw new Error(`empty regions: ${empty.map((r) => r.slug).join(",")}`);
const oversized = regions.flatMap((r) => r.lessons).filter((l) => l.wordIds.length > MAX_LESSON_WORDS);
if (oversized.length > 0) throw new Error(`lessons over ${MAX_LESSON_WORDS} words: ${oversized.map((l) => l.id).join(",")}`);

const json = JSON.stringify(journey);
fs.writeFileSync(path.join(root, "data", "journey.json"), json);
fs.writeFileSync(path.join(root, "public", "journey.json"), json);

console.log("JOURNEY OK");
console.log(`regions: ${regions.length}, lessons: ${totalLessons}, words: ${sum}`);
for (const r of regions) {
  console.log(
    `  ${String(r.index).padStart(2)} ${r.emoji} ${r.titleEn.padEnd(34)} p${String(r.startPage).padStart(3)}–${String(r.endPage).padEnd(3)} words=${String(r.wordCount).padStart(3)} lessons=${r.lessons.length}`,
  );
}
