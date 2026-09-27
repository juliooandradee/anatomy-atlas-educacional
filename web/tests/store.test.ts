import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData, useExplorer } from "../src/lib/store";
import type { Meta } from "../src/lib/geometry";
const m: Meta = {
  schema_version: 1,
  subject: "synthetic-state-test",
  shape: [2, 2, 2],
  spacing_mm: [1, 1, 1],
  center_mm: [0.5, 0.5, 0.5],
  affine_ras: [],
  ct_dtype: "int16-le",
  default_window: "bone",
  default_id: 8,
  window: { width: 1800, level: 400 },
  source: { url: "", attribution: "", license: "" },
  organs: [
    {
      id: 8,
      name: "tibia",
      display_name: "Tíbia",
      latin: "Tibia",
      color: "#ffffff",
      anchor: [1, 1, 1],
      centroid: [1, 1, 1],
      volume_ml: 1,
      faces: 12,
      bounds_voxel: [
        [1, 1, 1],
        [1, 1, 1],
      ],
    },
  ],
};
test("switching a dataset resets selection, visibility, camera-related controls and HU window", () => {
  useExplorer.setState({
    selected: 1,
    visible: [1],
    planes: false,
    overlays: false,
    windowPreset: "brain",
  });
  useExplorer
    .getState()
    .init(m, new Int16Array(8), new Uint8Array(8), "/data/legs");
  const s = useExplorer.getState();
  assert.equal(s.selected, 8);
  assert.deepEqual(s.visible, [8]);
  assert.deepEqual(s.crosshair, [1, 1, 1]);
  assert.equal(s.windowPreset, "bone");
  assert.equal(s.planes, true);
  assert.equal(s.overlays, true);
  s.reset();
  assert.equal(useExplorer.getState().selected, 8);
});
test("late responses from an aborted region cannot replace the active case, even when fetch ignores abort", async () => {
  const original = globalThis.fetch;
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  globalThis.fetch = (async (url: string | URL | Request) => {
    await gate;
    return new Response(
      String(url).endsWith("meta.json")
        ? JSON.stringify(m)
        : new Uint8Array(String(url).endsWith("ct.bin") ? 16 : 8),
    );
  }) as typeof fetch;
  try {
    const c = new AbortController();
    const pending = loadData("feet", c.signal);
    c.abort();
    useExplorer
      .getState()
      .init(
        { ...m, subject: "new-case" },
        new Int16Array(8),
        new Uint8Array(8),
        "/data/legs",
      );
    release();
    await pending;
    assert.equal(useExplorer.getState().meta!.subject, "new-case");
    assert.equal(useExplorer.getState().assetPath, "/data/legs");
  } finally {
    globalThis.fetch = original;
  }
});
test("an incomplete HU volume is rejected before the new case becomes visible", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) =>
    new Response(
      String(url).endsWith("meta.json") ? JSON.stringify(m) : new Uint8Array(8),
    )) as typeof fetch;
  try {
    await assert.rejects(
      loadData("legs", new AbortController().signal),
      /Arquivos incompletos/,
    );
    assert.equal(useExplorer.getState().meta, null);
  } finally {
    globalThis.fetch = original;
  }
});
test("MRI requires a complete T2 volume, keeps intensities distinct, and clears them on CT switch", async () => {
  const original = globalThis.fetch;
  let truncated = true;
  const mr: Meta = {
    ...m,
    modality: "MRI",
    sequence_windows: {
      t1: { width: 11000, level: 5500 },
      t2: { width: 10000, level: 5000 },
    },
  };
  globalThis.fetch = (async (url: string | URL | Request) =>
    new Response(
      String(url).endsWith("meta.json")
        ? JSON.stringify(mr)
        : String(url).endsWith("t2.bin")
          ? new Int16Array(truncated ? 7 : 8).fill(777)
          : String(url).endsWith("ct.bin")
            ? new Int16Array(8).fill(123)
            : new Uint8Array(8),
    )) as typeof fetch;
  try {
    await assert.rejects(
      loadData("neuro", new AbortController().signal),
      /Arquivos incompletos/,
    );
    truncated = false;
    await loadData("neuro", new AbortController().signal);
    assert.equal(useExplorer.getState().ct![0], 123);
    assert.equal(useExplorer.getState().secondaryVolume![0], 777);
    useExplorer.getState().init(m, new Int16Array(8), new Uint8Array(8));
    assert.equal(useExplorer.getState().secondaryVolume, null);
    assert.equal(useExplorer.getState().sequence, "t1");
  } finally {
    globalThis.fetch = original;
  }
});
test("quiz selection stays on the target while crosshairs can move, and resetting the region unlocks it", () => {
  const second = {
    ...m.organs[0],
    id: 9,
    name: "second",
    anchor: [0, 0, 0] as [number, number, number],
  };
  const meta = { ...m, organs: [...m.organs, second] };
  const labels = new Uint8Array(8).fill(9);
  labels[7] = 8;
  useExplorer.getState().init(meta, new Int16Array(8), labels);
  useExplorer.setState({ quizTarget: 8, quizHidden: true });
  useExplorer.getState().select(9);
  assert.equal(useExplorer.getState().selected, 8);
  useExplorer.getState().move([0, 0, 0], true);
  assert.equal(useExplorer.getState().selected, 8);
  assert.deepEqual(useExplorer.getState().crosshair, [0, 0, 0]);
  useExplorer.getState().init(meta, new Int16Array(8), labels);
  assert.equal(useExplorer.getState().quizTarget, null);
  assert.equal(useExplorer.getState().quizHidden, false);
  useExplorer.getState().select(9);
  assert.equal(useExplorer.getState().selected, 9);
});
