import AIChat from "@/components/AIChat";
import BottomNav from "@/components/BottomNav";

export default function AIPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800 px-4 py-3 shrink-0">
        <span className="text-xl font-black">MX<span className="text-orange-500">Feed</span></span>
        <span className="text-sm text-zinc-400 ml-2">AI Assistant</span>
      </header>

      <div className="flex-1 overflow-hidden pb-20">
        <AIChat />
      </div>

      <BottomNav />
    </div>
  );
}
