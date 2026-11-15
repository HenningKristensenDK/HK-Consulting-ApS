// Talks to the Rust core. In a plain browser (dev/test) it uses a demo image.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const inTauri = "__TAURI_INTERNALS__" in window;

export type Shot = { bitmap: ImageBitmap; w: number; h: number };

export async function loadShot(): Promise<Shot> {
  if (!inTauri) return demoShot();
  const buf = await invoke<ArrayBuffer>("get_shot");
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true);
  const h = dv.getUint32(4, true);
  const data = new ImageData(new Uint8ClampedArray(buf, 8, w * h * 4), w, h);
  return { bitmap: await createImageBitmap(data), w, h };
}

export function onCaptured(cb: () => void): () => void {
  if (!inTauri) {
    cb();
    return () => {};
  }
  let off = () => {};
  listen("captured", cb).then((u) => (off = u));
  return () => off();
}

export const showOverlay = () => (inTauri ? invoke("show_overlay") : Promise.resolve());
export const cancel = () => (inTauri ? invoke("cancel") : Promise.resolve());

/** Save + clipboard. Returns the saved path. */
export async function finish(png: Uint8Array): Promise<string> {
  if (inTauri) return invoke<string>("finish", png);
  (window as unknown as { __lastPng?: Uint8Array }).__lastPng = png;
  return "demo.png";
}

/** A fake desktop so the editor can be developed and tested in a browser. */
async function demoShot(): Promise<Shot> {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1e3a5f");
  bg.addColorStop(1, "#0f766e");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // a window
  g.fillStyle = "#ffffff";
  g.fillRect(120, 90, 720, 460);
  g.fillStyle = "#f1f5f9";
  g.fillRect(120, 90, 720, 36);
  g.fillStyle = "#0f172a";
  g.font = "600 15px Segoe UI, system-ui, sans-serif";
  g.fillText("Projektstatus - Vindmøllepark Nord", 140, 113);
  g.font = "14px Segoe UI, system-ui, sans-serif";
  const rows = ["Fundament: 42 af 60 færdige", "Tårne leveret: 18", "Næste milepæl: 1. december", "Risici åbne: 7", "Budget forbrugt: 61 %"];
  rows.forEach((r, i) => g.fillText(r, 150, 170 + i * 34));
  g.fillStyle = "#2563eb";
  g.fillRect(150, 360, 140, 38);
  g.fillStyle = "#fff";
  g.fillText("Godkend", 190, 384);
  g.fillStyle = "rgba(15,23,42,0.85)";
  g.fillRect(0, H - 48, W, 48);
  return { bitmap: c.transferToImageBitmap(), w, h };
}
