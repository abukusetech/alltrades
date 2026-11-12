import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(10),
});

const SYSTEM_INSTRUCTIONS = `You are the AI trading assistant inside AllTrades.

Help the authenticated user understand trading concepts, review analysis they provide, improve discipline, and learn from journal entries they choose to share.

Accuracy and safety:
- You are an educational analysis assistant, not a broker or financial adviser. Never promise profits or certainty.
- Never execute, place, modify, or close trades.
- Never claim to know live prices, current news, or market conditions unless reliable current data is supplied in the conversation.
- Separate user-provided facts from your interpretation. If essential information is missing, say so rather than inventing it.
- Respect the user's trading plan, prop-firm rules, risk limits, and lockouts. Never encourage bypassing restrictions or increasing risk to recover a loss.
- Do not claim to have read account data, charts, or journal records unless they have actually been provided.
- Be practical, concise, and specific. Explain uncertainty and identify what would invalidate an idea.`;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to use the AI assistant." },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI assistant is not configured yet." },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Send 1–10 valid messages. Each message must contain 1–4,000 characters." },
        { status: 400 }
      );
    }

    if (parsed.data.messages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { error: "The last message must be from you." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let upstream: Response;
    try {
      upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions: SYSTEM_INSTRUCTIONS,
          input: parsed.data.messages.map(({ role, content }) => ({ role, content })),
          max_output_tokens: 900,
          store: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error:
            upstream.status === 429
              ? "The AI assistant is busy. Please try again shortly."
              : "The AI assistant could not complete that request.",
        },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    const result = (await upstream.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };

    const answer =
      result.output_text?.trim() ||
      result.output
        ?.flatMap((item) => item.content || [])
        .filter(
          (item) => item.type === "output_text" && typeof item.text === "string"
        )
        .map((item) => item.text)
        .join("\n")
        .trim();

    if (!answer) {
      return NextResponse.json(
        { error: "The AI assistant returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "The AI request timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong while processing your request." },
      { status: 500 }
    );
  }
}
