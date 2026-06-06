import { NextResponse } from "next/server";
import { SeriesStandings } from "@/lib/types";

// Seeded with 2024/2025 MXGP season data — replace with live scrape or official API when available
const STANDINGS: SeriesStandings[] = [
  {
    series: "mxgp",
    label: "MXGP World Championship",
    season: 2025,
    riders: [
      { position: 1, rider: "Jorge Prado", country: "Spain", countryCode: "ESP", team: "Red Bull GasGas", points: 418, wins: 8 },
      { position: 2, rider: "Jeffrey Herlings", country: "Netherlands", countryCode: "NED", team: "Red Bull KTM", points: 391, wins: 5 },
      { position: 3, rider: "Tim Gajser", country: "Slovenia", countryCode: "SLO", team: "HRC Honda", points: 375, wins: 4 },
      { position: 4, rider: "Romain Febvre", country: "France", countryCode: "FRA", team: "Kawasaki", points: 312, wins: 2 },
      { position: 5, rider: "Glenn Coldenhoff", country: "Netherlands", countryCode: "NED", team: "Fantic", points: 287, wins: 1 },
      { position: 6, rider: "Maxime Renaux", country: "France", countryCode: "FRA", team: "Yamaha", points: 256, wins: 0 },
      { position: 7, rider: "Calvin Vlaanderen", country: "Netherlands", countryCode: "NED", team: "Yamaha", points: 241, wins: 0 },
      { position: 8, rider: "Mattia Guadagnini", country: "Italy", countryCode: "ITA", team: "Red Bull GasGas", points: 198, wins: 0 },
      { position: 9, rider: "Brian Bogers", country: "Netherlands", countryCode: "NED", team: "Fantic", points: 187, wins: 0 },
      { position: 10, rider: "Ruben Fernandez", country: "Spain", countryCode: "ESP", team: "HRC Honda", points: 162, wins: 0 },
    ],
  },
  {
    series: "mxgp",
    label: "MX2 World Championship",
    season: 2025,
    riders: [
      { position: 1, rider: "Lucas Coenen", country: "Belgium", countryCode: "BEL", team: "Husqvarna", points: 402, wins: 9 },
      { position: 2, rider: "Simon Längenfelder", country: "Germany", countryCode: "GER", team: "Red Bull GasGas", points: 378, wins: 5 },
      { position: 3, rider: "Thibault Benistant", country: "France", countryCode: "FRA", team: "Yamaha", points: 341, wins: 3 },
      { position: 4, rider: "Kay de Wolf", country: "Netherlands", countryCode: "NED", team: "Husqvarna", points: 298, wins: 2 },
      { position: 5, rider: "Tom Vialle", country: "France", countryCode: "FRA", team: "Red Bull KTM", points: 287, wins: 1 },
      { position: 6, rider: "Mikkel Haarup", country: "Denmark", countryCode: "DEN", team: "Kawasaki", points: 241, wins: 0 },
      { position: 7, rider: "Ferruccio Zanchi", country: "Italy", countryCode: "ITA", team: "Honda", points: 198, wins: 0 },
      { position: 8, rider: "Liam Everts", country: "Belgium", countryCode: "BEL", team: "Red Bull KTM", points: 187, wins: 0 },
      { position: 9, rider: "Camden McLellan", country: "South Africa", countryCode: "ZAF", team: "Triumph", points: 162, wins: 0 },
      { position: 10, rider: "Quentin Prugnieres", country: "France", countryCode: "FRA", team: "Kawasaki", points: 134, wins: 0 },
    ],
  },
  {
    series: "supercross",
    label: "AMA Supercross 450SX",
    season: 2025,
    riders: [
      { position: 1, rider: "Chase Sexton", country: "USA", countryCode: "USA", team: "Red Bull KTM", points: 366, wins: 7 },
      { position: 2, rider: "Cooper Webb", country: "USA", countryCode: "USA", team: "Monster Yamaha", points: 341, wins: 4 },
      { position: 3, rider: "Eli Tomac", country: "USA", countryCode: "USA", team: "Monster Yamaha", points: 312, wins: 3 },
      { position: 4, rider: "Jason Anderson", country: "USA", countryCode: "USA", team: "Kawasaki", points: 287, wins: 2 },
      { position: 5, rider: "Ken Roczen", country: "Germany", countryCode: "GER", team: "Suzuki", points: 264, wins: 1 },
      { position: 6, rider: "Aaron Plessinger", country: "USA", countryCode: "USA", team: "Red Bull KTM", points: 241, wins: 0 },
      { position: 7, rider: "Malcolm Stewart", country: "USA", countryCode: "USA", team: "Husqvarna", points: 198, wins: 0 },
      { position: 8, rider: "Dean Wilson", country: "GBR", countryCode: "GBR", team: "Honda HRC", points: 165, wins: 0 },
    ],
  },
  {
    series: "ama_mx",
    label: "AMA Pro Motocross 450MX",
    season: 2025,
    riders: [
      { position: 1, rider: "Chase Sexton", country: "USA", countryCode: "USA", team: "Red Bull KTM", points: 412, wins: 9 },
      { position: 2, rider: "Eli Tomac", country: "USA", countryCode: "USA", team: "Monster Yamaha", points: 387, wins: 6 },
      { position: 3, rider: "Hunter Lawrence", country: "Australia", countryCode: "AUS", team: "Honda HRC", points: 354, wins: 3 },
      { position: 4, rider: "Cooper Webb", country: "USA", countryCode: "USA", team: "Monster Yamaha", points: 298, wins: 2 },
      { position: 5, rider: "Christian Craig", country: "USA", countryCode: "USA", team: "Husqvarna", points: 276, wins: 0 },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ standings: STANDINGS });
}
