"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPrefs, savePrefs, EUROPEAN_COUNTRIES, USA_COUNTRIES, SERIES_LABELS } from "@/lib/preferences";
import { Series, Region } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

const ALL_SERIES: Series[] = ["mxgp", "emx", "ama_mx", "supercross"];

export default function SettingsPage() {
  const router = useRouter();
  const prefs = getPrefs();
  const [region, setRegion] = useState<Region>(prefs.region);
  const [country, setCountry] = useState(prefs.country);
  const [series, setSeries] = useState<Series[]>(prefs.series);
  const [saved, setSaved] = useState(false);

  const countries = region === "usa" ? USA_COUNTRIES : region === "both" ? [...EUROPEAN_COUNTRIES, ...USA_COUNTRIES] : EUROPEAN_COUNTRIES;

  function toggleSeries(s: Series) {
    setSeries(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function save() {
    savePrefs({ ...prefs, region, country, series: series.length > 0 ? series : ["mxgp"] });
    setSaved(true);
    setTimeout(() => { setSaved(false); router.push("/feed"); }, 1000);
  }

  function reset() {
    localStorage.removeItem("mxfeed_prefs");
    router.replace("/");
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <span className="text-xl font-black">MX<span className="text-orange-500">Feed</span></span>
        <span className="text-sm text-zinc-400 ml-2">Settings</span>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Region */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Region</h3>
          <div className="flex gap-2">
            {(["europe", "usa", "both"] as Region[]).map(r => (
              <button
                key={r}
                onClick={() => { setRegion(r); setCountry(r === "usa" ? "United States" : "Denmark"); }}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors capitalize",
                  region === r ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                {r === "both" ? "Both" : r === "usa" ? "USA" : "Europe"}
              </button>
            ))}
          </div>
        </div>

        {/* Country */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Country</h3>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Series */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Series</h3>
          <div className="flex flex-col gap-2">
            {ALL_SERIES.map(s => (
              <button
                key={s}
                onClick={() => toggleSeries(s)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                  series.includes(s) ? "border-orange-500 bg-orange-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                )}
              >
                <span className="font-semibold text-sm">{SERIES_LABELS[s]}</span>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", series.includes(s) ? "border-orange-500 bg-orange-500" : "border-zinc-600")}>
                  {series.includes(s) && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          className={cn(
            "w-full py-3 rounded-xl font-bold transition-colors",
            saved ? "bg-green-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          {saved ? "Saved ✓" : "Save preferences"}
        </button>

        <button onClick={reset} className="w-full py-3 rounded-xl font-semibold text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          Reset & redo onboarding
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
