import { chromium, webkit, devices } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.env.ANATOMY_URL || "http://127.0.0.1:3018";
const meta = JSON.parse(await readFile("public/data/neuro/meta.json"));
const labels = await readFile("public/data/neuro/labels.bin");
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
    await page.getByTestId("region-neuro").click();
    await page
      .locator('[data-testid="explorer"][data-region="neuro"]')
      .waitFor({ timeout: 60000 });
    await page
      .locator('[data-testid="scene"][data-ready="true"]')
      .waitFor({ timeout: 60000 });
    assert.equal(
      await page.getByLabel("Janela de TC", { exact: true }).count(),
      0,
    );
    assert.equal(await page.getByLabel("Sequência de RM").inputValue(), "t1");
    const canvas = page.getByTestId("canvas-axial"),
      cross = () => page.getByTestId("explorer").getAttribute("data-crosshair");
    const point = await cross(),
      t1 = await canvas.evaluate((c) => c.toDataURL());
    await page.getByLabel("Sequência de RM").selectOption("t2");
    const t2 = await canvas.evaluate((c) => c.toDataURL());
    assert.notEqual(t1, t2);
    assert.equal(await cross(), point);
    await page.getByLabel("Sequência de RM").selectOption("t1");
    const checked = mobile
      ? meta.organs.filter((o) =>
          [
            "precentral_l",
            "postcentral_r",
            "hippocampus_l",
            "third_ventricle",
            "brainstem",
            "vermis_i_v",
          ].includes(o.name),
        )
      : meta.organs;
    for (const o of checked) {
      await page.getByTestId(`select-${o.name}`).click();
      assert.equal(await cross(), o.anchor.join(","));
      const [i, j, k] = o.anchor;
      assert.equal(
        labels[i * meta.shape[1] * meta.shape[2] + j * meta.shape[2] + k],
        o.id,
      );
      for (const plane of ["axial", "coronal", "sagittal"])
        assert.equal(
          await page.getByTestId(`canvas-${plane}`).getAttribute("data-voxel"),
          o.anchor.join(","),
        );
    }
    await page.getByTestId("select-precentral_l").click();
    await page.getByRole("button", { name: "Estudar", exact: true }).click();
    await page
      .getByTestId("anatomy-card")
      .getByRole("heading", { name: "Giro pré-central · esquerdo" })
      .waitFor();
    assert.ok(
      (await page.getByTestId("anatomy-card").innerText()).includes(
        "motor primário",
      ),
    );
    await page
      .getByRole("button", { name: "Marcar como estudada", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Estrutura estudada", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: /Do movimento à percepção/ })
      .click();
    for (const [i, name] of [
      "precentral_l",
      "postcentral_l",
      "thalamus_l",
      "hippocampus_l",
    ].entries()) {
      assert.equal(
        await cross(),
        meta.organs.find((o) => o.name === name).anchor.join(","),
      );
      if (i < 3)
        await page
          .getByRole("button", { name: "Próxima etapa", exact: true })
          .click();
      else
        await page
          .getByRole("button", { name: "Concluir roteiro", exact: true })
          .click();
    }
    assert.ok(
      (await page.getByTestId("learning-progress").innerText()).includes(
        "1 roteiro",
      ),
    );
    await page.getByTestId("select-precentral_l").click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `../work/qa/neuro-study-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Quiz", exact: true }).click();
    await page
      .getByRole("button", { name: "Iniciar quiz", exact: true })
      .click();
    for (let i = 0; i < 5; i++) {
      await page
        .locator(".organ-title h2")
        .getByText("Estrutura em destaque", { exact: true })
        .waitFor();
      assert.equal(await page.locator(".organ-select").count(), 0);
      assert.equal(await page.getByLabel("Buscar estrutura").count(), 0);
      const id = Number(
        await page.getByTestId("explorer").getAttribute("data-current-label"),
      );
      const target = meta.organs.find((o) => o.id === id);
      assert.ok(target);
      if (i === 0) {
        await page
          .getByRole("button", { name: "Mostrar pista", exact: true })
          .click();
        const other = page
          .locator(
            `.quiz-options button:not([data-testid="quiz-option-${id}"])`,
          )
          .first();
        await other.click();
        assert.ok(
          (await page.locator(".quiz-feedback").innerText()).includes(
            "Vamos revisar.",
          ),
        );
      } else await page.getByTestId(`quiz-option-${id}`).click();
      assert.equal(
        await page.locator(".quiz-options button:not(:disabled)").count(),
        0,
      );
      assert.equal(
        await page.locator(".organ-title h2").innerText(),
        target.display_name,
      );
      if (i === 0) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `../work/qa/neuro-quiz-${mobile ? "mobile" : "desktop"}.png`,
          fullPage: true,
        });
      }
      await page
        .getByRole("button", {
          name: i === 4 ? "Ver resultado" : "Próxima pergunta",
          exact: true,
        })
        .click();
    }
    await page
      .getByRole("heading", { name: "4 de 5 acertos", exact: true })
      .waitFor();
    let saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("anatomy-atlas-progress-v1")),
    );
    assert.equal(saved.attempts, 5);
    assert.equal(saved.correct, 4);
    assert.equal(saved.assisted, 1);
    assert.deepEqual(saved.trails, ["neuro-cortex"]);
    await page.reload();
    await page.getByTestId("explorer").waitFor();
    await page.getByRole("button", { name: "Estudar", exact: true }).click();
    assert.ok(
      (await page.getByTestId("learning-progress").innerText()).includes("4/5"),
    );
    await page.getByRole("button", { name: "Quiz", exact: true }).click();
    await page
      .getByRole("button", { name: "Iniciar quiz", exact: true })
      .click();
    await page.getByTestId("region-feet").click();
    await page
      .locator('[data-testid="explorer"][data-region="feet"]')
      .waitFor({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Iniciar quiz", exact: true })
      .waitFor();
    assert.ok((await page.locator(".organ-select").count()) > 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    if (!mobile) {
      const blocked = await browser.newPage();
      await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', {get(){throw new Error('blocked storage test');}}));
      await blocked.goto(base); await blocked.getByTestId('explorer').waitFor({timeout:60000});
      await blocked.getByRole('button',{name:'Quiz',exact:true}).click();
      await blocked.getByRole('button',{name:'Iniciar quiz',exact:true}).click();
      await blocked.getByText('Estrutura em destaque',{exact:true}).waitFor();
      const target=await blocked.getByTestId('explorer').getAttribute('data-current-label');
      await blocked.getByTestId(`quiz-option-${target}`).click();
      await blocked.getByTestId('region-pelvis').click();
      await blocked.locator('[data-testid="explorer"][data-region="pelvis"]').waitFor({timeout:60000});
      assert.ok((await blocked.getByTestId('learning-progress').innerText()).includes('1/1'));
      await blocked.getByText('Armazenamento indisponível · progresso apenas nesta sessão',{exact:true}).waitFor();
      await blocked.close();
    }
    results.push({
      browser: mobile ? "WebKit iPhone 13 emulation" : "Chrome desktop",
      mri_labels_checked: checked.length,
      t1_t2_contrast_and_coordinates: true,
      no_hu_for_mri: true,
      guided_trail: true,
      quiz_hidden_names: true,
      wrong_and_right_answers: true,
      progress_persists_after_reload: true,
      region_switch_clears_quiz: true,
      no_overflow: true,
      no_runtime_errors: true,
      storage_blocked_fallback: mobile ? "covered on desktop" : true,
    });
  } finally {
    await browser.close();
  }
}
await writeFile(
  "../work/qa/learning-browser-checks.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
