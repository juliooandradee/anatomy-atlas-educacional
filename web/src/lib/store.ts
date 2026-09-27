import { create } from "zustand";
import { regions, type RegionId, type WindowPreset } from "./regions";
import {
  clampVoxel,
  indexOf,
  interiorPoint,
  type Meta,
  type Vec3,
  type Plane,
} from "./geometry";
type State = {
  meta: Meta | null;
  ct: Uint8Array | Int16Array | null;
  labels: Uint8Array | null;
  secondaryVolume: Int16Array | null;
  sequence: "t1" | "t2";
  quizTarget: number | null;
  quizHidden: boolean;
  crosshair: Vec3;
  selected: number;
  visible: number[];
  planes: boolean;
  overlays: boolean;
  overlayFill: boolean;
  smoothImages: boolean;
  expandedPlane: Plane | null;
  cameraReset: number;
  assetPath: string;
  windowPreset: WindowPreset;
  init: (
    m: Meta,
    c: Uint8Array | Int16Array,
    l: Uint8Array,
    path?: string,
    secondary?: Int16Array | null,
  ) => void;
  move: (v: Vec3, pick?: boolean) => void;
  select: (id: number, point?: Vec3) => void;
  toggle: (id: number) => void;
  reset: () => void;
  setPlanes: (v: boolean) => void;
  setOverlays: (v: boolean) => void;
  isolate: () => void;
};
export const useExplorer = create<State>((set, get) => ({
  meta: null,
  ct: null,
  labels: null,
  secondaryVolume: null,
  sequence: "t1",
  quizTarget: null,
  quizHidden: false,
  crosshair: [0, 0, 0],
  selected: 1,
  visible: [],
  planes: true,
  overlays: true,
  overlayFill: false,
  smoothImages: true,
  expandedPlane: null,
  cameraReset: 0,
  assetPath: "/data",
  windowPreset: "soft",
  init: (meta, ct, labels, assetPath = "/data", secondaryVolume = null) =>
    set({
      meta,
      ct,
      labels,
      assetPath,
      secondaryVolume,
      sequence: "t1",
      quizTarget: null,
      quizHidden: false,
      selected: meta.default_id ?? meta.organs[0].id,
      planes: true,
      overlays: true,
      overlayFill: false,
      expandedPlane: null,
      windowPreset: meta.default_window ?? "soft",
      visible: meta.organs.map((o) => o.id),
      crosshair: (
        meta.organs.find((o) => o.id === meta.default_id) ?? meta.organs[0]
      ).anchor,
    }),
  move: (v, pick = false) => {
    const s = get();
    if (!s.meta || !s.labels) return;
    const crosshair = clampVoxel(v, s.meta.shape);
    const id = s.labels[indexOf(crosshair, s.meta.shape)];
    set({
      crosshair,
      ...(pick && !s.quizTarget && id > 0 && s.visible.includes(id)
        ? { selected: id }
        : {}),
    });
  },
  select: (id, point) => {
    const s = get();
    if (s.quizTarget !== null && s.quizTarget !== id) return;
    const organ = s.meta?.organs.find((o) => o.id === id);
    if (!organ || !s.meta || !s.labels) return;
    set({
      selected: id,
      crosshair: point
        ? interiorPoint(point, organ, s.labels, s.meta)
        : organ.anchor,
      visible: s.visible.includes(id) ? s.visible : [...s.visible, id],
    });
  },
  toggle: (id) =>
    set((s) => ({
      visible: s.visible.includes(id)
        ? s.visible.filter((n) => n !== id)
        : [...s.visible, id],
    })),
  reset: () => {
    if (get().quizTarget !== null) return;
    const m = get().meta;
    if (m)
      set((s) => ({
        selected: m.default_id ?? m.organs[0].id,
        crosshair: (m.organs.find((o) => o.id === m.default_id) ?? m.organs[0])
          .anchor,
        windowPreset: m.default_window ?? "soft",
        sequence: "t1",
        visible: m.organs.map((o) => o.id),
        planes: true,
        overlays: true,
        overlayFill: false,
        expandedPlane: null,
        cameraReset: s.cameraReset + 1,
      }));
  },
  setPlanes: (planes) => set({ planes }),
  setOverlays: (overlays) => set({ overlays }),
  isolate: () =>
    set((s) => ({
      visible:
        s.visible.length === 1 && s.visible[0] === s.selected
          ? s.meta!.organs.map((o) => o.id)
          : [s.selected],
    })),
}));
export async function loadData(region: RegionId, signal: AbortSignal) {
  const path = regions.find((r) => r.id === region)!.path;
  useExplorer.setState({
    meta: null,
    ct: null,
    labels: null,
    secondaryVolume: null,
    visible: [],
    quizTarget: null,
    quizHidden: false,
  });
  const get = async (url: string) => {
    const r = await fetch(url, { signal });
    if (!r.ok)
      throw new Error(`Não foi possível carregar ${url} (${r.status}).`);
    return r;
  };
  const [mr, cr, lr] = await Promise.all(
    ["meta.json", "ct.bin", "labels.bin"].map((f) => get(`${path}/${f}`)),
  );
  const meta = (await mr.json()) as Meta;
  const [cb, lb, secondary] = await Promise.all([
    cr.arrayBuffer(),
    lr.arrayBuffer(),
    meta.modality === "MRI"
      ? get(`${path}/t2.bin`).then((r) => r.arrayBuffer())
      : Promise.resolve(null),
  ]);
  if (
    meta.schema_version !== 1 ||
    meta.shape.length !== 3 ||
    !meta.organs.length ||
    meta.organs.length > 255 ||
    meta.shape.some((n) => !Number.isSafeInteger(n) || n < 1) ||
    new Set(meta.organs.map((o) => o.id)).size !== meta.organs.length ||
    meta.organs.some((o) => !Number.isInteger(o.id) || o.id < 1 || o.id > 255)
  )
    throw new Error("Metadados anatômicos incompatíveis.");
  const count = meta.shape.reduce((a, b) => a * b, 1);
  if (
    cb.byteLength !== count * (meta.ct_dtype === "int16-le" ? 2 : 1) ||
    (secondary !== null && secondary.byteLength !== count * 2) ||
    lb.byteLength !== count
  )
    throw new Error(
      "Arquivos incompletos: tamanho do volume não corresponde aos metadados.",
    );
  // A previous region may finish after a newer selection. Never commit it.
  if (signal.aborted) return;
  useExplorer
    .getState()
    .init(
      meta,
      meta.ct_dtype === "int16-le" ? new Int16Array(cb) : new Uint8Array(cb),
      new Uint8Array(lb),
      path,
      secondary ? new Int16Array(secondary) : null,
    );
}
