import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageToday, updateProfile } from "@/lib/ai-chef.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout as doLogout } from "@/lib/auth";
import { Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const fetchUsage = useServerFn(getUsageToday);
  const saveProfile = useServerFn(updateProfile);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setFullName(data.fullName ?? "");
      setPhone(data.phone ?? "");
    }
  }, [data]);

  const logout = () => doLogout(navigate);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({ data: { full_name: fullName.trim(), phone: phone.trim() } });
      await qc.invalidateQueries({ queryKey: ["usage"] });
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="font-display text-4xl font-bold">Réglages</h1>

      <form onSubmit={onSave} className="mt-8 space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Mes informations</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre nom"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={data?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="text-sm">
            {data?.isPremium ? (
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <Crown className="h-4 w-4" /> Premium
              </span>
            ) : (
              "Free"
            )}
          </span>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </form>

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
