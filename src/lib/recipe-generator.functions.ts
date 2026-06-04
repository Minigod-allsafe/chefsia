import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600),
  ingredients: z.array(z.string().min(1).max(200)).min(1).max(40),
  steps: z.array(z.string().min(1).max(800)).min(1).max(30),
  cooking_time: z.string().min(1).max(60),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  image_prompt: z.string().min(1).max(800),
  video_prompt: z.string().min(1).max(800),
});

export type Recipe = z.infer<typeof RecipeSchema>;

const SYSTEM = `You are ChefIA, a Michelin-grade culinary AI. For every user request, return ONLY a JSON object (no markdown, no commentary) matching this exact schema:
{
  "title": string,
  "description": string (short editorial pitch),
  "ingredients": string[] (precise quantities, max 20),
  "steps": string[] (clear ordered instructions, max 12),
  "cooking_time": string (e.g. "35 min"),
  "difficulty": "Easy" | "Medium" | "Hard",
  "image_prompt": string (English, editorial food photography prompt for the final plated dish, premium dark moody lighting, warm orange accents),
  "video_prompt": string (English, cinematic step-by-step cooking video prompt, Michelin atmosphere)
}
Respond in the same language as the user for title, description, ingredients, steps. Keep image_prompt and video_prompt in English. NEVER include text outside the JSON.`;

async function callAI(prompt: string, apiKey: string): Promise<Recipe> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Trop de requêtes. Réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits pour continuer.");
    throw new Error(`AI ${res.status}: ${t.slice(0, 180)}`);
  }
  const json = (await res.json()) as any;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse IA vide");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("JSON invalide retourné par l'IA");
  }
  return RecipeSchema.parse(parsed);
}

async function generateImageB64(prompt: string, apiKey: string): Promise<string | null> {
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

export const generateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prompt: z.string().trim().min(2).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");
    const recipe = await callAI(data.prompt, apiKey);
    return { recipe };
  });

export const generateRecipeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ image_prompt: z.string().min(1).max(800) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");
    const enriched = `Editorial Michelin-star food photography. ${data.image_prompt}. Matte black plate, cinematic side lighting, warm orange rim light, shallow depth of field, magazine style, ultra-detailed, appetizing.`;
    const image_url = await generateImageB64(enriched, apiKey);
    if (!image_url) throw new Error("Échec de la génération d'image");
    return { image_url };
  });

// "Video" fallback: generate 3 step frames for a client-side slideshow.
export const generateRecipeSlideshow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        video_prompt: z.string().min(1).max(800),
        steps: z.array(z.string().min(1).max(800)).min(1).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquante");
    const labels = ["Préparation", "Cuisson", "Dressage"];
    const picked = data.steps.slice(0, 3);
    const frames: { label: string; image: string }[] = [];
    for (let i = 0; i < picked.length; i++) {
      const p = `Cinematic top-down editorial cooking photography, ${labels[i] ?? `Étape ${i + 1}`} — ${picked[i]}. ${data.video_prompt}. Warm orange key light, dark luxurious kitchen, shallow depth of field, magazine style.`;
      const img = await generateImageB64(p, apiKey);
      if (img) frames.push({ label: labels[i] ?? `Étape ${i + 1}`, image: img });
    }
    if (frames.length === 0) throw new Error("Échec de la génération du diaporama");
    return { frames };
  });
