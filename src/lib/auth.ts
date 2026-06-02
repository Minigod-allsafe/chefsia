import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit.functions";

export async function logout(navigate: (opts: { to: string }) => void) {
  await logAudit({ data: { action: "logout" } }).catch(() => {});
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast.error("Erreur lors de la déconnexion");
    return;
  }
  toast.success("À bientôt !");
  navigate({ to: "/" });
}
