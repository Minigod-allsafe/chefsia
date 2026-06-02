import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";
import { logAuditPublic } from "@/lib/audit.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (err) {
      // Re-throw router redirects; swallow init errors (e.g. missing env) so the page still renders.
      if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) throw err;
      console.warn("[login] auth init skipped:", err);
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");

  const finishLogin = (userId?: string) => {
    logAuditPublic({ data: { action: "login_success", email, user_id: userId } }).catch(() => {});
    toast.success("Bienvenue !");
    navigate({ to: "/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      logAuditPublic({ data: { action: "login_failed", email, metadata: { reason: error.message } } }).catch(() => {});
      const msg = /rate limit|too many/i.test(error.message)
        ? "Trop de tentatives, veuillez patienter un instant."
        : error.message;
      toast.error(msg);
      return;
    }
    // Check if MFA is required (AAL2)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        setMfa({ factorId: totp.id });
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    finishLogin(signInData.user?.id);
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error("Entrez le code à 6 chiffres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    finishLogin();
  };

  if (mfa) {
    return (
      <AuthShell title="Vérification 2FA" subtitle="Entrez le code à 6 chiffres de votre application.">
        <form onSubmit={verifyMfa} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp">Code de vérification</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Vérification..." : "Vérifier"}
          </Button>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); setMfa(null); setCode(""); }}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </form>
      </AuthShell>
    );
  }

  return <AuthShell title="Connexion" subtitle="Heureux de vous revoir, chef.">
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
      <p className="text-center text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">Mot de passe oublié ?</Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link to="/signup" className="text-primary hover:underline">Créer un compte</Link>
      </p>
    </form>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <ChefHat className="h-6 w-6 text-primary" /> Chef IA
        </Link>
        <div className="rounded-2xl border bg-card p-8 shadow-card-premium">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
