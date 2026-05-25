import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageToday } from "@/lib/ai-chef.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const fetchUsage = useServerFn(getUsageToday);
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="font-display text-4xl font-bold">Réglages</h1>

      <section className="mt-8 space-y-3 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Compte</h2>
        <Row label="Nom" value={data?.fullName ?? "—"} />
        <Row label="Email" value={data?.email ?? "—"} />
        <Row
          label="Plan"
          value={
            data?.isPremium ? (
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                <Crown className="h-4 w-4" /> Premium
              </span>
            ) : (
              "Free"
            )
          }
        />
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">Déconnectez-vous de votre compte.</p>
        <Button variant="destructive" className="mt-4" onClick={logout}>
          Se déconnecter
        </Button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
