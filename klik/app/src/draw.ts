// Shapes and rendering. All coordinates are in image (physical) pixels.

export type Tool = "highlight" | "pen" | "line" | "arrow" | "callout";
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Shape =
  | { kind: "highlight" | "pen"; color: string; pts: Pt[] }
  | { kind: "line"; color: string; a: Pt; b: Pt }
  | { kind: "arrow"; color: string; a: Pt; b: Pt; n: number }
  /** A comment box at `a`, with an arrow to `b` if `b` is away from the box. */
  | { kind: "callout"; color: string; a: Pt; b: Pt; text: string };

/** Sizes in CSS pixels; multiplied by the image scale when drawn. */
const SIZE = { pen: 4, line: 4, highlight: 22, arrow: 5, badge: 15, font: 17 };

/** Comment box: 15px Inter (about 11 pt), readable but small. */
export const CALLOUT = { font: 15, lineH: 20, padX: 10, padY: 7, maxW: 280, minW: 36, radius: 8, border: 2 };
export const CALLOUT_FONT = (px: number) => `500 ${px}px "Inter", "Segoe UI", system-ui, sans-serif`;

let measureCtx: OffscreenCanvasRenderingContext2D | null = null;
function measurer() {
  return (measureCtx ??= new OffscreenCanvas(1, 1).getContext("2d")!);
}

/** Word-wrap `text` at `maxW` (newlines kept). */
function wrap(ctx: { measureText(t: string): TextMetrics }, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (line && ctx.measureText(next.trimEnd()).width > maxW) {
        out.push(line.trimEnd());
        line = word.trimStart();
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Where a comment box sits and how its text breaks. Image pixels. */
export function calloutLayout(text: string, a: Pt, s: number) {
  const m = measurer();
  m.font = CALLOUT_FONT(CALLOUT.font * s);
  const lines = wrap(m, text || " ", CALLOUT.maxW * s);
  const textW = Math.max(...lines.map((l) => m.measureText(l).width), 0);
  const w = Math.max(textW + 2 * CALLOUT.padX * s, CALLOUT.minW * s);
  const h = lines.length * CALLOUT.lineH * s + 2 * CALLOUT.padY * s;
  return { lines, box: { x: a.x - w / 2, y: a.y - h / 2, w, h } };
}

/** Point where the line from the box centre to `b` leaves the box. */
function boxEdge(box: Rect, b: Pt): Pt {
  const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const t = Math.min(dx ? box.w / 2 / Math.abs(dx) : Infinity, dy ? box.h / 2 / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export function normRect(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function inside(r: Rect, p: Pt): boolean {
  return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h;
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) {
    ctx.lineTo(pts[0].x + 0.01, pts[0].y);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function badge(ctx: CanvasRenderingContext2D, p: Pt, n: number, color: string, s: number) {
  const r = SIZE.badge * s;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6 * s;
  ctx.shadowOffsetY = 1.5 * s;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${SIZE.font * s}px "Inter", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), p.x, p.y + 0.5 * s);
}

function arrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, s: number, gap = SIZE.badge * s) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const head = 18 * s;
  const start = { x: a.x + Math.cos(ang) * gap, y: a.y + Math.sin(ang) * gap };
  const neck = { x: b.x - Math.cos(ang) * head * 0.8, y: b.y - Math.sin(ang) * head * 0.8 };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 4 * s;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = SIZE.arrow * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(neck.x, neck.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(ang - 0.45) * head, b.y - Math.sin(ang - 0.45) * head);
  ctx.lineTo(b.x - Math.cos(ang + 0.45) * head, b.y - Math.sin(ang + 0.45) * head);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function callout(ctx: CanvasRenderingContext2D, sh: Extract<Shape, { kind: "callout" }>, s: number, boxHidden: boolean) {
  const { lines, box } = calloutLayout(sh.text, sh.a, s);
  const edge = boxEdge(box, sh.b);
  const inBox = sh.b.x >= box.x && sh.b.x <= box.x + box.w && sh.b.y >= box.y && sh.b.y <= box.y + box.h;
  if (!inBox && Math.hypot(sh.b.x - edge.x, sh.b.y - edge.y) > 14 * s) arrow(ctx, edge, sh.b, sh.color, s, 0);
  if (boxHidden) return;
  ctx.save();
  ctx.shadowColor = "rgba(7,4,116,0.25)";
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, CALLOUT.radius * s);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = CALLOUT.border * s;
  ctx.strokeStyle = sh.color;
  ctx.stroke();
  ctx.fillStyle = "#15162b";
  ctx.font = CALLOUT_FONT(CALLOUT.font * s);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) =>
    ctx.fillText(l, box.x + CALLOUT.padX * s, box.y + CALLOUT.padY * s + (i + 0.5) * CALLOUT.lineH * s),
  );
}

/** `boxHidden`: draw a comment's arrow only, while its text is being typed. */
export function drawShape(ctx: CanvasRenderingContext2D, sh: Shape, s: number, boxHidden = false) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (sh.kind) {
    case "highlight":
      // Multiply keeps the text under the marker readable.
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.highlight * s;
      ctx.lineCap = "butt";
      smoothPath(ctx, sh.pts);
      ctx.stroke();
      break;
    case "pen":
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.pen * s;
      smoothPath(ctx, sh.pts);
      ctx.stroke();
      break;
    case "line":
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.line * s;
      ctx.beginPath();
      ctx.moveTo(sh.a.x, sh.a.y);
      ctx.lineTo(sh.b.x, sh.b.y);
      ctx.stroke();
      break;
    case "arrow": {
      const len = Math.hypot(sh.b.x - sh.a.x, sh.b.y - sh.a.y);
      if (len > (SIZE.badge + 12) * s) arrow(ctx, sh.a, sh.b, sh.color, s);
      badge(ctx, sh.a, sh.n, sh.color, s);
      break;
    }
    case "callout":
      callout(ctx, sh, s, boxHidden);
      break;
  }
  ctx.restore();
}

/** Draw the screen, the dimmed surroundings and the annotations. */
export function render(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sel: Rect | null,
  shapes: Shape[],
  s: number,
  editing: number | null = null,
) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.fillStyle = "rgba(7, 4, 116, 0.42)"; // Ink Navy
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  if (sel) ctx.rect(sel.x, sel.y, sel.w, sel.h);
  ctx.fill("evenodd");
  ctx.restore();

  if (!sel) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(sel.x, sel.y, sel.w, sel.h);
  ctx.clip();
  shapes.forEach((sh, i) => drawShape(ctx, sh, s, i === editing));
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * s;
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
  ctx.restore();
}

/** The selection with annotations as raw RGBA, prefixed by width and height
 *  (u32 little-endian). Much faster than PNG encoding in the browser; the core
 *  puts it on the clipboard at once and writes the PNG file itself. */
export function exportRgba(img: CanvasImageSource, sel: Rect, shapes: Shape[], s: number): Uint8Array {
  const w = Math.max(1, Math.round(sel.w));
  const h = Math.max(1, Math.round(sel.h));
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(-Math.round(sel.x), -Math.round(sel.y));
  ctx.drawImage(img, 0, 0);
  for (const sh of shapes) drawShape(ctx as unknown as CanvasRenderingContext2D, sh, s);
  const px = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(8 + px.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, w, true);
  dv.setUint32(4, h, true);
  out.set(px, 8);
  return out;
}
