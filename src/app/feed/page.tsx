"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsItem } from "@/lib/types";
import { getPrefs, SERIES_LABELS } from "@/lib/preferences";
import NewsCard from "@/components/NewsCard";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

export default function FeedPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const prefs = getPrefs();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        region: prefs.region,
        series: prefs.series.join(","),
      });
      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      setNews(data.items ?? []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [prefs.region, prefs.series]);

  useEffect(() => { load(); }, [load]);

  const filtered = activeFilter === "all"
    ? news
    : news.filter(n => n.series.includes(activeFilter as never));

  const filters = ["all", ...prefs.series];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black">MX<span className="text-orange-500">Feed</span></span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{prefs.country}</span>
        </div>
        <button onClick={load} className="text-zinc-400 hover:text-white transition-colors text-lg">↺</button>
      </header>

      {/* Series filter tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors",
              activeFilter === f
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            )}
          >
            {f === "all" ? "All" : SERIES_LABELS[f] ?? f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn("bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse", i === 0 ? "col-span-2 h-64" : "h-48")} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="text-4xl mb-3">📡</div>
            <p className="font-semibold">No news loaded</p>
            <p className="text-sm mt-1">RSS feeds may be temporarily unavailable.</p>
            <button onClick={load} className="mt-4 text-orange-500 text-sm font-medium">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, i) => (
              <NewsCard key={item.id} item={item} featured={i === 0} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
