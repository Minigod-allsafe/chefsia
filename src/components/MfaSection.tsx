import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, ShieldCheck, Trash2 } from "lucide-react";

type Factor = { id: string; friendly_name?: string | null; status: string; factor_type: string };

export function MfaSection() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors((data.totp ?? []) as Factor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `ChefIA — ${new Date().toLocaleDateString("fr-FR")}`,
    });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Impossible de démarrer l'enrôlement");
      return;
    }
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error("Entrez le code à 6 chiffres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("2FA activée ! 🔒");
    setEnrolling(null);
    setCode("");
    refresh();
  };

  const cancelEnroll = async () => {
    if (!enrolling) return;
    await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    refresh();
  };

  const removeFactor = async (factorId: string) => {
    if (!confirm("Désactiver la 2FA ? Votre compte sera moins sécurisé.")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("2FA désactivée");
    refresh();
  };

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <section className="mt-6 rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {verified.length > 0 ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
            Authentification à deux facteurs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez une couche de sécurité avec une application comme Google Authenticator, 1Password ou Authy.
          </p>
        </div>
        {verified.length > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">Active</span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
      ) : verified.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {verified.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
              <span>{f.friendly_name ?? "Application authenticator"}</span>
              <Button variant="ghost" size="sm" onClick={() => removeFactor(f.id)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : enrolling ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-medium">1. Scannez ce QR code dans votre application</p>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <img src={enrolling.qr} alt="QR code 2FA" className="h-40 w-40 rounded-md bg-white p-2" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">Ou entrez ce code manuellement :</p>
                <code className="block break-all rounded bg-muted px-2 py-1.5 text-xs">{enrolling.secret}</code>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totp-code">2. Entrez le code à 6 chiffres généré</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmEnroll} disabled={busy} className="flex-1">Activer la 2FA</Button>
            <Button variant="outline" onClick={cancelEnroll} disabled={busy}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={busy} className="mt-4">
          <Shield className="mr-1 h-4 w-4" /> Activer la 2FA
        </Button>
      )}
    </section>
  );
}
