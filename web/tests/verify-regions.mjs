import { chromium, webkit, devices } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.ANATOMY_URL || "http://127.0.0.1:3018";
const output = "../work/qa";
await mkdir(output, { recursive: true });
const regions = ["head-neck", "abdomen", "pelvis", "legs", "feet"];
const data = Object.fromEntries(
  await Promise.all(
    regions.map(async (r) => {
      const root = r === "abdomen" ? "public/data" : `public/data/${r}`;
      return [
        r,
        {
          meta: JSON.parse(await readFile(`${root}/meta.json`)),
          labels: await readFile(`${root}/labels.bin`),
        },
      ];
    }),
  ),
);
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
      : { viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" },
  );
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => requests.push(r.url()));
  try {
    await page.goto(base);
    await page
      .locator('[data-testid="scene"][data-ready="true"]')
      .waitFor({ timeout: 60000 });
    assert.ok(
      !requests.some((u) =>
        regions
          .filter((r) => r !== "abdomen")
          .some((r) => u.includes(`/data/${r}/`)),
      ),
      "Only active dataset should load",
    );
    for (const region of regions) {
      const { meta, labels } = data[region];
      await page.getByTestId(`region-${region}`).click();
      await page
        .locator(`[data-testid="explorer"][data-region="${region}"]`)
        .waitFor({ timeout: 60000 });
      await page
        .locator('[data-testid="scene"][data-ready="true"]')
        .waitFor({ timeout: 60000 });
      const offset = ([i, j, k]) =>
        i * meta.shape[1] * meta.shape[2] + j * meta.shape[2] + k;
      assert.equal(await page.locator("canvas").count(), 4);
      assert.equal(
        await page.locator(".count").textContent(),
        String(meta.organs.length).padStart(2, "0"),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${region}: horizontal overflow`,
      );
      const organs = mobile
        ? [meta.organs[0], meta.organs.at(-1)]
        : meta.organs;
      for (const organ of organs) {
        await page.getByTestId(`select-${organ.name}`).click();
        const point = (
          await page.getByTestId("explorer").getAttribute("data-crosshair")
        )
          .split(",")
          .map(Number);
        assert.equal(
          labels[offset(point)],
          organ.id,
          `${region}/${organ.name}: selected anchor inside mask`,
        );
        for (const plane of ["axial", "coronal", "sagittal"])
          assert.equal(
            await page
              .getByTestId(`canvas-${plane}`)
              .getAttribute("data-voxel"),
            point.join(","),
          );
      }
      // Exercise real mesh raycasting after leaving the structure's slice.
      const selected = meta.organs.find((o) => o.id === (meta.default_id ?? 1));
      await page.getByTestId(`select-${selected.name}`).click();
      await page
        .getByRole("button", { name: "Isolar estrutura", exact: true })
        .click();
      const slider = page.getByRole("slider", {
        name: "Corte axial",
        exact: true,
      });
      await slider.focus();
      await slider.press("Home");
      const canvas = page.getByTestId("scene").locator("canvas");
      await canvas.scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      const box = await canvas.boundingBox(),
        distance =
          Math.max(...meta.shape.map((n, i) => n * meta.spacing_mm[i])) * 1.95;
      const [i, j, k] = selected.anchor,
        x = -(i * meta.spacing_mm[0] - meta.center_mm[0]),
        y = k * meta.spacing_mm[2] - meta.center_mm[2],
        z = j * meta.spacing_mm[1] - meta.center_mm[1];
      const focal = box.height / (2 * Math.tan((34 * Math.PI) / 360));
      await page.mouse.click(
        box.x + box.width / 2 + (x * focal) / (distance - z),
        box.y + box.height / 2 - (y * focal) / (distance - z),
      );
      await page.waitForFunction(
        (id) =>
          document
            .querySelector('[data-testid="explorer"]')
            .getAttribute("data-current-label") === String(id),
        selected.id,
        { timeout: 6000 },
      );
      const hit = (
        await page.getByTestId("explorer").getAttribute("data-crosshair")
      )
        .split(",")
        .map(Number);
      assert.equal(labels[offset(hit)], selected.id);
      await page
        .getByRole("button", { name: "Ver todos", exact: true })
        .click();
      if (meta.ct_dtype) {
        await page
          .getByLabel("Janela de TC", { exact: true })
          .selectOption("soft");
        const soft = await page
          .getByTestId("canvas-axial")
          .evaluate((c) => c.toDataURL());
        await page
          .getByLabel("Janela de TC", { exact: true })
          .selectOption("bone");
        await page.waitForFunction(
          () =>
            document.querySelector(".window-label").textContent ===
            "W 1800 / L 400",
        );
        const bone = await page
          .getByTestId("canvas-axial")
          .evaluate((c) => c.toDataURL());
        assert.notEqual(soft, bone, "HU contrast visibly changes the CT");
      }
      if (region === "feet") {
        await page
          .getByLabel("Buscar estrutura", { exact: true })
          .fill("falange distal");
        assert.equal(await page.locator(".organ-select").count(), 10);
        await page.getByTestId("select-phalange_foot_5_3_r").click();
        assert.equal(
          await page.getByTestId("explorer").getAttribute("data-current-label"),
          "63",
        );
        await page.getByLabel("Buscar estrutura", { exact: true }).fill("");
        await page
          .getByLabel("Filtrar estruturas", { exact: true })
          .selectOption("Tarso");
        assert.equal(await page.locator(".organ-select").count(), 14);
        await page
          .getByLabel("Filtrar estruturas", { exact: true })
          .selectOption("");
      }
      await page.getByTestId(`select-${selected.name}`).click();
      if (region === "head-neck")
        await page
          .getByLabel("Janela de TC", { exact: true })
          .selectOption("brain");
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${output}/expanded-${mobile ? "mobile" : "desktop"}-${region}.png`,
        fullPage: true,
      });
      results.push({
        browser: mobile ? "WebKit mobile" : "Chrome desktop",
        region,
        selected_anchors_checked: organs.length,
        raycast_inside_real_mask: true,
        all_views_sync: true,
        no_horizontal_overflow: true,
        contrast_change: !!meta.ct_dtype,
      });
    }
    // Return from sparse IDs (8..63) to abdomen, then to head: no stale selection.
    await page.getByTestId("region-abdomen").click();
    await page
      .locator('[data-testid="explorer"][data-region="abdomen"]')
      .waitFor();
    assert.equal(
      await page.getByTestId("select-liver").getAttribute("aria-pressed"),
      "true",
    );
    await page.getByTestId("region-head-neck").click();
    await page.getByTestId("region-feet").click();
    await page.getByTestId("region-pelvis").click();
    await page
      .locator('[data-testid="explorer"][data-region="pelvis"]')
      .waitFor();
    await page
      .locator('[data-testid="scene"][data-ready="true"]')
      .waitFor({ timeout: 60000 });
    assert.equal(
      await page.getByTestId("select-hip_l").getAttribute("aria-pressed"),
      "true",
    );
    assert.deepEqual(errors, [], `No runtime errors: ${errors.join(";")}`);
  } finally {
    await browser.close();
  }
}
// Network failure + retry when entering a new region; previous anatomy must clear.
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto(base);
  await page.getByTestId("explorer").waitFor();
  await page.route("**/data/feet/ct.bin", (r) =>
    r.fulfill({ status: 503, body: "test temporary error" }),
  );
  await page.getByTestId("region-feet").click();
  await page.locator('.loading-card[role="alert"]').waitFor();
  assert.equal(await page.getByTestId("explorer").count(), 0);
  await page.unroute("**/data/feet/ct.bin");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await page
    .locator('[data-testid="explorer"][data-region="feet"]')
    .waitFor({ timeout: 60000 });
  await page
    .locator('[data-testid="scene"][data-ready="true"]')
    .waitFor({ timeout: 60000 });
  results.push({ region_retry_after_503: true });
} finally {
  await browser.close();
}
await writeFile(
  `${output}/regional-browser-checks.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
