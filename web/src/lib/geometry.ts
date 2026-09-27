export type Vec3 = [number, number, number];
export type Plane = "axial" | "coronal" | "sagittal";
export type Organ = {
  id: number;
  name: string;
  display_name: string;
  latin: string;
  color: string;
  centroid: Vec3;
  anchor: Vec3;
  volume_ml: number;
  faces: number;
  bounds_voxel: [Vec3, Vec3];
  group?: string;
  hemisphere?: string;
  source_ids?: number[];
  note?: string;
};
export type Meta = {
  schema_version: number;
  modality?: "MRI";
  sequence_windows?: Record<"t1" | "t2", { width: number; level: number }>;
  subject: string;
  shape: Vec3;
  spacing_mm: Vec3;
  center_mm: Vec3;
  affine_ras: number[][];
  organs: Organ[];
  window: { width: number; level: number };
  ct_dtype?: "int16-le";
  default_window?: "soft" | "bone" | "brain";
  default_id?: number;
  coverage?: string;
  source: { url: string; attribution: string; license: string };
};
export const indexOf = ([i, j, k]: Vec3, shape: Vec3) =>
  i * shape[1] * shape[2] + j * shape[2] + k;
export const clampVoxel = (v: Vec3, shape: Vec3): Vec3 =>
  v.map((n, d) => Math.max(0, Math.min(shape[d] - 1, Math.round(n)))) as Vec3;
export function voxelToWorld(v: Vec3, m: Meta): Vec3 {
  const r = v.map((n, d) => n * m.spacing_mm[d] - m.center_mm[d]);
  return [-r[0], r[2], r[1]];
}
export function worldToVoxel([x, y, z]: Vec3, m: Meta): Vec3 {
  return clampVoxel(
    [
      (-x + m.center_mm[0]) / m.spacing_mm[0],
      (z + m.center_mm[1]) / m.spacing_mm[1],
      (y + m.center_mm[2]) / m.spacing_mm[2],
    ],
    m.shape,
  );
}
export const planeAxes = (p: Plane): [number, number, number] =>
  p === "axial" ? [0, 1, 2] : p === "coronal" ? [0, 2, 1] : [1, 2, 0];
export function voxelToPixel(v: Vec3, p: Plane, shape: Vec3): [number, number] {
  const [h, t] = planeAxes(p);
  return [shape[h] - 1 - v[h], shape[t] - 1 - v[t]];
}
export function pixelToVoxel(
  col: number,
  row: number,
  v: Vec3,
  p: Plane,
  shape: Vec3,
): Vec3 {
  const [h, t] = planeAxes(p);
  const next = [...v] as Vec3;
  next[h] = shape[h] - 1 - col;
  next[t] = shape[t] - 1 - row;
  return clampVoxel(next, shape);
}
export function interiorPoint(
  v: Vec3,
  organ: Organ,
  labels: Uint8Array,
  m: Meta,
): Vec3 {
  const point = clampVoxel(v, m.shape);
  if (labels[indexOf(point, m.shape)] === organ.id) return point;
  let best: Vec3 = organ.anchor;
  let distance = Infinity;
  // Mesh smoothing may move the surface across a voxel boundary. Snap to the
  // nearest occupied voxel in physical space, preserving the intended location.
  const [lo, hi] = organ.bounds_voxel;
  for (let i = lo[0]; i <= hi[0]; i++)
    for (let j = lo[1]; j <= hi[1]; j++)
      for (let k = lo[2]; k <= hi[2]; k++) {
        if (labels[indexOf([i, j, k], m.shape)] !== organ.id) continue;
        const d =
          ((i - point[0]) * m.spacing_mm[0]) ** 2 +
          ((j - point[1]) * m.spacing_mm[1]) ** 2 +
          ((k - point[2]) * m.spacing_mm[2]) ** 2;
        if (d < distance) {
          distance = d;
          best = [i, j, k];
        }
      }
  return best;
}
