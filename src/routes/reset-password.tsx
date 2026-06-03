import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient, getSupabaseUnavailableMessage } from "@/lib/supabase-safe";
import { toast } from "sonner";
import { AuthShell } from "./login";
import { validatePassword } from "@/lib/password";
import { Check, X } from "lucide-react";


export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authClient = getSupabaseClient();
    if (!authClient) return;

    // Supabase auto-handles the recovery token from URL hash on this page
    const { data: { subscription } } = authClient.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check existing session in case event already fired
    authClient.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const check = useMemo(() => validatePassword(password), [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!check.ok) {
      toast.error("Mot de passe trop faible — corrigez les critères ci-dessous");
      return;
    }

    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const authClient = getSupabaseClient();
    if (!authClient) {
      setLoading(false);
      toast.error(getSupabaseUnavailableMessage());
      return;
    }

    const { error } = await authClient.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour ✅");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé.">
      {!ready ? (
        <p className="text-sm text-muted-foreground text-center">
          Lien invalide ou expiré. Demandez un nouveau lien depuis « Mot de passe oublié ».
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            {password.length > 0 && (
              <ul className="space-y-1 pt-1 text-xs">
                {[
                  ["Au moins 10 caractères", password.length >= 10],
                  ["Une minuscule", /[a-z]/.test(password)],
                  ["Une majuscule", /[A-Z]/.test(password)],
                  ["Un chiffre", /[0-9]/.test(password)],
                  ["Un caractère spécial", /[^a-zA-Z0-9]/.test(password)],
                ].map(([label, ok]) => (
                  <li key={label as string} className="flex items-center gap-1.5">
                    {ok ? <Check className="h-3 w-3 text-emerald-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
