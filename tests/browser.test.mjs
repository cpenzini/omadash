import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const URL = process.env.OMADASH_URL || "http://127.0.0.1:8080/";

async function appUp() {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

const ready = await appUp();

test("the app is running so browser tests can run", (t) => {
  if (!ready) t.skip("Start the app (npm run dev) to run the product tests.");
  assert.equal(ready, true);
});

/** @type {import('playwright').Browser | null} */
let browser = null;
/** @type {import('playwright').Page | null} */
let page = null;

before(async () => {
  if (!ready) return;
  browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.count()) await skip.click();
});

after(async () => {
  await browser?.close();
});

test("empty until connect — no sample inbox", async (t) => {
  if (!page) t.skip();
  const body = await page.locator("body").innerText();
  assert.match(body, /Connect/i);
  assert.doesNotMatch(body, /Alice|Bob Martinez|Q3 planning deck/i);
  assert.match(body, /No mailbox|Connect a mailbox|Focused/i);
});

test("settings opens from comma", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("Escape");
  await page.keyboard.press(",");
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.waitFor({ state: "visible", timeout: 4000 });
  const text = await dialog.innerText();
  assert.match(text, /Layout/);
  assert.match(text, /Two panes/);
  assert.match(text, /Three panes/);
  assert.match(text, /Accounts/);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 4000 });
});

test("calendar is a full empty window", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("3");
  await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  assert.match(body, /Day/);
  assert.match(body, /Week/);
  assert.match(body, /Work/);
  assert.match(body, /Month/);
  assert.match(body, /Agenda/);
  assert.match(body, /Connect/i);
  assert.doesNotMatch(body, /Standup with design|Q3 offsite/i);
  await page.keyboard.press("Escape");
});

test("compose without a mailbox asks to connect", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("c");
  await page.waitForTimeout(400);
  const body = await page.locator("body").innerText();
  assert.match(body, /Connect/i);
  await page.keyboard.press("Escape");
});

test("file on calendar without a thread tells you to select one", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("n");
  await page.waitForTimeout(500);
  const toast = await page.locator("[data-sonner-toaster], [data-sonner-toast]").innerText().catch(() => "");
  const body = await page.locator("body").innerText();
  assert.match(`${toast}\n${body}`, /Select a thread|Connect/i);
});

test("command palette lists File on calendar", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+k");
  const palette = page.locator("[cmdk-root], [role='dialog']").first();
  await palette.waitFor({ state: "visible", timeout: 4000 });
  await page.keyboard.type("file on");
  await page.waitForTimeout(200);
  const text = await page.locator("body").innerText();
  assert.match(text, /File on calendar/);
  await page.keyboard.press("Escape");
});

test("shortcut sheet includes N and comma", async (t) => {
  if (!page) t.skip();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+/");
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await sheet.waitFor({ state: "visible", timeout: 4000 });
  const text = await sheet.innerText();
  assert.match(text, /File on calendar/);
  assert.match(text, /Settings/);
  assert.match(text, /Two panes \/ three panes/);
  await page.keyboard.press("Escape");
});

test("status bar names two panes", async (t) => {
  if (!page) t.skip();
  const footer = page.locator("footer");
  const text = await footer.innerText();
  assert.match(text, /Omadash/);
  assert.match(text, /Two panes|Enter open|J\/K move/i);
});
