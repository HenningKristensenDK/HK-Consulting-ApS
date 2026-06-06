"use client";

import { useEffect, useState } from "react";
import { SeriesStandings } from "@/lib/types";
import { getPrefs } from "@/lib/preferences";
import StandingsTable from "@/components/StandingsTable";
import BottomNav from "@/components/BottomNav";

export default function StandingsPage() {
  const [standings, setStandings] = useState<SeriesStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const prefs = getPrefs();

  useEffect(() => {
    fetch("/api/standings")
      .then(r => r.json())
      .then(d => {
        const all: SeriesStandings[] = d.standings ?? [];
        // filter to user's series but keep both MXGP classes together
        const filtered = all.filter(s => prefs.series.some(ps =>
          ps === s.series || (ps === "mxgp" && s.label.includes("MX2"))
        ));
        setStandings(filtered.length > 0 ? filtered : all);
      })
      .finally(() => setLoading(false));
  }, [prefs.series]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <span className="text-xl font-black">MX<span className="text-orange-500">Feed</span></span>
        <span className="text-sm text-zinc-400 ml-2">Standings</span>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-64 animate-pulse" />)}
          </div>
        ) : (
          <StandingsTable standings={standings} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
