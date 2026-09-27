import { chromium, webkit, devices } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const base = process.env.ANATOMY_URL || "http://127.0.0.1:3017";
const root = path.resolve("..");
const out = path.join(root, "work/qa");
await mkdir(out, { recursive: true });
const meta = JSON.parse(await readFile("public/data/meta.json", "utf8"));
const labels = await readFile("public/data/labels.bin");
const offset = ([i, j, k]) =>
  i * meta.shape[1] * meta.shape[2] + j * meta.shape[2] + k;
const results = [];

async function verify(engine, name, options) {
  const browser = await engine.launch(
    name === "desktop-chromium"
      ? {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          headless: true,
        }
      : { headless: true },
  );
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(base);
  await page.getByTestId("explorer").waitFor({ timeout: 60000 });
  await page
    .locator('[data-testid="scene"][data-ready="true"]')
    .waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("canvas").count(), 4);
  assert.equal(await page.locator("[data-nextjs-dialog]").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "No horizontal overflow",
  );
  for (const organ of meta.organs) {
    await page.getByTestId(`select-${organ.name}`).click();
    const point = (
      await page.getByTestId("explorer").getAttribute("data-crosshair")
    )
      .split(",")
      .map(Number);
    assert.equal(
      labels[offset(point)],
      organ.id,
      `${organ.name} anchor must lie in real label volume`,
    );
    for (const plane of ["axial", "coronal", "sagittal"])
      assert.equal(
        await page.getByTestId(`canvas-${plane}`).getAttribute("data-voxel"),
        point.join(","),
      );
  }
  await page.getByTestId("select-kidney_left").click();
  await page.getByRole("button", { name: "Isolar estrutura", exact: true }).click();
  // Move away first: a valid surface click can coincide with the chosen
  // interior anchor in a concave organ, so anchor inequality is not evidence.
  const initialSlider = page.getByRole("slider", {
    name: "Corte axial",
    exact: true,
  });
  await initialSlider.focus();
  await initialSlider.press("Home");
  const before = (
    await page.getByTestId("explorer").getAttribute("data-crosshair")
  )
    .split(",")
    .map(Number);
  const scene = page.getByTestId("scene").locator("canvas");
  await scene.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({
    path: path.join(out, `${name}-kidney.png`),
    fullPage: true,
  });
  const box = await scene.boundingBox();
  const distance =
    Math.max(...meta.shape.map((n, i) => n * meta.spacing_mm[i])) * 1.95;
  const [i, j, k] = meta.organs.find((o) => o.name === "kidney_left").anchor;
  const x = -(i * meta.spacing_mm[0] - meta.center_mm[0]);
  const y = k * meta.spacing_mm[2] - meta.center_mm[2];
  const z = j * meta.spacing_mm[1] - meta.center_mm[1];
  const focal = box.height / (2 * Math.tan((34 * Math.PI) / 360));
  await page.mouse.click(
    box.x + box.width / 2 + (x * focal) / (distance - z),
    box.y + box.height / 2 - (y * focal) / (distance - z),
  );
  await page.waitForFunction(
    (before) =>
      document
        .querySelector('[data-testid="explorer"]')
        .getAttribute("data-crosshair") !== before,
    before.join(","),
    { timeout: 5000 },
  );
  const after = (
    await page.getByTestId("explorer").getAttribute("data-crosshair")
  )
    .split(",")
    .map(Number);
  assert.equal(
    labels[offset(after)],
    5,
    "3D kidney click maps inside real left kidney mask",
  );
  assert.notDeepEqual(
    after,
    before,
    "3D raycast must return the crosshair from a distant slice into the kidney",
  );
  for (const plane of ["axial", "coronal", "sagittal"])
    assert.equal(
      await page.getByTestId(`canvas-${plane}`).getAttribute("data-label"),
      "5",
    );
  await page.getByRole("button", { name: "Ver todos", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Corte axial", exact: true });
  await slider.focus();
  for (let step = 0; step < 3; step++) await slider.press("ArrowRight");
  const changed = (
    await page.getByTestId("explorer").getAttribute("data-crosshair")
  )
    .split(",")
    .map(Number);
  assert.equal(changed[2], Math.min(meta.shape[2] - 1, after[2] + 3));
  await page.getByTestId("select-kidney_left").click();
  const axial = page.getByTestId("canvas-axial");
  await axial.scrollIntoViewIfNeeded();
  const rect = await axial.boundingBox();
  const prior = await page
    .getByTestId("explorer")
    .getAttribute("data-crosshair");
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForFunction(
    (v) =>
      document
        .querySelector('[data-testid="explorer"]')
        .getAttribute("data-crosshair") !== v,
    prior,
  );
  const point2d = await page
    .getByTestId("explorer")
    .getAttribute("data-crosshair");
  for (const plane of ["axial", "coronal", "sagittal"])
    assert.equal(
      await page.getByTestId(`canvas-${plane}`).getAttribute("data-voxel"),
      point2d,
    );
  assert.equal(
    await page
      .locator(".organ-title")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.getByTestId("select-kidney_left").click();
  await page
    .getByRole("button", { name: "Ocultar rim esquerdo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mostrar rim esquerdo", exact: true })
    .waitFor();
  await page.getByTestId("select-kidney_left").click();
  await page
    .getByRole("button", { name: "Ocultar rim esquerdo", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Como explorar" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByTestId("select-liver").click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: path.join(out, `${name}.png`),
    fullPage: true,
  });
  assert.deepEqual(errors, [], "No browser runtime/console errors");
  assert.deepEqual(failed, [], "No failed resources");
  results.push({
    browser: name,
    all_8_anchors_inside: true,
    views_synchronized: true,
    three_dimensional_click_inside_kidney: true,
    two_dimensional_click_synchronized: true,
    reduced_motion: true,
    slider: true,
    visibility: true,
    no_overflow: true,
    no_errors: true,
    webgl: true,
  });
  await browser.close();
}

await verify(chromium, "desktop-chromium", {
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
await verify(webkit, "mobile-webkit", {
  ...devices["iPhone 13"],
  reducedMotion: "reduce",
});
const recoveryBrowser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const recovery = await recoveryBrowser.newPage();
await recovery.route("**/data/ct.bin", (route) =>
  route.fulfill({ status: 404, body: "Missing CT" }),
);
await recovery.goto(base);
await recovery.getByRole("alert").filter({ hasText: "ct.bin" }).waitFor();
await recovery.unroute("**/data/ct.bin");
await recovery
  .getByRole("button", { name: "Tentar novamente", exact: true })
  .click();
await recovery
  .locator('[data-testid="scene"][data-ready="true"]')
  .waitFor({ timeout: 60000 });
results.push({ missing_file_error_visible: true, retry_recovers: true });
await recoveryBrowser.close();
await writeFile(
  path.join(out, "browser-checks.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
