"use client";

import { useState } from "react";
import { UserPreferences, Series, Region } from "@/lib/types";
import { savePrefs, EUROPEAN_COUNTRIES, USA_COUNTRIES, SERIES_LABELS } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface Props {
  onComplete: (prefs: UserPreferences) => void;
}

const ALL_SERIES: Series[] = ["mxgp", "emx", "ama_mx", "supercross"];

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<Region>("europe");
  const [country, setCountry] = useState("Denmark");
  const [series, setSeries] = useState<Series[]>(["mxgp"]);

  const countries = region === "usa" ? USA_COUNTRIES : region === "both" ? [...EUROPEAN_COUNTRIES, ...USA_COUNTRIES] : EUROPEAN_COUNTRIES;

  function toggleSeries(s: Series) {
    setSeries(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function finish() {
    const prefs: UserPreferences = {
      region,
      country,
      series: series.length > 0 ? series : ["mxgp"],
      favoriteRiders: [],
      onboardingComplete: true,
    };
    savePrefs(prefs);
    onComplete(prefs);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-4xl font-black tracking-tight text-white">MX<span className="text-orange-500">Feed</span></span>
        </div>
        <p className="text-zinc-400 text-sm">Europe&apos;s first AI-powered motocross news app</p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn("h-1 w-8 rounded-full transition-colors", i <= step ? "bg-orange-500" : "bg-zinc-700")} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Where are you from?</h2>
            <p className="text-zinc-400 text-sm mb-6">We&apos;ll personalise your feed and find local streams.</p>
            <div className="flex flex-col gap-3">
              {([
                { value: "europe", label: "Europe", desc: "MXGP, EMX & national series" },
                { value: "usa", label: "United States / Canada", desc: "AMA Pro MX & Supercross" },
                { value: "both", label: "Both", desc: "Full global coverage" },
              ] as { value: Region; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setRegion(opt.value); if (opt.value === "usa") setCountry("United States"); else setCountry("Denmark"); }}
                  className={cn(
                    "flex flex-col text-left px-4 py-3 rounded-xl border transition-all",
                    region === opt.value
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                  )}
                >
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-zinc-400 text-xs mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Your country</h2>
            <p className="text-zinc-400 text-sm mb-6">Used to surface local races, results and streams.</p>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
            >
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Back
              </button>
              <button onClick={() => setStep(2)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Which series?</h2>
            <p className="text-zinc-400 text-sm mb-6">Pick everything you follow — you can change this later.</p>
            <div className="flex flex-col gap-3">
              {ALL_SERIES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSeries(s)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                    series.includes(s)
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                  )}
                >
                  <span className="font-semibold text-sm">{SERIES_LABELS[s]}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    series.includes(s) ? "border-orange-500 bg-orange-500" : "border-zinc-600"
                  )}>
                    {series.includes(s) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Back
              </button>
              <button
                onClick={finish}
                disabled={series.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Let&apos;s go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
