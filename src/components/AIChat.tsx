"use client";

import { useState, useRef, useEffect } from "react";
import { AIMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Who leads the MXGP standings?",
  "What happened to Herlings this season?",
  "When is the next MXGP round?",
  "Where can I watch MXGP in Denmark?",
  "Who is in MX2 this year?",
];

export default function AIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const query = (text ?? input).trim();
    if (!query || loading) return;
    setInput("");

    const updated: AIMessage[] = [...messages, { role: "user", content: query }];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Sorry, I couldn't get an answer right now." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="text-4xl mb-4">🏍️</div>
          <h2 className="text-lg font-bold mb-1 text-center">Ask anything about MX</h2>
          <p className="text-zinc-400 text-sm text-center mb-8">Riders, results, standings, streams — I know it all.</p>
          <div className="flex flex-col gap-2 w-full max-w-sm">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:border-orange-500 hover:text-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-orange-500 text-white rounded-br-sm"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about any rider, race, or result..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-bold transition-colors text-sm"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
