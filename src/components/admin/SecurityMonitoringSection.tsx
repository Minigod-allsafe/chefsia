import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecurityOverview } from "@/lib/security.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ShieldAlert, ShieldCheck, AlertTriangle, Lock, Webhook, Activity } from "lucide-react";

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-yellow-600 dark:text-yellow-400" : "text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} /> {label}
      </div>
      <p className={`mt-2 text-3xl font-bold ${value > 0 ? color : ""}`}>{value}</p>
    </Card>
  );
}

export function SecurityMonitoringSection() {
  const fetchOverview = useServerFn(getSecurityOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["security-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
          <ShieldAlert className="h-6 w-6 text-primary" /> Monitoring sécurité
        </h2>
        <Card className="p-6 text-muted-foreground">Chargement…</Card>
      </section>
    );
  }
  if (error || !data) {
    return (
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-semibold">
          <ShieldAlert className="h-6 w-6 text-primary" /> Monitoring sécurité
        </h2>
        <Card className="p-6 text-destructive">Impossible de charger les données de sécurité.</Card>
      </section>
    );
  }

  const { kpis, series, alerts, recent, topIps } = data;
  const hasIssues = kpis.loginFailed24h + kpis.accessDenied24h + kpis.webhookInvalid24h > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <ShieldAlert className="h-6 w-6 text-primary" /> Monitoring sécurité
        </h2>
        {!hasIssues && (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Tout est calme (24h)
          </Badge>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Alert key={a.id} variant={a.severity === "critical" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="uppercase">
                  {a.severity}
                </Badge>
                <span>{a.type.replace(/_/g, " ")}</span>
              </AlertTitle>
              <AlertDescription>
                {a.message}
                {a.target && <span className="ml-2 font-mono text-xs">→ {a.target}</span>}
                <span className="ml-2 text-xs text-muted-foreground">
                  · dernière : {new Date(a.lastSeen).toLocaleString("fr-FR")}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Lock} label="Échecs login (24h)" value={kpis.loginFailed24h} tone={kpis.loginFailed24h > 10 ? "danger" : kpis.loginFailed24h > 0 ? "warn" : "ok"} />
        <Kpi icon={ShieldAlert} label="Accès refusés (24h)" value={kpis.accessDenied24h} tone={kpis.accessDenied24h > 5 ? "danger" : kpis.accessDenied24h > 0 ? "warn" : "ok"} />
        <Kpi icon={Webhook} label="Webhooks Stripe invalides (24h)" value={kpis.webhookInvalid24h} tone={kpis.webhookInvalid24h > 0 ? "danger" : "ok"} />
        <Kpi icon={Activity} label="Total événements sécurité (7j)" value={kpis.totalSecurity7d} tone={kpis.totalSecurity7d > 50 ? "warn" : "ok"} />
      </div>

      {/* Time series */}
      <Card className="p-5">
        <h3 className="mb-4 font-semibold">Événements sécurité — 24 dernières heures</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="hour" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area type="monotone" dataKey="login_failed" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.5} name="Échecs login" />
              <Area type="monotone" dataKey="access_denied" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} name="Accès refusés" />
              <Area type="monotone" dataKey="webhook_invalid" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} name="Webhooks invalides" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top IPs + Recent */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">IPs avec le plus d'événements (7j)</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">IP</th><th className="p-3 text-right">Événements</th></tr>
            </thead>
            <tbody>
              {topIps.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">Aucune IP suspecte.</td></tr>}
              {topIps.map((ip) => (
                <tr key={ip.ip} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{ip.ip}</td>
                  <td className="p-3 text-right font-mono">{ip.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">Derniers événements sécurité</div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left">
                <tr><th className="p-3">Date</th><th className="p-3">Action</th><th className="p-3">Cible</th></tr>
              </thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">RAS.</td></tr>}
                {recent.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleTimeString("fr-FR")}</td>
                    <td className="p-3"><Badge variant="destructive" className="text-xs">{l.action}</Badge></td>
                    <td className="p-3 text-xs">{l.user_email ?? l.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
