import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import { Studio } from "./content/Studio";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { inTauri } from "./bridge";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow-semi-condensed/700.css";
import "./styles.css";
import "./content/studio.css";

// Canvas text (step numbers) only uses Inter once it is loaded.
document.fonts.load('700 16px "Inter"').catch(() => {});

// One page serves both windows: the capture overlay and the content maker.
function windowLabel(): string {
  if (!inTauri) return "";
  try {
    return getCurrentWindow().label;
  } catch {
    return "";
  }
}
const isStudio = new URLSearchParams(location.search).has("studio") || windowLabel() === "studio";

if (isStudio) document.documentElement.classList.add("studio-page");

createRoot(document.getElementById("root")!).render(isStudio ? <Studio /> : <Overlay />);
