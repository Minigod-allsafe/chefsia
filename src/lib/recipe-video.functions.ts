import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STEP_LABELS = [
  "Ingrédients",
  "Préparation",
  "Cuisson",
  "Dressage",
  "Résultat final",
] as const;

type Scene = {
  step: number;
  label: string;
  caption: string;
  image: string; // data:image/png;base64,...
  duration_ms: number;
};

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

function extractJSON(raw: string): any {
  let cleaned = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const objStart = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (objStart !== -1 && end > objStart) {
      cleaned = cleaned.slice(objStart, end + 1);
    } else {
      throw new Error("Aucun JSON trouvé dans la réponse");
    }
  }
  return JSON.parse(cleaned);
}

async function buildStoryboard(
  recipeMarkdown: string,
  apiKey: string,
): Promise<{ dish: string; scenes: Array<Omit<Scene, "image"> & { image_prompt?: string }> }> {
  const callModel = async (model: string, attempt: number): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content:
                'Tu es un réalisateur de vidéo culinaire. Réponds UNIQUEMENT avec un JSON valide (pas de markdown) au format: {"dish": string, "scenes": [{"step": 1-5, "label": "Ingrédients"|"Préparation"|"Cuisson"|"Dressage"|"Résultat final", "caption": string ≤120 chars, "image_prompt": string en anglais pour photo culinaire, "duration_ms": 3000-6000}]}. Exactement 5 scènes dans l\'ordre des labels.',
            },
            { role: "user", content: `Recette:\n\n${recipeMarkdown.slice(0, 6000)}` },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const msg = e?.name === "AbortError" ? "timeout réseau (45s)" : (e?.message ?? "erreur réseau");
      console.error(`[storyboard] ${model} attempt#${attempt} fetch failed:`, msg);
      throw new Error(`Réseau: ${msg}`);
    }
    clearTimeout(timeoutId);

    if (res.status === 429) throw new Error("Quota IA atteint (429). Réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés (402). Ajoutez des crédits dans l'espace de travail.");
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[storyboard] ${model} attempt#${attempt} HTTP ${res.status}:`, errText.slice(0, 300));
      throw new Error(`AI ${res.status}: ${errText.slice(0, 180)}`);
    }

    const json = (await res.json().catch(() => null)) as any;
    const choice = json?.choices?.[0];
    const content = choice?.message?.content;
    const finishReason = choice?.finish_reason;
    console.log(
      `[storyboard] ${model} attempt#${attempt} finish=${finishReason} len=${content?.length ?? 0} usage=`,
      json?.usage,
    );

    if (!content || String(content).trim() === "") {
      if (finishReason === "length") {
        throw new Error("Réponse IA tronquée (limite tokens).");
      }
      throw new Error(`Réponse IA vide (finish=${finishReason ?? "?"})`);
    }
    return content as string;
  };

  const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-pro"];
  let lastErr: unknown = null;
  let content: string | null = null;
  outer: for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        content = await callModel(model, attempt);
        break outer;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("402") || msg.includes("Crédits")) break outer;
        if (msg.includes("429") || msg.includes("Quota")) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  if (!content) {
    throw new Error(lastErr instanceof Error ? lastErr.message : "Échec après 3 tentatives");
  }

  let parsed: any;
  try {
    parsed = extractJSON(content);
  } catch {
    console.error("[storyboard] JSON parse failed. Raw content:", content.slice(0, 500));
    throw new Error("JSON storyboard invalide");
  }
  if (!parsed?.dish || !Array.isArray(parsed?.scenes) || parsed.scenes.length === 0) {
    throw new Error("Storyboard incomplet");
  }
  return {
    dish: String(parsed.dish),
    scenes: parsed.scenes.slice(0, 5).map((s: any, i: number) => {
      const step = Number(s.step ?? i + 1);
      return {
        step,
        label: STEP_LABELS[Math.min(4, Math.max(0, step - 1))],
        caption: String(s.caption ?? ""),
        duration_ms: Math.min(6000, Math.max(3000, Number(s.duration_ms ?? 4000))),
        image_prompt: String(s.image_prompt ?? s.caption ?? ""),
      };
    }),
  };
}

export const getRecipeVideo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chatId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("recipe_videos")
      .select("id, status, scenes, dish_name, error, updated_at")
      .eq("chat_id", data.chatId)
      .maybeSingle();
    return row ?? null;
  });

