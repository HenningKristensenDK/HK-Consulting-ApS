# Klik Content: specification

Version 0.1, 2026.11.16. Owner: Henning Kristensen.

Klik Content is Klik plus a built-in content maker. It turns screenshots (and later recordings) into finished LinkedIn content and presentations in the RTPM brand. It is a separate app next to Klik so it never overwrites it. Klik's own spec is `../klik/SPEC.md`; requirement numbers F1-F14 refer to it, and F15 there describes the full recording-to-post flow this app grows into.

Status words as in Klik's spec: **Built** (code exists and was tested in a browser, not yet on Windows), **Planned**, **Open**.

## C1. Separate app: Must, Built

- App id `dk.rtpm.klik.content`, product name "Klik Content", binary `klik-content.exe`, own install folder and installer.
- The installer closes only `klik-content.exe`, never Klik or `klik-mcp`.
- Does not bundle `klik-mcp`; Claude uses the one Klik installs. Both apps read the same folders.
- Screenshot capture and editor are Klik's (F1-F4), unchanged.

## C2. Content maker window: Must, Built

- Opened from the tray menu: "Lav opslag (karrusel eller præsentation)".
- Recent screenshots from `Pictures\Klik` (newest 60). One click adds a screenshot slide.
- Slide kinds: cover (dark), screenshot (light), text (light), closer (dark).
- Per slide: tag, headline, highlight (words from the headline), body, screenshot.
- Reorder, delete, add text slide. Profile chip: name, role, photo (chosen once, kept only on the PC, never in the repo).
- The deck is saved automatically on the PC.

## C3. Two formats: Must, Built

| Format | Size | Use | Layout |
|---|---|---|---|
| 4:5 carousel | 1080 × 1350 per page | LinkedIn document post | One column. Nothing essential below y 1170 |
| 16:9 presentation | 1920 × 1080 per page | Demo, user walkthrough, website | Text zone left 40 %, screenshot right 60 %. Its own layout, never a crop of 4:5 |

## C4. Brand checks: Must, Built

Rendered from `rtpm-brand-system` tokens and the brand guide of 2026.11.15 rev 2. Colours: Ink Navy, Indigo, Gold, Paper, Ink. Fonts: Barlow Semi Condensed 700 for headlines, Inter for the rest (bundled). One highlight per slide: gold on dark, indigo on light. The text shrinks to the phone floors (headline 96 px, body 36 px, labels 30 px) and is flagged if it still does not fit. Also flagged: em-dashes, URLs, highlight not in the headline, more than 4 highlighted words, headline outside 4-8 words, body over 25 words, any number (must come from an approved source), "AI-powered" or "unique" in a headline, carousel length outside 6-9. The "Real Time" logo appears only on the closer.

## C5. Export: Must, Built

One PDF (`Karrusel.pdf` or `Præsentation.pdf`) plus one PNG per slide in `Documents\Klik\Opslag\<date> <title> <format>\`. The folder opens when done.

## C6. Claude writes the story: Should, Built

- The user writes the audience and angle, then copies a brief to Claude Desktop.
- With `klik-mcp` connected, Claude looks at the screenshots, picks the story and saves a draft with `handoff_write`: a fenced `klik-deck` JSON block (format, title, angle, slides).
- Klik Content lists those drafts from `Documents\Klik\Inbox` and loads one with one click. The user reviews before export. Fallback without the connector: paste Claude's JSON.
- Claude never edits screenshots or files. Screenshots of client systems go to Claude only with the client's permission (as F9).
- **Accept when:** in Claude Desktop, one pasted brief gives a draft that loads in Klik Content and exports with only light edits.

## C7. Recording to post: Should, Planned

Follows Klik F15: event log, local transcript, Claude edit plan, FFmpeg render to 4:5, 9:16 and 16:9 with the same brand templates.

- **Cursor and click highlight: indigo** (decided by Henning 2026.11.16): a 2 px `#0D08D2` ring with a light indigo halo `#E7E6FA`, never gold. This replaces the yellow ring in Klik's F7 for videos made in Klik Content.

## C8. Open questions

| # | Question |
|---|---|
| CQ1 | Should Claude be able to start an export by itself (a write tool in klik-mcp), or should a person always press Export? Today: a person always exports. |
| CQ2 | Merge the content maker back into Klik later, or keep two apps? The code sits in its own folder (`app/src/content/`) so either is easy. |
| CQ3 | Role line in the profile chip is TBD in the brand tokens. Current text: "Project Management · Digital Execution · Offshore Wind". |
