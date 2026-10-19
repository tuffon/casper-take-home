// End-to-end check of setup and the daily writing practice (per-form goals,
// streaks, drafts, history), in a real browser. Each run creates two new
// throwaway accounts in the Supabase project behind the app it targets. It
// takes about two minutes, because the time goal needs a minute of typing.
//
// Usage: E2E_BASE_URL=https://your-app.vercel.app node tests/e2e/practice.mjs
// (defaults to http://localhost:3000). Screenshots go to test-results/e2e/practice.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const shotDir = "test-results/e2e/practice";
mkdirSync(shotDir, { recursive: true });

const password = "correct-horse-42";
const writerA = `casper.qa.a.${Date.now()}@mailinator.com`;
const writerB = `casper.qa.b.${Date.now()}@mailinator.com`;
const results = [];

function record(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

// Today's date in a timezone, e.g. "2026-10-19" (as in URLs)...
function calendarDateIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// ...and as the app writes it, e.g. "Monday, October 19".
function longDateIn(timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

const losAngelesToday = calendarDateIn("America/Los_Angeles");
const losAngelesLongDate = longDateIn("America/Los_Angeles");

const browser = await chromium.launch();
const pathname = (p) => new URL(p.url()).pathname;
const promptText = (p) => p.locator("#todays-prompt").innerText();
const saveButton = (p) => p.getByRole("button", { name: "Save", exact: true });
const openDialog = (p) => p.locator("dialog[open]");

async function signUp(page, email) {
  await page.goto(baseUrl); // lets the timezone cookie get set first
  await page.waitForTimeout(500);
  await page.goto(`${baseUrl}/signup`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/setup", { timeout: 15000 });
}

async function signIn(page, email) {
  await page.goto(`${baseUrl}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15000 });
}

async function signOut(page) {
  await page.goto(`${baseUrl}/account`);
  await page.click("text=Sign out");
  await page.waitForURL("**/login", { timeout: 15000 });
}

// Keep typing every 20s (time only runs while typing) until `text` appears.
async function typeUntil(page, text) {
  for (let i = 0; i < 4 && !(await page.getByText(text).isVisible()); i++) {
    await page.waitForTimeout(20000);
    await page.locator("#body").press("End");
    await page.locator("#body").type(" more");
  }
  await page.getByText(text).waitFor({ timeout: 30000 });
}

try {
  console.log(`Target: ${baseUrl}\nWriter A (Los Angeles): ${writerA}\nWriter B (Tokyo): ${writerB}\n`);

  const signedOut = await fetch(`${baseUrl}/today`, { redirect: "manual" });
  record("Signed-out /today redirects to sign-in", (signedOut.headers.get("location") ?? "").includes("/login"), `HTTP ${signedOut.status}`);

  // ---------- Writer A: setup ----------
  const contextA = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  const page = await contextA.newPage();
  await signUp(page, writerA);
  record("New account goes straight to setup", pathname(page) === "/setup");

  await page.goto(`${baseUrl}/today`);
  record("Today page sends writers without setup to /setup", pathname(page) === "/setup");
  record("Goal boxes only appear for ticked kinds", (await page.locator("input[name$='-words']").count()) === 0);

  await page.getByRole("button", { name: "Start writing" }).click();
  await page.locator("p[role=alert]").waitFor({ timeout: 15000 });
  record("Setup asks for at least one kind of writing", (await page.locator("p[role=alert]").innerText()).includes("at least one"));

  // Lyrics: a word goal only. Essay: a time goal only.
  await page.check("input[name=writingForms][value=lyrics]");
  await page.fill("input[name=lyrics-words]", "20");
  await page.fill("input[name=lyrics-minutes]", "");
  await page.check("input[name=writingForms][value=essay]");
  await page.fill("input[name=essay-words]", "");
  await page.fill("input[name=essay-minutes]", "1");
  await page.getByRole("button", { name: "Start writing" }).click();
  await page.waitForURL("**/today", { timeout: 15000 });
  record("Finishing setup opens Today", pathname(page) === "/today");

  // ---------- Writer A: today page ----------
  const formButtons = page.locator("[aria-label='Writing form']");
  async function showForm(label) {
    await formButtons.getByRole("button", { name: label }).click();
    await page.getByText(`${label} prompt`).waitFor();
  }

  record("Date shown is the writer's local date", await page.getByText(losAngelesLongDate).isVisible(), losAngelesLongDate);
  const tabNames = (await formButtons.getByRole("button").allInnerTexts()).map((t) => t.trim());
  record("Only the chosen kinds of writing get tabs", JSON.stringify(tabNames) === JSON.stringify(["Lyrics", "Essay"]), tabNames.join(", "));
  record("First tab is open to start", await page.getByText("Lyrics prompt").isVisible());
  record("Tab shows its own goal", await page.getByText("Today’s lyrics goal: 20 words.").isVisible());

  const firstPrompt = await promptText(page);
  await page.click("text=Another prompt");
  await page.waitForFunction((previous) => document.querySelector("#todays-prompt")?.textContent?.trim() !== previous, firstPrompt);
  record("“Another prompt” shows a different prompt", (await promptText(page)) !== firstPrompt);
  const lyricsPrompt = await promptText(page);

  const lyricsDraft = "twelve words of lyrics to start the day off right now ok"; // 12 words
  await page.fill("#body", lyricsDraft);
  record("Unsaved changes are flagged", await page.getByText("Unsaved changes").isVisible());

  await showForm("Essay");
  record("Each kind of writing has its own text", (await page.inputValue("#body")) === "");
  record("The tab with unsaved writing is marked", (await formButtons.getByText("(unsaved)").count()) === 1);

  // Leave without saving: no confirmation, and the draft is kept in the browser.
  await page.click("nav[aria-label='Main'] >> text=History");
  await page.waitForURL("**/history");
  await page.click("nav[aria-label='Main'] >> text=Today");
  await page.waitForURL("**/today");
  await page.waitForFunction((text) => document.querySelector("#body")?.value === text, lyricsDraft, { timeout: 5000 }).catch(() => {});
  record("Unsaved draft survives leaving the page", (await page.inputValue("#body")) === lyricsDraft);
  record("Restored draft keeps its prompt", (await promptText(page)) === lyricsPrompt);

  await saveButton(page).click();
  await page.getByText(/Saved at/).waitFor({ timeout: 15000 });
  record("12 of 20 lyrics words is not enough", await page.getByText("12 / 20 words").isVisible());
  record("No pop-up before a goal is reached", (await openDialog(page).count()) === 0);
  record("Overall streak stays at 0", await page.getByText("0 days", { exact: true }).isVisible());

  const lyricsText = `${lyricsDraft} and ten more words to pass the goal right here`; // 22 words
  await page.fill("#body", lyricsText);
  record("Editor says to save once the goal is met", await page.getByText("Goal reached. Save to lock it in.").isVisible());
  await saveButton(page).click();
  const lyricsPopUp = openDialog(page);
  await lyricsPopUp.waitFor({ timeout: 15000 });
  const lyricsPopUpText = await lyricsPopUp.innerText();
  record("Reaching the lyrics goal opens its pop-up", lyricsPopUpText.includes("Lyrics goal reached"));
  record("Pop-up shows the lyrics streak and the overall streak", /1\s+day lyrics streak/.test(lyricsPopUpText) && /1\s+day overall streak/.test(lyricsPopUpText));
  record("Pop-up shows a milestone message for day one", lyricsPopUpText.includes("Day one is done"));
  await page.waitForTimeout(900); // let the check mark draw and the confetti fly
  await page.screenshot({ path: `${shotDir}/2-celebration.png` });
  await lyricsPopUp.getByText("Keep writing").click();
  record("“Keep writing” closes the pop-up", (await openDialog(page).count()) === 0);
  await page.getByText("1 day", { exact: true }).waitFor({ timeout: 15000 });
  record("Overall streak becomes 1 day", true);
  record("Lyrics tab shows its goal reached", await page.getByText("Lyrics goal reached today").isVisible());

  // Essay has its own goal (1 minute) and its own count: lyrics words don't help it.
  await showForm("Essay");
  record("Essay starts with its own goal, untouched by lyrics", await page.getByText("Today’s essay goal: 1 min.").isVisible());
  const essayText = "ten words for the essay about rules we follow daily"; // 10 words
  await page.fill("#body", essayText);
  record("Essay counts only its own words", await page.getByText("10 words", { exact: true }).isVisible());
  record("Essay streak starts at 0", (await page.locator("section").first().innerText()).includes("0-day essay streak"));
  await typeUntil(page, "1 / 1 min");
  record("Active typing time is counted toward the essay's time goal", true);
  await saveButton(page).click();
  const essayPopUp = openDialog(page);
  await essayPopUp.waitFor({ timeout: 15000 });
  const essayPopUpText = await essayPopUp.innerText();
  record("Reaching the essay goal opens its own pop-up", essayPopUpText.includes("Essay goal reached"));
  record("Overall streak stays 1 with two goals on the same day", /1\s+day overall streak/.test(essayPopUpText));
  await essayPopUp.getByText("Keep writing").click();

  await page.locator("#body").press("End");
  await page.locator("#body").type(" encore");
  await saveButton(page).click();
  await page.getByText(/Saved at/).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
  record("Each pop-up appears only once per day", (await openDialog(page).count()) === 0);
  await page.screenshot({ path: `${shotDir}/3-today.png`, fullPage: true });
  const essaySaved = await page.inputValue("#body");

  await page.reload();
  await page.getByText("Lyrics prompt").waitFor();
  record("Lyrics piece is there after a refresh", (await page.inputValue("#body")) === lyricsText);
  record("Its prompt is there after a refresh", (await promptText(page)) === lyricsPrompt);
  record("Lyrics streak shows 1 day", (await page.locator("section").first().innerText()).includes("1-day lyrics streak"));
  await showForm("Essay");
  record("Essay piece and time are there after a refresh", (await page.inputValue("#body")) === essaySaved && (await page.getByText("1 / 1 min").isVisible()));

  // Drafts kept in the browser from an earlier day are erased.
  await page.goto(`${baseUrl}/account`);
  const userId = (await page.locator("dd.font-mono").innerText()).trim();
  const oldKey = `writers-block:drafts:${userId}:2020-01-01`;
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ essay: { prompt: "x", body: "old", writingSeconds: 1 } })), oldKey);
  await page.goto(`${baseUrl}/today`);
  await page.getByText("Lyrics prompt").waitFor();
  await page.waitForTimeout(500);
  record("Drafts from earlier days are erased", (await page.evaluate((key) => localStorage.getItem(key), oldKey)) === null);

  // ---------- Writer A: history ----------
  await page.goto(`${baseUrl}/history`);
  const entryLink = page.locator(`a[href="/history/${losAngelesToday}"]`);
  record("Entry is saved under the writer's local date", (await entryLink.count()) === 1, losAngelesToday);
  const dayCard = await entryLink.innerText();
  record("History lists both pieces, each marked goal met", (dayCard.match(/Goal met/g) ?? []).length === 2 && dayCard.includes("Lyrics ·") && dayCard.includes("Essay ·"));
  const streakChips = await page.locator("[aria-label='Streak for each kind of writing']").innerText();
  record("History shows a streak for each kind of writing", /Lyrics ·\s*1\s*-day streak/.test(streakChips) && /Essay ·\s*1\s*-day streak/.test(streakChips), streakChips.replace(/\n/g, " | "));
  record("History shows the overall streak", (await page.locator("dl").innerText()).includes("Overall streak\n1"));
  await page.screenshot({ path: `${shotDir}/4-history.png`, fullPage: true });

  await entryLink.click();
  await page.waitForURL(`**/history/${losAngelesToday}`);
  record("Day page shows both pieces", (await page.getByText(lyricsText).isVisible()) && (await page.getByText(essayText.slice(0, 25)).isVisible()));

  await page.goto(`${baseUrl}/setup`);
  await page.screenshot({ path: `${shotDir}/1-setup.png`, fullPage: true });
  record(
    "Setup shows saved choices and goals when revisited",
    (await page.getByText("Your writing goals").isVisible()) &&
      (await page.isChecked("input[name=writingForms][value=lyrics]")) &&
      (await page.inputValue("input[name=lyrics-words]")) === "20" &&
      (await page.inputValue("input[name=essay-minutes]")) === "1" &&
      !(await page.isChecked("input[name=writingForms][value=story]")),
  );

  await page.goto(baseUrl);
  record("Signed-in visit to the home page opens Today", pathname(page) === "/today", pathname(page));
  await signOut(page);
  await signIn(page, writerA);
  record("Writer who finished setup signs in straight to Today", pathname(page) === "/today", pathname(page));

  // ---------- Writer B: separate account, skips setup ----------
  const contextB = await browser.newContext({ timezoneId: "Asia/Tokyo" });
  const pageB = await contextB.newPage();
  await signUp(pageB, writerB);
  await pageB.click("button:has-text('Skip for now')");
  await pageB.waitForURL("**/today", { timeout: 15000 });
  record("Skipping setup opens Today right away", pathname(pageB) === "/today");
  const tabsB = await pageB.locator("[aria-label='Writing form']").getByRole("button").count();
  record("Skipped writer gets every kind of writing", tabsB === 5, `${tabsB} tabs`);
  record("Skipped writer: any writing counts", await pageB.getByText("goal: any writing").isVisible());
  const tokyoLongDate = longDateIn("Asia/Tokyo");
  const utcLongDate = longDateIn("UTC");
  record("Tokyo writer sees Tokyo's date, not the server's UTC date", await pageB.getByText(tokyoLongDate).isVisible(), `Tokyo: ${tokyoLongDate} | UTC: ${utcLongDate}`);

  const otherWritersEntry = await pageB.goto(`${baseUrl}/history/${losAngelesToday}`);
  record("Another writer can’t open writer A’s entry", otherWritersEntry.status() === 404, `HTTP ${otherWritersEntry.status()}`);
  await pageB.goto(`${baseUrl}/history`);
  record("Another writer’s history is empty", await pageB.getByText("Nothing here yet.").isVisible());

  await signOut(pageB);
  await signIn(pageB, writerB);
  record("Writer who skipped sees setup again at sign-in", pathname(pageB) === "/setup", pathname(pageB));
  record("Setup at sign-in still offers “Skip for now”", await pageB.getByText("Skip for now").isVisible());
  await pageB.click("button:has-text('Skip for now')");
  await pageB.waitForURL("**/today", { timeout: 15000 });
  record("Skipping again opens Today", pathname(pageB) === "/today");

  await contextA.close();
  await contextB.close();
} catch (error) {
  record("Script finished without crashing", false, String(error).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
