// End-to-end check of sign-up, sign-in, sign-out and protected pages, in a
// real browser. Each run creates a new throwaway account in the Supabase
// project behind the app it targets.
//
// Usage: E2E_BASE_URL=https://your-app.vercel.app node tests/e2e/auth.mjs
// (defaults to http://localhost:3000). Screenshots go to test-results/e2e/auth.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const shotDir = "test-results/e2e/auth";
mkdirSync(shotDir, { recursive: true });

const email = `casper.qa.${Date.now()}@mailinator.com`;
const password = "correct-horse-42";
const results = [];

function record(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const pathname = (p = page) => new URL(p.url()).pathname;

async function submitAndReadAlert() {
  await page.click("button[type=submit]");
  const alert = page.locator("p[role=alert]");
  await alert.waitFor({ timeout: 15000 });
  return (await alert.textContent()) ?? "";
}

try {
  console.log(`Target: ${baseUrl}\nTest account: ${email}\n`);

  // Public home page
  const home = await fetch(baseUrl);
  record("Home page is publicly reachable", home.status === 200, `HTTP ${home.status}`);
  await page.goto(baseUrl);
  await page.screenshot({ path: `${shotDir}/1-home.png` });

  // Unauthenticated access to the protected page
  const raw = await fetch(`${baseUrl}/account`, { redirect: "manual" });
  record(
    "Server answers signed-out /account with a redirect",
    raw.status >= 300 && raw.status < 400 && (raw.headers.get("location") ?? "").includes("/login"),
    `HTTP ${raw.status} -> ${raw.headers.get("location")}`,
  );
  const rawBody = await raw.text();
  record("Signed-out response contains no account content", !rawBody.includes("User ID"));
  await page.goto(`${baseUrl}/account`);
  record("Signed-out browser visit to /account ends on /login", pathname() === "/login", pathname());

  // Sign-up validation: browser check
  await page.goto(`${baseUrl}/signup`);
  await page.fill("#email", "not-an-email");
  const emailInvalid = await page.locator("#email").evaluate((el) => !el.checkValidity());
  record("Browser flags an invalid email before submitting", emailInvalid);

  // Sign-up validation: server check (browser checks switched off)
  await page.goto(`${baseUrl}/signup`);
  await page.locator("form").evaluate((form) => (form.noValidate = true));
  await page.fill("#email", email);
  await page.fill("#password", "short");
  const shortPasswordError = await submitAndReadAlert();
  record("Server rejects a short password", shortPasswordError.includes("at least 8"), shortPasswordError);
  record("Email stays filled in after a failed submit", (await page.inputValue("#email")) === email);
  await page.screenshot({ path: `${shotDir}/2-signup-error.png` });

  // Sign-up success
  await page.goto(`${baseUrl}/signup`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/setup", { timeout: 15000 });
  record("Sign-up continues to setup", pathname() === "/setup");
  await page.goto(`${baseUrl}/account`);
  record("Account page shows the signed-in email", await page.getByText(email).isVisible());
  await page.screenshot({ path: `${shotDir}/3-account.png` });

  // Refresh keeps the session
  await page.reload();
  record(
    "Still signed in after a refresh",
    pathname() === "/account" && (await page.getByText(email).isVisible()),
  );
  const authCookie = (await context.cookies()).find(
    (cookie) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(cookie.name),
  );
  record("Session is stored in a Supabase auth cookie", Boolean(authCookie), authCookie?.name);

  // Signed-in visitors skip the sign-in form
  await page.goto(`${baseUrl}/login`);
  record("Signed-in visit to /login skips the form", pathname() !== "/login", pathname());
  await page.goto(`${baseUrl}/account`);

  // Sign out
  await page.click("text=Sign out");
  await page.waitForURL("**/login", { timeout: 15000 });
  record("Sign out lands on /login", pathname() === "/login");
  await page.goto(`${baseUrl}/account`);
  record("After sign out, /account redirects to /login", pathname() === "/login", pathname());

  // Wrong password
  await page.fill("#email", email);
  await page.fill("#password", "wrong-password-1");
  const wrongPasswordError = await submitAndReadAlert();
  record("Wrong password shows a clear error", wrongPasswordError.includes("don't match"), wrongPasswordError);
  await page.screenshot({ path: `${shotDir}/4-login-error.png` });

  // Loading state + correct sign in (server response delayed so the pending UI is observable)
  await page.goto(`${baseUrl}/login`);
  await page.route(`${baseUrl}/login`, async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForTimeout(400);
  const button = page.locator("button[type=submit]");
  const buttonText = await button.textContent();
  record(
    "Submit button shows a disabled loading state",
    buttonText === "Signing in…" && (await button.isDisabled()),
    buttonText ?? "",
  );
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15000 });
  record("Sign in with the right password goes into the app", ["/today", "/setup"].includes(pathname()), pathname());
  await page.unroute(`${baseUrl}/login`);
  await page.goto(`${baseUrl}/account`);

  // Forged session cookie (no valid signature) must not grant access
  const forgedContext = await browser.newContext();
  const forgedSession = {
    access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIiwiZW1haWwiOiJmYWtlQGV4YW1wbGUuY29tIn0.bad-signature",
    refresh_token: "not-a-real-token",
    expires_at: 9999999999,
    token_type: "bearer",
    user: { id: "fake", email: "fake@example.com" },
  };
  await forgedContext.addCookies([
    {
      name: authCookie.name.replace(/\.\d+$/, ""),
      value: `base64-${Buffer.from(JSON.stringify(forgedSession)).toString("base64url")}`,
      url: baseUrl,
    },
  ]);
  const forgedPage = await forgedContext.newPage();
  await forgedPage.goto(`${baseUrl}/account`);
  record("Forged session cookie is rejected", pathname(forgedPage) === "/login", pathname(forgedPage));
  await forgedContext.close();

  // Duplicate sign-up
  await page.click("text=Sign out");
  await page.waitForURL("**/login", { timeout: 15000 });
  await page.goto(`${baseUrl}/signup`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  const duplicateError = await submitAndReadAlert();
  record("Signing up twice with one email shows a clear error", duplicateError.includes("already exists"), duplicateError);
  await page.goto(`${baseUrl}/login`);
  await page.screenshot({ path: `${shotDir}/5-login.png` });
} catch (error) {
  record("Script finished without crashing", false, String(error).split("\n")[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
