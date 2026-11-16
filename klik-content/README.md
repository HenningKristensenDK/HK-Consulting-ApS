# Klik Content

Klik med indbygget indholdsværktøj: skærmbilleder bliver til en 4:5 LinkedIn-karrusel eller en 16:9 præsentation (demo eller brugerguide) i RTPM-brand, eksporteret som PDF og PNG.

Klik Content er en **selvstændig app ved siden af Klik**. Den har sit eget app-id (`dk.rtpm.klik.content`), sin egen installationsmappe og sit eget build, så den aldrig overskriver Klik. Begge apps bruger samme mappe til skærmbilleder (`Billeder\Klik`), så billeder fra Klik kan bruges direkte.

Spec: [`SPEC.md`](SPEC.md). Klik selv: [`../klik`](../klik).

## Brug

1. Tag skærmbilleder som i Klik (`Ctrl+Alt+K`, eller den ledige genvej menuen viser. Kører Klik også, tager Klik Content den næste ledige).
2. Højreklik på ikonet ved uret → **Lav opslag (karrusel eller præsentation)**.
3. Vælg **4:5 karrusel** eller **16:9 præsentation**.
4. Klik på skærmbilleder i venstre side for at lave slides. Skriv overskrift, fremhævning og tekst, eller lad Claude skrive (se nedenfor).
5. **Eksportér PDF + PNG**. Filerne ligger i `Dokumenter\Klik\Opslag\<dato navn format>\`. PDF'en uploades på LinkedIn som dokumentopslag.

Under hver slide viser Klik Content, om den følger brand-reglerne: telefon-minimum (overskrift 96 px, tekst 36 px, etiketter 30 px), ingen tankestreger, ingen links, én fremhævning, højst 25 ord, tal kun fra godkendt kilde.

## Claude laver historien

Med Klik-forbindelsen (`klik-mcp`, fra Klik) i Claude Desktop:

1. Klik på **Claude** → skriv målgruppe og vinkel → **Kopiér brief til Claude**.
2. Indsæt briefen i Claude Desktop. Claude ser dine skærmbilleder (`klik_list_captures`, `klik_get_capture`), vælger vinkel og historie og gemmer et udkast med `handoff_write` i `Dokumenter\Klik\Inbox`.
3. Tilbage i Klik Content: Claude-udkastet står under **Claude**. Klik **Brug**, læs igennem, eksportér.

Claude ændrer aldrig dine filer. Du godkender teksten, før noget eksporteres. Uden Klik-forbindelsen kan Claudes JSON-svar indsættes i hånden.

Udkastformat (i en ` ```klik-deck ` blok i handoff-teksten):

```json
{"format":"4x5","title":"...","angle":"...","slides":[{"kind":"cover|shot|text|closer","shot":"Klik 2026-11-16 101500.png","tag":"","headline":"","highlight":"","body":""}]}
```

## Udvikling

```
cd app
npm ci
npm run dev        # åbn http://localhost:1420/?studio for indholdsværktøjet med demo-billeder
npm run typecheck
npx tauri build    # på Windows
```

Indholdsværktøjet ligger i `app/src/content/` (`render.ts` tegner slides, `export.ts` laver PDF/PNG, `Studio.tsx` er vinduet). Rust-kommandoerne til filer og Claude-udkast ligger i `app/src-tauri/src/lib.rs`. Windows-build: GitHub Actions-workflowet "Klik Content - Windows build".
