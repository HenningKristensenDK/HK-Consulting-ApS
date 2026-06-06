import { NewsItem } from "@/lib/types";
import { SERIES_LABELS } from "@/lib/preferences";
import { cn } from "@/lib/utils";

interface Props {
  item: NewsItem;
  featured?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsCard({ item, featured = false }: Props) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all group",
        featured ? "col-span-2" : ""
      )}
    >
      {item.imageUrl && (
        <div className={cn("w-full bg-zinc-800 overflow-hidden", featured ? "h-48" : "h-36")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {item.series.map(s => (
            <span key={s} className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
              {SERIES_LABELS[s] ?? s}
            </span>
          ))}
        </div>
        <h3 className={cn("font-bold leading-tight text-white group-hover:text-orange-400 transition-colors", featured ? "text-base" : "text-sm")}>
          {item.title}
        </h3>
        {featured && item.summary && (
          <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-zinc-500 font-medium">{item.source}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-600">{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}
