// Klik Content: turn Klik screenshots into a 4:5 LinkedIn carousel or a 16:9
// presentation (demo or user slideshow), in RTPM brand, exported as PDF + PNG.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoWhiteUrl from "../assets/rtpm-realtime-white.svg";
import { DEFAULT_PROFILE, drawSlide, loadFonts, SIZE, textIssues, type Assets, type Format, type Issue, type Kind, type Profile, type Slide } from "./render";
import { listCaptures, listClaudeDrafts, openExports, readCapture, type Capture, type ClaudeDraft } from "./io";
import { exportDeck } from "./export";

const STORE = "klik-content-v1";

const uid = () => Math.random().toString(36).slice(2, 9);

const KIND_LABEL: Record<Kind, string> = {
  cover: "Forside",
  shot: "Skærmbillede",
  rule: "Regel",
  text: "Tekst",
  closer: "Afslutning",
};

function blank(kind: Kind, shot?: string): Slide {
  switch (kind) {
    case "cover":
      return { id: uid(), kind, tag: "[Topic]", headline: "[Headline, 5 to 7 words]", highlight: "", body: "[One line: who this is for]" };
    case "closer":
      return { id: uid(), kind, tag: "", headline: "Recognise this on your project?", highlight: "on your project?", body: "[One low-friction offer line]" };
    case "text":
      return { id: uid(), kind, tag: "", headline: "[One idea per slide]", highlight: "", body: "[Max 25 words]" };
    case "rule":
      return { id: uid(), kind, tag: "", headline: "[The rule, 5 to 7 words]", highlight: "", body: "[Why it holds, max 25 words]", bodyHighlight: "", inPractice: "[What it looks like in the reader's own tools]" };
    default:
      return { id: uid(), kind, tag: "", headline: "[What this screen shows]", highlight: "", body: "", shot };
  }
}

type Saved = { fmt: Format; title: string; slides: Slide[]; profile: Profile; angle?: string };

const KINDS: Kind[] = ["cover", "shot", "rule", "text", "closer"];

type RawSlide = Partial<Slide> & { body_highlight?: string; in_practice?: string };

/** The profile wording before the V2 template, replaced on load so old decks get the website wording. */
const OLD_ROLE = "Project Management · Digital Execution · Offshore Wind";

function withDefaults(p: Partial<Profile> | undefined): Profile {
  const role = !p?.role || p.role === OLD_ROLE ? DEFAULT_PROFILE.role : p.role;
  return { ...DEFAULT_PROFILE, ...p, role, experience: p?.experience ?? DEFAULT_PROFILE.experience, photo: p?.photo ?? null };
}

/** Reads a deck Claude wrote: {format, title, angle, slides:[...]} or a bare slide array. */
function parseDeck(raw: string): { fmt?: Format; title?: string; angle?: string; slides: Slide[] } {
  const m = raw.match(/[\[{][\s\S]*[\]}]/);
  const data = JSON.parse(m ? m[0] : raw) as unknown;
  const obj = (Array.isArray(data) ? { slides: data } : data) as { format?: string; title?: string; angle?: string; slides?: RawSlide[] };
  if (!Array.isArray(obj.slides) || !obj.slides.length) throw new Error("no slides");
  const slides = obj.slides.map((r) => {
    const kind = KINDS.includes(r.kind as Kind) ? (r.kind as Kind) : r.shot ? "shot" : "text";
    return {
      id: r.id ?? uid(),
      kind,
      tag: r.tag ?? "",
      headline: r.headline ?? "",
      highlight: r.highlight ?? "",
      body: r.body ?? "",
      bodyHighlight: r.bodyHighlight ?? r.body_highlight ?? "",
      inPractice: r.inPractice ?? r.in_practice ?? "",
      shot: r.shot,
    } as Slide;
  });
  const fmt = obj.format === "16x9" || obj.format === "16:9" ? "16x9" : obj.format === "4x5" || obj.format === "4:5" ? "4x5" : undefined;
  return { fmt, title: obj.title, angle: obj.angle, slides };
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "");
    if (s && Array.isArray(s.slides)) return { ...s, profile: withDefaults(s.profile) };
  } catch {
    /* first run */
  }
  return {
    fmt: "4x5",
    title: "Nyt opslag",
    slides: [blank("cover"), blank("closer")],
    profile: withDefaults(undefined),
  };
}

async function bitmapFromDataUrl(url: string): Promise<ImageBitmap> {
  const b = await (await fetch(url)).blob();
  return createImageBitmap(b);
}

