# Klik: product specification

Version 0.2, 2026.11.15. Owner: Henning Kristensen (RTPM).
"Klik" is a working name.

This spec records Henning's wishes for a simple screen capture tool that covers the most-used Snagit features with far fewer clicks. Each requirement says where it stands: **Built** (code exists and was tested in a browser, not yet on Windows), **Planned**, or **Open** (a decision is still needed). How the tool gets built is in `PLAN.md`.

## 1. Purpose

Snagit can do a lot, but it has too many buttons and too many clicks per task. Klik keeps only what Henning uses and makes each task as short as possible:

- screenshots with markings, ready to paste
- long scrolling screenshots
- step-by-step guides made from clicks
- screen videos with a visible cursor, voice-over and webcam: demo videos made in the same tool
- Claude writes the text for the steps

**Users:** Henning first, then the RTPM team. Possibly external buyers later (see open question Q1).

## 2. Design principles

1. **One hotkey, no dialogs.** Every capture starts from one key. No "save as" windows, no setup screens.
2. **The editor opens by itself** after a capture, with a drawing tool already selected.
3. **Esc means done.** Esc saves the result and puts it on the clipboard, ready to paste wherever you are.
4. **Few tools, all visible.** No menus and no hidden panels. One drag or click per marking.
5. **Looks calm and modern.** One dark, glass-style toolbar that appears next to the selection. A single accent colour.
6. **Local by default.** Files stay on the PC. Nothing goes to the cloud or to AI unless the user asks for it in that capture.

## 3. Functional requirements

Priority: **Must** = MVP, **Should** = next release, **Could** = later.

### F1. Screenshot: Must, Built

- `PrtScn` (or `Ctrl+Shift+X` as a fallback) freezes the monitor under the mouse.
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
| Freehand pen | `P` | Smooth freehand line. |
| Line | `L` | Straight line. |

- 5 colours: red, yellow, green, blue, black. The colour belongs to the selected tool.
- `Shift` while drawing with the pen or highlighter gives a straight stroke.
- `Ctrl+Z` undoes the last marking.
- **Accept when:** a screenshot with the steps "1, 2, 3" takes one drag to select plus three drags to mark.

### F4. Esc = save and copy: Must, Built

- `Esc` (or `Enter`, or the "Kopiér" button) saves the image with all markings as PNG in `Pictures\Klik\` and places it on the clipboard.
- The window closes at once. `Ctrl+V` in Teams, Outlook, Word, PowerPoint or a browser pastes the marked image.
- Esc before anything is selected cancels without saving. A ✕ button discards a capture.
- **Accept when:** the pasted image in Teams and Word matches the editor, including all markings.

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
| Windows installer built by GitHub Actions, current user only, no admin rights | Built, first build running |
| Microsoft Store (free registration, Microsoft signs the app, no SmartScreen warning) | Planned. Tauri does not produce MSIX by itself; the packaging step is not yet tested. |
| Chrome Web Store, as a browser extension for step guides and demo videos in web apps | Open, see Q1 and Q2 |

## 4. Click budget

These targets are the pass/fail test. Henning does each task in Snagit and in Klik. Klik passes when every task needs fewer clicks than Snagit and no task shows a dialog.

| Task | Klik flow | Target |
|---|---|---|
| Area screenshot into Teams | `PrtScn` → drag → `Esc` → `Ctrl+V` | 1 drag |
| Screenshot with steps 1–3 | `PrtScn` → drag → `A` → 3 drags → `Esc` | 1 + 3 drags |
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
| Q2 | Should the Chrome extension or the Windows app come first for step guides and demo videos? | Most client work is in web apps (Microsoft 365, SharePoint) |
| Q3 | Highlighter: was "marker" meant as a yellow highlighter (built) or a red pen? | The default tool |
| Q4 | Danish only, or Danish and English? | Needed for the store, and for clients outside Denmark |
| Q5 | Whose Claude account pays for F9, and where do client guides get stored (local folder, SharePoint)? | Cost and client data rules |

## 9. Source of these wishes

Henning's messages in the Claude Code session of 2026.11.13–15. Snagit feature research: `PLAN.md`, section 2.
