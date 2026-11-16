// Content maker <-> Rust core. In a plain browser (dev/test) it uses demo screenshots.

import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "../bridge";

export type Capture = { name: string; modified: number };

export async function listCaptures(): Promise<Capture[]> {
  if (inTauri) return invoke<Capture[]>("list_captures");
  return [
    { name: "Klik demo register.png", modified: Date.now() },
    { name: "Klik demo item.png", modified: Date.now() - 60_000 },
  ];
}

export async function readCapture(name: string): Promise<Blob> {
  if (!inTauri) return demoImage(name);
  const buf = await invoke<ArrayBuffer>("read_capture", { name });
  return new Blob([buf], { type: "image/png" });
}

/** Writes one export file to Documents\Klik\Opslag\<folder>\<file>. Returns the folder path. */
export async function saveExport(folder: string, file: string, bytes: Uint8Array): Promise<string> {
  if (!inTauri) {
    const w = window as unknown as { __exports?: { folder: string; file: string; size: number }[] };
    (w.__exports ??= []).push({ folder, file, size: bytes.length });
    return `demo/${folder}`;
  }
  return invoke<string>("save_export", bytes, {
    headers: { "x-folder": encodeURIComponent(folder), "x-file": encodeURIComponent(file) },
  });
}

export const openExports = (folder: string) => (inTauri ? invoke("open_exports", { folder }) : Promise.resolve());

/** Fake product screens so the content maker can be developed in a browser. */
async function demoImage(name: string): Promise<Blob> {
  const w = 1600;
  const h = 1000;
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.fillStyle = "#F7F7FB";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#070474";
  g.fillRect(0, 0, 260, h);
  g.fillStyle = "#FFFFFF";
  g.fillRect(300, 40, w - 340, h - 80);
  g.fillStyle = "#15162B";
  g.font = "600 34px Inter, sans-serif";
  g.fillText(name.includes("item") ? "IF-0142 Cable entry detail" : "Interface register", 340, 110);
  g.font = "400 24px Inter, sans-serif";
  g.fillStyle = "#595B78";
  const rows = ["IF-0139  Foundation bolts   Owner: Contractor A   Done", "IF-0141  J-tube interface  Owner: Contractor B   Medium", "IF-0142  Cable entry detail  Owner: Contractor B   High", "IF-0145  Transition piece  Owner: Contractor A   Low"];
  rows.forEach((r, i) => {
    g.fillStyle = i % 2 ? "#FFFFFF" : "#FAFAFD";
    g.fillRect(340, 160 + i * 90, w - 420, 80);
    g.fillStyle = "#15162B";
    g.fillText(r, 360, 210 + i * 90);
  });
  g.fillStyle = "#FFCC00";
  g.fillRect(340, 560, 200, 60);
  g.fillStyle = "#15162B";
  g.font = "600 26px Inter, sans-serif";
  g.fillText("Approve", 385, 600);
  g.fillStyle = "#8A8CA6";
  g.font = "500 20px Inter, sans-serif";
  g.fillText("Sample data", 340, h - 70);
  return c.convertToBlob({ type: "image/png" });
}

export type ClaudeDraft = { file: string; title: string; modified: number; deck: string };

/** Decks Claude wrote to the Klik inbox (```klik-deck block in a handoff). */
export async function listClaudeDrafts(): Promise<ClaudeDraft[]> {
  if (inTauri) return invoke<ClaudeDraft[]>("list_claude_drafts");
  return [
    {
      file: "2026-11-16 0900 - klik-deck-interface-register.md",
      title: "Klik deck: one record per interface",
      modified: Date.now(),
      deck: JSON.stringify({
        format: "4x5",
        title: "One record per interface",
        angle: "Project directors on offshore wind packages who chase interface status by email",
        slides: [
          { kind: "cover", tag: "Interface management", headline: "Stop chasing interface status by email", highlight: "by email", body: "What one shared record looks like in practice." },
          { kind: "shot", shot: "Klik demo register.png", tag: "", headline: "Every interface has one owner", highlight: "", body: "Each row names the owner on each side and the need-by date." },
          { kind: "shot", shot: "Klik demo item.png", tag: "", headline: "The answer lives on the item", highlight: "", body: "No thread to search. The reply, the drawing and the decision sit together." },
          { kind: "closer", tag: "", headline: "Recognise this on your project?", highlight: "on your project?", body: "Comment “register” and I’ll send you the template." },
        ],
      }),
    },
  ];
}
