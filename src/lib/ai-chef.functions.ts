import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_DAILY_LIMIT = 3;

const SYSTEM_PROMPT = `Tu es Chef IA, un chef cuisinier et pâtissier français d'exception. Tu réponds toujours en français.
Pour chaque demande de recette ou de plat, structure ta réponse en markdown EXACTEMENT ainsi:

## 🍽️ [Nom du plat]

**⏱️ Temps de préparation :** X min · **Cuisson :** X min · **Difficulté :** Facile/Moyen/Difficile

### Ingrédients
- liste à puces précise avec quantités

### Étapes
1. étapes numérotées et claires

### 💡 Conseils du chef
- 2-3 astuces pro

Pour les questions culinaires générales, réponds de manière concise, experte et chaleureuse.`;

export const askChef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(4000),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check premium
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();
    const isPremium = profile?.is_premium ?? false;

    // Rate limit for free users
    const today = new Date().toISOString().slice(0, 10);
    if (!isPremium) {
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      const used = usage?.count ?? 0;
      if (used >= FREE_DAILY_LIMIT) {
        throw new Error(
          `Limite quotidienne atteinte (${FREE_DAILY_LIMIT}/jour). Passez à Premium pour un usage illimité.`,
        );
      }
    }

    // Call Lovable AI
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
      if (res.status === 402)
        throw new Error("Crédits IA épuisés. Ajoutez des crédits dans Lovable Cloud.");
      throw new Error("Erreur du service IA");
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "";

    // Save chat history
    const userMsg = data.messages[data.messages.length - 1];
    await supabase.from("ai_chats").insert([
      { user_id: userId, role: "user", content: userMsg.content },
      { user_id: userId, role: "assistant", content: reply },
    ]);

    // Increment usage
    if (!isPremium) {
      const { data: existing } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("ai_usage")
          .update({ count: existing.count + 1 })
          .eq("user_id", userId)
          .eq("day", today);
      } else {
        await supabase.from("ai_usage").insert({ user_id: userId, day: today, count: 1 });
      }
    }

    return { reply, isPremium };
  });

export const getUsageToday = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("is_premium, full_name, email").eq("id", userId).single(),
      supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle(),
    ]);
    return {
      used: usage?.count ?? 0,
      limit: FREE_DAILY_LIMIT,
      isPremium: profile?.is_premium ?? false,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });

export const upgradeToPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({ is_premium: true }).eq("id", userId);
    return { ok: true };
  });
