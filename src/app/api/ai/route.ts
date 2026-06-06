import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are MXFeed AI, an expert assistant for motocross and supercross fans.
You have deep knowledge of:
- MXGP / MX2 World Championship (riders, results, standings, history)
- EMX European Championship
- AMA Pro Motocross and Supercross
- All major riders: Prado, Herlings, Gajser, Febvre, Coenen, Sexton, Tomac, Webb, etc.
- Race calendars, venues, track info
- Team and manufacturer news
- Where to watch/stream in different countries (Motoplus, Eurosport, Peacock, Fox Sports, etc.)

Keep answers concise, factual, and conversational — like a knowledgeable fan talking to another fan.
If you don't know something current (like today's live results), say so and suggest where to check.
Always mention if information might be outdated (your knowledge cutoff is August 2025).`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
