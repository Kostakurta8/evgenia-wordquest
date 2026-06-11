import type { Lang } from "@/lib/types";

/**
 * All UI chrome strings live here in {bg, en} pairs — no hard-coded UI text
 * in components. Target words are always English and never localized.
 */
export const STRINGS = {
  appName: {
    bg: "WordQuest: Задругата на думите",
    en: "WordQuest: Fellowship of Words",
  },
  tagline: {
    bg: "Пътешествие през 1177 думи от „Задругата на пръстена“.",
    en: "A journey through 1177 words from The Fellowship of the Ring.",
  },
  navMap: { bg: "Карта", en: "Map" },
  navReview: { bg: "Преговор", en: "Review" },
  navLexicon: { bg: "Речник", en: "Lexicon" },
  navProfile: { bg: "Профил", en: "Profile" },
  gotIt: { bg: "Разбрах!", en: "Got it!" },
  fromBook: { bg: "от книгата · стр.", en: "from the book · p." },
  synonyms: { bg: "Синоними", en: "Synonyms" },
  antonyms: { bg: "Антоними", en: "Antonyms" },
  mnemonic: { bg: "Запомни така", en: "Memory hook" },
  example: { bg: "Пример", en: "Example" },
  wordsLoaded: { bg: "думи заредени", en: "words loaded" },
  withBookSentence: { bg: "с изречение от книгата", en: "with a book sentence" },

  // Map
  lesson: { bg: "Урок", en: "Lesson" },
  words: { bg: "думи", en: "words" },
  start: { bg: "Започни", en: "Start" },
  continueBtn: { bg: "Продължи", en: "Continue" },
  locked: { bg: "Заключено", en: "Locked" },
  done: { bg: "Готово", en: "Done" },
  chapter: { bg: "Глава", en: "Chapter" },
  prologueBook: { bg: "Пролог", en: "Prologue" },
  bookOne: { bg: "Книга първа", en: "Book One" },
  bookTwo: { bg: "Книга втора", en: "Book Two" },
  pages: { bg: "стр.", en: "pp." },
  yourJourney: { bg: "Твоето пътешествие", en: "Your journey" },

  // Lesson player
  newWord: { bg: "Нова дума", en: "New word" },
  check: { bg: "Провери", en: "Check" },
  correct: { bg: "Точно така!", en: "Correct!" },
  wrong: { bg: "Почти! Опитай пак по-късно.", en: "Almost! You'll see it again." },
  correctAnswerWas: { bg: "Верен отговор:", en: "Correct answer:" },
  quitLesson: { bg: "Изход от урока?", en: "Quit the lesson?" },
  quitLessonBody: {
    bg: "Прогресът в този урок ще се загуби.",
    en: "Progress in this lesson will be lost.",
  },
  quitConfirm: { bg: "Излез", en: "Quit" },
  quitCancel: { bg: "Остани", en: "Stay" },
  listenPrompt: { bg: "Чуй и избери думата", en: "Listen and pick the word" },
  tapToHear: { bg: "Натисни, за да чуеш", en: "Tap to hear" },
  meaningPrompt: { bg: "Какво означава", en: "What does it mean:" },
  reversePrompt: { bg: "Коя дума означава", en: "Which word means" },
  playAgain: { bg: "Чуй пак", en: "Play again" },

  // Lesson summary
  lessonComplete: { bg: "Урокът е завършен!", en: "Lesson complete!" },
  perfectLesson: { bg: "Перфектен урок!", en: "Perfect lesson!" },
  xpEarned: { bg: "спечелени точки", en: "XP earned" },
  accuracy: { bg: "точност", en: "accuracy" },
  dayStreak: { bg: "дни поред", en: "day streak" },
  backToMap: { bg: "Към картата", en: "Back to the map" },

  // Review / lexicon / profile
  reviewTitle: { bg: "Преговор", en: "Review" },
  reviewComingSoon: {
    bg: "Хъбът за преговор идва съвсем скоро — учи нови думи от картата!",
    en: "The review hub is coming very soon — learn new words from the map!",
  },
  dueToday: { bg: "за преговор днес", en: "due today" },
  lexiconTitle: { bg: "Речник", en: "Lexicon" },
  searchPlaceholder: { bg: "Търси дума…", en: "Search a word…" },
  noResults: { bg: "Няма намерени думи.", en: "No words found." },
  learned: { bg: "научени", en: "learned" },
  notSeenYet: { bg: "още не е учена", en: "not seen yet" },
  profileTitle: { bg: "Профил", en: "Profile" },
  level: { bg: "Ниво", en: "Level" },
  totalXp: { bg: "общо точки", en: "total XP" },
  gems: { bg: "кристали", en: "gems" },
  longestStreak: { bg: "най-дълга серия", en: "longest streak" },
  dailyGoal: { bg: "Дневна цел", en: "Daily goal" },
  signIn: { bg: "Влез", en: "Sign in" },
  signOut: { bg: "Изход", en: "Sign out" },
  emailPlaceholder: { bg: "Твоят имейл", en: "Your email" },
  sendMagicLink: { bg: "Изпрати ми вълшебен линк", en: "Send me a magic link" },
  magicLinkSent: {
    bg: "Провери пощата си! Изпратихме ти линк за вход. ✨",
    en: "Check your inbox! We sent you a sign-in link. ✨",
  },
  magicLinkError: {
    bg: "Нещо се обърка. Провери имейла и опитай пак.",
    en: "Something went wrong. Check the email and try again.",
  },
  signedInAs: { bg: "Влязла си като", en: "Signed in as" },
  syncOn: {
    bg: "Прогресът ти се пази в облака. ☁️",
    en: "Your progress is saved to the cloud. ☁️",
  },
  syncOff: {
    bg: "Влез, за да пазиш прогреса си в облака и на други устройства.",
    en: "Sign in to keep your progress in the cloud and on other devices.",
  },
  uiLanguage: { bg: "Език на приложението", en: "App language" },
  sound: { bg: "Звуци", en: "Sounds" },
  on: { bg: "Вкл.", en: "On" },
  off: { bg: "Изкл.", en: "Off" },
  theme: { bg: "Тема", en: "Theme" },
  themeLight: { bg: "Светла", en: "Light" },
  themeDark: { bg: "Тъмна", en: "Dark" },

  // P3 exercises
  typePrompt: { bg: "Напиши думата на английски", en: "Type the word in English" },
  typePlaceholder: { bg: "Напиши тук…", en: "Type here…" },
  clozePrompt: { bg: "Попълни липсващата дума от книгата", en: "Fill in the missing word from the book" },
  pairsPrompt: { bg: "Свържи двойките", en: "Match the pairs" },
  synonymPrompt: { bg: "Кое е синоним на", en: "Which is a synonym of" },

  // Review hub
  reviewNow: { bg: "Преговори сега", en: "Review now" },
  reviewEmpty: {
    bg: "Нищо за преговор! Върни се по-късно или научи нови думи от картата. 🌿",
    en: "Nothing to review! Come back later or learn new words from the map. 🌿",
  },
  reviewDone: { bg: "Преговорът е завършен!", en: "Review complete!" },
  reviewedWords: { bg: "преговорени думи", en: "words reviewed" },

  // Dopamine
  combo: { bg: "серия", en: "combo" },
  levelUp: { bg: "Ново ниво!", en: "Level up!" },
  goalReached: { bg: "Дневна цел постигната! 🎯", en: "Daily goal reached! 🎯" },
  chestTitle: { bg: "Съкровище!", en: "Treasure!" },
  chestBody: {
    bg: "Завърши цяла глава! Искра ти носи награда.",
    en: "You finished a whole chapter! Iskra brings you a reward.",
  },
  chestOpen: { bg: "Отвори сандъка", en: "Open the chest" },
  chestClaim: { bg: "Вземи", en: "Claim" },
  share: { bg: "Сподели", en: "Share" },
  shareText: {
    bg: "Уча думите на „Задругата на пръстена“ с WordQuest! ✨",
    en: "I'm learning the words of The Fellowship of the Ring with WordQuest! ✨",
  },
  achievements: { bg: "Постижения", en: "Achievements" },
  achievementUnlocked: { bg: "Ново постижение!", en: "Achievement unlocked!" },

  // Challenge mode
  challenge: { bg: "Предизвикателство", en: "Challenge" },
  challengeIntro: {
    bg: "10 думи · 3 живота · часовник. Двойни точки!",
    en: "10 words · 3 lives · the clock is ticking. Double XP!",
  },
  challengeStart: { bg: "Започни!", en: "Start!" },
  challengeFailed: { bg: "Без живот! Опитай пак.", en: "Out of lives! Try again." },
  challengeDone: { bg: "Предизвикателството е твое!", en: "Challenge conquered!" },
  challengeLocked: {
    bg: "Научи поне 10 думи, за да отключиш.",
    en: "Learn at least 10 words to unlock.",
  },
  lives: { bg: "живота", en: "lives" },
  tryAgain: { bg: "Опитай пак", en: "Try again" },

  // PWA
  installNudge: {
    bg: "Добави WordQuest на началния екран!",
    en: "Add WordQuest to your home screen!",
  },
  installYes: { bg: "Добави", en: "Add" },

  // Mascot lines
  mascotIntro: {
    bg: "Аз съм Искра! Ще светя по пътя ти. ✨",
    en: "I'm Iskra! I'll light your way. ✨",
  },
  mascotCorrect: { bg: "Браво!", en: "Nice one!" },
  mascotWrong: { bg: "Спокойно — ще я хванем пак!", en: "No worries — we'll catch it again!" },
  mascotLessonDone: { bg: "Ти си звезда! ⭐", en: "You're a star! ⭐" },
  mascotNewWord: { bg: "Нова дума за колекцията ти!", en: "A new word for your collection!" },
} as const satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang = "bg"): string {
  return STRINGS[key][lang];
}
