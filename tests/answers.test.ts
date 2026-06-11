import { describe, expect, it } from "vitest";
import {
  clozeText,
  editDistance,
  headwordBase,
  highlightedForm,
  isTypedCorrect,
  normalizeAnswer,
} from "@/lib/answers";

describe("headwordBase", () => {
  it("strips qualifiers and leading articles", () => {
    expect(headwordBase("till (verb)")).toBe("till");
    expect(headwordBase("a wraith")).toBe("wraith");
    expect(headwordBase("to stride")).toBe("stride");
    expect(headwordBase("unobtrusive")).toBe("unobtrusive");
  });
});

describe("normalizeAnswer", () => {
  it("is case-, accent- and whitespace-insensitive", () => {
    expect(normalizeAnswer("  LothlÓrien ")).toBe("lothlorien");
    expect(normalizeAnswer("moth-balls")).toBe("moth-balls");
    expect(normalizeAnswer("don’t")).toBe("don't");
    expect(normalizeAnswer("a  b")).toBe("a b");
  });
});

describe("isTypedCorrect", () => {
  it("accepts exact and case-different answers", () => {
    expect(isTypedCorrect("Unobtrusive", ["unobtrusive"])).toBe(true);
  });

  it("accepts one typo for 6+ letter words", () => {
    expect(isTypedCorrect("unobtrusiv", ["unobtrusive"])).toBe(true);
    expect(isTypedCorrect("unobtrosive", ["unobtrusive"])).toBe(true);
    expect(isTypedCorrect("unobtrusvie", ["unobtrusive"])).toBe(true); // transposition
  });

  it("rejects typos in short words", () => {
    expect(isTypedCorrect("tlil", ["till"])).toBe(false);
    expect(isTypedCorrect("til", ["till"])).toBe(false);
  });

  it("rejects empty input and unrelated words", () => {
    expect(isTypedCorrect("", ["till"])).toBe(false);
    expect(isTypedCorrect("mushroom", ["wraith"])).toBe(false);
  });

  it("accepts any of multiple accepted forms", () => {
    expect(isTypedCorrect("tilled", ["tilled", "till"])).toBe(true);
    expect(isTypedCorrect("till", ["tilled", "till"])).toBe(true);
  });
});

describe("editDistance", () => {
  it("counts substitutions, inserts, deletes, transpositions", () => {
    expect(editDistance("abc", "abc")).toBe(0);
    expect(editDistance("abc", "abd")).toBe(1);
    expect(editDistance("abc", "ab")).toBe(1);
    expect(editDistance("abc", "acb")).toBe(1);
    expect(editDistance("abc", "xyz")).toBe(3);
  });
});

describe("cloze helpers", () => {
  const sentence = "Hobbits are an **unobtrusive** but very ancient people.";
  it("extracts the highlighted surface form", () => {
    expect(highlightedForm(sentence)).toBe("unobtrusive");
    expect(highlightedForm("no highlight")).toBeNull();
  });
  it("blanks the highlighted word", () => {
    expect(clozeText(sentence)).toBe("Hobbits are an ______ but very ancient people.");
  });
});
