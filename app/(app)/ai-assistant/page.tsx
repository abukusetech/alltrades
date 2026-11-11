"use client";

import * as React from "react";
import { Bot, Send, Sparkles, RotateCcw } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STARTER_PROMPTS = [
  "Help me review my EURUSD trading plan for today.",
  "Explain premium, discount, and equilibrium using ICT concepts.",
  "Help me identify mistakes I should look for in my trading journal.",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.error || "The assistant could not respond. Please try again.");
      }

      setMessages([...nextMessages, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    if (loading) return;
    setMessages([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl flex-col">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            AllTrades Intelligence
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            AI Trading Assistant
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Think through setups, understand trading concepts, and strengthen your discipline.
          </p>
        </div>
        <button
          type="button"
          onClick={resetChat}
          disabled={loading || messages.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-ink-600 shadow-card transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          New chat
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">AllTrades AI</p>
            <p className="text-xs text-ink-500">Trading education and analysis support</p>
          </div>
          <span className="ml-auto rounded-full bg-profit-bg px-2.5 py-1 text-xs font-medium text-profit-text">
            Ready
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-surface-soft p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[360px] max-w-2xl flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-ink-900">
                What are we working on today?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
                Ask about ICT, SMC, risk management, trade psychology, or share your own analysis for a second opinion.
              </p>
              <div className="mt-6 grid w-full gap-2 text-left sm:grid-cols-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="rounded-lg border border-border bg-white p-3 text-left text-sm text-ink-700 transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm leading-6 text-white sm:max-w-[80%]"
                      : "max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm leading-6 text-ink-800 shadow-card sm:max-w-[85%]"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm text-ink-500 shadow-card">
                Thinking through that…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-loss-border bg-loss-bg px-3 py-2 text-sm text-loss-text">
              {error}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="border-t border-border bg-white p-3 sm:p-4"
        >
          <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-soft p-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Ask your trading question…"
              className="max-h-36 min-h-[48px] flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:ring-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-ink-400">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>{input.length}/4,000</span>
          </div>
        </form>
      </div>

      <p className="mx-auto mt-3 max-w-3xl text-center text-xs leading-5 text-ink-400">
        AI responses can be wrong. Verify market information and follow your account rules. AllTrades AI does not execute trades or replace your own risk checks.
      </p>
    </div>
  );
}