// Coût d'une génération vidéo (storyboard + 5 images) en crédits quotidiens.
// 1 crédit => les 3 requêtes gratuites quotidiennes autorisent jusqu'à 3 vidéos.
const VIDEO_CREDIT_COST = 1;
const FREE_DAILY_LIMIT = 3;


export const generateRecipeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chatId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Idempotency: if already exists, return current status
    const { data: existing } = await supabase
      .from("recipe_videos")
      .select("id, status")
      .eq("chat_id", data.chatId)
      .maybeSingle();
    if (existing && existing.status !== "failed") {
      return { id: existing.id, status: existing.status };
    }

    // Fetch the source recipe message (assistant message)
    const { data: chat, error: chatErr } = await supabase
      .from("ai_chats")
      .select("id, role, content, user_id")
      .eq("id", data.chatId)
      .maybeSingle();
    if (chatErr || !chat) throw new Error("Recette introuvable");
    if (chat.user_id !== userId) throw new Error("Accès refusé");
    if (chat.role !== "assistant") throw new Error("Message non-recette");

    // --- Vérification des crédits avant toute consommation API ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();
    const isPremium = profile?.is_premium ?? false;
    const today = new Date().toISOString().slice(0, 10);
    let usedToday = 0;
    if (!isPremium) {
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      usedToday = usage?.count ?? 0;
      const remaining = Math.max(0, FREE_DAILY_LIMIT - usedToday);
      if (remaining < VIDEO_CREDIT_COST) {
        const msg =
          remaining === 0
            ? `Crédits épuisés pour aujourd'hui (${FREE_DAILY_LIMIT}/jour en plan Free). La génération vidéo coûte ${VIDEO_CREDIT_COST} crédits. Passez Premium pour un usage illimité.`
            : `Crédits insuffisants : il vous reste ${remaining} crédit(s) aujourd'hui mais la vidéo en coûte ${VIDEO_CREDIT_COST}. Passez Premium pour continuer.`;
        // Persist a failed row so the player UI can display the message.
        const failPayload = {
          chat_id: data.chatId,
          user_id: userId,
          status: "failed" as const,
          scenes: [],
          error: msg,
        };
        if (existing) {
          await supabase.from("recipe_videos").update(failPayload).eq("id", existing.id);
        } else {
          await supabase.from("recipe_videos").insert(failPayload);
        }
        throw new Error(msg);
      }
    }

    // Insert pending row
    const upsertPayload = {
      chat_id: data.chatId,
      user_id: userId,
      status: "generating" as const,
      scenes: [],
      error: null,
    };
    if (existing) {
      await supabase
        .from("recipe_videos")
        .update(upsertPayload)
        .eq("id", existing.id);
    } else {
      await supabase.from("recipe_videos").insert(upsertPayload);
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");

    try {
      const storyboard = await buildStoryboard(chat.content, apiKey).catch((err) => {
        throw new Error(`Échec génération storyboard: ${err instanceof Error ? err.message : String(err)}`);
      });


      // Generate the 5 images sequentially to stay under gateway rate limits
      const scenes: Scene[] = [];
      for (const s of storyboard.scenes) {
        const fullPrompt = `Professional editorial food photography, ${(s as any).image_prompt}. Soft natural light, shallow depth of field, magazine style, high detail, appetizing.`;
        const image = await generateImage(fullPrompt, apiKey);
        scenes.push({
          step: s.step,
          label: s.label,
          caption: s.caption,
          duration_ms: s.duration_ms,
          image: image ?? "",
        });
      }

      const { error: updErr } = await supabase
        .from("recipe_videos")
        .update({
          status: "ready",
          scenes: scenes as any,
          dish_name: storyboard.dish,
          error: null,
        })
        .eq("chat_id", data.chatId);
      if (updErr) throw new Error(updErr.message);

      // --- Déduction des crédits après succès uniquement ---
      if (!isPremium) {
        const newCount = usedToday + VIDEO_CREDIT_COST;
        const { data: existingUsage } = await supabase
          .from("ai_usage")
          .select("count")
          .eq("user_id", userId)
          .eq("day", today)
          .maybeSingle();
        if (existingUsage) {
          await supabase
            .from("ai_usage")
            .update({ count: newCount })
            .eq("user_id", userId)
            .eq("day", today);
        } else {
          await supabase
            .from("ai_usage")
            .insert({ user_id: userId, day: today, count: VIDEO_CREDIT_COST });
        }
      }

      return { status: "ready" as const, dish: storyboard.dish };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      await supabase
        .from("recipe_videos")
        .update({ status: "failed", error: msg })
        .eq("chat_id", data.chatId);
      throw new Error(msg);
    }
  });
