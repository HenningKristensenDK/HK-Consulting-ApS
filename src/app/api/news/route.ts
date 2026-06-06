import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { NewsItem, Series } from "@/lib/types";

const parser = new Parser({ timeout: 10000 });

interface FeedSource {
  url: string;
  name: string;
  series: Series[];
  region: string[];
}

const SOURCES: FeedSource[] = [
  { url: "https://www.mxgp.com/rss/en", name: "MXGP", series: ["mxgp", "emx"], region: ["europe", "both"] },
  { url: "https://www.vitalmx.com/rss", name: "Vital MX", series: ["mxgp", "ama_mx", "supercross"], region: ["both", "usa", "europe"] },
  { url: "https://www.racerxonline.com/feed", name: "Racer X", series: ["ama_mx", "supercross", "mxgp"], region: ["both", "usa", "europe"] },
  { url: "https://www.mxvice.com/feed", name: "MX Vice", series: ["mxgp", "emx"], region: ["europe", "both"] },
  { url: "https://motocrossminded.com/feed", name: "Motocross Minded", series: ["mxgp", "emx"], region: ["europe", "both"] },
];

function detectSeries(title: string, desc: string): Series[] {
  const text = `${title} ${desc}`.toLowerCase();
  const result: Series[] = [];
  if (text.match(/\bmxgp\b|motogp mx|mx1|mx2/)) result.push("mxgp");
  if (text.match(/\bemx\b|european championship/)) result.push("emx");
  if (text.match(/\bsupercross\b|\bsx\b/)) result.push("supercross");
  if (text.match(/\bama\b|pro motocross|lucas oil/)) result.push("ama_mx");
  return result.length > 0 ? result : ["mxgp"];
}

function extractImage(item: Parser.Item): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enc = (item as any).enclosure;
  if (enc?.url && enc.url.match(/\.(jpg|jpeg|png|webp)/i)) return enc.url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = item.content ?? (item as any)["content:encoded"] ?? "";
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1];
}

export async function GET(req: NextRequest) {
  const series = req.nextUrl.searchParams.get("series")?.split(",") as Series[] | undefined;
  const region = req.nextUrl.searchParams.get("region") ?? "europe";

  const filtered = SOURCES.filter(s =>
    s.region.includes(region) &&
    (!series || s.series.some(sr => series.includes(sr)))
  );

  const results: NewsItem[] = [];

  await Promise.allSettled(
    filtered.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        for (const item of feed.items.slice(0, 8)) {
          const detectedSeries = detectSeries(item.title ?? "", item.contentSnippet ?? "");
          results.push({
            id: item.guid ?? item.link ?? Math.random().toString(),
            title: item.title ?? "Untitled",
            summary: item.contentSnippet?.slice(0, 200) ?? "",
            source: source.name,
            sourceUrl: source.url,
            publishedAt: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
            imageUrl: extractImage(item),
            series: detectedSeries,
            tags: [],
            link: item.link ?? "#",
          });
        }
      } catch {
        // individual feed failures are silently skipped
      }
    })
  );

  results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({ items: results.slice(0, 40) });
}
