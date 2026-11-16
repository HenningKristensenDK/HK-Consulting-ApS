// Renders every slide at full size and writes a PDF (LinkedIn document post or
// presentation) plus one PNG per slide.

import { PDFDocument } from "pdf-lib";
import { drawSlide, SIZE, type Assets, type Format, type Issue, type Profile, type Slide } from "./render";
import { saveExport } from "./io";

export type ExportResult = { folder: string; files: string[]; issues: { slide: number; issue: Issue }[] };

function canvasBytes(c: HTMLCanvasElement, type: string, q?: number): Promise<Uint8Array> {
  return new Promise((ok, fail) =>
    c.toBlob(async (b) => (b ? ok(new Uint8Array(await b.arrayBuffer())) : fail(new Error("render failed"))), type, q),
  );
}

export function folderName(title: string, fmt: Format): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
  const clean = title.replace(/[\\/:*?"<>|\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 48) || "Opslag";
  return `${stamp} ${clean} ${fmt === "4x5" ? "4x5" : "16x9"}`;
}

export async function exportDeck(fmt: Format, slides: Slide[], profile: Profile, assets: Assets, title: string): Promise<ExportResult> {
  const { w, h } = SIZE[fmt];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor(profile.name);
  pdf.setCreator("Klik Content");
  const folder = folderName(title, fmt);
  const files: string[] = [];
  const issues: ExportResult["issues"] = [];
  let dir = "";
  for (let i = 0; i < slides.length; i++) {
    drawSlide(g, fmt, slides[i], i, slides.length, profile, assets).forEach((issue) => issues.push({ slide: i + 1, issue }));
    const png = await canvasBytes(c, "image/png");
    const name = `${String(i + 1).padStart(2, "0")}.png`;
    dir = await saveExport(folder, name, png);
    files.push(name);
    const jpg = await canvasBytes(c, "image/jpeg", 0.92);
    const img = await pdf.embedJpg(jpg);
    const page = pdf.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  const pdfName = fmt === "4x5" ? "Karrusel.pdf" : "Præsentation.pdf";
  dir = await saveExport(folder, pdfName, await pdf.save());
  files.unshift(pdfName);
  return { folder: dir, files, issues };
}
