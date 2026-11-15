# Klik

Enkel screenshot til Windows. Se `../PLAN.md` for plan og status.

## Brug

**Åbn Klik = tag et screenshot.** Fra Start-menuen, en genvej på proceslinjen eller ikonet ved uret.

| Tast | Hvad sker der |
|---|---|
| `Ctrl+Alt+K` | Skærmen under musen fryses. Træk et område, eller klik for hele skærmen |
| Tegn | Marker er valgt fra start. `M` marker, `A` pil med nummer, `P` frihånd, `L` linje |
| `Shift` mens du tegner | Lige streg med marker og frihånd |
| `Ctrl+Z` | Fortryd |
| Højreklik | Vælg område forfra |
| Når området er markeret | Billedet er allerede kopieret og gemt i `Billeder\Klik`. Hver ny markering opdaterer det. Klar til `Ctrl+V` |
| `Esc` | Lukker. Kryds (✕) sletter billedet og lukker |

Er `Ctrl+Alt+K` optaget af et andet program, tager Klik den første ledige af `Ctrl+Shift+K`, `Ctrl+Alt+S` og `Ctrl+Shift+X`. Menuen ved ikonet viser, hvilken den fik. `PrtScn` bruges ikke, fordi Snagit og Windows' Klippeværktøj bruger den.

Klik ligger i proceslinjens ikonbakke. Venstreklik = nyt screenshot. Højreklik = menu.

## Installation

Hver push bygger en installer i GitHub Actions ("Klik - Windows build").
Hent artefaktet `Klik-installer`, pak ud og kør `Klik_0.1.3_x64-setup.exe`.
Den installeres kun for din bruger (ingen admin). Windows SmartScreen advarer, fordi filen ikke er kodesigneret: "Flere oplysninger" > "Kør alligevel".

## Udvikling

```
npm install
npm run dev          # editoren i en browser med et demo-skrivebord
npx tauri dev        # hele appen (kræver Windows + Rust)
```

- `src/Overlay.tsx` markering, værktøjslinje, taster
- `src/draw.ts` figurer og eksport til PNG
- `src-tauri/src/lib.rs` genvejstaster, capture, gem, udklipsholder, ikonbakke
