# Klik: product specification

Version 0.7, 2026.11.16. Owner: Henning Kristensen (RTPM).
"Klik" is a working name.

This spec records Henning's wishes for a simple screen capture tool that covers the most-used Snagit features with far fewer clicks. Each requirement says where it stands: **Built** (code exists and was tested in a browser, not yet on Windows), **Planned**, or **Open** (a decision is still needed). How the tool gets built is in `PLAN.md`.

## 1. Purpose

Snagit can do a lot, but it has too many buttons and too many clicks per task. Klik keeps only what Henning uses and makes each task as short as possible:

- screenshots with markings, ready to paste
- long scrolling screenshots
- step-by-step guides made from clicks
- screen videos with a visible cursor, voice-over and webcam: demo videos made in the same tool
- Claude writes the text for the steps
- Claude can read Klik's captures and a shared inbox directly, so results move between AI sessions without copy-paste

**Users:** Henning first, then the RTPM team. Possibly external buyers later (see open question Q1).

## 2. Design principles

1. **One hotkey, no dialogs.** Every capture starts from one key. No "save as" windows, no setup screens.
2. **The editor opens by itself** after a capture, with a drawing tool already selected.
3. **Esc means done.** Esc saves the result and puts it on the clipboard, ready to paste wherever you are.
4. **Few tools, all visible.** No menus and no hidden panels. One drag or click per marking.
5. **Looks calm and modern.** One dark, glass-style toolbar that appears next to the selection. A single accent colour.
6. **Local by default.** Files stay on the PC. Nothing goes to the cloud or to AI unless the user asks for it in that capture.
7. **A standalone app.** Klik is installed on the PC and runs on its own. It needs no browser, browser extension or other program to be open. (Its window is drawn with WebView2, a component built into Windows 11, not a browser you run.)

### Brand

Klik follows the RTPM product UI rules in `038-KNW-Universal brand color font and logo system` v1.0, sections 6-7. That file is the source. Do not copy its values elsewhere without checking it first.

- Font: Inter only (bundled with the app).
- Calm and light: white toolbar and hint, border `#e6e6f0`, text `#15162b`.
- Active tool: Primary Indigo `#0d08d2`. One primary action per screen: "Kopiér" in Accent Yellow `#ffcc00`.
- Marking colours: red `#C0392B`, indigo `#0d08d2`, green `#27AE60`, yellow `#ffcc00` (highlighter), ink `#15162b`. Numbered arrows default to indigo, pen and line to red.
- App icon: Ink Navy `#070474` with an indigo glow upper-right, white selection corners and a yellow step badge with the number 1. Klik's own icon, not the RTPM mark, so the logo rules for the RTPM mark do not apply.
- Sentence case in all UI text.
- Installer publisher: Real Time Project Management.

## 3. Functional requirements

Priority: **Must** = MVP, **Should** = next release, **Could** = later.

### F1. Screenshot: Must, Built

- Opening Klik (Start menu, taskbar or tray icon) or `Ctrl+Alt+K` freezes the monitor under the mouse. If another program owns that key, Klik takes the first free one of `Ctrl+Shift+K`, `Ctrl+Alt+S`, `Ctrl+Shift+X` and shows it in the tray menu. `PrtScn` is left to Snagit and the Snipping Tool.
- Drag to select an area, or click once to take the whole screen.
- The selection shows its size in pixels.
- Right-click starts the selection again.
- **Accept when:** the area goes from hotkey to selected in one drag, and the saved image is pixel-sharp at the monitor's own resolution on 100 % and 150 % scaling.

### F2. Editor opens automatically: Must, Built

- After the selection, the editor appears on top of the frozen screen with no extra click.
- The **highlighter (marker) is selected by default**, so marking can start straight away.
- **Accept when:** the first drag after selecting an area draws a highlight.

### F3. Annotation tools: Must, Built

| Tool | Key | Behaviour |
|---|---|---|
| Highlighter | `M` | Semi-transparent yellow marker. Text underneath stays readable. Default tool. |
| Arrow with number | `A` | Drag draws an arrow with a numbered badge (1, 2, 3 …) at its start. The number counts up by itself. A click without dragging gives only the badge. |
| Arrow with comment | `K` | Drag from where the comment should sit to what it points at. A text field opens there; type, then Enter (or Esc, or a click elsewhere) to finish. Shift+Enter gives a new line. A click without dragging gives only the comment box. 15 px Inter in a white box with a coloured border, wrapping at 280 px. An empty comment is removed. |
| Freehand pen | `P` | Smooth freehand line. |
| Line | `L` | Straight line. |

