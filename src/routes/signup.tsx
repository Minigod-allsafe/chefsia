import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell } from "./login";
import { logAuditPublic } from "@/lib/audit.functions";
import { validatePassword } from "@/lib/password";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/signup")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const check = useMemo(() => validatePassword(password), [password]);
  const strengthLabel = ["Trop faible", "Faible", "Moyen", "Bon", "Fort", "Excellent"][check.score];
  const strengthColor =
    check.score >= 5 ? "bg-emerald-500" :
    check.score >= 4 ? "bg-primary" :
    check.score >= 3 ? "bg-amber-500" :
    "bg-destructive";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!check.ok) {
      toast.error("Mot de passe trop faible — corrigez les critères ci-dessous");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });
    setLoading(false);
    if (error) {
      logAuditPublic({ data: { action: "signup_failed", email, metadata: { reason: error.message } } }).catch(() => {});
      const msg = /pwned|leaked|compromised|breach/i.test(error.message)
        ? "Ce mot de passe a déjà été compromis dans une fuite. Choisissez-en un autre."
        : /rate limit|too many|email rate/i.test(error.message)
        ? "Trop de requêtes, veuillez patienter un instant."
        : error.message;
      toast.error(msg);
      return;
    }
    logAuditPublic({ data: { action: "signup_success", email, user_id: data.user?.id } }).catch(() => {});
    if (data.session) {
      toast.success("Compte créé !");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Vérifiez votre boîte mail pour confirmer votre compte ✉️");
      navigate({ to: "/login" });
    }
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Commencez gratuitement. Aucune carte requise.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          {password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full transition-all ${strengthColor}`} style={{ width: `${(check.score / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{strengthLabel}</span>
              </div>
              <ul className="space-y-1 text-xs">
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
            </div>
          )}
        </div>
        <Button type="submit" className="w-full shadow-glow" disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ? <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
        </p>
      </form>
    </AuthShell>
  );
}

