import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askChef, getUsageToday } from "@/lib/ai-chef.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, ChefHat, Crown, Lock, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const search = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/chef")({
  validateSearch: search,
  component: ChefPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChefPage() {
  const { q } = Route.useSearch();
  const fetchAsk = useServerFn(askChef);
  const fetchUsage = useServerFn(getUsageToday);
  const qc = useQueryClient();

  const usageQ = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetchAsk({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
      qc.invalidateQueries({ queryKey: ["usage"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
      setMessages(next); // keep user msg
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const used = usageQ.data?.used ?? 0;
  const limit = usageQ.data?.limit ?? 3;
  const isPremium = usageQ.data?.isPremium ?? false;
  const limitReached = !isPremium && used >= limit;

  return (
    <div className="flex h-[100dvh] flex-col md:h-screen">
      <div className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Chef IA</h1>
          </div>
          <span className="text-xs text-muted-foreground">
            {isPremium ? "Premium · illimité" : `${used}/${limit} aujourd'hui`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <ChefHat className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-semibold">Bonjour, je suis votre Chef IA</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Demandez-moi une recette, un conseil ou une technique.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                    : "max-w-[90%] rounded-2xl border bg-card px-5 py-4"
                }
              >
                {m.role === "assistant" ? (
                  <AssistantMessage content={m.content} />
                ) : (
                  <p className="text-sm">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border bg-card px-5 py-4">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {limitReached ? (
        <div className="border-t bg-gradient-to-r from-primary/10 via-background to-primary/10 p-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              <span className="font-semibold">Limite quotidienne atteinte ({limit}/{limit})</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Passez à Premium pour un accès illimité au Chef IA, à tous les cours et plus encore.
            </p>
            <Button asChild size="lg" className="shadow-glow">
              <Link to="/premium">
                <Crown className="mr-2 h-4 w-4" /> Passer Premium · 10$/mois
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t bg-background p-4"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Demandez une recette, un conseil…"
              disabled={loading}
              className="h-12"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="lg">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
