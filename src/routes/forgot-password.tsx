import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      const msg = /rate limit|too many/i.test(error.message)
        ? "Trop de requêtes, veuillez patienter un instant."
        : error.message;
      toast.error(msg);
      return;
    }
    setSent(true);
    toast.success("Email envoyé ! Vérifiez votre boîte mail ✉️");
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien de réinitialisation par email.">
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Si un compte existe avec <span className="text-foreground font-medium">{email}</span>,
            vous recevrez un email contenant un lien pour réinitialiser votre mot de passe.
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link to="/login">Retour à la connexion</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Retour à la connexion</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
