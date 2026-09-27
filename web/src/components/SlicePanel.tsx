"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useExplorer } from "@/lib/store";
import { windowPresets } from "@/lib/regions";
import {
  indexOf,
  planeAxes,
  pixelToVoxel,
  voxelToPixel,
  type Plane,
  type Vec3,
} from "@/lib/geometry";
const descriptions = {
  axial: {
    name: "Axial",
    subtitle: "Visto a partir dos pés",
    letters: ["A", "P", "R", "L"],
    number: "02",
  },
  coronal: {
    name: "Coronal",
    subtitle: "De frente para o paciente",
    letters: ["S", "I", "R", "L"],
    number: "03",
  },
  sagittal: {
    name: "Sagital",
    subtitle: "Visto pelo lado esquerdo",
    letters: ["S", "I", "A", "P"],
    number: "04",
  },
};
export default function SlicePanel({ plane }: { plane: Plane }) {
  const {
    meta,
    ct,
    secondaryVolume,
    sequence,
    labels,
    crosshair,
    selected,
    visible,
    overlays,
    move,
    windowPreset,
    overlayFill,
    smoothImages,
    expandedPlane,
  } = useExplorer();
  const contrast =
    meta?.modality === "MRI"
      ? meta.sequence_windows?.[sequence]
      : meta?.ct_dtype
        ? windowPresets[windowPreset]
        : meta?.window;
  const pixels = sequence === "t2" && secondaryVolume ? secondaryVolume : ct;
  const expanded = expandedPlane === plane;
  const section = useRef<HTMLElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const rect = useRef({ x: 0, y: 0, w: 1, h: 1, cols: 1, rows: 1 });
  const [size, setSize] = useState([400, 300]);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useExplorer.setState({ expandedPlane: null });
        expandButton.current?.focus();
      }
      if (e.key === "Tab") {
        const controls = section.current?.querySelectorAll<HTMLElement>(
          "button, canvas, input",
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
    };
  }, [expanded]);
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize([r.width, r.height]);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !pixels || !labels || !meta) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(size[0] * dpr);
    c.height = Math.round(size[1] * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [h, v, fixed] = planeAxes(plane);
    const cols = meta.shape[h],
      rows = meta.shape[v];
    const scale = Math.min(
      (size[0] - 64) / (cols * meta.spacing_mm[h]),
      (size[1] - 42) / (rows * meta.spacing_mm[v]),
    );
    const w = cols * meta.spacing_mm[h] * scale,
      hh = rows * meta.spacing_mm[v] * scale;
    const x = (size[0] - w) / 2,
      y = (size[1] - hh) / 2;
    rect.current = { x, y, w, h: hh, cols, rows };
    const image = new ImageData(cols, rows);
    const sliceLabels = new Uint8Array(cols * rows);
    const colors = Object.fromEntries(
      meta.organs.map((o) => [
        o.id,
        [
          parseInt(o.color.slice(1, 3), 16),
          parseInt(o.color.slice(3, 5), 16),
          parseInt(o.color.slice(5, 7), 16),
        ],
      ]),
    );
    const pos = [...crosshair] as Vec3;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        pos[h] = cols - 1 - col;
        pos[v] = rows - 1 - row;
        pos[fixed] = crosshair[fixed];
        const ix = indexOf(pos, meta.shape),
          p = row * cols + col,
          g = meta.ct_dtype
            ? Math.round(
                Math.max(
                  0,
                  Math.min(
                    1,
                    (pixels[ix] - contrast!.level + contrast!.width / 2) /
                      contrast!.width,
                  ),
                ) * 255,
              )
            : pixels[ix];
        sliceLabels[p] = labels[ix];
        image.data.set([g, g, g, 255], p * 4);
      }
    if (overlays)
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const p = row * cols + col,
            id = sliceLabels[p];
          if (!id || !visible.includes(id)) continue;
          const edge =
            id === selected &&
            (col === 0 ||
              row === 0 ||
              col === cols - 1 ||
              row === rows - 1 ||
              sliceLabels[p - 1] !== id ||
              sliceLabels[p + 1] !== id ||
              sliceLabels[p - cols] !== id ||
              sliceLabels[p + cols] !== id);
          const alpha = edge
            ? 0.85
            : overlayFill
              ? id === selected
                ? 0.16
                : 0.06
              : 0;
          for (let channel = 0; channel < 3; channel++)
            image.data[p * 4 + channel] =
              image.data[p * 4 + channel] * (1 - alpha) +
              colors[id][channel] * alpha;
        }
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    off.getContext("2d")!.putImageData(image, 0, 0);
    ctx.fillStyle = "#0b100f";
    ctx.fillRect(0, 0, size[0], size[1]);
    ctx.imageSmoothingEnabled = smoothImages;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, x, y, w, hh);
    const [px, py] = voxelToPixel(crosshair, plane, meta.shape);
    const cx = x + ((px + 0.5) * w) / cols,
      cy = y + ((py + 0.5) * hh) / rows;
    ctx.strokeStyle = "#e0cfab";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + hh);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.font = "500 11px Montserrat, sans-serif";
    ctx.fillStyle = "#d4c3a5";
    ctx.textAlign = "center";
    const [top, bottom, left, right] = descriptions[plane].letters;
    ctx.fillText(top, size[0] / 2, 15);
    ctx.fillText(bottom, size[0] / 2, size[1] - 7);
    ctx.fillText(left, 17, size[1] / 2);
    ctx.fillText(right, size[0] - 17, size[1] / 2);
    const bar = 50 * scale;
    const bx = size[0] - bar - 18,
      by = size[1] - 20;
    ctx.strokeStyle = "#b8bba9";
    ctx.beginPath();
    ctx.moveTo(bx, by - 3);
    ctx.lineTo(bx, by + 3);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bar, by);
    ctx.moveTo(bx + bar, by - 3);
    ctx.lineTo(bx + bar, by + 3);
    ctx.stroke();
    ctx.font = "9px Montserrat";
    ctx.fillText("50 mm", bx + bar / 2, by - 6);
  }, [
    meta,
    pixels,
    labels,
    crosshair,
    selected,
    visible,
    overlays,
    size,
    plane,
    contrast,
    smoothImages,
    overlayFill,
  ]);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = useExplorer.getState();
      const axis = planeAxes(plane)[2];
      const v = [...s.crosshair] as Vec3;
      v[axis] += Math.sign(e.deltaY);
      s.move(v);
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [plane]);
  if (!meta) return null;
  const desc = descriptions[plane];
  const [h, v, fixed] = planeAxes(plane);
  const update = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const b = event.currentTarget.getBoundingClientRect();
    const r = rect.current;
    const x = event.clientX - b.left,
      y = event.clientY - b.top;
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return;
    move(
      pixelToVoxel(
        Math.floor(((x - r.x) / r.w) * r.cols),
        Math.floor(((y - r.y) / r.h) * r.rows),
        crosshair,
        plane,
        meta.shape,
      ),
      true,
    );
  };
  return (
    <section
      ref={section}
      className={`panel slice-panel ${expanded ? "expanded-panel" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-labelledby={`${plane}-title`}
      data-plane={plane}
    >
      <header className="panel-header">
        <div>
          <span className="panel-index">{desc.number}</span>
          <h2 id={`${plane}-title`}>{desc.name}</h2>
        </div>
        <div className="slice-header-tools">
          <span className="window-label">
            {meta.modality === "MRI"
              ? `RM ${sequence.toUpperCase()} · 1 mm`
              : `W ${contrast?.width} / L ${contrast?.level}`}
          </span>
          <button
            ref={expandButton}
            className="expand-slice"
            aria-label={`${expanded ? "Reduzir" : "Ampliar"} corte ${desc.name.toLowerCase()}`}
            onClick={() =>
              useExplorer.setState({ expandedPlane: expanded ? null : plane })
            }
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>
      <div className="slice-viewport" ref={holder}>
        <canvas
          ref={canvas}
          aria-label={`Corte ${desc.name.toLowerCase()}. Clique para posicionar a mira; setas movem a mira; Page Up e Page Down mudam o corte.`}
          role="img"
          tabIndex={0}
          data-testid={`canvas-${plane}`}
          data-voxel={crosshair.join(",")}
          data-label={labels?.[indexOf(crosshair, meta.shape)]}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            update(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) update(e);
          }}
          onKeyDown={(e) => {
            const n = [...crosshair] as Vec3;
            const keys: Record<string, [number, number]> = {
              ArrowLeft: [h, 1],
              ArrowRight: [h, -1],
              ArrowUp: [v, 1],
              ArrowDown: [v, -1],
              PageUp: [fixed, 1],
              PageDown: [fixed, -1],
            };
            if (keys[e.key]) {
              e.preventDefault();
              n[keys[e.key][0]] += keys[e.key][1];
              move(n, true);
            }
          }}
        />
      </div>
      <div className="slice-controls">
        <div className="slice-caption">
          <span>{desc.subtitle}</span>
          <output aria-label={`Posição ${desc.name.toLowerCase()}`}>
            {String(crosshair[fixed] + 1).padStart(3, "0")}{" "}
            <span>/ {meta.shape[fixed]}</span>
          </output>
        </div>
        <input
          aria-label={`Corte ${desc.name.toLowerCase()}`}
          type="range"
          min={0}
          max={meta.shape[fixed] - 1}
          value={crosshair[fixed]}
          onChange={(e) => {
            const n = [...crosshair] as Vec3;
            n[fixed] = Number(e.target.value);
            move(n);
          }}
        />
      </div>
    </section>
  );
}
