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

async function buildStoryboard(
  recipeMarkdown: string,
  apiKey: string,
): Promise<{ dish: string; scenes: Omit<Scene, "image">[] } | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Tu es un réalisateur de vidéo culinaire. À partir d'une recette en markdown, génère un storyboard de 5 scènes courtes en français pour une vidéo de présentation.",
        },
        {
          role: "user",
          content: `Recette:\n\n${recipeMarkdown}\n\nGénère le storyboard via l'outil "make_storyboard".`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "make_storyboard",
            description: "Produit un storyboard de 5 scènes pour la vidéo culinaire.",
            parameters: {
              type: "object",
              properties: {
                dish: { type: "string", description: "Nom du plat" },
                scenes: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      step: { type: "integer", enum: [1, 2, 3, 4, 5] },
                      label: {
                        type: "string",
                        enum: [...STEP_LABELS],
                      },
                      caption: {
                        type: "string",
                        description:
                          "Sous-titre court (≤120 caractères) affiché à l'écran pour cette scène.",
                      },
                      image_prompt: {
                        type: "string",
                        description:
                          "Prompt en anglais pour générer une photo culinaire pro de cette étape (style éditorial, lumière naturelle).",
                      },
                      duration_ms: {
                        type: "integer",
                        minimum: 3000,
                        maximum: 6000,
                      },
                    },
                    required: ["step", "label", "caption", "image_prompt", "duration_ms"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["dish", "scenes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "make_storyboard" } },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return null;
  try {
    const parsed = JSON.parse(call.function.arguments) as {
      dish: string;
      scenes: Array<{
        step: number;
        label: string;
        caption: string;
        image_prompt: string;
        duration_ms: number;
      }>;
    };
    return {
      dish: parsed.dish,
      scenes: parsed.scenes.map((s) => ({
        step: s.step,
        label: s.label,
        caption: s.caption,
        duration_ms: s.duration_ms,
        // image_prompt kept on the fly only (not persisted)
        ...({ image_prompt: s.image_prompt } as any),
      })),
    };
  } catch {
    return null;
  }
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
const VIDEO_CREDIT_COST = 2;
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
      const storyboard = await buildStoryboard(chat.content, apiKey);
      if (!storyboard) throw new Error("Échec génération storyboard");

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
