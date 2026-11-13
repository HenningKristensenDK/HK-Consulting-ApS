# Klik

Enkel screenshot til Windows. Se `../PLAN.md` for plan og status.

## Brug

| Tast | Hvad sker der |
|---|---|
| `PrtScn` eller `Ctrl+Shift+X` | Skærmen under musen fryses. Træk et område, eller klik for hele skærmen |
| Tegn | Marker er valgt fra start. `M` marker, `A` pil med nummer, `P` frihånd, `L` linje |
| `Shift` mens du tegner | Lige streg med marker og frihånd |
| `Ctrl+Z` | Fortryd |
| Højreklik | Vælg område forfra |
| `Esc` | Gemt i `Billeder\Klik` og lagt på udklipsholderen. Klar til `Ctrl+V` |

`PrtScn` virker kun, hvis Windows ikke selv bruger tasten:
Indstillinger > Tilgængelighed > Tastatur > slå "Brug Print Screen-tasten til at åbne skærmklip" fra.
Ellers brug `Ctrl+Shift+X`.

Klik ligger i proceslinjens ikonbakke. Venstreklik = nyt screenshot. Højreklik = menu.

## Installation

Hver push bygger en installer i GitHub Actions ("Klik - Windows build").
Hent artefaktet `Klik-installer`, pak ud og kør `Klik_0.1.0_x64-setup.exe`.
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