- 5 colours: red, yellow, green, blue, black. The colour belongs to the selected tool.
- `Shift` while drawing with the pen or highlighter gives a straight stroke.
- `Ctrl+Z` undoes the last marking.
- **Accept when:** a screenshot with the steps "1, 2, 3" takes one drag to select plus three drags to mark.

### F4. Copied as soon as it is framed: Must, Built

- The moment the area is selected (the second click or the end of the drag), the image is on the clipboard and saved as PNG in `Pictures\Klik\`. No button, no Esc needed.
- Every marking and every undo updates the clipboard and the same file within about 0.2 seconds. The toolbar shows "Kopieret".
- `Esc`, `Enter` or "Færdig" only closes. The ✕ button deletes the file and closes.
- Esc before anything is selected cancels without saving.
- **Accept when:** selecting an area and pressing `Ctrl+V` in Teams pastes it with no other key; after adding arrows, `Ctrl+V` pastes the marked version.

### F5. Scrolling capture: Must, Planned

- One hotkey, then one click in the window to capture. Klik scrolls by itself and stitches one long image.
- If automatic scrolling fails, a fallback mode lets the user scroll by hand while Klik stitches.
- The result opens in the same editor (F2–F4).
- **Accept when:** a long page in Chrome, Outlook and SharePoint comes out as one image with no visible seams or repeated headers.

### F6. Step capture: Must, Planned

- One hotkey starts step recording. **Every mouse click takes a new screenshot**, with a red ring where the click happened. The same hotkey stops it.
- After stopping, the steps appear as a numbered list. The user can delete or reorder steps and annotate each one with the F3 tools.
- **Accept when:** 10 clicks give 10 numbered steps, ready less than 2 seconds after stopping.

### F7. Screen video with a visible cursor: Should, Planned

- One hotkey, select an area or the whole screen, and the same hotkey stops recording.
- A **yellow ring follows the cursor**, and each click shows a short ripple, so viewers see where you point.
- Output is MP4 that plays in Teams and PowerPoint.
- **Accept when:** a 2-minute recording has a visible cursor ring and a click ripple at every click, and plays in both apps.

### F8. Demo video: voice-over and webcam: Should, Planned

- Record the microphone while recording the screen (F7) or the steps (F6).
- Optional webcam of the presenter shown **in a circle** in a corner of the video. It can be moved and switched off.
- The aim is a complete demo video made in Klik, with no separate video tool.
- **Accept when:** one recording gives an MP4 with screen, cursor ring, voice and webcam circle, in sync.

### F9. Claude writes the step text: Should, Planned

- From a step capture (F6), Claude writes a short instruction for each step. It uses the screenshot, what was clicked (for example the button label), and what the user said during recording (F8).
- The user reviews and edits the text before export.
- **Privacy:** AI is used only when the user presses "Write steps" on that guide. Screenshots of client systems are sent only with the client's permission. Text and images are not kept by Klik outside the user's own folder.
- **Accept when:** a 10-step guide needs no hand-written text, only light edits.

### F10. Export: Must for PNG, Should for the rest, Planned

| Output | From | Format |
|---|---|---|
| Image | F1, F5 | PNG (Built) |
| Guide | F6 + F9 | Word, PowerPoint (one slide per step), Markdown |
| Video | F7, F8 | MP4 |
| Step video | F6 + F8 + F9 | MP4 with one segment per step |

### F11. Always ready: Must, partly Built

- Klik runs in the system tray. Left-click takes a screenshot. The right-click menu has "Open folder" and "Quit" (Built).
- Starts with Windows (Planned).
- Only one copy runs at a time. Starting it again triggers a capture (Built).

### F12. Distribution: Open

| Channel | Status |
|---|---|
| Windows installer built by GitHub Actions, current user only, no admin rights | Built. First build succeeded 2026.11.13; installer not yet tried on a PC |
| Microsoft Store (free registration, Microsoft signs the app, no SmartScreen warning) | Planned. Tauri does not produce MSIX by itself; the packaging step is not yet tested. |
| Chrome Web Store browser extension | **Dropped** 2026.11.15: Klik is a standalone desktop app |

### F13. Claude can read Klik (MCP server): Should, Built

Klik ships a small local MCP server (`klik-mcp.exe`), so Claude can use Klik's output without the user pasting it.

| Tool | What Claude gets |
|---|---|
| `klik_latest` | The newest capture: image, time, file path |
| `klik_list` | Recent captures, guides and videos, newest first |
| `klik_get` | One capture as an image, or one guide as step text plus images |
| `klik_screenshot` (Could, Planned) | A new screenshot of the screen under the mouse. Klik shows a visible notice when it happens. |

- Read-only by default. It reads Klik's own folders and works even when the Klik app is closed.
- Status: the first five tools are built and tested with an MCP client (two separate sessions) on Linux. Not yet tested on Windows or in Claude Desktop.
- **Accept when:** in Claude Desktop, "What does my latest screenshot show?" gets an answer with no pasting.

### F14. Handoff inbox between AI sessions: Should, Built

The problem: a result from one AI session (chat, Project, Claude Code) is copied by hand into the next session. Klik becomes the shared place in between.

| Tool | Use |
|---|---|
| `handoff_write` | A session stores a result or handoff brief (title, Markdown text, optionally the latest capture) |
| `handoff_list` | Lists the inbox, newest first |
| `handoff_read` | The next session reads a handoff in full |

- Stored as plain Markdown and image files in `Documents\Klik\Inbox\`, so people and other tools can read them too.
- The tray menu opens the inbox folder (Built). Showing the count is Planned.
- Henning's `session-handoff` skill writes its brief to the inbox when Klik is connected, instead of a copy-paste block. The skill change is proposed; Henning approves it (not changed yet).
- (Could) A hotkey saves the clipboard text to the inbox, for AI tools without MCP.
- **Accept when:** session A writes a handoff, and session B (in another Claude surface) continues from it after one short prompt, with no copy-paste.

**Where it works.** A local MCP server is only reachable from programs on the same PC.

| Claude surface | Works? |
|---|---|
| Claude Desktop (chats, Projects) | Yes. Installed by double-clicking a `.mcpb` file. |
| Claude Code on the PC | Yes. `claude mcp add` |
| claude.ai in a browser, the phone app, Claude Code in the cloud | No, they cannot reach the PC. Possible bridge (Could, not tested): keep the inbox in a OneDrive or Google Drive folder and read it with the existing Microsoft 365 or Google Drive connectors. A remote MCP server in RTPM's own cloud is a later option, but then data leaves the PC. |

## 4. Click budget

These targets are the pass/fail test. Henning does each task in Snagit and in Klik. Klik passes when every task needs fewer clicks than Snagit and no task shows a dialog.

| Task | Klik flow | Target |
|---|---|---|
| Area screenshot into Teams | `Ctrl+Alt+K` → drag → `Ctrl+V` in Teams | 1 drag |
| Screenshot with steps 1–3 | `Ctrl+Alt+K` → drag → `A` → 3 drags → `Ctrl+V` | 1 + 3 drags |
| 10-step guide | hotkey → your 10 clicks → hotkey | 0 extra clicks |
| Video with yellow cursor | hotkey → drag → … → hotkey | 1 drag |
| Long page | hotkey → click in window | 1 click |

## 5. Non-functional requirements

- **Platform:** Windows 11 first. Mac is out of scope for now.
- **Speed (targets, not yet measured):** editor visible in under 0.3 seconds after the hotkey, and Esc to clipboard in under 0.5 seconds on a 4K monitor.
- **Screens:** several monitors with different scaling must work. The capture follows the mouse.
- **Storage:** `Pictures\Klik\`, with file names `Klik YYYY-MM-DD HHMMSS.png`.
- **Privacy:** no telemetry. No network calls except F9, and only when the user starts it.
- **Language:** Danish user interface in v1. Whether English comes later is open (Q4).
- **Install:** no admin rights needed.

## 6. Out of scope for the MVP

Webcam-only recording, GIF export, cloud sharing links, team review and comments, OCR (copying text from images), automatic redaction, templates, stamps, a library or gallery, and Mac.

## 7. Clean-room rule

Klik copies Snagit's ideas, not its code or look. It is built from public descriptions and observed behaviour. No decompiling or reverse engineering of Snagit's software, and no use of TechSmith's name, icons, sounds or UI assets. Snagit's licence terms and trademarks apply. This is not legal advice: check with a lawyer before selling Klik.

## 8. Open questions

| # | Question | Why it matters |
|---|---|---|
| Q1 | Is Klik a product to sell, or an internal tool for Henning and the RTPM team? | Decides store, branding, support and how far to polish |
| Q2 | ~~Chrome extension or Windows app first?~~ Decided 2026.11.15: standalone Windows app only | - |
| Q3 | Highlighter: was "marker" meant as a yellow highlighter (built) or a red pen? | The default tool |
| Q4 | Danish only, or Danish and English? | Needed for the store, and for clients outside Denmark |
| Q5 | Whose Claude account pays for F9, and where do client guides get stored (local folder, SharePoint)? | Cost and client data rules |
| Q6 | Do most of Henning's AI sessions run in Claude Desktop and Claude Code on the PC, or in the browser and on the phone? | F13 and F14 only work locally without the Drive bridge |

## 9. Source of these wishes

Henning's messages in the Claude Code session of 2026.11.13–15. Snagit feature research: `PLAN.md`, section 2.
