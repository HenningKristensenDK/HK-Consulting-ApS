# Klik: plan for en enkel Snagit-erstatning

Status: **planlagt**. Intet er bygget. "Klik" er et arbejdsnavn.
Dato: 2026.11.13

## 1. Mål og læser

- **Mål:** Et Windows-værktøj på Hennings desktop, der tager screenshots, lange scroll-billeder, step-guides og video med færre klik end Snagit.
- **Læser af planen:** Henning (beslutter), Ranjith eller Claude (bygger).
- **Princip:** Én genvejstast, ingen dialoger. Resultatet ligger på udklipsholderen og i en mappe med det samme. Editoren åbner kun, hvis du beder om den.

## 2. Hvad Snagit kan (research, nov. 2026)

Kilde: TechSmiths egen featureside og "What's new" (primærkilder). Snagit er nu på version 2026.4.x.

| Gruppe | Funktioner |
|---|---|
| Capture | Område/vindue/fuld skærm, **scrolling capture**, **Step Capture** (screenshot ved hvert klik), forsinkelse, menu-capture, flere områder, time-lapse |
| Video | Skærm + mikrofon + systemlyd, **cursor-highlight**, **klik-animation (ripple)**, tegn på skærmen mens du optager, webcam (billede-i-billede), trim, GIF, støjfjernelse |
| Editor | **Step-tool (1, 2, 3 …)**, pile, callouts, blur, Smart Redact, tekstgenkendelse, Simplify, Smart Move, skabeloner, beskæring, batch |
| Deling | Link, Screencast-review, Office-eksport (Word/PowerPoint med redigerbar tekst), PNG/JPG/GIF/PDF/MP4, send til Camtasia |

**Step Capture i 2026:** Laver en nummereret guide af screenshots, taget ved hvert klik. Kan eksporteres til PowerPoint med titelslide og redigerbar tekst (v2026.1), sendes til Camtasia som step-video (v2026.3) og eksporteres som enkeltbilleder (Mac v2026.4). Jeg fandt ikke en primærkilde på, om den skriver step-tekst automatisk.

**"Mest brugte":** Der findes ingen offentlige brugsdata. Signaler fra TechSmith og anmeldelser (sekundære kilder) peger på: scrolling capture, step-tool, video med cursor, blur/redact og tekstgenkendelse. Det er indikationer, ikke tal.

**Konkurrenter, gratis:**
- **Windows Klippeværktøj (Snipping Tool):** screenshots, skærmoptagelse med lyd, tekstudtræk (OCR). Ingen scroll, ingen step-guide, ingen cursor-highlight.
- **ShareX** (open source): scrolling capture, video, GIF, meget automatisering. Mange knapper. Ingen step-guide.
- **Greenshot:** enkel, scroll-capture. Ingen video.

**Konklusion:** Huller i de gratis værktøjer er step-guide, cursor-highlight i video og en rolig brugerflade. Det er der, Klik skal vinde.

## 3. Udfordring af briefet

1. **Byg vs. køb.** Snagit koster omkring $63 pr. år ([placeholder]: pris ikke bekræftet hos TechSmith). Et eget værktøj koster udviklertid, og RTPM prioriterer betalende kunder. Klik giver kun mening, hvis (a) du kan bygge det med Claude uden at trække Ranjith væk, eller (b) step-guiden bliver en del af RTPM's tilbud (se idé B).
2. **Video er den dyreste feature** og overlapper med Klippeværktøjet. Den kommer sidst.
3. **Scrolling capture er den mest risikable.** Sites med faste headere, lazy loading og smooth scroll giver fejl i sammensyningen. Også ShareX og Snagit fejler her nogle gange.

## 4. MVP-scope

Med:
1. **Screenshot:** genvejstast → træk område (eller klik på vindue) → på udklipsholder + gemt som PNG.
2. **Mini-editor med 4 værktøjer:** nummer (1, 2, 3 … auto-tæller), pil, firkant, blur. Ét klik pr. markering. Ingen menuer.
3. **Step-optagelse:** start → hvert museklik giver et screenshot med en rød ring om klikpunktet → stop → én samlet guide (lang PNG + Word/Markdown med nummererede trin).
4. **Video:** genvejstast → vælg område → optag med gul cursor-ring og klik-ripple → stop → MP4.
5. **Scrolling capture:** genvejstast → klik i vinduet → Klik scroller selv og syr billedet sammen.

Ude af MVP: webcam, GIF, cloud-deling, OCR, Smart Redact, skabeloner, Mac.

### Interaktion (mål for antal klik)

| Opgave | Klik-flow | Mål |
|---|---|---|
| Område-screenshot ind i Teams | `PrtScn` → træk → `Ctrl+V` i Teams | 1 tast + 1 træk |
| Screenshot med trin 1–3 | `PrtScn` → træk → `E` → 3 klik → `Ctrl+C` | 1 træk + 3 klik |
| Step-guide over 10 klik | `Ctrl+Shift+T` → dine 10 klik → `Ctrl+Shift+T` | 0 ekstra klik |
| Video med gul cursor | `Ctrl+Shift+R` → træk → … → `Ctrl+Shift+R` | 1 træk |
| Lang side | `Ctrl+Shift+S` → klik i vinduet | 1 klik |

