import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listCoursesPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("courses")
    .select("id, title, description, thumbnail_url, duration_min, is_premium, position")
    .order("position", { ascending: true });
  return data ?? [];
});

export const listCoursesWithProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // video_url is column-revoked from anon/authenticated: must be read with admin client
    const [{ data: courses }, { data: progress }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("courses")
        .select("id, title, description, thumbnail_url, video_url, duration_min, is_premium, position")
        .order("position", { ascending: true }),
      supabase.from("course_progress").select("course_id, progress_pct").eq("user_id", userId),
      supabase.from("profiles").select("is_premium").eq("id", userId).single(),
    ]);
    const map = new Map((progress ?? []).map((p) => [p.course_id, p.progress_pct]));
    const isPremium = profile?.is_premium ?? false;
    return {
      isPremium,
      courses: (courses ?? []).map((c) => ({
        ...c,
        // F-03: never expose premium video URLs to non-premium users.
        video_url: c.is_premium && !isPremium ? null : c.video_url,
        progress_pct: map.get(c.id) ?? 0,
      })),
    };
  });


export const setProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ courseId: z.string().uuid(), progress: z.number().min(0).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("course_progress")
      .upsert({ user_id: userId, course_id: data.courseId, progress_pct: data.progress });
    return { ok: true };
  });
