import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, isAdmin } from "@/lib/admin.functions";
import { getAuditLogs } from "@/lib/audit.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Crown, MessageSquare, TrendingUp, GraduationCap, Sparkles, Target, UserPlus, ShieldAlert } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const r = await isAdmin();
      if (!r.isAdmin) throw redirect({ to: "/dashboard" });
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function AdminPage() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="p-10 text-muted-foreground">Chargement des statistiques…</div>;
  if (error || !data) return <div className="p-10 text-destructive">Impossible de charger les stats.</div>;

  const { kpis, usageSeries, signupsSeries, topUsers, courseStats, topGoals, recentUsers, recentChats } = data;

  const pieData = [
    { name: "Premium", value: kpis.premium },
    { name: "Free", value: kpis.free },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Tableau de bord administrateur</h1>
          <p className="mt-1 text-muted-foreground">Vue d'ensemble en temps réel · rafraîchi toutes les 30s</p>
        </div>
        <Link to="/dashboard" className="text-sm text-primary hover:underline">← Retour à l'app</Link>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Utilisateurs totaux" value={kpis.totalUsers} sub={`+${kpis.newUsers7d} cette semaine`} />
        <Kpi icon={Crown} label="Premium" value={kpis.premium} sub={`Taux de conversion : ${kpis.conversionRate}%`} />
        <Kpi icon={MessageSquare} label="Questions Chef IA" value={kpis.totalChats} sub={`${kpis.chats30d} ces 30j`} />
        <Kpi icon={GraduationCap} label="Progression moy. cours" value={`${kpis.globalAvgProgress}%`} sub="Sur tous les apprenants" />
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Requêtes IA — 30 derniers jours</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={usageSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4 text-primary" /> Nouvelles inscriptions — 30j</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={signupsSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Répartition Premium / Free</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-primary" /> Objectifs des utilisateurs (mots-clés des questions)</h2>
          <div className="flex flex-wrap gap-2">
            {topGoals.length === 0 && <p className="text-sm text-muted-foreground">Pas encore assez de données.</p>}
            {topGoals.map((g) => (
              <Badge key={g.word} variant="secondary" className="text-sm">
                {g.word} <span className="ml-1 text-muted-foreground">×{g.count}</span>
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* Cours */}
      <section>
        <h2 className="mb-3 font-display text-2xl font-semibold">Performance des cours</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="p-3">Cours</th>
                <th className="p-3">Type</th>
                <th className="p-3">Apprenants</th>
                <th className="p-3">Terminés</th>
                <th className="p-3 w-1/3">Progression moyenne</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun cours.</td></tr>
              )}
              {courseStats.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3">{c.is_premium ? <Badge>Premium</Badge> : <Badge variant="secondary">Free</Badge>}</td>
                  <td className="p-3">{c.learners}</td>
                  <td className="p-3">{c.completed}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Progress value={c.avg} className="flex-1" />
                      <span className="w-10 text-right text-xs">{c.avg}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Top users + recent */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">Top utilisateurs (30j)</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">Utilisateur</th><th className="p-3 text-right">Questions</th></tr>
            </thead>
            <tbody>
              {topUsers.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">Pas d'activité.</td></tr>}
              {topUsers.map((u) => (
                <tr key={u.user_id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{u.full_name ?? u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{u.questions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">Nouveaux inscrits</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">Utilisateur</th><th className="p-3">Plan</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-3">{u.is_premium ? <Badge>Premium</Badge> : <Badge variant="secondary">Free</Badge>}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Dernières questions */}
      <section>
        <h2 className="mb-3 font-display text-2xl font-semibold">Dernières questions posées</h2>
        <Card className="divide-y">
          {recentChats.length === 0 && <p className="p-6 text-center text-muted-foreground">Pas encore de questions.</p>}
          {recentChats.map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.email}</span>
                <span>{new Date(c.created_at).toLocaleString("fr-FR")}</span>
              </div>
              <p className="mt-1 text-sm line-clamp-2">{c.content}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