Et lille, flydende panel (4 ikoner) findes også for dem, der ikke bruger genvejstaster. Panelet kan skjules.

## 5. Teknisk valg

**Anbefaling: Tauri 2 + React/TypeScript (UI) + Rust (capture-kerne). Kun Windows 11.**

- UI i React, som Ranjith kender. Lille installer (få MB) i forhold til Electron.
- Capture via Windows Graphics Capture API. Rust-craten `windows-capture` (MIT) kan tage billeder og skrive MP4 med cursor. Craten skal tjekkes for aktuel vedligeholdelse før brug.
- Globale museklik og taster via Win32-hooks (til step-optagelse og ripple).
- **Gul cursor-ring:** et gennemsigtigt, klik-igennem vindue der følger musen. Det kommer automatisk med i optagelsen. Enkelt og robust.
- **Scroll:** send scroll-hjul til vinduet, tag et billede pr. skridt, find overlap ved at sammenligne pixelrækker, sy sammen. Fald tilbage til "scroll selv"-tilstand, hvis automatik fejler.
- **Data:** alt gemmes lokalt i `Billeder\Klik\`. Ingen cloud. Klientdata forlader aldrig maskinen.

Alternativer:
- **Electron + React:** hurtigere start for en JS-udvikler, men 100+ MB og kræver alligevel native moduler til hooks.
- **.NET (WinUI 3/WPF):** bedst adgang til Windows, men ikke React. Godt valg, hvis en C#-udvikler bygger det.

Begrænsning: Windows-appen kan ikke køres i denne cloud-session (Linux). Kode kan skrives her. Byg og test sker på din PC eller via en Windows-runner i GitHub Actions.

## 6. Faser

Tidsestimater er grove skøn, ikke tilbud.

| Fase | Indhold | Skøn | Bevis for færdig |
|---|---|---|---|
| 0. Spike | Tauri-app der tager et screenshot via WGC, fanger et globalt klik og viser den gule ring | 2–3 dage | Kører på din PC |
| 1. Screenshot + mini-editor | Område/vindue, clipboard, 4 værktøjer, auto-gem | 1 uge | 5-opgave-test opgave 1–2 |
| 2. Step-optagelse | Klik-hook, rød ring, samlet guide, Word/Markdown-eksport | 1 uge | 10 klik → guide klar < 2 sek efter stop |
| 3. Video | MP4 med lyd, gul ring, klik-ripple | 1–1,5 uge | MP4 afspilles i Teams og PowerPoint |
| 4. Scrolling capture | Auto-scroll + sammensyning, manuel fallback | 1–2 uger | Lang side fra Chrome, Outlook og SharePoint uden synlige sømme |
| 5. Senere | AI-skrevne step-tekster (Claude), OCR, blur af e-mails/CPR automatisk | – | – |

Rækkefølgen er valgt efter værdi og risiko: step-optagelse er det, gratis værktøjer ikke har; scroll er sidst, fordi den er mest usikker.

## 7. Pass/fail-test (5 opgaver)

Henning udfører opgaverne i tabellen i afsnit 4, først i Snagit, så i Klik. Klik tæller antal klik og tid. Klik består, når hver opgave tager færre klik end Snagit, og ingen opgave kræver en dialogboks.

Reference til udseende: [placeholder] (fx et screenshot af et værktøj, hvis look du kan lide, så vi kan lægge Klik ved siden af).

## 8. Idéer der slår briefet

- **A. Test først, byg bagefter.** Brug Klippeværktøjet + ShareX en uge og notér, hvad du faktisk savner. Trade-off: en uges forsinkelse, men mindre spildt kode.
- **B. Step-guide som RTPM-produkt.** Step-optagelse + Claude-skrevne trin = arbejdsinstrukser og brugermanualer til kundernes RTPM-løsninger. Trade-off: kræver opt-in og styr på, at klientdata ikke sendes til AI uden tilladelse.
- **C. Drop editoren i MVP.** Kun nummer-værktøjet, direkte på overlayet før billedet gemmes. Trade-off: mindre fleksibelt, men endnu færre klik.

## 9. Risici

- Antivirus kan reagere på globale tastatur/mus-hooks og en usigneret .exe (SmartScreen-advarsel). OK til privat brug; kodesignering koster penge, hvis andre skal have den.
- Flere skærme med forskellig skalering (DPI) er en klassisk fejlkilde. Skal testes i fase 0.
- Vedligeholdelse: Windows-opdateringer kan ændre capture-adfærd.
- Alternativomkostning i forhold til betalende kunder.

## Kilder

- [TechSmith: Snagit features](https://www.techsmith.com/snagit-features.html)
- [TechSmith: What's new in Snagit](https://www.techsmith.com/learn/tutorials/snagit/whats-new/)
- [Snagit Windows 2026 Version History](https://support.techsmith.com/hc/en-us/articles/42674936732685-Snagit-Windows-2026-Version-History)
- [Microsoft: Snipping Tool, screenshots og optagelse](https://www.microsoft.com/windows/learning-center/how-to-use-snipping-tool-on-windows-screenshots-shortcuts-and-screen-recordings)
- [ShareX vs Snagit (ShareX' egen side)](https://getsharex.com/compare/sharex-vs-snagit/)
- [windows-capture (Rust crate)](https://github.com/NiiightmareXD/windows-capture)
