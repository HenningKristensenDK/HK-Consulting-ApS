export type Region = "europe" | "usa" | "both";
export type Series = "mxgp" | "ama_mx" | "supercross" | "emx";

export interface UserPreferences {
  region: Region;
  country: string;
  series: Series[];
  favoriteRiders: string[];
  onboardingComplete: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl?: string;
  series: Series[];
  tags: string[];
  link: string;
}

export interface RiderStanding {
  position: number;
  rider: string;
  country: string;
  countryCode: string;
  team: string;
  points: number;
  wins: number;
}

export interface SeriesStandings {
  series: Series;
  label: string;
  season: number;
  riders: RiderStanding[];
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}
