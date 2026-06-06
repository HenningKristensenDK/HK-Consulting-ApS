"use client";

import { useState } from "react";
import { SeriesStandings } from "@/lib/types";
import { SERIES_LABELS } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface Props {
  standings: SeriesStandings[];
}

const FLAG_MAP: Record<string, string> = {
  NED: "🇳🇱", BEL: "🇧🇪", FRA: "🇫🇷", GBR: "🇬🇧", ITA: "🇮🇹",
  ESP: "🇪🇸", GER: "🇩🇪", USA: "🇺🇸", AUS: "🇦🇺", SWE: "🇸🇪",
  DEN: "🇩🇰", FIN: "🇫🇮", SLO: "🇸🇮", SVK: "🇸🇰", COL: "🇨🇴",
  JOR: "🇯🇴", TUR: "🇹🇷", CHE: "🇨🇭",
};

export default function StandingsTable({ standings }: Props) {
  const [active, setActive] = useState(standings[0]?.series ?? "mxgp");
  const current = standings.find(s => s.series === active);

  return (
    <div>
      {/* Series tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {standings.map(s => (
          <button
            key={s.series}
            onClick={() => setActive(s.series)}
            className={cn(
              "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors",
              active === s.series
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            )}
          >
            {SERIES_LABELS[s.series] ?? s.series}
          </button>
        ))}
      </div>

      {current && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-bold">{current.label} {current.season}</span>
            <span className="text-xs text-zinc-500">Points</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {current.riders.map((rider) => (
              <div key={rider.rider} className="flex items-center gap-3 px-4 py-3">
                <span className={cn(
                  "text-sm font-black w-6 text-center",
                  rider.position === 1 ? "text-yellow-400" :
                  rider.position === 2 ? "text-zinc-300" :
                  rider.position === 3 ? "text-orange-400" : "text-zinc-500"
                )}>
                  {rider.position}
                </span>
                <span className="text-base">{FLAG_MAP[rider.countryCode] ?? "🏳️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{rider.rider}</div>
                  <div className="text-xs text-zinc-500 truncate">{rider.team}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-400">{rider.points}</div>
                  {rider.wins > 0 && <div className="text-[10px] text-zinc-500">{rider.wins}W</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
