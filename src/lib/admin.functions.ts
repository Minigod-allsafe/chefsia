import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// F-06: only super_admins can read global stats. Org admins must use the
// per-org dashboards instead (which are scoped via RLS).
async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès refusé : réservé aux super admins.");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "super_admin"]);
    return { isAdmin: (data?.length ?? 0) > 0 };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const today = new Date();
    const since30 = new Date(today.getTime() - 30 * 86400_000).toISOString();
    const since7 = new Date(today.getTime() - 7 * 86400_000).toISOString();

    const [
      profilesAll,
      premiumCount,
      newUsers7d,
      newUsers30d,
      chatsAll,
      chats30d,
      usage30d,
      coursesAll,
      progressAll,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, is_premium, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("is_premium", true),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("ai_chats").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("ai_chats").select("id, user_id, role, content, created_at").gte("created_at", since30).order("created_at", { ascending: false }),
      supabaseAdmin.from("ai_usage").select("day, count, user_id").gte("day", since30.slice(0, 10)),
      supabaseAdmin.from("courses").select("id, title, is_premium"),
      supabaseAdmin.from("course_progress").select("course_id, user_id, progress_pct"),
    ]);

    const totalUsers = profilesAll.data?.length ?? 0;
    const premium = premiumCount.count ?? 0;
    const conversionRate = totalUsers ? Math.round((premium / totalUsers) * 1000) / 10 : 0;

    // Activité IA / jour (30j)
    const dailyUsage = new Map<string, number>();
    (usage30d.data ?? []).forEach((u) => {
      dailyUsage.set(u.day, (dailyUsage.get(u.day) ?? 0) + u.count);
    });
    const usageSeries = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(today.getTime() - (29 - i) * 86400_000).toISOString().slice(0, 10);
      return { day: d.slice(5), requests: dailyUsage.get(d) ?? 0 };
    });

    // Nouveaux users / jour (30j)
    const signupsByDay = new Map<string, number>();
    (profilesAll.data ?? []).forEach((p) => {
      const d = p.created_at.slice(0, 10);
      signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
    });
    const signupsSeries = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(today.getTime() - (29 - i) * 86400_000).toISOString().slice(0, 10);
      return { day: d.slice(5), signups: signupsByDay.get(d) ?? 0 };
    });

    // Top utilisateurs (chats)
    const chatsByUser = new Map<string, number>();
    (chats30d.data ?? []).filter((c) => c.role === "user").forEach((c) => {
      chatsByUser.set(c.user_id, (chatsByUser.get(c.user_id) ?? 0) + 1);
    });
    const profileMap = new Map((profilesAll.data ?? []).map((p) => [p.id, p]));
    const topUsers = Array.from(chatsByUser.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, n]) => ({
        user_id: uid,
        email: profileMap.get(uid)?.email ?? "—",
        full_name: profileMap.get(uid)?.full_name ?? null,
        questions: n,
      }));

    // Cours : taux de complétion moyen
    const courses = coursesAll.data ?? [];
    const progress = progressAll.data ?? [];
    const courseStats = courses.map((c) => {
      const ps = progress.filter((p) => p.course_id === c.id);
      const avg = ps.length ? Math.round(ps.reduce((a, p) => a + p.progress_pct, 0) / ps.length) : 0;
      const completed = ps.filter((p) => p.progress_pct >= 100).length;
      return { id: c.id, title: c.title, is_premium: c.is_premium, learners: ps.length, avg, completed };
    });

    const globalAvgProgress = progress.length
      ? Math.round(progress.reduce((a, p) => a + p.progress_pct, 0) / progress.length)
      : 0;

    // Objectifs déduits = fréquence des mots clés dans les questions user
    const wordCount = new Map<string, number>();
    const STOP = new Set([
      "le","la","les","un","une","des","de","du","et","ou","à","au","aux","en","pour","avec","sans","sur","dans","par",
      "je","tu","il","elle","on","nous","vous","ils","elles","mon","ma","mes","ton","ta","tes","son","sa","ses","ce",
      "cette","ces","que","qui","quoi","comment","est","sont","être","avoir","fait","faire","plus","moins","comme",
      "the","a","an","of","to","for","and","or","is","are","my","i","it","how","what",
    ]);
    (chats30d.data ?? []).filter((c) => c.role === "user").forEach((c) => {
      c.content
        .toLowerCase()
        .replace(/[^\p{L}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w))
        .forEach((w) => wordCount.set(w, (wordCount.get(w) ?? 0) + 1));
    });
    const topGoals = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word, count]) => ({ word, count }));

    return {
      kpis: {
        totalUsers,
        premium,
        free: totalUsers - premium,
        conversionRate,
        newUsers7d: newUsers7d.count ?? 0,
        newUsers30d: newUsers30d.count ?? 0,
        totalChats: chatsAll.count ?? 0,
        chats30d: chats30d.data?.length ?? 0,
        globalAvgProgress,
      },
      usageSeries,
      signupsSeries,
      topUsers,
      courseStats,
      topGoals,
      recentUsers: (profilesAll.data ?? []).slice(0, 15),
      recentChats: (chats30d.data ?? [])
        .filter((c) => c.role === "user")
        .slice(0, 20)
        .map((c) => ({
          ...c,
          email: profileMap.get(c.user_id)?.email ?? "—",
        })),
    };
  });
