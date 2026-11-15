// Shapes and rendering. All coordinates are in image (physical) pixels.

export type Tool = "highlight" | "pen" | "line" | "arrow";
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Shape =
  | { kind: "highlight" | "pen"; color: string; pts: Pt[] }
  | { kind: "line"; color: string; a: Pt; b: Pt }
  | { kind: "arrow"; color: string; a: Pt; b: Pt; n: number };

/** Sizes in CSS pixels; multiplied by the image scale when drawn. */
const SIZE = { pen: 4, line: 4, highlight: 22, arrow: 5, badge: 15, font: 17 };

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
  ctx.font = `700 ${SIZE.font * s}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), p.x, p.y + 0.5 * s);
}

function arrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, s: number) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const head = 18 * s;
  const start = { x: a.x + Math.cos(ang) * SIZE.badge * s, y: a.y + Math.sin(ang) * SIZE.badge * s };
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

export function drawShape(ctx: CanvasRenderingContext2D, sh: Shape, s: number) {
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
) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.fillStyle = "rgba(10, 12, 20, 0.45)";
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
  for (const sh of shapes) drawShape(ctx, sh, s);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * s;
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
  ctx.restore();
}

/** The final image: only the selection, with annotations, no dimming. */
export async function exportPng(img: CanvasImageSource, sel: Rect, shapes: Shape[], s: number): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = Math.round(sel.w);
  c.height = Math.round(sel.h);
  const ctx = c.getContext("2d")!;
  ctx.translate(-Math.round(sel.x), -Math.round(sel.y));
  ctx.drawImage(img, 0, 0);
  for (const sh of shapes) drawShape(ctx, sh, s);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}