export function Studio() {
  const init = useMemo(load, []);
  const [fmt, setFmt] = useState<Format>(init.fmt);
  const [title, setTitle] = useState(init.title);
  const [slides, setSlides] = useState<Slide[]>(init.slides);
  const [profile, setProfile] = useState<Profile>(init.profile);
  const [sel, setSel] = useState(init.slides[0]?.id ?? "");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [angle, setAngle] = useState(init.angle ?? "");
  const [drafts, setDrafts] = useState<ClaudeDraft[]>([]);
  const assets = useRef<Assets>({ shots: new Map(), photo: null, logoWhite: null });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [, bump] = useState(0);

  // Persist the deck so closing the window never loses work.
  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify({ fmt, title, slides, profile, angle } satisfies Saved));
  }, [fmt, title, slides, profile, angle]);

  const refresh = useCallback(async () => {
    const list = await listCaptures();
    setCaptures(list);
    listClaudeDrafts().then(setDrafts).catch(() => setDrafts([]));
    for (const c of list) {
      if (assets.current.shots.has(c.name)) continue;
      const blob = await readCapture(c.name);
      assets.current.shots.set(c.name, await createImageBitmap(blob));
      const url = URL.createObjectURL(blob);
      setThumbs((t) => ({ ...t, [c.name]: url }));
    }
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    (async () => {
      await loadFonts();
      const img = new Image();
      img.src = logoWhiteUrl;
      await img.decode().catch(() => {});
      assets.current.logoWhite = img;
      if (init.profile.photo) assets.current.photo = await bitmapFromDataUrl(init.profile.photo).catch(() => null);
      await refresh();
      // Shots referenced by a saved deck but no longer in the recent list.
      for (const s of init.slides) {
        if (s.shot && !assets.current.shots.has(s.shot)) {
          try {
            assets.current.shots.set(s.shot, await createImageBitmap(await readCapture(s.shot)));
          } catch {
            /* file was deleted */
          }
        }
      }
      setReady(true);
    })();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [init, refresh]);

  const current = slides.find((s) => s.id === sel) ?? slides[0];
  const index = slides.findIndex((s) => s.id === current?.id);

  // Redraw the preview on every change.
  useEffect(() => {
    if (!ready || !current || !canvas.current) return;
    const c = canvas.current;
    const { w, h } = SIZE[fmt];
    c.width = w;
    c.height = h;
    setIssues(drawSlide(c.getContext("2d")!, fmt, slides, index, profile, assets.current));
  }, [ready, current, index, slides, fmt, profile]);

  const update = (patch: Partial<Slide>) => setSlides((all) => all.map((s) => (s.id === current.id ? { ...s, ...patch } : s)));

  const insertBeforeCloser = (s: Slide) => {
    setSlides((all) => {
      const at = all.findIndex((x) => x.kind === "closer");
      const next = [...all];
      next.splice(at < 0 ? next.length : at, 0, s);
      return next;
    });
    setSel(s.id);
  };

  const move = (d: -1 | 1) =>
    setSlides((all) => {
      const i = all.findIndex((s) => s.id === current.id);
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = () => {
    if (slides.length <= 1) return;
    const i = slides.findIndex((s) => s.id === current.id);
    const next = slides.filter((s) => s.id !== current.id);
    setSlides(next);
    setSel(next[Math.max(0, i - 1)].id);
  };

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    const bmp = await createImageBitmap(f);
    // Store a small copy (max 400 px) so the deck stays light.
    const s = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await c.convertToBlob({ type: "image/png" });
    const url = await new Promise<string>((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.readAsDataURL(blob);
    });
    assets.current.photo = await createImageBitmap(blob);
    setProfile((p) => ({ ...p, photo: url }));
  };

  const allIssues = useMemo(() => slides.flatMap((s, i) => textIssues(s).map((x) => ({ n: i + 1, ...x }))), [slides]);
  const count = slides.length;
  const lengthWarn = fmt === "4x5" && (count < 6 || count > 9) ? `En karrusel læses bedst med 6 til 9 slides. Du har ${count}.` : "";

  const doExport = async () => {
    setBusy("Eksporterer…");
    setNote("");
    try {
      const r = await exportDeck(fmt, slides, profile, assets.current, title);
      const stops = r.issues.filter((x) => x.issue.level === "stop");
      setNote(`Gemt: ${r.files.length} filer i ${r.folder}${stops.length ? `. ${stops.length} ting skal rettes før du poster.` : ""}`);
      await openExports(r.folder);
    } catch (e) {
      setNote(`Eksport fejlede: ${String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const claudeBrief = () => {
    const shots = slides.filter((s) => s.shot).map((s) => s.shot);
    return [
      `Make a ${fmt === "4x5" ? "4:5 LinkedIn carousel (6 to 9 slides)" : "16:9 presentation for a demo or user walkthrough"} in Klik Content.`,
      `Audience and angle: ${angle.trim() || "[who it is for, and the situation they recognise]"}.`,
      shots.length
        ? `Use these Klik screenshots: ${shots.join(", ")}. Look at each one with klik_get_capture.`
        : "Look at my recent screenshots with klik_list_captures and klik_get_capture, and pick the ones that tell the story.",
      "Story arc: a recognisable project situation, the usual answer, the turn, what they see (one item, one owner), why it holds, the offer.",
      "RTPM brand: sentence case, no em-dashes, headline 5 to 7 words, body max 25 words, one highlight of 1 to 4 words taken from the headline, show do not pitch, no URLs, no unapproved numbers (write [placeholder]), sample data labelled. On my personal posts do not name RTPM. Never describe a customer system unless I say the customer approved it.",
      "Slide kinds: cover (dark: tag names the topic, body names the reader), shot (one screenshot, light), rule (light: one rule, body with one bodyHighlight span, and inPractice saying what the rule looks like in the reader's own tools; numbered automatically), text (light), closer (dark, one question or offer).",
      "One highlight per slide: on a rule slide use bodyHighlight or highlight, not both.",
      "When done, save it with handoff_write. Title starts with \"Klik deck:\". In the text, put the deck in a fenced block marked klik-deck containing JSON:",
      '{"format":"' + fmt + '","title":"...","angle":"...","slides":[{"kind":"cover|shot|rule|text|closer","shot":"file name or omit","tag":"","headline":"","highlight":"","body":"","bodyHighlight":"rule only","inPractice":"rule only"}]}',
      "Then tell me in two lines which angle you chose and why.",
    ].join("\n");
  };

  const applyDeck = (raw: string, from: string) => {
    try {
      const d = parseDeck(raw);
      if (d.fmt) setFmt(d.fmt);
      if (d.title) setTitle(d.title);
      if (d.angle) setAngle(d.angle);
      setSlides(d.slides);
      setSel(d.slides[0].id);
      // Load any screenshot the draft uses that is not loaded yet.
      d.slides.forEach(async (s) => {
        if (s.shot && !assets.current.shots.has(s.shot)) {
          try {
            assets.current.shots.set(s.shot, await createImageBitmap(await readCapture(s.shot)));
            bump((n) => n + 1);
          } catch {
            /* missing file shows as an empty card */
          }
        }
      });
      setNote(`${from}: ${d.slides.length} slides sat ind. Læs dem igennem før du eksporterer.`);
      setReply("");
      setClaudeOpen(false);
    } catch {
      setNote("Kunne ikke læse udkastet. Det skal være JSON med en liste af slides.");
    }
  };

  if (!current) return null;
  const { w, h } = SIZE[fmt];

  return (
    <div className="studio">
      <header className="st-top">
        <div className="st-brand">Klik <span>Content</span></div>
        <input className="st-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Navn på opslaget" />
        <div className="seg" role="tablist" aria-label="Format">
          <button className={fmt === "4x5" ? "on" : ""} onClick={() => setFmt("4x5")}>4:5 karrusel</button>
          <button className={fmt === "16x9" ? "on" : ""} onClick={() => setFmt("16x9")}>16:9 præsentation</button>
        </div>
        <button className="ghost" onClick={() => { setClaudeOpen((o) => !o); refresh(); }}>Claude{drafts.length ? ` (${drafts.length} udkast)` : ""}</button>
        <button className="primary" disabled={!!busy || !ready} onClick={doExport}>{busy || "Eksportér PDF + PNG"}</button>
      </header>

      <aside className="st-shots">
        <div className="st-h">
          <span>Skærmbilleder</span>
          <button className="link" onClick={refresh}>Opdater</button>
        </div>
        <p className="st-hint">Klik på et billede for at lave en slide.</p>
        <div className="shot-grid">
          {captures.map((c) => (
            <button key={c.name} className="shot" title={c.name} onClick={() => insertBeforeCloser(blank("shot", c.name))}>
              {thumbs[c.name] ? <img src={thumbs[c.name]} alt="" /> : <span />}
            </button>
          ))}
          {!captures.length && <p className="st-hint">Ingen skærmbilleder endnu. Tag et med Klik.</p>}
        </div>
      </aside>

      <nav className="st-list">
        <div className="st-h"><span>Slides ({count})</span></div>
        <ol>
          {slides.map((s, i) => (
            <li key={s.id}>
              <button className={s.id === current.id ? "on" : ""} onClick={() => setSel(s.id)}>
                <b>{i + 1}</b>
                <span className="k">{KIND_LABEL[s.kind]}</span>
                <span className="t">{s.headline || "Uden overskrift"}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="ghost sm" onClick={() => insertBeforeCloser(blank("rule"))}>+ Regel</button>
          <button className="ghost sm" onClick={() => insertBeforeCloser(blank("text"))}>+ Tekst</button>
          <button className="ghost sm" onClick={() => move(-1)} aria-label="Flyt op">↑</button>
          <button className="ghost sm" onClick={() => move(1)} aria-label="Flyt ned">↓</button>
          <button className="ghost sm" onClick={remove} aria-label="Slet slide">Slet</button>
        </div>
        {lengthWarn && <p className="warn">{lengthWarn}</p>}

        <div className="st-h"><span>Profil</span></div>
        <label className="fld">Navn<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
        <label className="fld">Titel<input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} /></label>
        <label className="fld">Erfaring (forside)<input value={profile.experience ?? ""} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} /></label>
        <label className="fld">Foto (gemmes kun på denne pc)
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
      </nav>

      <main className="st-main">
        <div className="preview" style={{ aspectRatio: `${w} / ${h}` }}>
          <canvas ref={canvas} />
        </div>
        <section className="edit">
          <div className="row">
            <label className="fld grow">Mærkat<input value={current.tag} onChange={(e) => update({ tag: e.target.value })} placeholder="Valgfri" /></label>
            <label className="fld">Type
              <select value={current.kind} onChange={(e) => update({ kind: e.target.value as Kind })}>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
          </div>
          <label className="fld">Overskrift<textarea rows={2} value={current.headline} onChange={(e) => update({ headline: e.target.value })} /></label>
          <label className="fld">Fremhævning (ord fra overskriften)<input value={current.highlight} onChange={(e) => update({ highlight: e.target.value })} placeholder="Ingen" /></label>
          <label className="fld">Tekst<textarea rows={3} value={current.body} onChange={(e) => update({ body: e.target.value })} /></label>
          {current.kind === "rule" && (
            <>
              <label className="fld">Fremhævning i teksten (ord fra teksten)<input value={current.bodyHighlight ?? ""} onChange={(e) => update({ bodyHighlight: e.target.value })} placeholder="Ingen" /></label>
              <label className="fld">I praksis (sådan ser reglen ud i læserens egne værktøjer)<textarea rows={2} value={current.inPractice ?? ""} onChange={(e) => update({ inPractice: e.target.value })} /></label>
            </>
          )}
          {current.kind === "shot" && (
            <label className="fld">Skærmbillede
              <select value={current.shot ?? ""} onChange={(e) => update({ shot: e.target.value })}>
                {captures.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                {current.shot && !captures.some((c) => c.name === current.shot) && <option value={current.shot}>{current.shot}</option>}
              </select>
            </label>
          )}
          <ul className="issues">
            {issues.map((x, i) => <li key={i} className={x.level}>{x.text}</li>)}
            {!issues.length && <li className="ok">Klar: følger brand-reglerne for telefon.</li>}
          </ul>
          {allIssues.some((x) => x.level === "stop") && (
            <p className="warn">Andre slides skal rettes: {[...new Set(allIssues.filter((x) => x.level === "stop").map((x) => x.n))].join(", ")}.</p>
          )}
        </section>
      </main>

      {claudeOpen && (
        <div className="claude">
          <label className="fld">Målgruppe og vinkel
            <textarea rows={2} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Fx projektdirektører på havvind, der jagter status på interfaces i e-mails" />
          </label>
          <p><b>1.</b> Kopiér briefen og indsæt den i Claude Desktop med Klik-forbindelsen slået til. Claude ser dine skærmbilleder og gemmer et udkast i Klik.</p>
          <div className="row">
            <button className="ghost" onClick={() => navigator.clipboard.writeText(claudeBrief()).then(() => setNote("Briefen er kopieret. Indsæt den i Claude."))}>Kopiér brief til Claude</button>
            <button className="link" onClick={refresh}>Søg efter nye udkast</button>
          </div>
          <p><b>2.</b> Vælg Claudes udkast:</p>
          <ul className="drafts">
            {drafts.map((d) => (
              <li key={d.file}>
                <span>{d.title.replace(/^Klik deck:\s*/i, "")}</span>
                <button className="accent sm" onClick={() => applyDeck(d.deck, "Claudes udkast")}>Brug</button>
              </li>
            ))}
            {!drafts.length && <li className="st-hint">Ingen udkast endnu.</li>}
          </ul>
          <details>
            <summary>Uden Klik-forbindelse: indsæt Claudes svar</summary>
            <textarea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Indsæt JSON fra Claude" />
            <button className="ghost sm" onClick={() => applyDeck(reply, "Indsat svar")} disabled={!reply.trim()}>Brug svaret</button>
          </details>
          <div className="row"><button className="ghost" onClick={() => setClaudeOpen(false)}>Luk</button></div>
        </div>
      )}

      {note && <div className="st-note" role="status">{note}</div>}
    </div>
  );
}
