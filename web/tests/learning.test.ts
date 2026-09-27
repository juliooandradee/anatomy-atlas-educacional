import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { regions } from "../src/lib/regions";
import {
  cardFor,
  trails,
  makeQuiz,
  parseProgress,
  recordAnswer,
  emptyProgress,
  sources,
} from "../src/lib/learning";
import type { Meta } from "../src/lib/geometry";
const metas = Object.fromEntries(
  regions.map((r) => [
    r.id,
    JSON.parse(readFileSync(`public${r.path}/meta.json`, "utf8")) as Meta,
  ]),
);
test("all guided steps reference real selectable labels; all cards have traceable sources", () => {
  for (const region of regions) {
    const m = metas[region.id];
    for (const t of trails[region.id])
      for (const step of t.steps)
        assert.ok(
          m.organs.some((o) => o.name === step.name),
          `${region.id}: ${step.name}`,
        );
    for (const o of m.organs) {
      const c = cardFor(o);
      assert.ok(c.function && c.relation && c.observation);
      for (const source of c.sources)
        assert.ok(sources[source].url.startsWith("https://"));
      if (region.id !== "neuro")
        assert.ok(!c.context, `Missing specific family card: ${o.name}`);
    }
  }
});
test("quizzes have unique targets and alternatives, including exactly one correct answer", () => {
  for (const meta of Object.values(metas))
    for (let i = 0; i < 30; i++) {
      const quiz = makeQuiz(meta.organs);
      assert.equal(quiz.length, 5);
      assert.equal(new Set(quiz.map((q) => q.target.id)).size, 5);
      for (const q of quiz) {
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map((o) => o.id)).size, 4);
        assert.equal(q.options.filter((o) => o.id === q.target.id).length, 1);
      }
    }
});
test("corrupted progress recovers, valid progress roundtrips, and hints are counted separately", () => {
  for (const raw of [
    "bad",
    "null",
    "{}",
    '{"version":1,"attempts":-1}',
    '{"version":1,"attempts":1,"correct":2}',
  ])
    assert.deepEqual(parseProgress(raw), emptyProgress());
  let p = recordAnswer(emptyProgress(), "neuro:precentral_l", true, true);
  p = recordAnswer(p, "neuro:precentral_l", false, false);
  assert.equal(p.attempts, 2);
  assert.equal(p.correct, 1);
  assert.equal(p.assisted, 1);
  assert.equal(p.seen.length, 1);
  assert.deepEqual(parseProgress(JSON.stringify(p)), p);
});
