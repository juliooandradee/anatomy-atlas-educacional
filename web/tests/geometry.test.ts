import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampVoxel,
  indexOf,
  voxelToWorld,
  worldToVoxel,
  voxelToPixel,
  pixelToVoxel,
  interiorPoint,
  type Meta,
  type Vec3,
  type Plane,
  type Organ,
} from "../src/lib/geometry";
const m = {
  shape: [19, 25, 31],
  spacing_mm: [1.3, 2.7, 3.1],
  center_mm: [11.7, 32.4, 46.5],
} as Meta;
test("voxel/3D round trip preserves corners and interior with anisotropic spacing", () => {
  for (let i = 0; i < 19; i += 3)
    for (let j = 0; j < 25; j += 4)
      for (let k = 0; k < 31; k += 5) {
        const point: Vec3 = [i, j, k];
        assert.deepEqual(worldToVoxel(voxelToWorld(point, m), m), point);
      }
  assert.ok(
    voxelToWorld([18, 0, 0], m)[0] < voxelToWorld([0, 0, 0], m)[0],
    "Patient right appears on screen left from anterior camera",
  );
});
test("all display axes follow radiological convention with invertible pixel mapping", () => {
  const p: Vec3 = [3, 8, 12];
  assert.deepEqual(voxelToPixel(p, "axial", m.shape), [15, 16]);
  assert.deepEqual(voxelToPixel(p, "coronal", m.shape), [15, 18]);
  assert.deepEqual(voxelToPixel(p, "sagittal", m.shape), [16, 18]);
  for (const plane of ["axial", "coronal", "sagittal"] as Plane[]) {
    const [col, row] = voxelToPixel(p, plane, m.shape);
    assert.deepEqual(pixelToVoxel(col, row, p, plane, m.shape), p);
  }
});
test("C-order offsets and out-of-bounds clamping", () => {
  assert.equal(indexOf([2, 3, 4], m.shape), 2 * 25 * 31 + 3 * 31 + 4);
  assert.deepEqual(clampVoxel([-1, 300, 2.6], m.shape), [0, 24, 3]);
});
test("selection snaps into a non-convex mask when the centroid is outside", () => {
  const mm = {
    shape: [5, 5, 5],
    spacing_mm: [1, 2, 3],
    center_mm: [2, 4, 6],
  } as Meta;
  const labels = new Uint8Array(125);
  for (let i = 1; i < 4; i++) {
    labels[indexOf([i, 1, 2], mm.shape)] = 1;
    labels[indexOf([i, 3, 2], mm.shape)] = 1;
  }
  const organ = {
    id: 1,
    anchor: [2, 1, 2],
    bounds_voxel: [
      [1, 1, 2],
      [3, 3, 2],
    ],
  } as Organ;
  const point = interiorPoint([2, 2, 2], organ, labels, mm);
  assert.equal(labels[indexOf(point, mm.shape)], 1);
  assert.deepEqual(interiorPoint([2, 1, 2], organ, labels, mm), [2, 1, 2]);
});
