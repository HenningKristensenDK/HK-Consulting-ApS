"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/feed", label: "Feed", icon: "⚡" },
  { href: "/standings", label: "Standings", icon: "🏆" },
  { href: "/ai", label: "Ask AI", icon: "🤖" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-zinc-800 flex z-50">
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors text-xs font-medium",
            path.startsWith(item.href) ? "text-orange-500" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
