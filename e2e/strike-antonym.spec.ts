import { expect, test, type Page } from "@playwright/test";

/**
 * Verifies the two refinements live in a real browser (mobile viewport):
 *   1. Antonym (and synonym) exercises render inside a real lesson.
 *   2. Strike routing: 1 miss → "за преговор", 2 misses → "трудни", surfaced on
 *      the Review tab and the Lexicon filters. Seeded deterministically so it
 *      does not depend on randomized option order.
 */

async function readMain(page: Page): Promise<string> {
  return (await page.locator("main").first().innerText().catch(() => "")) ?? "";
}

test("a real lesson shows synonym AND antonym exercises", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href*="/lesson/"]').first().click();
  await expect(page.locator("main")).toBeVisible();

  let sawSynonym = false;
  let sawAntonym = false;

  for (let i = 0; i < 80; i++) {
    const main = await readMain(page);
    if (/синоним/i.test(main)) sawSynonym = true;
    if (/антоним/i.test(main)) sawAntonym = true;
    if (sawSynonym && sawAntonym) break;
    if (/завършен|Перфектен/i.test(main)) break; // reached the summary

    const gotIt = page.getByRole("button", { name: "Разбрах!" });
    const check = page.getByRole("button", { name: "Провери" });
    const cont = page.getByRole("button", { name: "Продължи" });
    const input = page.locator('input[type="text"]');

    if (await gotIt.count()) {
      await gotIt.first().click().catch(() => {});
    } else if (await input.count()) {
      // gibberish forces a miss on the typed exercises (proves a wrong path works)
      await input.first().fill("zzqqzz");
      if (await check.count()) await check.first().click().catch(() => {});
    } else if (await cont.count()) {
      await cont.first().click().catch(() => {});
    } else {
      const opts = page.locator('[role="group"] button');
      if (await opts.count()) await opts.first().click().catch(() => {});
    }
    await page.waitForTimeout(150);
  }

  expect(sawSynonym, "synonym exercise should appear").toBeTruthy();
  expect(sawAntonym, "antonym exercise should appear").toBeTruthy();
});

test("strikes route words to Преговор (1 miss) and Трудни (2 misses)", async ({ page }) => {
  // Seed persisted state BEFORE the app boots: word 1 missed once, word 2 twice.
  await page.addInitScript(() => {
    const wp = (over: Record<string, unknown>) => ({
      wordId: 0,
      status: "learning",
      mastery: 10,
      ease: 2.3,
      intervalDays: 0,
      dueAt: null,
      reps: 0,
      timesSeen: 2,
      timesCorrect: 1,
      misses: 0,
      lastSeen: "2026-06-13T10:00:00Z",
      ...over,
    });
    localStorage.setItem(
      "wq-app-v1",
      JSON.stringify({
        state: {
          lang: "bg",
          progress: {
            1: wp({ wordId: 1, status: "learning", misses: 1 }),
            2: wp({
              wordId: 2,
              status: "review",
              reps: 1,
              intervalDays: 1,
              dueAt: "2026-06-30T10:00:00Z",
              misses: 2,
            }),
          },
          stats: {
            xp: 50,
            level: 1,
            streak: 1,
            longestStreak: 1,
            lastActive: "2026-06-13",
            gems: 0,
            dailyGoal: 30,
            todayXp: 10,
            todayDate: "2026-06-13",
          },
        },
        version: 0,
      }),
    );
  });

  // --- Review tab ---------------------------------------------------------
  await page.goto("/review");
  // both words need review (strike ≥ 1) → "2 за преговор днес"
  await expect(page.getByText(/2\s+за преговор днес/i)).toBeVisible();
  // only word 2 is hard (strike ≥ 2)
  await expect(page.getByText(/Трудни думи\s*\(1\)/i)).toBeVisible();

  // --- Lexicon filters ----------------------------------------------------
  await page.goto("/lexicon");
  await expect(page.locator("main ul li").first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Трудни", exact: true }).click();
  await expect(page.locator("main ul li")).toHaveCount(1); // word 2 only

  await page.getByRole("button", { name: "За преговор", exact: true }).click();
  await expect(page.locator("main ul li")).toHaveCount(2); // words 1 + 2
});
