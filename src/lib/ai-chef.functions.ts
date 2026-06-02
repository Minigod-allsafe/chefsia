import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getReqMeta() {
  let ip: string | null = null;
  let ua: string | null = null;
  try { ip = getRequestIP({ xForwardedFor: true }) ?? null; } catch {}
  try { ua = getRequestHeader("user-agent") ?? null; } catch {}
  return { ip, ua };
}

async function audit(params: {
  user_id: string;
  email?: string | null;
  action: string;
  resource?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { ip, ua } = getReqMeta();
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: params.user_id,
      user_email: params.email ?? null,
      action: params.action,
      resource: params.resource ?? null,
      metadata: (params.metadata ?? null) as any,
      ip_address: ip,
      user_agent: ua,
    });
  } catch {
    // best effort
  }
}

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
    let reply: string = json.choices?.[0]?.message?.content ?? "";

    // If the reply contains a recipe (has the structured heading), generate an image.
    const dishMatch = reply.match(/##\s*🍽️\s*(.+)/);
    if (dishMatch) {
      const dishName = dishMatch[1].trim();
      try {
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: `Photographie culinaire professionnelle de "${dishName}". Plat fini, dressé avec soin sur une belle assiette, lumière naturelle douce, vue de dessus 3/4, style magazine gastronomique, très appétissant, haute résolution.`,
              },
            ],
            modalities: ["image", "text"],
          }),
        });
        if (imgRes.ok) {
          const imgJson = await imgRes.json();
          const url: string | undefined =
            imgJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (url) {
            reply = `![${dishName}](${url})\n\n${reply}`;
          }
        }
      } catch {
        // Image generation is best-effort; ignore failure.
      }
    }

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
      supabase
        .from("profiles")
        .select("is_premium, full_name, email, phone")
        .eq("id", userId)
        .maybeSingle(),
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
      phone: profile?.phone ?? null,
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(1).max(120).optional(),
        phone: z
          .string()
          .trim()
          .max(30)
          .regex(/^[+0-9 ().-]*$/, "Numéro invalide")
          .optional()
          .or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { full_name?: string; phone?: string | null } = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone === "" ? null : data.phone;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upgradeToPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({ is_premium: true }).eq("id", userId);
    return { ok: true };
  });
