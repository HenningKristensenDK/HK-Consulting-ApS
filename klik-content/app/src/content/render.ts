// Draws one content slide onto a canvas at full export size.
// Brand: the approved V2 carousel template (brand-guide.md section 5b, Henning 2026-11-16)
// on rtpm-brand-system tokens. Phone floors on 1080 px wide canvases: headline 64 px,
// body 36 px, any label 30 px (brand-tokens.json phone_legibility).

export type Format = "4x5" | "16x9";
export type Kind = "cover" | "shot" | "rule" | "text" | "closer";

export type Slide = {
  id: string;
  kind: Kind;
  tag: string;
  headline: string;
  /** Words from the headline shown in the one highlight colour. Empty = none. */
  highlight: string;
  body: string;
  /** Words from the body shown as the one indigo span (rule slides). Empty = none. */
  bodyHighlight?: string;
  /** What the rule looks like in the reader's own tools (rule slides). */
  inPractice?: string;
  /** File name in Pictures\Klik (shot slides). */
  shot?: string;
};

/** role = the title line under the name. experience = the one-line track record. */
export type Profile = { name: string; role: string; experience?: string; photo: string | null };

export type Assets = {
  shots: Map<string, ImageBitmap>;
  photo: ImageBitmap | null;
  logoWhite: HTMLImageElement | ImageBitmap | null;
};

export const SIZE: Record<Format, { w: number; h: number }> = {
  "4x5": { w: 1080, h: 1350 },
  "16x9": { w: 1920, h: 1080 },
};

/** Same words as the website (brand-tokens.json footer). */
export const DEFAULT_PROFILE: Profile = {
  name: "Henning Kristensen",
  role: "Founder, solution architect and client lead",
  experience: "20+ years in project management, offshore wind and large construction.",
  photo: null,
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
};
const DISPLAY = '"Barlow Semi Condensed"';
const TEXT = '"Inter"';

const FLOOR = { headline: 64, body: 36, label: 30 };

export type Issue = { level: "warn" | "stop"; text: string };

type Word = { t: string; hi: boolean };
type FontFn = (px: number) => string;

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

