import { useCallback, useEffect, useReducer, useRef } from "react";
import { cancel, finish, inTauri, loadShot, onCaptured, showOverlay, type Shot } from "./bridge";
import { exportPng, normRect, render, type Pt, type Rect, type Shape, type Tool } from "./draw";
import { Icon } from "./icons";

type Mode = "idle" | "select" | "edit";

const COLORS = ["#EF4444", "#FFE14D", "#22C55E", "#3B82F6", "#111827"];
const DEFAULT_COLORS: Record<Tool, string> = {
  highlight: "#FFE14D",
  pen: "#EF4444",
  line: "#EF4444",
  arrow: "#EF4444",
};
const TOOLS: { id: Tool; key: string; label: string }[] = [
  { id: "highlight", key: "M", label: "Marker" },
  { id: "arrow", key: "A", label: "Pil med nummer" },
  { id: "pen", key: "P", label: "Frihånd" },
  { id: "line", key: "L", label: "Linje" },
];

export function Overlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shot = useRef<Shot | null>(null);
  const st = useRef({
    mode: "idle" as Mode,
    sel: null as Rect | null,
    shapes: [] as Shape[],
    draft: null as Shape | null,
    start: null as Pt | null,
    tool: "highlight" as Tool,
    colors: { ...DEFAULT_COLORS },
    busy: false,
    toast: "",
  });
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const frame = useRef(0);

  /** Image pixels per CSS pixel. */
  const k = () => {
    const c = canvasRef.current;
    return c && shot.current ? shot.current.w / c.getBoundingClientRect().width : 1;
  };

  const paint = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = canvasRef.current;
      const s = st.current;
      if (!c || !shot.current) return;
      const shapes = s.draft ? [...s.shapes, s.draft] : s.shapes;
      render(c.getContext("2d")!, shot.current.bitmap, s.sel, shapes, k());
    });
  }, []);

  // A new capture arrives: draw it first, then show the window.
  useEffect(
    () =>
      onCaptured(async () => {
        const next = await loadShot();
        shot.current?.bitmap.close();
        shot.current = next;
        const c = canvasRef.current!;
        c.width = next.w;
        c.height = next.h;
        Object.assign(st.current, { mode: "select", sel: null, shapes: [], draft: null, start: null, busy: false, toast: "" });
        render(c.getContext("2d")!, next.bitmap, null, [], k());
        rerender();
        await showOverlay();
      }),
    [],
  );

  const toImg = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    const kk = k();
    return { x: (e.clientX - r.left) * kk, y: (e.clientY - r.top) * kk };
  };

  const done = useCallback(async () => {
    const s = st.current;
    if (s.busy || !s.sel || !shot.current) return;
    s.busy = true;
    const png = await exportPng(shot.current.bitmap, s.sel, s.shapes, k());
    s.mode = "idle";
    s.toast = "Gemt og kopieret";
    rerender();
    await finish(png);
    s.busy = false;
  }, []);

  const abort = useCallback(async () => {
    st.current.mode = "idle";
    rerender();
    await cancel();
  }, []);

  const backToSelect = () => {
    Object.assign(st.current, { mode: "select", sel: null, shapes: [], draft: null, start: null });
    paint();
    rerender();
  };

  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    if (e.button === 2) return backToSelect();
    if (e.button !== 0) return;
    const p = toImg(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
    if (s.mode === "select") {
      s.start = p;
      s.sel = null;
    } else if (s.mode === "edit") {
      const color = s.colors[s.tool];
      if (s.tool === "highlight" || s.tool === "pen") s.draft = { kind: s.tool, color, pts: [p] };
      else if (s.tool === "line") s.draft = { kind: "line", color, a: p, b: p };
      else {
        const n = s.shapes.filter((x) => x.kind === "arrow").length + 1;
        s.draft = { kind: "arrow", color, a: p, b: p, n };
      }
    }
    paint();
  };

  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.mode === "select" && s.start) {
      s.sel = normRect(s.start, toImg(e));
      paint();
      rerender();
    } else if (s.mode === "edit" && s.draft) {
      const p = toImg(e);
      const d = s.draft;
      if (d.kind === "highlight" || d.kind === "pen") {
        // Shift = straight stroke
        if (e.shiftKey) d.pts = [d.pts[0], p];
        else d.pts.push(p);
      } else if (d.kind === "line" || d.kind === "arrow") d.b = p;
      paint();
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.mode === "select" && s.start) {
      const end = toImg(e);
      const r = normRect(s.start, end);
      // A click without a drag takes the whole screen.
      s.sel = r.w < 6 * k() || r.h < 6 * k() ? { x: 0, y: 0, w: shot.current!.w, h: shot.current!.h } : r;
      s.start = null;
      s.mode = "edit";
    } else if (s.mode === "edit" && s.draft) {
      s.shapes = [...s.shapes, s.draft];
      s.draft = null;
    }
    paint();
    rerender();
  };

  const setTool = (t: Tool) => {
    st.current.tool = t;
    rerender();
  };
  const setColor = (c: string) => {
    st.current.colors = { ...st.current.colors, [st.current.tool]: c };
    rerender();
  };
  const undo = () => {
    st.current.shapes = st.current.shapes.slice(0, -1);
    paint();
    rerender();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = st.current;
      if (s.mode === "idle") return;
      const key = e.key.toLowerCase();
      if (key === "escape") {
        e.preventDefault();
        if (s.mode === "edit") done();
        else abort();
      } else if (s.mode !== "edit") return;
      else if (key === "enter" || (e.ctrlKey && key === "c")) done();
      else if (e.ctrlKey && key === "z") undo();
      else if (!e.ctrlKey && !e.altKey) {
        const t = TOOLS.find((x) => x.key.toLowerCase() === key);
        if (t) setTool(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, abort]);

  const s = st.current;
  const kk = k();
  const selCss = s.sel && { x: s.sel.x / kk, y: s.sel.y / kk, w: s.sel.w / kk, h: s.sel.h / kk };

  let bar: React.CSSProperties | undefined;
  if (s.mode === "edit" && selCss) {
    const H = 52;
    let top = selCss.y + selCss.h + 12;
    if (top + H > window.innerHeight - 8) top = selCss.y - H - 12;
    if (top < 8) top = selCss.y + selCss.h - H - 12;
    const center = Math.min(Math.max(selCss.x + selCss.w / 2, 260), window.innerWidth - 260);
    bar = { top, left: center };
  }

  return (
    <div className={`stage mode-${s.mode}`} onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        className="screen"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />

      {s.mode === "select" && !s.start && (
        <div className="hint">
          <b>Træk</b> for at markere &nbsp;·&nbsp; <b>Klik</b> = hele skærmen &nbsp;·&nbsp; <b>Esc</b> = annullér
        </div>
      )}

      {selCss && s.mode !== "idle" && (
        <div className="size" style={{ left: selCss.x, top: Math.max(selCss.y - 28, 4) }}>
          {Math.round(s.sel!.w)} × {Math.round(s.sel!.h)}
        </div>
      )}

      {s.mode === "edit" && bar && (
        <div className="bar" style={bar} onPointerDown={(e) => e.stopPropagation()}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool ${s.tool === t.id ? "on" : ""}`}
              title={`${t.label}  (${t.key})`}
              onClick={() => setTool(t.id)}
            >
              <Icon name={t.id} />
            </button>
          ))}
          <span className="sep" />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${s.colors[s.tool] === c ? "on" : ""}`}
              style={{ background: c }}
              title="Farve"
              onClick={() => setColor(c)}
            />
          ))}
          <span className="sep" />
          <button className="tool" title="Fortryd  (Ctrl+Z)" disabled={!s.shapes.length} onClick={undo}>
            <Icon name="undo" />
          </button>
          <button className="tool" title="Kassér" onClick={abort}>
            <Icon name="close" />
          </button>
          <button className="done" title="Gem og kopiér  (Esc)" onClick={done}>
            <Icon name="check" /> Kopiér <kbd>Esc</kbd>
          </button>
        </div>
      )}

      {!inTauri && s.mode === "idle" && s.toast && <div className="toast">{s.toast}</div>}
    </div>
  );
}
