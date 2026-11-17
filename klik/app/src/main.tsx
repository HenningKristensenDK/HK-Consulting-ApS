import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./styles.css";

// Canvas text (step numbers) only uses Inter once it is loaded.
document.fonts.load('700 16px "Inter"').catch(() => {});

createRoot(document.getElementById("root")!).render(<Overlay />);
