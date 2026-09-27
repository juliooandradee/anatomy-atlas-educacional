import { chromium, webkit, devices } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.env.ANATOMY_URL || "http://127.0.0.1:3018";
const meta = JSON.parse(await readFile("public/data/head-neck/meta.json"));
const labels = await readFile("public/data/head-neck/labels.bin");
const results = [];
for (const mobile of [false, true]) {
  const browser = await (mobile ? webkit : chromium).launch(
    mobile
      ? { headless: true }
      : {
          headless: true,
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        },
  );
  const page = await browser.newPage(
    mobile
      ? { ...devices["iPhone 13"], reducedMotion: "reduce" }
      : { viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" },
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base);
    await page.getByTestId("explorer").waitFor({ timeout: 60000 });
    assert.equal(await page.title(), "Anatomy Atlas · versão educacional");
    await page
      .getByRole("link", { name: "Anatomy Atlas, início" })
      .waitFor();
    assert.equal(
      await page
        .locator(".brand-mark img")
        .evaluate((i) => i.complete && i.naturalWidth > 0),
      true,
    );
    assert.equal(
      await page
        .locator(".topbar")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(32, 52, 73)",
    );
    await page.getByTestId("region-head-neck").click();
    await page
      .locator('[data-testid="explorer"][data-region="head-neck"]')
      .waitFor();
    await page
      .locator('[data-testid="scene"][data-ready="true"]')
      .waitFor({ timeout: 60000 });
    assert.equal(meta.subject, "s0591");
    const canvas = page.getByTestId("canvas-axial");
    assert.equal(
      await page.getByLabel("Camada anatômica", { exact: true }).inputValue(),
      "outline",
    );
    const smooth = await canvas.evaluate((c) => c.toDataURL());
    await page
      .getByRole("button", { name: "Interpolação suave", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Interpolação suave", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    const pixel = await canvas.evaluate((c) => c.toDataURL());
    assert.notEqual(smooth, pixel);
    await page
      .getByRole("button", { name: "Interpolação suave", exact: true })
      .click();
    await page
      .getByLabel("Camada anatômica", { exact: true })
      .selectOption("color");
    const color = await canvas.evaluate((c) => c.toDataURL());
    assert.notEqual(smooth, color);
    await page
      .getByLabel("Camada anatômica", { exact: true })
      .selectOption("off");
    const clean = await canvas.evaluate((c) => c.toDataURL());
    assert.notEqual(clean, color);
    await page
      .getByLabel("Camada anatômica", { exact: true })
      .selectOption("outline");
    const before = await canvas.boundingBox();
    await page
      .getByRole("button", { name: "Ampliar corte axial", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Axial", exact: true }).waitFor();
    const enlarged = await canvas.boundingBox();
    assert.ok(enlarged.height > before.height + 80);
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    // Pixel-to-voxel mapping remains correct after resizing into the dialog.
    const cols = meta.shape[0],
      rows = meta.shape[1];
    const scale = Math.min(
      (enlarged.width - 64) / (cols * meta.spacing_mm[0]),
      (enlarged.height - 42) / (rows * meta.spacing_mm[1]),
    );
    const w = cols * meta.spacing_mm[0] * scale,
      h = rows * meta.spacing_mm[1] * scale;
    const [i, j] = meta.organs.find((o) => o.id === 1).anchor;
    const x =
      enlarged.x + (enlarged.width - w) / 2 + ((cols - 1 - i + 0.5) * w) / cols;
    const y =
      enlarged.y +
      (enlarged.height - h) / 2 +
      ((rows - 1 - j + 0.5) * h) / rows;
    await page.mouse.click(x, y);
    const point = (
      await page.getByTestId("explorer").getAttribute("data-crosshair")
    )
      .split(",")
      .map(Number);
    assert.equal(point[0], i);
    assert.equal(point[1], j);
    assert.equal(
      labels[
        point[0] * meta.shape[1] * meta.shape[2] +
          point[1] * meta.shape[2] +
          point[2]
      ],
      1,
    );
    for (const plane of ["axial", "coronal", "sagittal"])
      assert.equal(
        await page.getByTestId(`canvas-${plane}`).getAttribute("data-voxel"),
        point.join(","),
      );
    if (!mobile)
      await page.screenshot({
        path: "../work/qa/magno-encefalo-ampliado.png",
        fullPage: true,
      });
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    await page
      .getByRole("button", { name: "Ampliar corte coronal", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reduzir corte coronal", exact: true })
      .focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      ),
      "Corte coronal",
    );
    await page
      .getByRole("button", { name: "Reduzir corte coronal", exact: true })
      .click();
    await page.getByTestId("select-brain").click();
    await page.evaluate(() => {
      scrollTo(0, 0);
      return document.fonts.ready;
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `../work/qa/magno-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    results.push({
      browser: mobile ? "WebKit iPhone 13 emulation" : "Chrome desktop",
      atlas_title_and_symbol: true,
      atlas_header_color: true,
      head_case: "s0591",
      interpolation_toggle: true,
      overlay_modes: true,
      enlarged_slice_coordinates_match_labels: true,
      view_sync: true,
      escape_closes: true,
      focus_trap: true,
      no_overflow: true,
      no_runtime_errors: true,
    });
  } finally {
    await browser.close();
  }
}
await writeFile(
  "../work/qa/magno-browser-checks.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
