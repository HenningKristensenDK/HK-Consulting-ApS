// Draws one content slide onto a canvas at full export size.
// Brand: rtpm-brand-system (main) + brand-guide.md / brand-tokens.json, handoff 2026-11-15 rev 2.
// Phone floors on 1080 px wide canvases: headline 96 px, body 36 px, any label 30 px.

export type Format = "4x5" | "16x9";
export type Kind = "cover" | "shot" | "text" | "closer";

export type Slide = {
  id: string;
  kind: Kind;
  tag: string;
  headline: string;
  /** Words from the headline shown in the one highlight colour. Empty = none. */
  highlight: string;
  body: string;
  /** File name in Pictures\Klik (shot slides). */
  shot?: string;
};

export type Profile = { name: string; role: string; photo: string | null };

export type Assets = {
  shots: Map<string, ImageBitmap>;
  photo: ImageBitmap | null;
  logoWhite: HTMLImageElement | ImageBitmap | null;
};

export const SIZE: Record<Format, { w: number; h: number }> = {
  "4x5": { w: 1080, h: 1350 },
  "16x9": { w: 1920, h: 1080 },
};

const C = {
  navy: "#070474",
  indigo: "#0D08D2",
  gold: "#FFCC00",
  ink: "#15162B",
  paper: "#F7F7FB",
  card: "#FFFFFF",
  border: "#E6E6F0",
  tint: "#E7E6FA",
  sec: "#595B78",
  muted: "#8A8CA6",
  onNavy: "#CFCEFF",
  chip: "#100C8A",
  chipLine: "#2A2790",
};
const DISPLAY = '"Barlow Semi Condensed"';
const TEXT = '"Inter"';

const FLOOR = { headline: 96, body: 36, label: 30 };

export type Issue = { level: "warn" | "stop"; text: string };

type Word = { t: string; hi: boolean };

function words(text: string, highlight: string): Word[][] {
  // Returns paragraphs (split on \n) of words, flagged when inside the highlight span.
  const hiStart = highlight.trim() ? text.indexOf(highlight.trim()) : -1;
  const hiEnd = hiStart >= 0 ? hiStart + highlight.trim().length : -1;
  const out: Word[][] = [];
  let pos = 0;
  for (const para of text.split("\n")) {
    const line: Word[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(para))) {
      const s = pos + m.index;
      const e = s + m[0].length;
      line.push({ t: m[0], hi: hiStart >= 0 && s >= hiStart && e <= hiEnd + 1 });
    }
    out.push(line);
    pos += para.length + 1;
  }
  return out;
}

type Laid = { lines: Word[][]; size: number; lineH: number; overflow: boolean };

function layout(
  g: CanvasRenderingContext2D,
  paras: Word[][],
  font: (px: number) => string,
  maxW: number,
  maxH: number,
  maxSize: number,
  minSize: number,
  lh: number,
): Laid {
  let best: Laid | null = null;
  for (let size = maxSize; size >= minSize; size -= 2) {
    g.font = font(size);
    const space = g.measureText(" ").width;
    const lines: Word[][] = [];
    let tooWide = false;
    for (const p of paras) {
      let cur: Word[] = [];
      let w = 0;
      for (const wd of p) {
        const ww = g.measureText(wd.t).width;
        if (ww > maxW) tooWide = true;
        if (cur.length && w + space + ww > maxW) {
          lines.push(cur);
          cur = [wd];
          w = ww;
        } else {
          w += (cur.length ? space : 0) + ww;
          cur.push(wd);
        }
      }
      lines.push(cur);
    }
    const lineH = size * lh;
    const fits = !tooWide && lines.length * lineH <= maxH;
    best = { lines, size, lineH, overflow: !fits };
    if (fits) return best;
  }
  return best!;
}

