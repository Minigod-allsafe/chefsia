import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lookupInvitation, acceptInvitation } from "@/lib/invitations.functions";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: z.object({ token: z.string().min(10).max(200) }).parse,
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const fetchInv = useServerFn(lookupInvitation);
  const accept = useServerFn(acceptInvitation);
  const [accepting, setAccepting] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInv({ data: { token } }),
  });

  const onAccept = async () => {
    setAccepting(true);
    try {
      await accept({ data: { token } });
      toast.success("Invitation acceptée !");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Invitation</h1>
        {isLoading && <p className="mt-4 text-muted-foreground">Vérification…</p>}
        {inv && !inv.ok && (
          <p className="mt-4 text-destructive">
            {inv.reason === "not_found" && "Invitation introuvable."}
            {inv.reason === "already_used" && "Cette invitation a déjà été utilisée."}
            {inv.reason === "expired" && "Cette invitation a expiré."}
          </p>
        )}
        {inv && inv.ok && (
          <>
            <p className="mt-3 text-muted-foreground">
              Vous êtes invité à rejoindre <strong>{inv.organizationName}</strong> en tant que <strong>{inv.role}</strong>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Email : {inv.email}</p>
            {hasSession === false && (
              <div className="mt-6 space-y-2">
                <p className="text-sm">Connectez-vous (ou créez un compte) avec <strong>{inv.email}</strong> pour accepter :</p>
                <div className="flex gap-2">
                  <Button asChild className="flex-1"><a href={`/login?redirect=/accept-invite?token=${token}`}>Se connecter</a></Button>
                  <Button asChild variant="outline" className="flex-1"><a href={`/signup?redirect=/accept-invite?token=${token}`}>Créer un compte</a></Button>
                </div>
              </div>
            )}
            {hasSession && (
              <Button className="mt-6 w-full" onClick={onAccept} disabled={accepting}>
                {accepting ? "…" : "Accepter et rejoindre"}
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