function layout(g: CanvasRenderingContext2D, paras: Word[][], font: FontFn, hiFont: FontFn, maxW: number, maxH: number, maxSize: number, minSize: number, lh: number): Laid {
  let best: Laid | null = null;
  for (let size = maxSize; size >= minSize; size -= 2) {
    const measure = (wd: Word) => {
      g.font = wd.hi ? hiFont(size) : font(size);
      return g.measureText(wd.t).width;
    };
    g.font = font(size);
    const space = g.measureText(" ").width;
    const lines: Word[][] = [];
    let tooWide = false;
    for (const p of paras) {
      let cur: Word[] = [];
      let w = 0;
      for (const wd of p) {
        const ww = measure(wd);
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

function drawLaid(g: CanvasRenderingContext2D, l: Laid, font: FontFn, hiFont: FontFn, x: number, y: number, color: string, hiColor: string): number {
  g.textBaseline = "alphabetic";
  g.font = font(l.size);
  const space = g.measureText(" ").width;
  l.lines.forEach((line, i) => {
    let cx = x;
    const by = y + l.lineH * i + l.size * 0.86;
    for (const wd of line) {
      g.font = wd.hi ? hiFont(l.size) : font(l.size);
      g.fillStyle = wd.hi ? hiColor : color;
      g.fillText(wd.t, cx, by);
      cx += g.measureText(wd.t).width + space;
    }
  });
  return y + l.lines.length * l.lineH;
}

type BlockOpts = {
  family: string;
  weight: number;
  x: number;
  y: number;
  w: number;
  h: number;
  max: number;
  min: number;
  lh: number;
  color: string;
  hiColor?: string;
  /** Weight of the highlighted words (V2: body span is 600). Defaults to weight. */
  hiWeight?: number;
};

function block(g: CanvasRenderingContext2D, issues: Issue[], what: string, text: string, hi: string, o: BlockOpts): number {
  if (!text.trim()) return o.y;
  const font: FontFn = (px) => `${o.weight} ${px}px ${o.family}`;
  const hiFont: FontFn = (px) => `${o.hiWeight ?? o.weight} ${px}px ${o.family}`;
  const l = layout(g, words(text, hi), font, hiFont, o.w, o.h, o.max, o.min, o.lh);
  if (l.overflow) issues.push({ level: "stop", text: `${what} er for lang til at kunne læses på en telefon. Forkort den.` });
  return drawLaid(g, l, font, hiFont, o.x, o.y, o.color, o.hiColor ?? o.color);
}

function spacing(g: CanvasRenderingContext2D, v: string) {
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = v;
}

/** V2 kicker: Inter 30/600, uppercase, letter-spacing 0.12em. */
function kicker(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = FLOOR.label) {
  if (!text.trim()) return;
  g.font = `600 ${size}px ${TEXT}`;
  g.fillStyle = color;
  g.textBaseline = "top";
  spacing(g, `${(size * 0.12).toFixed(1)}px`);
  g.fillText(text.toUpperCase(), x, y);
  spacing(g, "0px");
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Soft indigo glow toward the upper right on navy (brand-tokens background_glow).
 *  Exact stops are TBD in the brand system; these values are a proposal. */
function glow(g: CanvasRenderingContext2D, W: number, H: number) {
  const r = Math.max(W, H) * 0.8;
  const gr = g.createRadialGradient(W * 0.95, H * 0.02, 0, W * 0.95, H * 0.02, r);
  gr.addColorStop(0, "rgba(13,8,210,0.55)");
  gr.addColorStop(0.45, "rgba(13,8,210,0.18)");
  gr.addColorStop(1, "rgba(13,8,210,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
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

function initials(name: string): string {
  return name.split(/\s+/).map((s) => s[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Headshot on the light ground #F7F7FB. r < 0 draws a circle. Cover-fit, biased to the top. */
function portrait(g: CanvasRenderingContext2D, photo: ImageBitmap | null, name: string, x: number, y: number, w: number, h: number, r: number, bg: string = C.paper) {
  g.save();
  if (r < 0) {
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  } else roundRect(g, x, y, w, h, r);
  g.clip();
  g.fillStyle = bg;
  g.fillRect(x, y, w, h);
  if (photo) {
    const s = Math.max(w / photo.width, h / photo.height);
    const iw = photo.width * s;
    const ih = photo.height * s;
    g.drawImage(photo, x + (w - iw) / 2, y + Math.min(0, (h - ih) * 0.15), iw, ih);
  } else {
    g.fillStyle = C.navy;
    g.font = `700 ${Math.round(Math.min(w, h) * 0.36)}px ${DISPLAY}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(initials(name), x + w / 2, y + h / 2 + 2);
    g.textAlign = "left";
  }
  g.restore();
}

function fit(g: CanvasRenderingContext2D, t: string, w: number): string {
  if (g.measureText(t).width <= w) return t;
  let s = t;
  while (s.length > 1 && g.measureText(s + "…").width > w) s = s.slice(0, -1);
  return s + "…";
}

/** Wraps to at most maxLines; the last line is cut with an ellipsis. Returns the lines. */
function wrap(g: CanvasRenderingContext2D, t: string, w: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const wd of t.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${wd}` : wd;
    if (g.measureText(next).width > w && cur) {
      out.push(cur);
      cur = wd;
    } else cur = next;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) {
    const keep = out.slice(0, maxLines);
    keep[maxLines - 1] = fit(g, out.slice(maxLines - 1).join(" "), w);
    return keep;
  }
  return out;
}

/** Name, title and experience lines beside or under the headshot. Returns the bottom y. */
function profileText(g: CanvasRenderingContext2D, p: Profile, x: number, y: number, w: number, nameSize: number, lineSize: number, expLines = 2): number {
  g.textBaseline = "top";
  g.fillStyle = "#FFFFFF";
  g.font = `700 ${nameSize}px ${TEXT}`;
  g.fillText(fit(g, p.name, w), x, y);
  let cy = y + nameSize * 1.35;
  g.font = `400 ${lineSize}px ${TEXT}`;
  g.fillStyle = C.onNavy;
  for (const l of wrap(g, p.role, w, 2)) {
    g.fillText(l, x, cy);
    cy += lineSize * 1.35;
  }
  if (p.experience?.trim()) {
    cy += lineSize * 0.35;
    g.fillStyle = "#FFFFFF";
    for (const l of wrap(g, p.experience, w, expLines)) {
      g.fillText(l, x, cy);
      cy += lineSize * 1.35;
    }
  }
  return cy;
}

/** V2 profile block (4:5): headshot 168 x 210, radius 18, text beside it. */
function profileBlock(g: CanvasRenderingContext2D, p: Profile, photo: ImageBitmap | null, x: number, y: number, w: number) {
  const pw = 168;
  const ph = 210;
  portrait(g, photo, p.name, x, y, pw, ph, 18);
  profileText(g, p, x + pw + 32, y + 6, w - pw - 32, 36, 30);
}

/** V2 "Swipe →": Barlow Semi Condensed 600, 40 px, light blue, never gold. Right-aligned. */
function swipe(g: CanvasRenderingContext2D, right: number, y: number) {
  g.font = `600 40px ${DISPLAY}`;
  g.fillStyle = C.onNavy;
  g.textBaseline = "top";
  g.textAlign = "right";
  g.fillText("Swipe →", right, y);
  g.textAlign = "left";
}

function logo(g: CanvasRenderingContext2D, img: Assets["logoWhite"], x: number, bottom: number, w: number) {
  if (!img) return;
  const h = (w * 52) / 259;
  g.drawImage(img, x, bottom - h, w, h);
}

/** V2 interior footer: round headshot 72 + name left, page "3/8" indigo right. */
function footer(g: CanvasRenderingContext2D, p: Profile, photo: ImageBitmap | null, n: number, total: number, x: number, right: number, bottom: number) {
  const d = 72;
  const y = bottom - d;
  // Light indigo tint so the circle reads on the #F7F7FB interior ground.
  portrait(g, photo, p.name, x, y, d, d, -1, C.tint);
  g.textBaseline = "middle";
  g.font = `600 ${FLOOR.label}px ${TEXT}`;
  g.fillStyle = C.sec;
  g.fillText(fit(g, p.name, right - x - d - 200), x + d + 20, y + d / 2);
  g.fillStyle = C.indigo;
  g.textAlign = "right";
  g.fillText(`${n}/${total}`, right, y + d / 2);
  g.textAlign = "left";
}

/** Position of a rule slide among the deck's rule slides, for "Rule 1 of 4". */
function ruleNo(slides: Slide[], index: number): { n: number; total: number } {
  const rules = slides.filter((s) => s.kind === "rule");
  return { n: rules.indexOf(slides[index]) + 1, total: rules.length };
}

const countWords = (t: string | undefined) => (t?.trim() ? t.trim().split(/\s+/).length : 0);

/** Brand checks that do not depend on drawing. */
export function textIssues(s: Slide): Issue[] {
  const out: Issue[] = [];
  const all = `${s.tag} ${s.headline} ${s.body} ${s.inPractice ?? ""}`;
  if (/[—]/.test(all)) out.push({ level: "stop", text: "Ingen tankestreger (—). Brug punktum eller komma." });
  if (s.highlight.trim() && !s.headline.includes(s.highlight.trim()))
    out.push({ level: "stop", text: "Fremhævningen skal være ord fra overskriften." });
  if (s.highlight.trim().split(/\s+/).length > 4) out.push({ level: "warn", text: "Fremhæv højst 4 ord." });
  const n = countWords(s.headline);
  if (n && (n < 4 || n > 8)) out.push({ level: "warn", text: `Overskriften har ${n} ord. Sigt efter 5 til 7.` });
  const bw = countWords(s.body);
  if (bw > 25 && s.kind !== "cover") out.push({ level: "warn", text: `Teksten har ${bw} ord. Højst 25 på en slide.` });
  if (s.kind === "rule") {
    if (s.bodyHighlight?.trim() && !s.body.includes(s.bodyHighlight.trim()))
      out.push({ level: "stop", text: "Fremhævningen i teksten skal være ord fra teksten." });
    if (s.highlight.trim() && s.bodyHighlight?.trim())
      out.push({ level: "warn", text: "Én fremhævning pr. slide: vælg overskriften eller teksten." });
    if (!s.inPractice?.trim()) out.push({ level: "warn", text: "En regel-slide skal have \"I praksis\": hvordan reglen ser ud i læserens egne værktøjer." });
    if (countWords(s.inPractice) > 25) out.push({ level: "warn", text: `"I praksis" har ${countWords(s.inPractice)} ord. Højst 25.` });
  }
  if (/\d/.test(`${s.headline} ${s.body} ${s.inPractice ?? ""}`))
    out.push({ level: "warn", text: "Tal skal komme fra godkendt kilde. Ukendt tal = [placeholder]." });
  if (/https?:\/\/|www\.|\.dk\b|\.com\b/i.test(all)) out.push({ level: "stop", text: "Ingen links på slides. Links hører til i opslagets tekst." });
  if (/\bAI-powered\b|\bunik\b|\bunique\b/i.test(s.headline)) out.push({ level: "stop", text: "Undgå “AI-powered” og “unik” i overskrifter." });
  return out;
}

export function drawSlide(g: CanvasRenderingContext2D, fmt: Format, slides: Slide[], index: number, p: Profile, a: Assets): Issue[] {
  const s = slides[index];
  const total = slides.length;
  const issues: Issue[] = textIssues(s);
  const { w: W, h: H } = SIZE[fmt];
  const dark = s.kind === "cover" || s.kind === "closer";
  const hiColor = dark ? C.gold : C.indigo;
  g.clearRect(0, 0, W, H);
  g.fillStyle = dark ? C.navy : C.paper;
  g.fillRect(0, 0, W, H);
  if (dark) glow(g, W, H);
  const rule = s.kind === "rule" ? ruleNo(slides, index) : null;
  const tag = rule && !s.tag.trim() ? `Rule ${rule.n} of ${rule.total}` : s.tag;

  if (fmt === "4x5") {
    const M = 88;
    const TOP = 104;
    const CW = W - 2 * M;
    const SAFE = 1170;
    const BOTTOM = H - M;
    if (s.kind === "cover") {
      kicker(g, tag, M, TOP, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 250, w: CW, h: 380, max: 116, min: FLOOR.headline, lh: 1.04, color: "#FFFFFF", hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 44, w: CW, h: 160, max: 38, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      const py = BOTTOM - 210;
      if (y > py - 90) issues.push({ level: "stop", text: "Forsiden er for fuld. Forkort overskriften eller teksten." });
      swipe(g, W - M, py - 76);
      profileBlock(g, p, a.photo, M, py, CW);
    } else if (s.kind === "closer") {
      kicker(g, tag, M, TOP, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 220, w: CW, h: 330, max: 104, min: FLOOR.headline, lh: 1.08, color: "#FFFFFF", hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 40, w: CW, h: 170, max: 38, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      profileBlock(g, p, a.photo, M, Math.max(y + 64, 700), CW);
      logo(g, a.logoWhite, M, SAFE - 10, 300);
    } else if (s.kind === "rule") {
      kicker(g, tag, M, TOP, C.indigo);
      g.font = `700 170px ${DISPLAY}`;
      g.fillStyle = C.indigo;
      g.textBaseline = "alphabetic";
      g.fillText(String(rule!.n), M - 6, TOP + 60 + 170 * 0.74);
      let y = TOP + 60 + 170 * 0.74 + 36;
      y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y, w: CW, h: 200, max: 88, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      y = block(g, issues, "Teksten", s.body, s.bodyHighlight ?? "", { family: TEXT, weight: 400, x: M, y: y + 28, w: CW, h: 230, max: 38, min: FLOOR.body, lh: 1.45, color: C.ink, hiColor: C.indigo, hiWeight: 600 });
      if (s.inPractice?.trim()) {
        y += 40;
        g.fillStyle = C.border;
        g.fillRect(M, y, CW, 2);
        kicker(g, "In practice", M, y + 28, C.sec);
        y = block(g, issues, "\"I praksis\"", s.inPractice, "", { family: TEXT, weight: 400, x: M, y: y + 28 + 52, w: CW, h: SAFE - (y + 80), max: 36, min: FLOOR.body, lh: 1.45, color: C.ink });
      }
      footer(g, p, a.photo, index + 1, total, M, W - M, BOTTOM);
    } else {
      kicker(g, tag, M, TOP, C.indigo);
      const top = tag.trim() ? TOP + 60 : TOP;
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: top, w: CW, h: s.kind === "shot" ? 200 : 400, max: 88, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      y = block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 28, w: CW, h: s.kind === "shot" ? 120 : 420, max: 38, min: FLOOR.body, lh: 1.45, color: C.ink });
      if (s.kind === "shot") {
        const cy = y + 40;
        shotCard(g, s.shot ? a.shots.get(s.shot) : undefined, M, cy, CW, SAFE - cy);
      }
      footer(g, p, a.photo, index + 1, total, M, W - M, BOTTOM);
    }
  } else {
    const M = 104;
    const BOTTOM = H - M;
    if (s.kind === "cover" || s.kind === "closer") {
      // V2 16:9 cover: text zone left, profile column 500 px right, Swipe under it.
      const colW = 500;
      const colX = W - M - colW;
      const tw = colX - M - 80;
      kicker(g, tag, M, M, C.onNavy);
      let y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: 220, w: tw, h: 440, max: 128, min: FLOOR.headline, lh: 1.04, color: "#FFFFFF", hiColor });
      block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 40, w: tw, h: 170, max: 42, min: FLOOR.body, lh: 1.45, color: C.onNavy });
      portrait(g, a.photo, p.name, colX, M, 240, 300, 18);
      const ty = profileText(g, p, colX, M + 300 + 28, colW, 36, 30, 3);
      if (s.kind === "cover") swipe(g, W - M, Math.max(ty + 24, BOTTOM - 48));
      else logo(g, a.logoWhite, M, BOTTOM, 300);
    } else if (s.kind === "rule") {
      // V2 16:9 rule: left zone 760 px, 2 px divider, right zone body + In practice.
      const lw = 760;
      const dx = M + lw + 56;
      const rx = dx + 2 + 56;
      const rw = W - M - rx;
      kicker(g, tag, M, M, C.indigo);
      g.font = `700 220px ${DISPLAY}`;
      g.fillStyle = C.indigo;
      g.textBaseline = "alphabetic";
      g.fillText(String(rule!.n), M - 8, M + 56 + 220 * 0.74);
      block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: M + 56 + 220 * 0.74 + 40, w: lw, h: 360, max: 104, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      g.fillStyle = C.border;
      g.fillRect(dx, M, 2, BOTTOM - 120 - M);
      let y = block(g, issues, "Teksten", s.body, s.bodyHighlight ?? "", { family: TEXT, weight: 400, x: rx, y: M + 40, w: rw, h: 360, max: 44, min: FLOOR.body, lh: 1.45, color: C.ink, hiColor: C.indigo, hiWeight: 600 });
      if (s.inPractice?.trim()) {
        y += 48;
        g.fillStyle = C.border;
        g.fillRect(rx, y, rw, 2);
        kicker(g, "In practice", rx, y + 32, C.sec);
        block(g, issues, "\"I praksis\"", s.inPractice, "", { family: TEXT, weight: 400, x: rx, y: y + 32 + 56, w: rw, h: BOTTOM - 120 - (y + 88), max: 40, min: FLOOR.body, lh: 1.45, color: C.ink });
      }
      footer(g, p, a.photo, index + 1, total, M, W - M, BOTTOM);
    } else {
      // Text zone left 40 %, screenshot zone right 60 %. Its own layout, never a crop of 4:5.
      const tw = W * 0.4 - M - 24;
      kicker(g, tag, M, M, C.indigo);
      const top = tag.trim() ? M + 64 : M;
      const full = s.kind === "text";
      const y = block(g, issues, "Overskriften", s.headline, s.highlight, { family: DISPLAY, weight: 700, x: M, y: top, w: full ? W - 2 * M : tw, h: full ? 420 : 480, max: full ? 120 : 100, min: FLOOR.headline, lh: 1.06, color: C.ink, hiColor });
      block(g, issues, "Teksten", s.body, "", { family: TEXT, weight: 400, x: M, y: y + 32, w: full ? W * 0.6 : tw, h: BOTTOM - 120 - y - 32, max: 38, min: FLOOR.body, lh: 1.45, color: C.ink });
      if (s.kind === "shot") {
        const sx = W * 0.4 + 24;
        shotCard(g, s.shot ? a.shots.get(s.shot) : undefined, sx, M, W - M - sx, BOTTOM - 110 - M, true);
      }
      footer(g, p, a.photo, index + 1, total, M, W - M, BOTTOM);
    }
  }
  return issues;
}

/** Waits for the brand fonts so canvas text never falls back. */
export async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`700 100px ${DISPLAY}`),
    document.fonts.load(`600 40px ${DISPLAY}`),
    document.fonts.load(`400 36px ${TEXT}`),
    document.fonts.load(`500 30px ${TEXT}`),
    document.fonts.load(`600 30px ${TEXT}`),
    document.fonts.load(`700 34px ${TEXT}`),
  ]).catch(() => {});
}