function drawLaid(
  g: CanvasRenderingContext2D,
  l: Laid,
  font: (px: number) => string,
  x: number,
  y: number,
  color: string,
  hiColor: string,
): number {
  g.font = font(l.size);
  g.textBaseline = "alphabetic";
  const space = g.measureText(" ").width;
  l.lines.forEach((line, i) => {
    let cx = x;
    const by = y + l.lineH * i + l.size * 0.86;
    for (const wd of line) {
      g.fillStyle = wd.hi ? hiColor : color;
      g.fillText(wd.t, cx, by);
      cx += g.measureText(wd.t).width + space;
    }
  });
  return y + l.lines.length * l.lineH;
}

function block(
  g: CanvasRenderingContext2D,
  issues: Issue[],
  label: string,
  text: string,
  hi: string,
  o: { family: string; weight: number; x: number; y: number; w: number; h: number; max: number; min: number; lh: number; color: string; hiColor?: string },
): number {
  if (!text.trim()) return o.y;
  const font = (px: number) => `${o.weight} ${px}px ${o.family}`;
  const l = layout(g, words(text, hi), font, o.w, o.h, o.max, o.min, o.lh);
  if (l.overflow) issues.push({ level: "stop", text: `${label} er for lang til at kunne læses på en telefon. Forkort den.` });
  return drawLaid(g, l, font, o.x, o.y, o.color, o.hiColor ?? o.color);
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, weight = 600, upper = true) {
  if (!text.trim()) return;
  g.font = `${weight} ${FLOOR.label}px ${TEXT}`;
  g.fillStyle = color;
  g.textBaseline = "top";
  const t = upper ? text.toUpperCase() : text;
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = upper ? "2px" : "0px";
  g.fillText(t, x, y);
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Screenshot on a white card, radius 14, "raised" shadow, fitted inside the box. */
function shotCard(g: CanvasRenderingContext2D, img: ImageBitmap | undefined, x: number, y: number, w: number, h: number, center = false) {
  const pad = 16;
  let cw = w;
  let ch = h;
  if (img) {
    const s = Math.min((w - 2 * pad) / img.width, (h - 2 * pad) / img.height);
    cw = img.width * s + 2 * pad;
    ch = img.height * s + 2 * pad;
  }
  const cx = x + (w - cw) / 2;
  const cy = center ? y + (h - ch) / 2 : y;
  g.save();
  g.shadowColor = "rgba(21,22,43,0.08)";
  g.shadowBlur = 16;
  g.shadowOffsetY = 4;
  g.fillStyle = C.card;
  roundRect(g, cx, cy, cw, ch, 14);
  g.fill();
  g.restore();
  g.strokeStyle = C.border;
  g.lineWidth = 2;
  roundRect(g, cx, cy, cw, ch, 14);
  g.stroke();
  if (img) {
    g.save();
    roundRect(g, cx + pad, cy + pad, cw - 2 * pad, ch - 2 * pad, 8);
    g.clip();
    g.drawImage(img, cx + pad, cy + pad, cw - 2 * pad, ch - 2 * pad);
    g.restore();
  } else {
    g.fillStyle = C.muted;
    g.font = `500 ${FLOOR.label}px ${TEXT}`;
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillText("Vælg et skærmbillede", cx + cw / 2, cy + ch / 2);
    g.textAlign = "left";
  }
}

function chip(g: CanvasRenderingContext2D, p: Profile, photo: ImageBitmap | null, x: number, y: number, w: number) {
  const h = 170;
  g.fillStyle = C.chip;
  roundRect(g, x, y, w, h, 24);
  g.fill();
  g.strokeStyle = C.chipLine;
  g.lineWidth = 2;
  roundRect(g, x, y, w, h, 24);
  g.stroke();
  const d = 120;
  const px = x + 20;
  const py = y + (h - d) / 2;
  g.save();
  g.beginPath();
  g.arc(px + d / 2, py + d / 2, d / 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = C.tint;
  g.fillRect(px, py, d, d);
  if (photo) {
    // Cover-fit, biased to the top so a portrait shows the face.
    const s = Math.max(d / photo.width, d / (photo.height * 0.62));
    const iw = photo.width * s;
    g.drawImage(photo, px + (d - iw) / 2, py - photo.height * s * 0.08, iw, photo.height * s);
  } else {
    const ini = p.name.split(/\s+/).map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();
    g.fillStyle = C.navy;
    g.font = `700 40px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(ini, px + d / 2, py + d / 2 + 2);
    g.textAlign = "left";
  }
  g.restore();
  const tx = px + d + 24;
  const tw = x + w - tx - 20;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#FFFFFF";
  g.font = `700 34px ${TEXT}`;
  g.fillText(fit(g, p.name, tw), tx, y + 58);
  g.fillStyle = C.onNavy;
  g.font = `400 ${FLOOR.label}px ${TEXT}`;
  // Role wraps onto a second line instead of being cut off.
  // Break between " · " parts when the role has them, else between words.
  const sep = p.role.includes(" · ") ? " · " : " ";
  const parts = p.role.split(sep);
  let l1 = "";
  let i = 0;
  for (; i < parts.length; i++) {
    const t = l1 ? `${l1}${sep}${parts[i]}` : parts[i];
    if (g.measureText(t).width > tw && l1) break;
    l1 = t;
  }
  const l2 = parts.slice(i).join(sep);
  g.fillText(l1, tx, y + 100);
  if (l2) g.fillText(fit(g, l2, tw), tx, y + 138);
}

function fit(g: CanvasRenderingContext2D, t: string, w: number): string {
  if (g.measureText(t).width <= w) return t;
  let s = t;
  while (s.length > 1 && g.measureText(s + "…").width > w) s = s.slice(0, -1);
  return s + "…";
}

function logo(g: CanvasRenderingContext2D, img: Assets["logoWhite"], x: number, bottom: number, w: number) {
  if (!img) return;
  const h = (w * 52) / 259;
  g.drawImage(img, x, bottom - h, w, h);
}

function pageNo(g: CanvasRenderingContext2D, n: number, total: number, x: number, y: number) {
  label(g, `${n} of ${total}`, x, y, C.muted, 500, false);
}

/** Brand checks that do not depend on drawing. */
export function textIssues(s: Slide): Issue[] {
  const out: Issue[] = [];
  const all = `${s.tag} ${s.headline} ${s.body}`;
  if (/[\u2014]/.test(all)) out.push({ level: "stop", text: "Ingen tankestreger (—). Brug punktum eller komma." });
  if (s.highlight.trim() && !s.headline.includes(s.highlight.trim()))
    out.push({ level: "stop", text: "Fremhævningen skal være ord fra overskriften." });
  if (s.highlight.trim().split(/\s+/).length > 4) out.push({ level: "warn", text: "Fremhæv højst 4 ord." });
  const n = s.headline.trim() ? s.headline.trim().split(/\s+/).length : 0;
  if (n && (n < 4 || n > 8)) out.push({ level: "warn", text: `Overskriften har ${n} ord. Sigt efter 5 til 7.` });
  const bw = s.body.trim() ? s.body.trim().split(/\s+/).length : 0;
  if (bw > 25 && s.kind !== "cover") out.push({ level: "warn", text: `Teksten har ${bw} ord. Højst 25 på en slide.` });
  if (/\d/.test(`${s.headline} ${s.body}`))
    out.push({ level: "warn", text: "Tal skal komme fra godkendt kilde. Ukendt tal = [placeholder]." });
  if (/https?:\/\/|www\.|\.dk\b|\.com\b/i.test(all)) out.push({ level: "stop", text: "Ingen links på slides. Links hører til i opslagets tekst." });
  if (/\bAI-powered\b|\bunik\b|\bunique\b/i.test(s.headline)) out.push({ level: "stop", text: "Undgå “AI-powered” og “unik” i overskrifter." });
  return out;
}

export function drawSlide(
  g: CanvasRenderingContext2D,
  fmt: Format,
  s: Slide,
  index: number,
  total: number,
  p: Profile,
  a: Assets,
): Issue[] {
  const issues: Issue[] = textIssues(s);
  const { w: W, h: H } = SIZE[fmt];
  const dark = s.kind === "cover" || s.kind === "closer";
  const hiColor = dark ? C.gold : C.indigo;
  g.clearRect(0, 0, W, H);
  g.fillStyle = dark ? C.navy : C.paper;
  g.fillRect(0, 0, W, H);

  if (fmt === "4x5") {
    const M = 88;
    const CW = W - 2 * M;
    const SAFE = 1170;
    if (s.kind === "cover") {
      label(g, s.tag, M, M, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 250, w: CW, h: 420, max: 116, min: FLOOR.headline, lh: 1.05, color: "#FFFFFF", hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 48, w: CW, h: 170, max: 36, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      chip(g, p, a.photo, M, Math.max(y + 60, 860), CW);
      g.font = `600 ${FLOOR.label}px ${TEXT}`;
      g.fillStyle = "#FFFFFF";
      g.textBaseline = "top";
      g.fillText("Swipe", M, 1110);
      g.fillStyle = C.gold;
      g.font = `600 34px ${TEXT}`;
      g.fillText("→", M + g.measureText("Swipe ").width + 6, 1106);
    } else if (s.kind === "closer") {
      label(g, s.tag, M, M, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 200, w: CW, h: 330, max: 104, min: FLOOR.headline, lh: 1.08, color: "#FFFFFF", hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 40, w: CW, h: 170, max: 36, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      chip(g, p, a.photo, M, Math.max(y + 60, 700), CW);
      logo(g, a.logoWhite, M, SAFE - 10, 300);
    } else {
      label(g, s.tag, M, M, C.sec);
      const top = s.tag.trim() ? M + 64 : M;
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: top, w: CW, h: s.kind === "shot" ? 230 : 440, max: 100, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 28, w: CW, h: s.kind === "shot" ? 120 : 420, max: 36, min: FLOOR.body, lh: 1.5, color: C.sec });
      if (s.kind === "shot") {
        const cy = y + 44;
        shotCard(g, s.shot ? a.shots.get(s.shot) : undefined, M, cy, CW, SAFE - cy);
      }
      pageNo(g, index + 1, total, M, 1200);
    }
  } else {
    const M = 104;
    if (s.kind === "cover" || s.kind === "closer") {
      const tw = W * 0.62 - M;
      label(g, s.tag, M, M, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 220, w: tw, h: 400, max: 132, min: FLOOR.headline, lh: 1.05, color: "#FFFFFF", hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 40, w: tw, h: 160, max: 40, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      chip(g, p, a.photo, M, H - M - 170, 820);
      if (s.kind === "closer") logo(g, a.logoWhite, W - M - 300, H - M, 300);
    } else {
      // Horizontal division: text zone left 40 %, screenshot zone right 60 %.
      const tw = W * 0.4 - M - 24;
      label(g, s.tag, M, M, C.sec);
      const top = s.tag.trim() ? M + 64 : M;
      const full = s.kind === "text";
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: top, w: full ? W - 2 * M : tw, h: full ? 420 : 520, max: full ? 120 : 100, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 32, w: full ? W * 0.6 : tw, h: H - y - 32 - M - 60, max: 36, min: FLOOR.body, lh: 1.5, color: C.sec });
      if (s.kind === "shot") {
        const sx = W * 0.4 + 24;
        shotCard(g, s.shot ? a.shots.get(s.shot) : undefined, sx, M, W - M - sx, H - 2 * M, true);
      }
      pageNo(g, index + 1, total, M, H - M - 30);
    }
  }
  return issues;
}

/** Waits for the brand fonts so canvas text never falls back. */
export async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`700 100px ${DISPLAY}`),
    document.fonts.load(`400 36px ${TEXT}`),
    document.fonts.load(`500 30px ${TEXT}`),
    document.fonts.load(`600 30px ${TEXT}`),
    document.fonts.load(`700 34px ${TEXT}`),
  ]).catch(() => {});
}
