import { UserPreferences } from "./types";

const PREFS_KEY = "mxfeed_prefs";

export const defaultPrefs: UserPreferences = {
  region: "europe",
  country: "Denmark",
  series: ["mxgp"],
  favoriteRiders: [],
  onboardingComplete: false,
};

export function getPrefs(): UserPreferences {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export function savePrefs(prefs: UserPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export const SERIES_LABELS: Record<string, string> = {
  mxgp: "MXGP / MX2",
  ama_mx: "AMA Pro MX",
  supercross: "Supercross",
  emx: "EMX",
};

export const EUROPEAN_COUNTRIES = [
  "Denmark", "Netherlands", "Belgium", "France", "Germany",
  "Italy", "Spain", "Sweden", "Finland", "Norway", "UK",
  "Switzerland", "Austria", "Portugal", "Czech Republic", "Hungary",
];

export const USA_COUNTRIES = ["United States", "Canada"];
